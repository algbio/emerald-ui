import React, { useState } from 'react';
import type { Alignment, Edge } from '../../types/PointGrid';
import { emeraldService } from '../../utils/api/EmeraldService';

interface FileUploaderProps {
  onAlignmentsGenerated: (data: {
    representative: string;
    member: string;
    alignments: Alignment[];
  }) => void;
  showConsoleOutput?: boolean;
}

export const FileUploader = ({ 
  onAlignmentsGenerated,
}: FileUploaderProps) => {
  const [loading, setLoading] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [alpha, setAlpha] = useState<string>("0.75");
  const [delta, setDelta] = useState<string>("8");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paramsChanged, setParamsChanged] = useState(false);
  const [sequences, setSequences] = useState<{
    reference: { seq: string, desc: string },
    member: { seq: string, desc: string }
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOutputUrl(null);
      setSequences(null);
      setParamsChanged(false);
    }
  };

  const parseFastaFile = async (file: File): Promise<{ 
    reference: { seq: string, desc: string }, 
    member: { seq: string, desc: string } 
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const sequences = content.split('>').filter(Boolean);
          
          if (sequences.length < 2) {
            reject(new Error("FASTA file must contain at least two sequences"));
            return;
          }
          
          // Parse first sequence (reference)
          const refLines = sequences[0].trim().split('\n');
          const refDesc = refLines[0].trim();
          const refSeq = refLines.slice(1).join('').replace(/\s/g, '');
          
          // Parse second sequence (member)
          const memLines = sequences[1].trim().split('\n');
          const memDesc = memLines[0].trim();
          const memSeq = memLines.slice(1).join('').replace(/\s/g, '');
          
          resolve({
            reference: { seq: refSeq, desc: refDesc },
            member: { seq: memSeq, desc: memDesc }
          });
        } catch (err) {
          reject(new Error(`Failed to parse FASTA file: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // Convert from EmeraldService format to PointGridPlot format
  const processAlignmentResult = (result: any): {
    representative: string;
    member: string;
    alignments: Alignment[];
  } => {
    const alignments: Alignment[] = [];

    // Process alignment_graph data
    if (result.alignment_graph && Array.isArray(result.alignment_graph)) {
      for (const node of result.alignment_graph) {
        if (node && Array.isArray(node.edges)) {
          const edges: Edge[] = [];
          
          for (const edge of node.edges) {
            edges.push({
              from: [node.from[0], node.from[1]],
              to: [edge[0], edge[1]],
              probability: edge[2]
            });
          }
          
          alignments.push({
            color: "black",
            edges: edges,
          });
        }
      }
    }
    
    // Process window data
    if (result.windows_representative && Array.isArray(result.windows_representative)) {
      for (let i = 0; i < result.windows_representative.length; i++) {
        const windowRep = result.windows_representative[i];
        const windowMem = result.windows_member ? result.windows_member[i] : null;
        
        if (windowRep && windowMem) {
          alignments.push({
            color: "green",
            edges: [],
            startDot: { x: windowRep[0], y: windowMem[0] },
            endDot: { x: windowRep[1], y: windowMem[1] }
          });
        }
      }
    }

    return {
      representative: result.representative_string,
      member: result.member_string,
      alignments
    };
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);

    try {
      // Parse the FASTA file if needed
      let seqs = sequences;
      if (!seqs) {
        seqs = await parseFastaFile(selectedFile);
        setSequences(seqs);
      }
      
      // console.log(`Running alignment with alpha=${alpha}, delta=${delta}`);
      
      // Use the EmeraldService to generate the alignment
      const result = await emeraldService.generateAlignment(
        seqs.reference.seq,
        seqs.reference.desc,
        seqs.member.seq,
        seqs.member.desc,
        parseFloat(alpha),
        parseInt(delta),
        -1,  // default gapCost
        -11  // default startGap
      );
      
      // console.log("Alignment generated successfully");
      
      // Process the result to match the expected format for visualization
      const processedData = processAlignmentResult(result);
      
      // Pass the processed data to the parent component
      onAlignmentsGenerated(processedData);
      
      // Create a download link for the JSON result
      const jsonString = JSON.stringify(result, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      setOutputUrl(URL.createObjectURL(blob));
      setParamsChanged(false);
      
    } catch (err) {
      console.error('Error processing file:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Check if this is a memory-related error
      if (errorMessage.includes('Memory limit exceeded') || 
          errorMessage.includes('Cannot enlarge memory') ||
          errorMessage.includes('out of memory') ||
          errorMessage.includes('OutOfMemory') ||
          errorMessage.includes('stack overflow') ||
          errorMessage.includes('Maximum call stack') ||
          errorMessage.includes('Aborted') ||
          errorMessage.includes('RuntimeError') ||
          errorMessage.includes('memory access out of bounds') ||
          errorMessage.includes('unreachable executed')) {
        alert('Memory Limit Exceeded\n\nYour browser has run out of memory processing these sequences. Please refresh the page and try again with shorter sequences.');
      } else {
        alert('Error processing file: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Validate input to ensure it's a valid number
  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user convenience while typing
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 1)) {
      setAlpha(value);
      if (outputUrl !== null) setParamsChanged(true);
    }
  };

  // Validate input to ensure it's a positive integer
  const handleDeltaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user convenience while typing
    if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) > 0)) {
      setDelta(value);
      if (outputUrl !== null) setParamsChanged(true);
    }
  };

  return (
    <div className="card">
      <div className="upload-container">
        <div className="file-input-container">
          <label htmlFor="file-upload" className="file-label">
            {selectedFile ? selectedFile.name : 'Choose FASTA file'}
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".fasta,.fa,.txt"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
        
        <div className="parameters">
          <div className="param-group">
            <label htmlFor="alpha">Alpha:</label>
            <input
              id="alpha"
              type="number"
              value={alpha}
              onChange={handleAlphaChange}
              min="0"
              max="1"
              step="0.01"
              className="param-input"
            />
          </div>
          
          <div className="param-group">
            <label htmlFor="delta">Delta:</label>
            <input
              id="delta"
              type="number"
              value={delta}
              onChange={handleDeltaChange}
              min="1"
              className="param-input"
            />
          </div>
        </div>
        
        <button 
          className="run-button" 
          onClick={handleRunAnalysis} 
          disabled={loading || !selectedFile}
        >
          {loading ? 'Processing...' : paramsChanged ? 'Update Results' : 'Run Analysis'}
        </button>
        
        {outputUrl && (
          <a 
            href={outputUrl}
            download="alignment_results.json"
            className="download-button"
          >
            Download Results
          </a>
        )}
      </div>
    </div>
  );
}