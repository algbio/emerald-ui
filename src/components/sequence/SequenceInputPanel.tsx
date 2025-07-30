import React from 'react';
import { FastaFileUploader } from './FastaFileUploader';
import UniProtSearch from './UniProtSearch';

const SequenceInputPanel: React.FC = () => (
  <div className="sequence-input-panel">
    <div className="input-methods-container">
      <div className="input-method">
        <h4>Method 1: Upload FASTA File</h4>
        <p className="method-description">
          Upload a FASTA file containing two protein sequences. The file should contain exactly two sequences 
          in standard FASTA format with descriptive headers. Available sequences will appear below after upload.
        </p>
        <FastaFileUploader />
      </div>
      
      <div className="input-method">
        <h4>Method 2: Search UniProt Database</h4>
        <p className="method-description">
          Search the UniProt protein database using protein names, gene names, or UniProt accession numbers. 
          This provides access to high-quality, annotated protein sequences. Search results will appear below.
        </p>
        <UniProtSearch />
      </div>
    </div>
  </div>
);

export default SequenceInputPanel;