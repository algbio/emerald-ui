import React, { useEffect, useRef, useState } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec, type PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { Asset } from 'molstar/lib/mol-util/assets';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import './StructureViewer.css';

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
  /** Callback when PDB structures are found for UniProt ID */
  onPdbStructuresFound?: (pdbIds: string[]) => void;
  /** Safety windows for sequence highlighting in 3D structure */
  safetyWindows?: Array<{
    startPosition: number;
    endPosition: number;
    color?: string;
  }>;
  /** Enable safety window highlighting */
  enableSafetyWindowHighlighting?: boolean;
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
  onPdbStructuresFound,
  safetyWindows = [],
  enableSafetyWindowHighlighting = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [availablePdbIds, setAvailablePdbIds] = useState<string[]>([]);
  const [selectedPdbId, setSelectedPdbId] = useState<string>('');
  const [hasAlphaFold, setHasAlphaFold] = useState<boolean>(false);
  const [useAlphaFold, setUseAlphaFold] = useState<boolean>(false);
  const [isPluginReady, setIsPluginReady] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);

  // Custom Mol* plugin configuration for better protein visualization with sequence viewer
  const getPluginSpec = (): PluginUISpec => {
    const spec = DefaultPluginUISpec();
    
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

    // console.log('Starting structure loading...', { uniprotId, pdbId, useAlphaFold });

    setIsLoading(true);
    setError('');

    try {
      // Clear any existing structures first
      await clearAllStructures();

      let url: string;
      let isBinary = false;
      let finalPdbId = pdbId;

      // Handle UniProt ID by fetching PDB IDs first
      if (uniprotId && !pdbId) {
        const { pdbIds, hasAlphaFold } = await fetchDataFromUniProt(uniprotId);
        
        setHasAlphaFold(hasAlphaFold || false);
        setAvailablePdbIds(pdbIds);
        
        if (hasAlphaFold) {
          // Prioritize AlphaFold structure as it represents the complete sequence
          setUseAlphaFold(true);
          // console.log(`AlphaFold structure available for UniProt ${uniprotId}, using as primary structure`);
          if (pdbIds.length > 0) {
            setSelectedPdbId(pdbIds[0]);
            onPdbStructuresFound?.(pdbIds);
            // console.log(`${pdbIds.length} PDB structures also available as alternatives:`, pdbIds);
          }
        } else if (pdbIds.length > 0) {
          // No AlphaFold, but PDB structures available
          finalPdbId = pdbIds[0];
          setSelectedPdbId(finalPdbId || '');
          onPdbStructuresFound?.(pdbIds);
          // console.log(`Found ${pdbIds.length} PDB structures for UniProt ${uniprotId}:`, pdbIds);
        } else {
          throw new Error(`No PDB or AlphaFold structures found for UniProt ID: ${uniprotId}`);
        }
      }

      if (pdbContent) {
        // Load from content string
        const blob = new Blob([pdbContent], { type: 'text/plain' });
        url = URL.createObjectURL(blob);
      } else if (pdbUrl) {
        // Load from custom URL
        url = pdbUrl;
        isBinary = pdbUrl.toLowerCase().includes('.cif') || pdbUrl.toLowerCase().includes('.bcif');
      } else if (useAlphaFold && uniprotId) {
        // Load from AlphaFold
        url = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.cif`;
        isBinary = true; // AlphaFold uses mmCIF format
      } else if (finalPdbId) {
        // Load from PDB ID via RCSB PDB
        url = `https://files.rcsb.org/download/${finalPdbId.toUpperCase()}.pdb`;
      } else {
        throw new Error('No PDB ID, UniProt ID, URL, or content provided');
      }

      // Load the structure
      const data = await pluginRef.current.builders.data.download(
        { url: Asset.Url(url) },
        { state: { isGhost: false } }
      );

      // Parse the structure format
      const trajectory = await pluginRef.current.builders.structure.parseTrajectory(
        data,
        isBinary ? 'mmcif' : 'pdb'
      );

      // Create the structure
      const model = await pluginRef.current.builders.structure.createModel(trajectory);
      const structure = await pluginRef.current.builders.structure.createStructure(model);

      // Apply default representation (cartoon + ball-and-stick for ligands)
      await pluginRef.current.builders.structure.representation.addRepresentation(
        structure,
        {
          type: 'cartoon',
          color: 'chain-id',
          size: 'uniform',
        }
      );

      // Focus on the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});

      // Enable sequence viewer after structure is loaded
      await enableSequenceViewer(structure);

      // Apply safety window highlighting if enabled
      await applySafetyWindowHighlighting(structure);

      onStructureLoaded?.();
      
    } catch (err) {
      const errorMsg = `Failed to load structure: ${err}`;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error(errorMsg);
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
    if (!pluginRef.current || !enableSafetyWindowHighlighting || safetyWindows.length === 0) {
      return;
    }

    console.log('Applying safety window highlighting:',uniprotId, safetyWindows);

    try {
      const plugin = pluginRef.current;
      const structureData = structure.cell.obj.data;
      
      // Clear any existing highlights using the correct API
      if (plugin.managers?.interactivity?.lociHighlights?.clear) {
        plugin.managers.interactivity.lociHighlights.clear();
      }
      
      // Collect all residues from all safety windows into a single schema
      const allResidues: { label_seq_id: number }[] = [];
      
      for (let i = 0; i < safetyWindows.length; i++) {
        const window = safetyWindows[i];
        // console.log(`Processing safety window ${i + 1}:`, window);
        
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
      
      // console.log(`Successfully highlighted all ${safetyWindows.length} safety windows with ${allResidues.length} total residues`);
      
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

  // Function to fetch PDB structures and sequence from UniProt
  const fetchDataFromUniProt = async (uniprotAccession: string): Promise<{
    pdbIds: string[];
    sequence?: string;
    hasAlphaFold?: boolean;
  }> => {
    try {
      // Use UniProt REST API to get cross-references to PDB and sequence
      const response = await fetch(
        `https://rest.uniprot.org/uniprotkb/${uniprotAccession}.json`
      );
      
      if (!response.ok) {
        throw new Error(`UniProt API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract PDB cross-references
      const pdbIds: string[] = [];
      let hasAlphaFoldStructure = false;
      
      if (data.uniProtKBCrossReferences) {
        for (const xref of data.uniProtKBCrossReferences) {
          if (xref.database === 'PDB') {
            pdbIds.push(xref.id);
          } else if (xref.database === 'AlphaFoldDB') {
            hasAlphaFoldStructure = true;
          }
        }
      }
      
      // If no PDB structures found, check AlphaFold availability by attempting to fetch
      if (pdbIds.length === 0 && !hasAlphaFoldStructure) {
        hasAlphaFoldStructure = await checkAlphaFoldAvailability(uniprotAccession);
      }
      
      // Extract protein sequence
      let sequence = '';
      if (data.sequence && data.sequence.value) {
        sequence = data.sequence.value;
      }
      
      return { pdbIds, sequence, hasAlphaFold: hasAlphaFoldStructure };
    } catch (err) {
      console.error('Error fetching data from UniProt:', err);
      throw new Error(`Failed to fetch data for UniProt ID ${uniprotAccession}: ${err}`);
    }
  };

  // Function to check AlphaFold structure availability
  const checkAlphaFoldAvailability = async (uniprotAccession: string): Promise<boolean> => {
    try {
      const alphaFoldUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotAccession}-F1-model_v4.cif`;
      const response = await fetch(alphaFoldUrl, { method: 'HEAD' });
      return response.ok;
    } catch (err) {
      console.warn('Could not check AlphaFold availability:', err);
      return false;
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

  // Reset AlphaFold preference when uniprotId changes
  useEffect(() => {
    // Reset state but prioritize AlphaFold when available
    setAvailablePdbIds([]);
    setSelectedPdbId('');
    // Note: useAlphaFold will be set by loadStructure based on availability
    setUseAlphaFold(false);
    setHasAlphaFold(false);
  }, [uniprotId, pdbId]);

  // Load structure when plugin is ready and props change
  useEffect(() => {
    if (isPluginReady && pluginRef.current && (uniprotId || pdbId || pdbUrl || pdbContent)) {
      // console.log('useEffect triggered structure loading', { isPluginReady, uniprotId, pdbId });
      loadStructure();
    }
  }, [pdbId, uniprotId, pdbUrl, pdbContent, sequence, isPluginReady, useAlphaFold]);

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

  return (
    <div className="structure-viewer" style={{ width, height }}>
      {/* Main viewer container */}
      <div className="structure-viewer-main">
       
        {/* Structure info */}
        {(uniprotId || pdbId || selectedPdbId) && (
          <div className="structure-info">
            {uniprotId && (
              <div><strong>UniProt:</strong> {uniprotId}</div>
            )}
            <div>
              <strong>{useAlphaFold ? 'AlphaFold:' : 'PDB:'}</strong> 
              {useAlphaFold ? 
                ` AF-${uniprotId}-F1` : 
                (selectedPdbId || pdbId || 'Loading...').toUpperCase()
              }
            </div>
            {useAlphaFold && (
              <div className="structure-info-complete-model">
                Complete sequence model
              </div>
            )}
            {availablePdbIds.length > 0 && (
              <div className="structure-info-secondary">
                {availablePdbIds.length} PDB structure{availablePdbIds.length > 1 ? 's' : ''} available
              </div>
            )}
            {!useAlphaFold && hasAlphaFold && (
              <div className="structure-info-secondary">
                AlphaFold structure available
              </div>
            )}
          </div>
        )}

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
      {(uniprotId || pdbId || selectedPdbId) && (
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
              title={`Search ${selectedPdbId || pdbId} in Foldseek cluster database`}
            >
              🔍 Foldseek
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StructureViewer;
