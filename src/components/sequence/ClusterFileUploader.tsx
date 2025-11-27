import React, { useState } from 'react';
import './ClusterFileUploader.css';

interface ClusterFileUploaderProps {
  onClusterLoaded: (data: {
    representative: { name: string; sequence: string };
    members: Array<{ name: string; sequence: string }>;
  }) => void;
}

const ClusterFileUploader: React.FC<ClusterFileUploaderProps> = ({ onClusterLoaded }) => {
  const [error, setError] = useState<string>('');
  const [representativeIndex, setRepresentativeIndex] = useState<number>(0);
  const [parsedSequences, setParsedSequences] = useState<Array<{ name: string; sequence: string }>>([]);

  const parseFasta = (content: string): Array<{ name: string; sequence: string }> => {
    const sequences: Array<{ name: string; sequence: string }> = [];
    const lines = content.split('\n');
    let currentName = '';
    let currentSequence = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('>')) {
        if (currentName && currentSequence) {
          sequences.push({
            name: currentName,
            sequence: currentSequence.replace(/\s/g, '').toUpperCase()
          });
        }
        currentName = trimmedLine.substring(1).trim();
        currentSequence = '';
      } else if (trimmedLine) {
        currentSequence += trimmedLine;
      }
    }

    if (currentName && currentSequence) {
      sequences.push({
        name: currentName,
        sequence: currentSequence.replace(/\s/g, '').toUpperCase()
      });
    }

    return sequences;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const sequences = parseFasta(content);
        
        if (sequences.length < 2) {
          setError('FASTA file must contain at least 2 sequences (1 representative + at least 1 cluster member)');
          return;
        }

        setParsedSequences(sequences);
        setRepresentativeIndex(0); // Default to first sequence as representative
      } catch (err) {
        setError('Error parsing FASTA file. Please ensure it is properly formatted.');
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
    };

    reader.readAsText(file);
  };

  const handleLoadCluster = () => {
    if (parsedSequences.length === 0) {
      setError('Please upload a FASTA file first');
      return;
    }

    const representative = parsedSequences[representativeIndex];
    const members = parsedSequences.filter((_, index) => index !== representativeIndex);

    onClusterLoaded({ representative, members });
  };

  return (
    <div className="cluster-file-uploader">
      <div className="upload-section">
        <label htmlFor="cluster-file-input" className="file-upload-label">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <strong>Choose FASTA File</strong>
            <span>File should contain multiple protein sequences</span>
          </div>
        </label>
        <input
          id="cluster-file-input"
          type="file"
          accept=".fasta,.fa,.faa,.txt"
          onChange={handleFileUpload}
          className="file-input"
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {parsedSequences.length > 0 && (
        <div className="sequences-preview">
          <h4>Loaded Sequences: {parsedSequences.length}</h4>
          
          <div className="representative-selector">
            <label htmlFor="rep-select">
              <strong>Select Representative Protein:</strong>
            </label>
            <select
              id="rep-select"
              value={representativeIndex}
              onChange={(e) => setRepresentativeIndex(Number(e.target.value))}
              className="rep-dropdown"
            >
              {parsedSequences.map((seq, index) => (
                <option key={index} value={index}>
                  {seq.name} ({seq.sequence.length} aa)
                </option>
              ))}
            </select>
          </div>

          <div className="sequences-list">
            <div className="sequence-item representative">
              <span className="sequence-label">Representative:</span>
              <span className="cluster-sequence-name">{parsedSequences[representativeIndex].name}</span>
              <span className="sequence-length">{parsedSequences[representativeIndex].sequence.length} aa</span>
            </div>
            
            <div className="members-header">
              <span className="sequence-label">Cluster Members ({parsedSequences.length - 1}):</span>
            </div>
            
            {parsedSequences.map((seq, index) => {
              if (index === representativeIndex) return null;
              return (
                <div key={index} className="sequence-item member">
                  <span className="cluster-sequence-name">{seq.name}</span>
                  <span className="sequence-length">{seq.sequence.length} aa</span>
                </div>
              );
            })}
          </div>

          <button onClick={handleLoadCluster} className="load-cluster-button">
            Load Cluster
          </button>
        </div>
      )}
    </div>
  );
};

export default ClusterFileUploader;
