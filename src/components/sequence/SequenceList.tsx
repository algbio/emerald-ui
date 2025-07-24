import React, { useState, useEffect } from 'react';
import { StructureViewer } from '../structure/StructureViewer';
import { getEffectiveUniProtId } from '../../utils/api/uniprotUtils';
import './SequenceList.css';

export interface SequenceListItem {
  id: string;
  description: string;
  sequence: string;
  accession?: string;
  proteinName?: string;
  organismName?: string;
  pdbIds?: string[]; // Add this property
}

interface SequenceListProps {
  sequences: SequenceListItem[];
  onSelectA?: (seq: SequenceListItem) => void;
  onSelectB?: (seq: SequenceListItem) => void;
  onLoadBoth?: (seqA: SequenceListItem, seqB: SequenceListItem) => void;
  showDescription?: boolean; // Add this prop to control descriptor column visibility
  useIdAsProteinName?: boolean; // Add this prop to use id field for protein name (for search results)
}

export const SequenceList: React.FC<SequenceListProps> = ({
  sequences,
  onSelectA,
  onSelectB,
  onLoadBoth,
  showDescription = false, // Default to false to not show descriptor for search results
  useIdAsProteinName = false, // Default to false to use proteinName field
}) => {
  const [selectedSequence, setSelectedSequence] = useState<SequenceListItem | null>(null);
  const [viewerKey, setViewerKey] = useState<number>(0);
  const [previewSequenceId, setPreviewSequenceId] = useState<string | null>(null);

  // Clean up modal state on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleViewStructure = (sequence: SequenceListItem) => {
    // Force a complete remount by incrementing the key
    setViewerKey(prev => prev + 1);
    setSelectedSequence(sequence);
  };

  const handleCloseStructureViewer = () => {
    setSelectedSequence(null);
  };

  const handleTogglePreview = (sequenceId: string) => {
    setPreviewSequenceId(prev => prev === sequenceId ? null : sequenceId);
  };

  const copySequenceToClipboard = (sequence: string) => {
    navigator.clipboard.writeText(sequence).then(() => {
      // You could add a toast notification here
      console.log('Sequence copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy sequence:', err);
    });
  };

  if (!sequences.length) return null;

  // Check if any sequence has UniProt-specific fields
  const showAccession = sequences.some(seq => !!getEffectiveUniProtId(seq));
  const showProteinName = sequences.some(seq => !!seq.proteinName);
  const showOrganismName = sequences.some(seq => !!seq.organismName);
  const shouldShowDescription = showDescription && sequences.some(seq => !!seq.description);

  return (
    <div className="parsed-sequences">
      <div className="sequence-table-container">
        <table className="sequence-table">
          <thead>
            <tr>
              {showAccession && <th>Accession</th>}
              {showProteinName && <th>Protein Name</th>}
              {showOrganismName && <th>Organism</th>}
              {shouldShowDescription && <th>Description</th>}
              <th>Length</th>
              <th>Load</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((seq) => {
              const effectiveUniprotId = getEffectiveUniProtId(seq);
              const isPreviewOpen = previewSequenceId === seq.id;
              
              return (
                <React.Fragment key={seq.id}>
                  <tr>
                    {showAccession && <td>{effectiveUniprotId || '-'}</td>}
                    {showProteinName && <td>{useIdAsProteinName ? 
                      seq.id.split(' | ').map((part, index) => (
                        <div key={index}>{part}</div>
                      )) : 
                      seq.proteinName || '-'
                    }</td>}
                    {showOrganismName && <td>{seq.organismName || '-'}</td>}
                    {shouldShowDescription && <td title={seq.description}>{seq.description || '-'}</td>}
                    <td>{seq.sequence.length}</td>
                    <td>
                      <div className="load-buttons">
                        {onSelectA && (
                          <button
                            onClick={() => onSelectA(seq)}
                            className="btn-outline-success"
                            title="Load sequence A"
                          >
                            Load A
                          </button>
                        )}
                        {onSelectB && (
                          <button
                            onClick={() => onSelectB(seq)}
                            className="btn-outline-success"
                            title="Load sequence B"
                          >
                            Load B
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleTogglePreview(seq.id)}
                          className="btn-ghost"
                          title={isPreviewOpen ? "Hide sequence preview" : "Show sequence preview"}
                        >
                          {isPreviewOpen ? 'Hide' : 'Preview'}
                        </button>
                        {effectiveUniprotId && (
                          <button
                            onClick={() => {
                              window.open(`https://www.uniprot.org/uniprotkb/${effectiveUniprotId}`, '_blank');
                            }}
                            className="btn-ghost"
                            title={`Open UniProt page for ${effectiveUniprotId}`}
                          >
                            UniProt
                          </button>
                        )}
                        <button
                          onClick={() => handleViewStructure(seq)}
                          disabled={!effectiveUniprotId && (!seq.pdbIds || seq.pdbIds.length === 0)}
                          className="btn-ghost"
                          title={effectiveUniprotId ? `View 3D structure and sequence (PDB/AlphaFold) for ${effectiveUniprotId}` : 
                                 (seq.pdbIds && seq.pdbIds.length > 0) ? `View PDB structure and sequence: ${seq.pdbIds[0]}` : 
                                 'No structure available'}
                        >
                          3D Structure
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isPreviewOpen && (
                    <tr className="sequence-preview-row">
                      <td colSpan={3 + (showAccession ? 1 : 0) + (showProteinName ? 1 : 0) + (showOrganismName ? 1 : 0) + (shouldShowDescription ? 1 : 0)} className="sequence-preview-cell">
                        <div className="sequence-preview-container">
                          <div className="sequence-preview-header">
                            <div className="sequence-preview-info">
                              <strong>Sequence for {seq.id}</strong>
                              {seq.proteinName && <span> - {seq.proteinName}</span>}
                              <span className="sequence-length"> ({seq.sequence.length} amino acids)</span>
                            </div>
                            <button
                              onClick={() => copySequenceToClipboard(seq.sequence)}
                              className="copy-sequence-button"
                              title="Copy sequence to clipboard"
                            >
                              📋 Copy
                            </button>
                          </div>
                          <div className="sequence-preview-text">
                            <div className="sequence-scroll-container">
                              {seq.sequence}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {onLoadBoth && sequences.length >= 2 && (
        <button
          className="load-both-button"
          onClick={() => onLoadBoth(sequences[0], sequences[1])}
        >
          Load First Two Sequences
        </button>
      )}
      
      {selectedSequence && (
        <div className="structure-viewer-container">
          <div className="structure-viewer-header">
            <h3 className="structure-viewer-title">
              3D Structure & Sequence: {selectedSequence.id}
              {selectedSequence.proteinName && (
                <span className="structure-viewer-subtitle">
                  {' - '}{selectedSequence.proteinName}
                </span>
              )}
            </h3>
            <button
              onClick={handleCloseStructureViewer}
              className="structure-viewer-close-button"
            >
              Close
            </button>
          </div>
          <StructureViewer
            key={viewerKey} // Use incrementing key to force complete remount
            uniprotId={getEffectiveUniProtId(selectedSequence) || undefined}
            pdbId={selectedSequence.pdbIds?.[0]}
            sequence={selectedSequence.sequence}
            width="100%"
            height={500}
            showLoading={true}
            showSequence={true}
            onStructureLoaded={() => console.log(`Structure loaded for ${selectedSequence.id}`)}
            onError={(error) => console.error(`Structure error for ${selectedSequence.id}:`, error)}
            onPdbStructuresFound={(pdbIds) => console.log(`Found PDB structures for ${selectedSequence.id}:`, pdbIds)}
          />
        </div>
      )}
    </div>
  );
};