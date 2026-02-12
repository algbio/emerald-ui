import React, { useEffect, useRef, useState } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec, type PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { Asset } from 'molstar/lib/mol-util/assets';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { useSafetyWindowsHighlighting } from '../../hooks/useSafetyWindowsHighlighting';
import { mapUniProtToKegg } from '../../utils/api/uniprotUtils';
import './StructureViewer.css';
import { Color } from 'molstar/lib/mol-util/color';

interface StructureViewerProps {
  /** PDB ID to load (e.g., '1crn') */
  pdbId?: string;
  /** UniProt accession to load (e.g., 'P02769') */
  uniprotId?: string;
  /** Custom PDB file URL or data */
  pdbUrl?: string;
  /** Custom PDB file content as string */
  pdbContent?: string;
  /** Protein sequence to display */
  sequence?: string;
  /** Width of the viewer */
  width?: number | string;
  /** Height of the viewer */
  height?: number | string;
  /** Whether to show the loading indicator */
  showLoading?: boolean;
  /** Whether to show the protein sequence */
  showSequence?: boolean;
  /** Enable debug mode for troubleshooting */
  debug?: boolean;
  /** Callback when structure is loaded */
  onStructureLoaded?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Safety windows for sequence highlighting in 3D structure */
  safetyWindows?: Array<{
    startPosition: number;
    endPosition: number;
    color?: string;
  }>;
  /** Enable safety window highlighting */
  enableSafetyWindowHighlighting?: boolean;
  /** Custom colors for cartoon representation (hex color codes) */
  cartoonColors?: string[]; // Array of up to 8 hex colors like ['#FF0000', '#00FF00', ...]
  /** Cartoon color scheme to use - colors the backbone by different criteria */
  cartoonColorScheme?: 'chain-id' | 'secondary-structure' | 'b-factor' | 'uniform';
}

