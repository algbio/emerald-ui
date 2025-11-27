import { useState, useRef, useEffect } from 'react';
import './ClusterModePanel.css';
import ClusterFileUploader from './ClusterFileUploader';
import ClusterUniProtSearch from './ClusterUniProtSearch';
import SafetyHeatmap from './SafetyHeatmap';
import ClusterStructureHeatmapViewer from '../structure/ClusterStructureHeatmapViewer';
import { useSequence } from '../../context/SequenceContext';
import { EmeraldService } from '../../utils/api/EmeraldService';
import { extractUniProtId } from '../../utils/api/uniprotUtils';

interface ClusterAlignment {
  memberName: string;
  memberSequence: string;
  safetyWindows: Array<{ start: number; end: number }>;
  alignmentResult?: any; // Store the full alignment result for graph display
}

interface ClusterData {
  representativeSequence: string;
  representativeName: string;
  clusterSequences: Array<{ name: string; sequence: string }>;
  results: ClusterAlignment[];
}

interface ClusterModePanelProps {
  onViewPairwiseAlignment?: (repSeq: string, repName: string, memSeq: string, memName: string) => void;
  cachedData?: ClusterData | null;
  onDataChange?: (data: ClusterData) => void;
}

function ClusterModePanel({ onViewPairwiseAlignment, cachedData, onDataChange }: ClusterModePanelProps = {}) {
  const [activeTab, setActiveTab] = useState<'file' | 'uniprot'>('file');
  const [representativeSequence, setRepresentativeSequence] = useState(cachedData?.representativeSequence || '');
  const [representativeName, setRepresentativeName] = useState(cachedData?.representativeName || '');
  const [clusterSequences, setClusterSequences] = useState<Array<{ name: string; sequence: string }>>(cachedData?.clusterSequences || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ClusterAlignment[]>(cachedData?.results || []);
  const [error, setError] = useState<string>('');
  const [show3DStructure, setShow3DStructure] = useState(false);
  const { state, dispatch } = useSequence();
  const { alpha, delta } = state.params;
  
  const emeraldServiceRef = useRef<EmeraldService | null>(null);

  // Extract UniProt ID from representative name if available
  const representativeUniProtId = extractUniProtId(representativeName);

  // Sync state changes to parent component
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        representativeSequence,
        representativeName,
        clusterSequences,
        results
      });
    }
  }, [representativeSequence, representativeName, clusterSequences, results, onDataChange]);

  const handleFileUpload = (data: {
    representative: { name: string; sequence: string };
    members: Array<{ name: string; sequence: string }>;
  }) => {
    setRepresentativeName(data.representative.name);
    setRepresentativeSequence(data.representative.sequence);
    setClusterSequences(data.members);
    setResults([]); // Clear previous results
  };

  const handleUniProtSearch = (data: {
    representative: { name: string; sequence: string };
    members: Array<{ name: string; sequence: string }>;
  }) => {
    setRepresentativeName(data.representative.name);
    setRepresentativeSequence(data.representative.sequence);
    setClusterSequences(data.members);
    setResults([]); // Clear previous results
  };

  const runClusterAnalysis = async () => {
    if (!representativeSequence || clusterSequences.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setError('');
    const analysisResults: ClusterAlignment[] = [];

    try {
      // Initialize the Emerald service if needed
      if (!emeraldServiceRef.current) {
        emeraldServiceRef.current = new EmeraldService();
        await emeraldServiceRef.current.initialize();
      }

      for (const member of clusterSequences) {
        try {
          // Run EMERALD alignment between representative and this member
          const alignmentResult = await emeraldServiceRef.current.generateAlignment(
            representativeSequence,
            representativeName,
            member.sequence,
            member.name,
            alpha,
            delta
          );

          console.log('Alignment result for', member.name, ':', alignmentResult);
          console.log('Safety windows:', alignmentResult.safety_windows);

          // Extract safety windows from the alignment result
          // Handle cases where safety_windows might be undefined or null
          const safetyWindows = alignmentResult.safety_windows 
            ? alignmentResult.safety_windows.map(window => {
                console.log('Processing window:', window);
                return {
                  start: window.start_ref,
                  end: window.end_ref
                };
              })
            : [];

          console.log('Extracted safety windows:', safetyWindows);

          // Store the results including full alignment result
          analysisResults.push({
            memberName: member.name,
            memberSequence: member.sequence,
            safetyWindows: safetyWindows,
            alignmentResult: alignmentResult
          });
        } catch (memberError) {
          console.error(`Error processing member ${member.name}:`, memberError);
          // Add result with error indication
          analysisResults.push({
            memberName: `${member.name} (error)`,
            memberSequence: member.sequence,
            safetyWindows: []
          });
        }
      }

      setResults(analysisResults);
    } catch (err) {
      console.error('Error during cluster analysis:', err);
      setError(err instanceof Error ? err.message : 'Error during cluster analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="cluster-mode-panel">
      <div className="cluster-mode-header">
        <h2>Cluster Analysis Mode</h2>
        <p className="cluster-mode-description">
          Analyze a protein cluster by comparing a representative protein against all other members.
          The analysis will identify alignment-safe windows in the representative sequence across all pairwise comparisons.
        </p>
      </div>

      <div className="cluster-input-section">
        <div className="cluster-tabs">
          <button
            className={`cluster-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            Upload FASTA File
          </button>
          <button
            className={`cluster-tab ${activeTab === 'uniprot' ? 'active' : ''}`}
            onClick={() => setActiveTab('uniprot')}
          >
            UniProt Search
          </button>
        </div>

        <div className="cluster-tab-content">
          {activeTab === 'file' && (
            <ClusterFileUploader onClusterLoaded={handleFileUpload} />
          )}
          {activeTab === 'uniprot' && (
            <ClusterUniProtSearch onClusterLoaded={handleUniProtSearch} />
          )}
        </div>
      </div>

      {representativeSequence && clusterSequences.length > 0 && (
        <div className="cluster-summary">
          <h3>Cluster Summary</h3>
          <div className="cluster-info">
            <p><strong>Representative:</strong> {representativeName}</p>
            <p><strong>Sequence Length:</strong> {representativeSequence.length} aa</p>
            <p><strong>Cluster Members:</strong> {clusterSequences.length}</p>
            <p><strong>Parameters:</strong> α = {alpha}, δ = {delta}</p>
          </div>
          <button
            className="analyze-cluster-button"
            onClick={runClusterAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Cluster Analysis'}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <>
          <SafetyHeatmap
            representativeSequence={representativeSequence}
            representativeName={representativeName}
            alignmentResults={results}
          />
          
          {representativeUniProtId && (
            <div className="structure-toggle-section">
              <button
                className="toggle-structure-button"
                onClick={() => setShow3DStructure(!show3DStructure)}
              >
                {show3DStructure ? '🔽 Hide 3D Structure' : '▶️ Show 3D Structure'}
              </button>
              {!show3DStructure && (
                <p className="structure-toggle-hint">
                  View the 3D structure of {representativeName} with coverage statistics
                </p>
              )}
            </div>
          )}
          
          {show3DStructure && representativeUniProtId && (
            <ClusterStructureHeatmapViewer
              uniprotId={representativeUniProtId}
              sequence={representativeSequence}
              alignmentResults={results}
              representativeName={representativeName}
              width="100%"
              height={600}
            />
          )}
          
          <div className="cluster-results">
            <h3>Detailed Results by Alignment</h3>
            <p className="results-description">
              Safety window indexes in the representative sequence ({representativeName}) for each pairwise alignment.
              Click "View in Pairwise Alignment" to see the detailed graph for any alignment.
            </p>
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <h4>{result.memberName}</h4>
                    <span className="window-count">{result.safetyWindows.length} safety windows</span>
                  </div>
                  
                  <div className="safety-windows">
                    {result.safetyWindows.length > 0 ? (
                      <div className="window-list">
                        {result.safetyWindows.map((window, idx) => (
                          <span key={idx} className="window-badge">
                            [{window.start}, {window.end}]
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="no-windows">No safety windows found</p>
                    )}
                  </div>
                  
                  <div className="view-pairwise-section">
                    <button
                      className="view-pairwise-button"
                      onClick={() => {
                        // Load sequences into context
                        dispatch({
                          type: 'LOAD_SEQUENCES',
                          payload: {
                            sequenceA: representativeSequence,
                            sequenceB: result.memberSequence,
                            descriptorA: representativeName,
                            descriptorB: result.memberName
                          }
                        });
                        // Switch to pairwise mode if callback provided
                        if (onViewPairwiseAlignment) {
                          onViewPairwiseAlignment(
                            representativeSequence,
                            representativeName,
                            result.memberSequence,
                            result.memberName
                          );
                        }
                      }}
                    >
                      View in Pairwise Alignment →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

export default ClusterModePanel;
