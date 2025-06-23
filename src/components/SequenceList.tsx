import React from 'react';
import './SequenceList.css'; // Assuming you have a CSS file for styles

export interface SequenceListItem {
  id: string;
  description: string;
  sequence: string;
  accession?: string;
  proteinName?: string;
  organismName?: string;
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
  if (!sequences.length) return null;

  // Check if any sequence has UniProt-specific fields
  const showAccession = sequences.some(seq => !!seq.accession);
  const showProteinName = sequences.some(seq => !!seq.proteinName);
  const showOrganismName = sequences.some(seq => !!seq.organismName);

  return (
    <div className="parsed-sequences">
      <h3>Found {sequences.length} sequences:</h3>
      <table className="sequence-table">
        <thead>
          <tr>
            {showAccession && <th>Accession</th>}
            <th>ID</th>
            {showProteinName && <th>Protein Name</th>}
            {showOrganismName && <th>Organism</th>}
            <th>Length</th>
            <th>Preview</th>
            {(onSelectA || onSelectB) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sequences.map((seq, index) => (
            <tr key={index}>
              {showAccession && <td>{seq.accession || '-'}</td>}
              <td title={seq.description}>{seq.id}</td>
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
                      style={{ marginRight: 4 }}
                    >
                      A
                    </button>
                  )}
                  {onSelectB && (
                    <button
                      title="Use as Sequence B"
                      onClick={() => onSelectB(seq)}
                    >
                      B
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {onLoadBoth && sequences.length >= 2 && (
        <button
          className="load-both-button"
          onClick={() => onLoadBoth(sequences[0], sequences[1])}
          style={{ marginTop: 12 }}
        >
          Load First Two Sequences
        </button>
      )}
    </div>
  );
};