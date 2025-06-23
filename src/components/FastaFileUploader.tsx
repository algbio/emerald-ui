import React, { useState } from 'react';
import { useSequence } from '../context/SequenceContext';
import { SequenceList } from './SequenceList';

interface FastaSequence {
  id: string;
  description: string;
  sequence: string;
}

export const FastaFileUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedSequences, setParsedSequences] = useState<FastaSequence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { dispatch } = useSequence();
  
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
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setIsLoading(true);
          const content = event.target?.result as string;
          const sequences = parseFasta(content);
          
          if (sequences.length === 0) {
            setError('No valid sequences found in the file.');
            return;
          }
          
          setParsedSequences(sequences);
        } catch (err) {
          setError('Failed to parse file. Please check the format.');
          console.error('Error parsing FASTA file:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read file.');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
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
  
  return (
    <div className="fasta-uploader">
      <h2>Upload FASTA File</h2>
      <div className="uploader-input">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".fasta,.fa,.txt"
          id="fasta-file-input"
        />
        <label htmlFor="fasta-file-input" className="file-input-label">
          {selectedFile ? selectedFile.name : 'Choose FASTA file...'}
        </label>
      </div>
      {isLoading && <p>Loading file...</p>}
      {error && <div className="error-message">{error}</div>}
      <SequenceList
        sequences={parsedSequences}
        onSelectA={seq => loadSequence(seq, true)}
        onSelectB={seq => loadSequence(seq, false)}
        onLoadBoth={loadBothSequences}
      />
    </div>
  );
};