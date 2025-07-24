import React, { useState } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { SequenceList } from './SequenceList';

interface FastaSequence {
  id: string;
  description: string;
  sequence: string;
}

interface FastaFileData {
  file: File;
  sequences: FastaSequence[];
}

export const FastaFileUploader: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FastaFileData[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { dispatch } = useSequence();
  
  // Get current file data
  const currentFile = uploadedFiles[currentFileIndex];
  const currentSequences = currentFile?.sequences || [];
  
  const parseFasta = (content: string): FastaSequence[] => {
    const sequences: FastaSequence[] = [];
    const lines = content.split('\n');
    
    let currentSeq: FastaSequence | null = null;
    
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
    const files = e.target.files;
    if (files && files.length > 0) {
      setError(null);
      
      // Check file limit
      const totalFiles = uploadedFiles.length + files.length;
      if (totalFiles > 5) {
        setError(`Cannot upload more than 5 files. You're trying to upload ${files.length} files but already have ${uploadedFiles.length} files.`);
        e.target.value = '';
        return;
      }
      
      setIsLoading(true);
      
      // Process all selected files
      const filePromises = Array.from(files).map(async (file) => {
        return new Promise<FastaFileData>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              const sequences = parseFasta(content);
              
              if (sequences.length === 0) {
                reject(new Error(`No valid sequences found in ${file.name}`));
                return;
              }
              
              resolve({ file, sequences });
            } catch (err) {
              reject(new Error(`Failed to parse ${file.name}: ${err}`));
            }
          };
          
          reader.onerror = () => {
            reject(new Error(`Failed to read ${file.name}`));
          };
          
          reader.readAsText(file);
        });
      });
      
      // Wait for all files to be processed
      Promise.all(filePromises)
        .then((newFiles) => {
          setUploadedFiles(prev => [...prev, ...newFiles]);
          // Set current file to the first newly uploaded file
          setCurrentFileIndex(prev => prev === 0 && uploadedFiles.length === 0 ? 0 : uploadedFiles.length);
        })
        .catch((err) => {
          setError(err.message);
          console.error('Error processing files:', err);
        })
        .finally(() => {
          setIsLoading(false);
          // Reset file input
          e.target.value = '';
        });
    }
  };
  
  const loadSequence = (seq: FastaSequence, isSequenceA: boolean) => {
    if (isSequenceA) {
      dispatch({ type: 'UPDATE_SEQUENCE_A', payload: seq.sequence });
      dispatch({ type: 'UPDATE_DESCRIPTOR_A', payload: seq.description });
    } else {
      dispatch({ type: 'UPDATE_SEQUENCE_B', payload: seq.sequence });
      dispatch({ type: 'UPDATE_DESCRIPTOR_B', payload: seq.description });
    }
  };
  
  const loadBothSequences = (seqA: FastaSequence, seqB: FastaSequence) => {
    dispatch({ 
      type: 'LOAD_SEQUENCES', 
      payload: {
        sequenceA: seqA.sequence,
        descriptorA: seqA.description,
        sequenceB: seqB.sequence,
        descriptorB: seqB.description
      } 
    });
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
    setUploadedFiles(newFiles);
    
    // Adjust current file index if necessary
    if (indexToRemove === currentFileIndex) {
      // If we removed the current file, go to the previous one or stay at 0
      setCurrentFileIndex(Math.max(0, currentFileIndex - 1));
    } else if (indexToRemove < currentFileIndex) {
      // If we removed a file before the current one, decrement index
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };
  
  return (
    <div className="fasta-uploader">
      <h2>Upload FASTA Files</h2>
      
      {/* File upload section */}
      <div className="uploader-input">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".fasta,.fa,.txt"
          id="fasta-file-input"
          multiple
          disabled={uploadedFiles.length >= 5}
        />
        <label htmlFor="fasta-file-input" className="file-input-label">
          {uploadedFiles.length >= 5 
            ? 'Maximum 5 files reached'
            : uploadedFiles.length > 0 
              ? `${uploadedFiles.length}/max 5 files uploaded` 
              : 'Choose FASTA files (max 5)...'
          }
        </label>
      </div>
      
      {isLoading && <p>Loading files...</p>}
      {error && <div className="error-message">{error}</div>}
      
      {/* File navigation section */}
      {uploadedFiles.length > 0 && (
        <div className="file-navigation">
          <div className="file-navigation-header">
            <h3>
              File {currentFileIndex + 1}/max 5: {currentFile?.file.name}
            </h3>
            <div className="file-navigation-controls">
              <span className="file-indicator">
                {currentFileIndex + 1} / {uploadedFiles.length}
              </span>
              <button
                onClick={() => removeFile(currentFileIndex)}
                className="remove-button"
                title="Remove current file"
              >
                Remove File
              </button>
            </div>
          </div>
          
          {/* File list for quick navigation */}
          {uploadedFiles.length > 1 && (
            <div className="file-list">
              <h4>Quick Navigation:</h4>
              <div className="file-tabs">
                {uploadedFiles.map((fileData, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFileIndex(index)}
                    className={`file-tab ${index === currentFileIndex ? 'active' : ''}`}
                    title={`Switch to ${fileData.file.name}`}
                  >
                    {fileData.file.name} ({fileData.sequences.length} seq)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Sequence list for current file */}
      {currentSequences.length > 0 && (
        <SequenceList
          sequences={currentSequences}
          onSelectA={seq => loadSequence(seq, true)}
          onSelectB={seq => loadSequence(seq, false)}
          onLoadBoth={loadBothSequences}
          showDescription={true}
        />
      )}
    </div>
  );
};