import React from 'react';
import { useSequence } from '../context/SequenceContext';
import { StructureViewer } from './StructureViewer';
import { extractSafetyWindowsFromAlignments, mergeSafetyWindows } from '../utils/safetyWindowUtils';
import './AlignmentStructuresViewer.css';

export const AlignmentStructuresViewer: React.FC = () => {
  const { state } = useSequence();
  const { sequences, alignments, structureA, structureB } = state;

  // Only show structures if we have alignments and at least one sequence has a structure
  const hasAlignments = alignments.length > 0;
  const hasStructureA = structureA?.uniprotId || structureA?.fileContent;
  const hasStructureB = structureB?.uniprotId || structureB?.fileContent;
  const shouldShowStructures = hasAlignments && (hasStructureA || hasStructureB);

  // Extract safety windows from alignments
  console.log('Extracting safety windows from alignments:', alignments);
  const safetyWindowMapping = hasAlignments ? extractSafetyWindowsFromAlignments(alignments) : { sequenceA: [], sequenceB: [] };
  console.log('Safety windows mapping:', safetyWindowMapping);
  const safetyWindowsA = mergeSafetyWindows(safetyWindowMapping.sequenceA);
  const safetyWindowsB = mergeSafetyWindows(safetyWindowMapping.sequenceB);

  // Debug logging
  console.log('AlignmentStructuresViewer debug:', {
    hasAlignments,
    alignmentsCount: alignments.length,
    hasStructureA,
    structureAUniprotId: structureA?.uniprotId,
    hasStructureB,
    structureBUniprotId: structureB?.uniprotId,
    shouldShowStructures,
    sequenceA: sequences.sequenceA ? `${sequences.sequenceA.length} chars` : 'empty',
    sequenceB: sequences.sequenceB ? `${sequences.sequenceB.length} chars` : 'empty',
    descriptorA: sequences.descriptorA,
    descriptorB: sequences.descriptorB,
    safetyWindowsA: safetyWindowsA.length,
    safetyWindowsB: safetyWindowsB.length
  });


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
                {structureA.uniprotId && (
                  <span className="uniprot-id">UniProt: {structureA.uniprotId}</span>
                )}
                {structureA.pdbId && (
                  <span className="pdb-id">PDB: {structureA.pdbId}</span>
                )}
                {structureA.chainId && (
                  <span className="chain-id">Chain: {structureA.chainId}</span>
                )}
                {structureA.fileContent && (
                  <span className="file-type">Uploaded {structureA.fileType?.toUpperCase()} file</span>
                )}
                {safetyWindowsA.length > 0 && (
                  <span className="safety-windows-info" style={{ color: '#28a745', fontSize: '12px' }}>
                    🔒 {safetyWindowsA.length} safety window{safetyWindowsA.length > 1 ? 's' : ''} highlighted
                  </span>
                )}
              </div>
            </div>
            <StructureViewer
              key={`structure-a-${structureA.uniprotId || structureA.pdbId || 'uploaded'}`}
              uniprotId={structureA.uniprotId || undefined}
              pdbId={structureA.pdbId || undefined}
              pdbContent={structureA.fileContent || undefined}
              sequence={sequences.sequenceA}
              width="100%"
              height={500}
              showLoading={true}
              showSequence={true}
              safetyWindows={safetyWindowsA}
              enableSafetyWindowHighlighting={safetyWindowsA.length > 0}
              onStructureLoaded={() => console.log(`Structure A loaded`)}
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
                {structureB.uniprotId && (
                  <span className="uniprot-id">UniProt: {structureB.uniprotId}</span>
                )}
                {structureB.pdbId && (
                  <span className="pdb-id">PDB: {structureB.pdbId}</span>
                )}
                {structureB.chainId && (
                  <span className="chain-id">Chain: {structureB.chainId}</span>
                )}
                {structureB.fileContent && (
                  <span className="file-type">Uploaded {structureB.fileType?.toUpperCase()} file</span>
                )}
                {safetyWindowsB.length > 0 && (
                  <span className="safety-windows-info" style={{ color: '#28a745', fontSize: '12px' }}>
                    🔒 {safetyWindowsB.length} safety window{safetyWindowsB.length > 1 ? 's' : ''} highlighted
                  </span>
                )}
              </div>
            </div>
            <StructureViewer
              key={`structure-b-${structureB.uniprotId || structureB.pdbId || 'uploaded'}`}
              uniprotId={structureB.uniprotId || undefined}
              pdbId={structureB.pdbId || undefined}
              pdbContent={structureB.fileContent || undefined}
              sequence={sequences.sequenceB}
              width="100%"
              height={500}
              showLoading={true}
              showSequence={true}
              safetyWindows={safetyWindowsB}
              enableSafetyWindowHighlighting={safetyWindowsB.length > 0}
              onStructureLoaded={() => console.log(`Structure B loaded`)}
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
          <p>To view structures, use descriptors that include UniProt IDs or upload PDB/CIF files:</p>
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
