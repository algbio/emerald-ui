import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec, type PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { Asset } from 'molstar/lib/mol-util/assets';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import './ClusterStructureHeatmapViewer.css';

interface SafetyWindow {
  start: number;
  end: number;
}

interface ClusterAlignment {
  memberName: string;
  safetyWindows: SafetyWindow[];
}

interface ClusterStructureHeatmapViewerProps {
  /** UniProt ID of the representative protein */
  uniprotId?: string;
  /** PDB ID of the representative protein */
  pdbId?: string;
  /** Representative protein sequence */
  sequence: string;
  /** All cluster alignment results */
  alignmentResults: ClusterAlignment[];
  /** Representative protein name */
  representativeName: string;
  /** Width of the viewer */
  width?: number | string;
  /** Height of the viewer */
  height?: number | string;
}

export const ClusterStructureHeatmapViewer: React.FC<ClusterStructureHeatmapViewerProps> = ({
  uniprotId,
  pdbId,
  sequence,
  alignmentResults,
  representativeName,
  width = '100%',
  height = 600
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPluginReady, setIsPluginReady] = useState<boolean>(false);

  // Calculate coverage for each position in the sequence
  const coverageMap = useMemo(() => {
    const coverage = new Array(sequence.length).fill(0);
    const totalAlignments = alignmentResults.length;
    
    alignmentResults.forEach(result => {
      result.safetyWindows.forEach(window => {
        for (let i = window.start; i <= window.end && i < sequence.length; i++) {
          coverage[i]++;
        }
      });
    });
    
    return { coverage, maxCoverage: Math.max(...coverage, 1), totalAlignments };
  }, [sequence, alignmentResults]);

  // Custom Mol* plugin configuration
  const getPluginSpec = (): PluginUISpec => {
    const spec = DefaultPluginUISpec();
    
    spec.layout = {
      initial: {
        isExpanded: false,
        showControls: false,
        controlsDisplay: 'reactive'
      }
    };
    
    return spec;
  };

  // Initialize Mol* plugin
  const initializePlugin = async () => {
    if (!containerRef.current || pluginRef.current) return;

    try {
      const plugin = await createPluginUI({
        target: containerRef.current,
        render: renderReact18,
        spec: getPluginSpec()
      });
      
      pluginRef.current = plugin;
      setIsPluginReady(true);
    } catch (err) {
      const errorMsg = `Failed to initialize Mol* viewer: ${err}`;
      console.error(errorMsg, err);
      setError(errorMsg);
      setIsPluginReady(false);
    }
  };

  // Load structure
  const loadStructure = async () => {
    if (!pluginRef.current || (!uniprotId && !pdbId)) return;

    setIsLoading(true);
    setError('');

    try {
      // Clear existing structures
      await pluginRef.current.clear();

      let url: string;
      let isBinary = false;

      // Handle UniProt ID by loading AlphaFold structure via API
      if (uniprotId && !pdbId) {
        try {
          // Use the AlphaFold API to get the structure URLs
          console.log(`Fetching AlphaFold structure info from API for ${uniprotId}...`);
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
      } else if (pdbId) {
        // Load from RCSB PDB
        url = `https://files.rcsb.org/download/${pdbId}.cif`;
        console.log(`Attempting to load structure from PDB: ${url}`);
      } else {
        throw new Error('No structure identifier provided');
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
        throw new Error('Failed to create structure');
      }

      // Create representation with initial coloring
      try {
        await pluginRef.current.builders.structure.representation.addRepresentation(
          structure,
          { type: 'cartoon', color: 'chain-id' }
        );
      } catch (reprError) {
        console.warn('Could not add cartoon representation, trying alternative:', reprError);
        // Try a simpler representation if cartoon fails
        try {
          await pluginRef.current.builders.structure.representation.addRepresentation(
            structure,
            { type: 'ball-and-stick', color: 'element-symbol' }
          );
        } catch (altReprError) {
          console.warn('Alternative representation also failed:', altReprError);
          // Structure is loaded but no representation - this is still partially successful
        }
      }

      // Apply heatmap coloring
      await applyHeatmapColoring(structure);

      // Focus on the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});

      console.log('Structure loaded successfully');

    } catch (err) {
      let errorMsg = 'Failed to load structure';
      
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.includes('Not Found') || err.message.includes('status code 404')) {
          errorMsg = `Structure not available. The protein "${uniprotId || pdbId}" does not have a 3D structure in the AlphaFold or PDB database. This is common for some proteins that don't have experimental or predicted structures available.`;
        } else if (err.message.includes('AlphaFold API')) {
          errorMsg = `AlphaFold database error: ${err.message}`;
        } else if (err.message.includes('Network')) {
          errorMsg = `Network error: Unable to download structure. Please check your internet connection.`;
        } else {
          errorMsg = `Structure loading error: ${err.message}`;
        }
      }
      
      setError(errorMsg);
      console.error('Structure loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply heatmap coloring to the structure
  const applyHeatmapColoring = async (_structure: any) => {
    if (!pluginRef.current) return;

    try {
      console.log('Heatmap coloring feature - structure loaded successfully');
      console.log('Note: Advanced residue coloring via Molstar overpaint API is under development');
      
      // TODO: Implement advanced overpaint coloring
      // For now, the structure displays with default cartoon coloring
      // Future implementation will use Molstar's overpaint API to apply
      // per-residue colors based on safety window coverage
      
      // Log coverage information for debugging
      const totalPositions = sequence.length;
      const positionsWithCoverage = coverageMap.coverage.filter(c => c > 0).length;
      const coveragePercentage = ((positionsWithCoverage / totalPositions) * 100).toFixed(1);
      
      console.log(`Coverage statistics:`);
      console.log(`- Total positions: ${totalPositions}`);
      console.log(`- Positions with coverage: ${positionsWithCoverage} (${coveragePercentage}%)`);
      console.log(`- Max coverage: ${coverageMap.maxCoverage}/${coverageMap.totalAlignments} alignments`);

    } catch (err) {
      console.warn('Error in heatmap coloring setup:', err);
    }
  };

  // Initialize plugin when component mounts
  useEffect(() => {
    const initWhenReady = async () => {
      let retries = 0;
      while (retries < 20) {
        if (containerRef.current && 
            containerRef.current.offsetWidth > 0 && 
            containerRef.current.offsetHeight > 0) {
          await initializePlugin();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      console.error('Container never became ready for initialization');
      setError('Failed to initialize: container not ready');
    };

    const timer = setTimeout(initWhenReady, 50);

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

  // Load structure when plugin is ready
  useEffect(() => {
    if (isPluginReady && pluginRef.current && (uniprotId || pdbId)) {
      loadStructure();
    }
  }, [uniprotId, pdbId, isPluginReady]);

  return (
    <div className="cluster-structure-heatmap-viewer" style={{ width, height }}>
      <div className="heatmap-viewer-header">
        <h3>3D Structure Viewer</h3>
        <p className="heatmap-viewer-description">
          Representative structure ({representativeName}) for cluster analysis with {coverageMap.totalAlignments} alignments.
          {coverageMap.maxCoverage > 0 && ` Coverage: ${((coverageMap.coverage.filter(c => c > 0).length / sequence.length) * 100).toFixed(1)}% of residues are in safety windows.`}
          {' '}Note: Advanced residue-level heatmap coloring is under development.
        </p>
      </div>

      <div className="structure-viewer-main">
        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-overlay">
            Loading 3D structure and applying heatmap...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-overlay">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Mol* container */}
        <div
          ref={containerRef}
          className="molstar-container"
          style={{ height: typeof height === 'number' ? `${height - 100}px` : '500px' }}
        />
      </div>

      {/* Color legend */}
      <div className="heatmap-color-legend">
        <span className="legend-title">Coverage:</span>
        <div className="legend-gradient">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#c8c8c8' }}></div>
            <span>None</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 75%)' }}></div>
            <span>Low</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 62%)' }}></div>
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 40%)' }}></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterStructureHeatmapViewer;
