import React, { useState } from 'react';
import { StructureViewer } from './StructureViewer';
import { getEffectiveUniProtId } from '../utils/uniprotUtils';
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
}

export const SequenceList: React.FC<SequenceListProps> = ({
  sequences,
  onSelectA,
  onSelectB,
  onLoadBoth,
}) => {
  const [selectedSequence, setSelectedSequence] = useState<SequenceListItem | null>(null);
  const [viewerKey, setViewerKey] = useState<number>(0);

  if (!sequences.length) return null;

  // Check if any sequence has UniProt-specific fields
  const showAccession = sequences.some(seq => !!getEffectiveUniProtId(seq));
  const showProteinName = sequences.some(seq => !!seq.proteinName);
  const showOrganismName = sequences.some(seq => !!seq.organismName);

  const handleViewStructure = (sequence: SequenceListItem) => {
    // Force a complete remount by incrementing the key
    setViewerKey(prev => prev + 1);
    setSelectedSequence(sequence);
  };

  const handleCloseStructureViewer = () => {
    setSelectedSequence(null);
  };

  return (
    <div className="parsed-sequences">
      <h3>Found {sequences.length} sequences:</h3>
      <table className="sequence-table">
        <thead>
          <tr>
            {showAccession && <th>Accession</th>}
            {showProteinName && <th>Protein Name</th>}
            {showOrganismName && <th>Organism</th>}
            <th>Length</th>
            <th>Preview</th>
            {(onSelectA || onSelectB) && <th>Actions</th>}
            <th>3D Structure</th>
            <th>UniProt Entry</th>
          </tr>
        </thead>
        <tbody>
          {sequences.map((seq, index) => {
            const effectiveUniprotId = getEffectiveUniProtId(seq);
            return (
            <tr key={index}>
              {showAccession && <td>{effectiveUniprotId || '-'}</td>}
              {showProteinName && <td>{seq.proteinName || '-'}</td>}
              {showOrganismName && <td>{seq.organismName || '-'}</td>}
              <td>{seq.sequence.length}</td>
              <td>
                <span title={seq.sequence}>
                  {seq.sequence.substring(0, 20)}
                  {seq.sequence.length > 20 ? '…' : ''}
                </span>
              </td>
              {(onSelectA || onSelectB) && (
                <td>
                  {onSelectA && (
                    <button
                      title="Use as Sequence A"
                      onClick={() => onSelectA(seq)}
                      className="action-button"
                    >
                      A
                    </button>
                  )}
                  {onSelectB && (
                    <button
                      title="Use as Sequence B"
                      onClick={() => onSelectB(seq)}
                      className="action-button"
                    >
                      B
                    </button>
                  )}
                </td>
              )}
              <td>
                <button
                  onClick={() => handleViewStructure(seq)}
                  disabled={!effectiveUniprotId && (!seq.pdbIds || seq.pdbIds.length === 0)}
                  className="structure-view-button"
                  title={effectiveUniprotId ? `View 3D structure and sequence (PDB/AlphaFold) for ${effectiveUniprotId}` : 
                         (seq.pdbIds && seq.pdbIds.length > 0) ? `View PDB structure and sequence: ${seq.pdbIds[0]}` : 
                         'No structure available'}
                >
                  {effectiveUniprotId ? '🧬 View Structure' : 
                   (seq.pdbIds && seq.pdbIds.length > 0) ? '🧬 View PDB' : 
                   '🚫'}
                </button>
              </td>
              <td>
                <button
                  onClick={() => {
                    if (effectiveUniprotId) {
                      window.open(`https://www.uniprot.org/uniprotkb/${effectiveUniprotId}`, '_blank');
                    }
                  }}
                  disabled={!effectiveUniprotId}
                  className={`uniprot-button ${effectiveUniprotId ? 'enabled' : 'disabled'}`}
                  title={effectiveUniprotId ? `Open UniProt page for ${effectiveUniprotId}` : 'No UniProt ID available'}
                >
                  🔗 UniProt
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
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