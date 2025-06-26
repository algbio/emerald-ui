import React from 'react';
import { useSequence } from '../context/SequenceContext';
import { StructureViewer } from './StructureViewer';
import './AlignmentStructuresViewer.css';

export const AlignmentStructuresViewer: React.FC = () => {
  const { state } = useSequence();
  const { sequences, alignments, structureA, structureB } = state;

  // Only show structures if we have alignments and at least one sequence has a UniProt ID
  const hasAlignments = alignments.length > 0;
  const hasStructureA = structureA?.uniprotId;
  const hasStructureB = structureB?.uniprotId;
  const shouldShowStructures = hasAlignments && (hasStructureA || hasStructureB);

  if (!shouldShowStructures) {
    return null;
  }

  return (
    <div className="alignment-structures-viewer">
      <h2 className="structures-title">Aligned Sequence Structures</h2>
      <p className="structures-subtitle">
        3D structures for aligned sequences with interactive sequence mapping
      </p>
      
      <div className="structures-container">
        {/* Sequence A Structure */}
        {hasStructureA && (
          <div className="structure-panel">
            <div className="structure-header">
              <h3>Sequence A: {sequences.descriptorA || 'Reference Sequence'}</h3>
              <div className="structure-info">
                <span className="uniprot-id">UniProt: {structureA.uniprotId}</span>
                {structureA.pdbId && (
                  <span className="pdb-id">PDB: {structureA.pdbId}</span>
                )}
              </div>
            </div>
            <StructureViewer
              key={`structure-a-${structureA.uniprotId}`}
              uniprotId={structureA.uniprotId || undefined}
              pdbId={structureA.pdbId || undefined}
              sequence={sequences.sequenceA}
              width="100%"
              height={500}
              showLoading={true}
              showSequence={true}
              onStructureLoaded={() => console.log(`Structure A loaded for ${structureA.uniprotId}`)}
              onError={(error) => console.error(`Structure A error:`, error)}
              onPdbStructuresFound={(pdbIds) => console.log(`Found PDB structures for sequence A:`, pdbIds)}
            />
          </div>
        )}

        {/* Sequence B Structure */}
        {hasStructureB && (
          <div className="structure-panel">
            <div className="structure-header">
              <h3>Sequence B: {sequences.descriptorB || 'Member Sequence'}</h3>
              <div className="structure-info">
                <span className="uniprot-id">UniProt: {structureB.uniprotId}</span>
                {structureB.pdbId && (
                  <span className="pdb-id">PDB: {structureB.pdbId}</span>
                )}
              </div>
            </div>
            <StructureViewer
              key={`structure-b-${structureB.uniprotId}`}
              uniprotId={structureB.uniprotId || undefined}
              pdbId={structureB.pdbId || undefined}
              sequence={sequences.sequenceB}
              width="100%"
              height={500}
              showLoading={true}
              showSequence={true}
              onStructureLoaded={() => console.log(`Structure B loaded for ${structureB.uniprotId}`)}
              onError={(error) => console.error(`Structure B error:`, error)}
              onPdbStructuresFound={(pdbIds) => console.log(`Found PDB structures for sequence B:`, pdbIds)}
            />
          </div>
        )}
      </div>

      {/* Show info about missing structures */}
      {hasAlignments && !hasStructureA && !hasStructureB && (
        <div className="no-structures-message">
          <p>No 3D structures available for the aligned sequences.</p>
          <p>To view structures, use descriptors that include UniProt IDs, such as:</p>
          <div className="examples">
            <code>sp|P02769|ALBU_HUMAN</code> or <code>P02769</code> (Human Serum Albumin)
            <br />
            <code>sp|P01308|INS_HUMAN</code> or <code>P01308</code> (Human Insulin)
          </div>
          <p>Structures are automatically loaded from PDB or AlphaFold databases.</p>
        </div>
      )}
    </div>
  );
};

export default AlignmentStructuresViewer;
