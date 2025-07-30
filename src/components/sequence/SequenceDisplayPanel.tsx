import React from 'react';
import { useSequence } from '../../context/SequenceContext';

const SequenceDisplayPanel: React.FC = () => {
  const { state } = useSequence();
  
  // Check if we have any uploaded sequences or search results to display
  const hasFastaSequences = state.uploadedFiles && state.uploadedFiles.length > 0;
  const hasSearchResults = state.searchResults && state.searchResults.length > 0;
  
  if (!hasFastaSequences && !hasSearchResults) {
    return null;
  }

  return (
    <div className="sequence-display-panel">
      <h3>Available Sequences</h3>
      <p className="display-description">
        Select sequences from the lists below to use as Sequence A and Sequence B for alignment.
      </p>
      
      {hasFastaSequences && (
        <div className="fasta-sequences-section">
          <h4>From Uploaded FASTA Files</h4>
          {/* FASTA sequences will be rendered here */}
        </div>
      )}
      
      {hasSearchResults && (
        <div className="search-results-section">
          <h4>From UniProt Search</h4>
          {/* Search results will be rendered here */}
        </div>
      )}
    </div>
  );
};

export default SequenceDisplayPanel;