export const StructureViewer: React.FC<StructureViewerProps> = ({
  pdbId,
  uniprotId,
  pdbUrl,
  pdbContent,
  sequence,
  width = '100%',
  height = 400,
  showLoading = true,
  onStructureLoaded,
  onError,
  safetyWindows = [],
  enableSafetyWindowHighlighting = false,
  cartoonColorScheme = 'chain-id'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPluginReady, setIsPluginReady] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);
  const [keggMappingLoading, setKeggMappingLoading] = useState<boolean>(false);
  
  // Use optimized safety window highlighting with memoization
  const safetyWindowOptimization = useSafetyWindowsHighlighting(
    uniprotId || null,
    safetyWindows || []
  );

  // Custom Mol* plugin configuration for better protein visualization with sequence viewer
  const getPluginSpec = (): PluginUISpec => {
    const spec = DefaultPluginUISpec();
    
    // Configure Canvas3D rendering and colors
    spec.canvas3d = {
      ...DefaultPluginUISpec().canvas3d,
      renderer: {
        ...DefaultPluginUISpec().canvas3d?.renderer,
        backgroundColor: Color(0xffffff), // white background
        selectColor: Color(0x00cc66), // green selection
        highlightColor: Color(0x00cc66), // green highlight (same as selection)
      },
      // Customize highlight/selection colors - use same green for both
      marking: {
        enabled: true,
        selectEdgeColor: Color(0x00cc66), // green selection edge
        selectColor: Color(0x00cc66), // green selection face
        highlightEdgeColor: Color(0x00cc66), // green highlight edge
        highlightColor: Color(0x00cc66), // green highlight face
      }
    };
    
    // Enable sequence viewer and ensure it's visible
    spec.layout = {
      initial: {
        isExpanded: false,
        showControls: true,
        regionState: {
          bottom: "hidden",
          left: "collapsed", 
          right: "hidden",
          top: "full",
        },
        controlsDisplay: 'reactive',
      },
    };

    return spec;
  };

  const initializePlugin = async () => {
    if (!containerRef.current) {
      console.warn('Container not ready for plugin initialization');
      return;
    }

    // console.log(`Initializing Mol* plugin... (attempt ${initAttempts + 1})`);

    try {
      // Clear any existing plugin
      if (pluginRef.current) {
        // console.log('Disposing existing plugin');
        try {
          pluginRef.current.dispose();
        } catch (err) {
          console.warn('Error disposing previous plugin:', err);
        }
        setIsPluginReady(false);
      }

      // Clear the container content to ensure clean slate
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new plugin instance
      // console.log('Creating new plugin instance');
      const plugin = await createPluginUI({
        target: containerRef.current,
        render: renderReact18,
        spec: getPluginSpec()
      });
      
      pluginRef.current = plugin;
      setIsPluginReady(true);
      setInitAttempts(0); // Reset attempts on success
      // console.log('Plugin initialized successfully');
      
    } catch (err) {
      const errorMsg = `Failed to initialize Mol* viewer: ${err}`;
      console.error(errorMsg, err);
      
      // Increment attempt counter
      const newAttempts = initAttempts + 1;
      setInitAttempts(newAttempts);
      
      // Retry up to 3 times with increasing delays
      if (newAttempts < 3) {
        // console.log(`Retrying initialization in ${newAttempts * 1000}ms...`);
        setTimeout(() => {
          initializePlugin();
        }, newAttempts * 1000);
      } else {
        setError(errorMsg);
        onError?.(errorMsg);
        setIsPluginReady(false);
      }
    }
  };

  const loadStructure = async () => {
    if (!isPluginReady || !pluginRef.current) {
      console.warn('Plugin not ready for structure loading', { isPluginReady, hasPlugin: !!pluginRef.current });
      return;
    }

    // console.log('Starting structure loading...', { uniprotId, pdbId });

    setIsLoading(true);
    setError('');

    try {
      // Clear any existing structures first
      await clearAllStructures();

      let url: string;
      let isBinary = false;
      let finalPdbId = pdbId;

      // Handle UniProt ID by loading AlphaFold structure via API
      if (uniprotId && !pdbId) {
        try {
          // Use the new AlphaFold API to get the structure URLs
          const response = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`);
          if (!response.ok) {
            throw new Error(`AlphaFold API returned ${response.status}: ${response.statusText}`);
          }
          
          const predictions = await response.json();
          if (!predictions || predictions.length === 0) {
            throw new Error(`No AlphaFold predictions found for UniProt ID: ${uniprotId}`);
          }
          
          // Use the first prediction (usually the canonical sequence)
          const prediction = predictions[0];
          
          // Prefer CIF format over PDB for better structure quality
          if (prediction.cifUrl) {
            url = prediction.cifUrl;
            isBinary = true; // CIF format
          } else if (prediction.pdbUrl) {
            url = prediction.pdbUrl;
            isBinary = false; // PDB format
          } else {
            throw new Error(`No structure files available for UniProt ID: ${uniprotId}`);
          }
          
          console.log(`Loading AlphaFold structure from API: ${url}`);
        } catch (apiError) {
          console.error('AlphaFold API error:', apiError);
          throw new Error(`Failed to fetch AlphaFold structure: ${apiError}`);
        }
      } else if (pdbContent) {
        // Load from content string
        const blob = new Blob([pdbContent], { type: 'text/plain' });
        url = URL.createObjectURL(blob);
      } else if (pdbUrl) {
        // Load from custom URL
        url = pdbUrl;
        isBinary = pdbUrl.toLowerCase().includes('.cif') || pdbUrl.toLowerCase().includes('.bcif');
      } else if (finalPdbId) {
        // Load from PDB ID via RCSB PDB
        url = `https://files.rcsb.org/download/${finalPdbId.toUpperCase()}.pdb`;
      } else {
        throw new Error('No PDB ID, UniProt ID, URL, or content provided');
      }

      // Load the structure with better error handling
      console.log(`Loading structure from: ${url}, format: ${isBinary ? 'mmcif' : 'pdb'}`);
      
      const data = await pluginRef.current.builders.data.download(
        { url: Asset.Url(url) },
        { state: { isGhost: false } }
      );

      if (!data) {
        throw new Error('Failed to download structure data');
      }

      // Parse the structure format with improved format detection
      let format = isBinary ? 'mmcif' : 'pdb';
      
      // Better format detection based on URL
      if (url.toLowerCase().includes('.cif')) {
        format = 'mmcif';
      } else if (url.toLowerCase().includes('.bcif')) {
        format = 'mmcif'; // Binary CIF is also mmcif format
      } else if (url.toLowerCase().includes('.pdb')) {
        format = 'pdb';
      }

      const trajectory = await pluginRef.current.builders.structure.parseTrajectory(
        data,
        format
      );

      if (!trajectory) {
        throw new Error('Failed to parse structure trajectory');
      }

      // Create the structure
      const model = await pluginRef.current.builders.structure.createModel(trajectory);
      
      if (!model) {
        throw new Error('Failed to create structure model');
      }
      
      const structure = await pluginRef.current.builders.structure.createStructure(model);

      if (!structure) {
        throw new Error('Failed to create structure representation');
      }

      // Apply default representation (cartoon + ball-and-stick for ligands)
      try {
        // Map the color scheme to valid Mol* values
        let colorScheme: string = 'chain-id';
        if (cartoonColorScheme === 'secondary-structure') {
          colorScheme = 'secondary-structure';
        } else if (cartoonColorScheme === 'b-factor') {
          colorScheme = 'uncertainty';
        } else if (cartoonColorScheme === 'uniform') {
          colorScheme = 'uniform';
        } else {
          colorScheme = 'chain-id';
        }

        const repr = await pluginRef.current.builders.structure.representation.addRepresentation(
          structure,
          {
            type: 'cartoon',
            color: colorScheme,
            size: 'uniform',
          }
        );

        // Ensure the representation is fully updated
        if (repr && pluginRef.current.managers.structure) {
          await pluginRef.current.managers.structure.component.updateRepresentations([repr]);
        }
      } catch (reprError) {
        console.warn('Could not add cartoon representation:', reprError);
        // Just log the error - don't add alternative representation
      }

      // Focus on the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});

      // Enable sequence viewer after structure is loaded
      await enableSequenceViewer(structure);

      // Apply safety window highlighting if enabled
      await applySafetyWindowHighlighting(structure);

      onStructureLoaded?.();
      
    } catch (err) {
      let errorMsg = 'Failed to load structure';
      
      // Provide more specific error messages based on the error type
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.includes('Not Found')) {
          errorMsg = `Structure not found. The ${uniprotId ? 'UniProt ID' : 'PDB ID'} "${uniprotId || pdbId}" may not have an available structure in the database.`;
        } else if (err.message.includes('Invalid data cell')) {
          errorMsg = `Structure file format error. The structure data appears to be corrupted or in an unsupported format.`;
        } else if (err.message.includes('AlphaFold API')) {
          errorMsg = `AlphaFold database error: ${err.message}`;
        } else if (err.message.includes('Network')) {
          errorMsg = `Network error: Unable to download structure. Please check your internet connection.`;
        } else {
          errorMsg = `Structure loading error: ${err.message}`;
        }
      } else {
        errorMsg = `Unknown error occurred while loading structure: ${err}`;
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Structure loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to enable sequence viewer for loaded structure
  const enableSequenceViewer = async (structure: any) => {
    if (!pluginRef.current) return;
    
    try {
      // Get the plugin context
      const plugin = pluginRef.current;
      
      // The sequence viewer should automatically appear when structures are loaded
      // But we can ensure the bottom panel is visible using the correct API
      if (plugin.layout && plugin.layout.setProps) {
        plugin.layout.setProps({
          regionState: {
            ...plugin.layout.state.regionState,
            bottom: "full",
          }
        });
      }
      
      // Update the structure focus to show sequence
      const structureRef = structure.ref;
      if (plugin.managers?.structure?.focus) {
        await plugin.managers.structure.focus.set({ 
          structures: [structureRef]
        });
      }
      
    } catch (err) {
      console.warn('Could not configure sequence viewer:', err);
    }
  };

  // Function to apply safety window highlighting to the loaded structure
  const applySafetyWindowHighlighting = async (structure: any) => {
    // Get optimized safety windows with change detection
    const { safetyWindows: optimizedWindows, shouldUpdate, resetChangeFlag } = safetyWindowOptimization;
    
    if (!pluginRef.current || !enableSafetyWindowHighlighting || !shouldUpdate) {
      return;
    }

    try {
      const plugin = pluginRef.current;
      const structureData = structure.cell.obj.data;
      
      // Clear any existing highlights using the correct API
      if (plugin.managers?.interactivity?.lociHighlights?.clear) {
        plugin.managers.interactivity.lociHighlights.clear();
      }
      
      // Collect all residues from all safety windows into a single schema
      const allResidues: { label_seq_id: number }[] = [];
      
      for (let i = 0; i < optimizedWindows.length; i++) {
        const window = optimizedWindows[i];
        
        // Add all residues from this window to the combined list
        for (let residueId = window.startPosition; residueId < window.endPosition; residueId++) {
          allResidues.push({ label_seq_id: residueId });
        }
      }
      
      // Create a single schema with all residues from all safety windows
      const combinedSchema: StructureElement.Schema = {
        items: allResidues
      };
      
      // Convert schema to Loci
      const combinedLoci = StructureElement.Loci.fromSchema(structureData, combinedSchema);
      
      // Check if Loci is valid and not empty
      if (StructureElement.Loci.isEmpty(combinedLoci)) {
        console.warn(`No residues found for any safety windows`);
        return;
      }
      
      // Apply highlighting for all safety windows at once
      if (plugin.managers?.interactivity?.lociHighlights?.highlightOnly) {
        plugin.managers.interactivity.lociHighlights.highlightOnly({ loci: combinedLoci });
      }
      
      // Also apply selection for better visibility
      if (plugin.managers?.structure?.selection?.fromLoci) {
        plugin.managers.structure.selection.fromLoci('set', combinedLoci);
      }
      
      // Focus camera on the combined selection
      if (plugin.managers?.camera?.focusLoci) {
        plugin.managers.camera.focusLoci(combinedLoci);
      }
      
      // Reset change flag after successful highlighting to prevent unnecessary rerenders
      resetChangeFlag();
      
    } catch (err) {
      console.warn('Could not apply safety window highlighting:', err);
      console.error('Full error details:', err);
    }
  };

  // Function to clear existing safety window highlights
  const clearSafetyWindowHighlights = async () => {
    if (!pluginRef.current) return;
    
    try {
      const plugin = pluginRef.current;
      
      // Clear all highlights using the interactivity manager
      if (plugin.managers?.interactivity?.lociHighlights?.clear) {
        plugin.managers.interactivity.lociHighlights.clear();
      }
      
    } catch (err) {
      console.warn('Error clearing safety window highlights:', err);
    }
  };

  // Function to clear all existing structures
  const clearAllStructures = async () => {
    if (!pluginRef.current) return;
    
    try {
      // Clear all data from the plugin
      await pluginRef.current.clear();
    } catch (err) {
      console.warn('Error clearing structures:', err);
    }
  };

  // Initialize plugin when component mounts
  useEffect(() => {
    // Reset state when component mounts
    setIsPluginReady(false);
    setInitAttempts(0);
    setError('');
    
    // Use a more robust initialization approach
    const initWhenReady = async () => {
      // Wait for container to be ready
      let retries = 0;
      while (retries < 20) { // Max 2 seconds
        if (containerRef.current && 
            containerRef.current.offsetWidth > 0 && 
            containerRef.current.offsetHeight > 0) {
          // console.log('Container is ready, initializing plugin');
          await initializePlugin();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      console.error('Container never became ready for initialization');
      setError('Failed to initialize: container not ready');
    };

    // Start the initialization process
    const timer = setTimeout(initWhenReady, 50);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (pluginRef.current) {
        try {
          pluginRef.current.dispose();
        } catch (err) {
          console.warn('Error disposing plugin on unmount:', err);
        }
        setIsPluginReady(false);
      }
    };
  }, []);

  // Load structure when plugin is ready and props change
  useEffect(() => {
    if (isPluginReady && pluginRef.current && (uniprotId || pdbId || pdbUrl || pdbContent)) {
      // console.log('useEffect triggered structure loading', { isPluginReady, uniprotId, pdbId });
      loadStructure();
    }
  }, [pdbId, uniprotId, pdbUrl, pdbContent, sequence, isPluginReady]);

  // Apply safety window highlighting when it changes (without reloading structure)
  useEffect(() => {
    if (isPluginReady && pluginRef.current && enableSafetyWindowHighlighting && safetyWindows.length > 0) {
      // console.log('Applying safety window highlighting due to changes:', safetyWindows);
      // Find the current structure in the plugin state
      const structures = pluginRef.current.managers.structure.hierarchy.current.structures;
      if (structures.length > 0) {
        const structure = structures[0];
        applySafetyWindowHighlighting(structure);
      }
    } else if (isPluginReady && pluginRef.current && (!enableSafetyWindowHighlighting || safetyWindows.length === 0)) {
      // Clear highlighting if disabled or no windows
      clearSafetyWindowHighlights();
    }
  }, [safetyWindows, enableSafetyWindowHighlighting, isPluginReady]);

  const handleRetryInitialization = () => {
    setError('');
    setInitAttempts(0);
    setIsPluginReady(false);
    initializePlugin();
  };

  const handleKeggClick = async () => {
    if (!uniprotId) return;
    
    setKeggMappingLoading(true);
    try {
      const keggId = await mapUniProtToKegg(uniprotId);
      if (keggId) {
        window.open(`https://www.genome.jp/entry/${keggId}`, '_blank');
      } else {
        // Fallback: try direct UniProt ID (though it might not work)
        window.open(`https://www.genome.jp/entry/${uniprotId}`, '_blank');
      }
    } catch (error) {
      console.error('Error mapping to KEGG:', error);
      // Fallback: try direct UniProt ID
      window.open(`https://www.genome.jp/entry/${uniprotId}`, '_blank');
    } finally {
      setKeggMappingLoading(false);
    }
  };

  return (
    <div className="structure-viewer" style={{ width, height }}>
      {/* Main viewer container */}
      <div className="structure-viewer-main">
       

        {/* Loading indicator */}
        {isLoading && showLoading && (
          <div className="loading-overlay">
            Loading structure...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-overlay">
            <strong>Error:</strong> {error}
            <br />
            <button
              onClick={handleRetryInitialization}
              className="error-retry-button"
            >
              Retry Initialization
            </button>
          </div>
        )}

        {/* Mol* container */}
        <div
          ref={containerRef}
          className="molstar-container"
        />
      </div>
      
      {/* External Database Links Footer */}
      {(uniprotId || pdbId) && (
        <div className="external-links-footer">
          <div className="external-links-label">
            External Databases:
          </div>
          
          {uniprotId && (
            <button
              onClick={() => window.open(`https://www.uniprot.org/uniprotkb/${uniprotId}`, '_blank')}
              className="external-link-button external-link-uniprot"
              title={`View ${uniprotId} in UniProt`}
            >
              🔗 UniProt
            </button>
          )}
          
          {uniprotId && (
            <button
              onClick={() => window.open(`https://alphafold.ebi.ac.uk/entry/${uniprotId}`, '_blank')}
              className="external-link-button external-link-alphafold"
              title={`View ${uniprotId} in AlphaFold Database`}
            >
              🧬 AlphaFold
            </button>
          )}
          
          {uniprotId && (
            <button
              onClick={() => window.open(`https://swissmodel.expasy.org/repository/uniprot/${uniprotId}`, '_blank')}
              className="external-link-button external-link-swiss-model"
              title={`View ${uniprotId} models in SWISS-MODEL Repository`}
            >
              📐 SWISS-MODEL
            </button>
          )}
          
          {(uniprotId) && (
            <button
              onClick={() => {
                window.open(`https://cluster.foldseek.com/cluster/${uniprotId}`, '_blank');
              }}
              className="external-link-button external-link-foldseek"
              title={`Search ${pdbId || uniprotId} in Foldseek cluster database`}
            >
              🔍 Foldseek
            </button>
          )}
          
          {uniprotId && (
            <button
              onClick={handleKeggClick}
              className="external-link-button external-link-kegg"
              title={`View ${uniprotId} in KEGG Database`}
              disabled={keggMappingLoading}
            >
              {keggMappingLoading ? '⏳ Mapping...' : '🧪 KEGG'}
            </button>
          )}
          
          {uniprotId && (
            <button
              onClick={() => window.open(`https://www.compbio.dundee.ac.uk/ligysis/results/${uniprotId}/1`, '_blank')}
              className="external-link-button external-link-ligsys"
              title={`View ${uniprotId} in LIGSYS Database`}
            >
              💊 LIGYSIS
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StructureViewer;
