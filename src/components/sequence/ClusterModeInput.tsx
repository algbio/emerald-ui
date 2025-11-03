import React, { useState } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import { emeraldService } from '../../utils/api/EmeraldService';
import type { AlignmentResult } from '../../utils/api/EmeraldService';
import './ClusterModeInput.css';

interface ClusterSequence {
  id: string;
  description: string;
  sequence: string;
}

interface SafetyWindowInfo {
  memberDescription: string;
  memberLength: number;
  safetyWindowIndexes: Array<{ start: number; end: number }>;
}

export const ClusterModeInput: React.FC = () => {
  const [clusterSequences, setClusterSequences] = useState<ClusterSequence[]>([]);
  const [representativeIndex, setRepresentativeIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SafetyWindowInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const { state } = useSequence();
  const { params } = state;
  const { notifySuccess, notifyError, notifyInfo } = useFeedbackNotifications();
  
  const parseFasta = (content: string): ClusterSequence[] => {
    const sequences: ClusterSequence[] = [];
    const lines = content.split('\n');
    
    let currentSeq: ClusterSequence | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('>')) {
        // Save previous sequence if it exists
        if (currentSeq) {
          sequences.push(currentSeq);
        }
        
        // Start a new sequence
        const description = trimmedLine.substring(1);
        const id = description;
        
        currentSeq = {
          id,
          description,
          sequence: ''
        };
      } else if (trimmedLine && currentSeq) {
        // Add sequence content (ignoring empty lines)
        currentSeq.sequence += trimmedLine;
      }
    }
    
    // Add the last sequence if it exists
    if (currentSeq) {
      sequences.push(currentSeq);
    }
    
    return sequences;
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setResults([]);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const sequences = parseFasta(content);
        
        if (sequences.length < 2) {
          setError('FASTA file must contain at least 2 sequences (1 representative + at least 1 other sequence)');
          setClusterSequences([]);
          return;
        }
        
        setClusterSequences(sequences);
        setRepresentativeIndex(0);
        notifySuccess('Cluster Loaded', `Loaded ${sequences.length} sequences from cluster`);
      } catch (err) {
        setError(`Failed to parse FASTA file: ${err}`);
        setClusterSequences([]);
        notifyError('Parse Failed', 'Failed to parse FASTA file');
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
      notifyError('Read Failed', 'Failed to read file');
    };
    
    reader.readAsText(file);
  };
  
  const handleRunClusterAnalysis = async () => {
    if (clusterSequences.length < 2) {
      notifyError('Invalid Cluster', 'Please load a cluster with at least 2 sequences');
      return;
    }
    
    setIsAnalyzing(true);
    setResults([]);
    setError(null);
    
    const representative = clusterSequences[representativeIndex];
    const members = clusterSequences.filter((_, idx) => idx !== representativeIndex);
    
    notifyInfo('Cluster Analysis Started', `Analyzing ${members.length} alignments...`);
    
    try {
      const alignmentResults: SafetyWindowInfo[] = [];
      
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        
        notifyInfo(
          `Processing ${i + 1}/${members.length}`, 
          `Aligning ${member.description}`
        );
        
        // Run alignment between representative and this member
        const alignmentResult: AlignmentResult = await emeraldService.generateAlignment(
          representative.sequence,
          representative.description,
          member.sequence,
          member.description,
          params.alpha,
          params.delta,
          params.gapCost ?? -1,
          params.startGap ?? -11,
          params.costMatrixType
        );
        
        // Extract safety window indexes in the representative sequence
        const safetyWindowIndexes = alignmentResult.safety_windows.map(sw => ({
          start: sw.start_ref,
          end: sw.end_ref
        }));
        
        alignmentResults.push({
          memberDescription: member.description,
          memberLength: member.sequence.length,
          safetyWindowIndexes
        });
      }
      
      setResults(alignmentResults);
      notifySuccess(
        'Cluster Analysis Complete', 
        `Processed ${alignmentResults.length} alignments`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Analysis failed: ${errorMsg}`);
      notifyError('Analysis Failed', errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="cluster-mode-input">
      <h2>Cluster Mode Analysis</h2>
      <p className="cluster-mode-description">
        Upload a FASTA file containing multiple protein sequences. Select one as the representative, 
        and the tool will run EMERALD between the representative and every other protein in the cluster.
      </p>
      
      <div className="example-section">
        <h4>Example:</h4>
        <p>Try the insulin protein cluster from the UniProt Search tab. Search for and load:</p>
        <div className="example-accessions">
          <strong>Representative:</strong> P01308 (Human Insulin)<br />
          <strong>Cluster Members:</strong> P01308, P01317 (Bovine Insulin), P67974 (Mouse Insulin)
        </div>
        <p className="example-note">
          Download these sequences as a FASTA file from the UniProt Search results, then upload here.
        </p>
      </div>
      
      <div className="cluster-upload-section">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".fasta,.fa,.txt"
          id="cluster-file-input"
          disabled={isLoading || isAnalyzing}
        />
        <label htmlFor="cluster-file-input" className="file-input-label">
          {clusterSequences.length > 0 
            ? `${clusterSequences.length} sequences loaded` 
            : 'Choose FASTA file with cluster sequences'
          }
        </label>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {clusterSequences.length > 0 && (
        <div className="cluster-config-section">
          <h3>Select Representative Protein</h3>
          <select 
            value={representativeIndex} 
            onChange={(e) => setRepresentativeIndex(parseInt(e.target.value))}
            disabled={isAnalyzing}
            className="representative-select"
          >
            {clusterSequences.map((seq, idx) => (
              <option key={idx} value={idx}>
                {seq.description} ({seq.sequence.length} aa)
              </option>
            ))}
          </select>
          
          <div className="cluster-info">
            <p><strong>Representative:</strong> {clusterSequences[representativeIndex].description}</p>
            <p><strong>Members to align:</strong> {clusterSequences.length - 1}</p>
          </div>
          
          <button 
            onClick={handleRunClusterAnalysis}
            disabled={isAnalyzing}
            className="run-cluster-button"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Cluster Analysis'}
          </button>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="cluster-results-section">
          <h3>Safety Window Results</h3>
          <p className="results-description">
            Safety window indexes in the representative sequence ({clusterSequences[representativeIndex].description})
          </p>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Member Protein</th>
                  <th>Length</th>
                  <th>Safety Windows Count</th>
                  <th>Safety Window Indexes (Start-End)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx}>
                    <td className="member-description">{result.memberDescription}</td>
                    <td>{result.memberLength}</td>
                    <td>{result.safetyWindowIndexes.length}</td>
                    <td className="safety-windows-cell">
                      {result.safetyWindowIndexes.length > 0 ? (
                        result.safetyWindowIndexes.map((sw, swIdx) => (
                          <span key={swIdx} className="safety-window-range">
                            [{sw.start}-{sw.end}]
                          </span>
                        ))
                      ) : (
                        <span className="no-windows">No safety windows found</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="export-section">
            <button 
              onClick={() => {
                const csvContent = generateCSV();
                downloadCSV(csvContent, 'cluster_analysis_results.csv');
              }}
              className="export-button"
            >
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  function generateCSV(): string {
    const headers = ['Member Protein', 'Length', 'Safety Windows Count', 'Safety Window Indexes'];
    const rows = results.map(result => [
      result.memberDescription,
      result.memberLength.toString(),
      result.safetyWindowIndexes.length.toString(),
      result.safetyWindowIndexes.map(sw => `[${sw.start}-${sw.end}]`).join('; ')
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
  
  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
