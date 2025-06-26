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
            <th>ID</th>
            {showProteinName && <th>Protein Name</th>}
            {showOrganismName && <th>Organism</th>}
            <th>Length</th>
            <th>Preview</th>
            {(onSelectA || onSelectB) && <th>Actions</th>}
            <th>3D Structure</th>
          </tr>
        </thead>
        <tbody>
          {sequences.map((seq, index) => {
            const effectiveUniprotId = getEffectiveUniProtId(seq);
            return (
            <tr key={index}>
              {showAccession && <td>{effectiveUniprotId || '-'}</td>}
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
              <td>
                <button
                  onClick={() => handleViewStructure(seq)}
                  disabled={!effectiveUniprotId && (!seq.pdbIds || seq.pdbIds.length === 0)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    background: 'white',
                    color: '#007bff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title={effectiveUniprotId ? `View 3D structure and sequence (PDB/AlphaFold) for ${effectiveUniprotId}` : 
                         (seq.pdbIds && seq.pdbIds.length > 0) ? `View PDB structure and sequence: ${seq.pdbIds[0]}` : 
                         'No structure available'}
                >
                  {effectiveUniprotId ? '🧬 View Structure' : 
                   (seq.pdbIds && seq.pdbIds.length > 0) ? '🧬 View PDB' : 
                   '🚫'}
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
          style={{ marginTop: 12 }}
        >
          Load First Two Sequences
        </button>
      )}
      
      {selectedSequence && (
        <div className="structure-viewer-container" style={{ marginTop: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: 0 }}>
              3D Structure & Sequence: {selectedSequence.id}
              {selectedSequence.proteinName && (
                <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}>
                  {' - '}{selectedSequence.proteinName}
                </span>
              )}
            </h3>
            <button
              onClick={handleCloseStructureViewer}
              style={{
                padding: '6px 12px',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                background: 'white',
                color: '#6c757d',
                cursor: 'pointer',
                fontSize: '14px'
              }}
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