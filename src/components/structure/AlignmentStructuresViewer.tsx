import React, { useState } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { StructureViewer } from './StructureViewer';
import { extractSafetyWindowsFromAlignments, mergeSafetyWindows } from '../../utils/sequence/safetyWindowUtils';
import './AlignmentStructuresViewer.css';
import { StructureSuperpositionPanel } from './StructureSuperpositionPanel';
import type { StructureDataResult } from '../../hooks/useStructureData';
import type { ProteinDomain } from '../../hooks/useProteinDomains';
import { downloadRawStructureFile } from '../../utils/export/structureExport';

function sanitizeForFilename(value: string): string {
  return (value || 'structure').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
}

interface AlignmentStructuresViewerProps {
  /**
   * Shared AlphaFold fetch result for sequence A (from useStructureData, also used for the
   * pLDDT confidence strip), so StructureViewer can reuse it instead of fetching on its own.
   * While this is 'loading', the 3D panel for A shows a placeholder rather than mounting
   * StructureViewer with just a uniprotId (which would trigger its own, duplicate fetch).
   */
  structureDataA?: StructureDataResult;
  /** Same as structureDataA, for sequence B. */
  structureDataB?: StructureDataResult;
  /**
   * UniProt domain annotations for each sequence, from the same useProteinDomains fetch that
   * feeds the alignment graph's domain strip - so a domain keeps one color across the 2D strip
   * and the 3D structure. Undefined/empty means the "Colour by domain" toggle isn't offered.
   */
  proteinDomainsA?: ProteinDomain[];
  proteinDomainsB?: ProteinDomain[];
}

export const AlignmentStructuresViewer: React.FC<AlignmentStructuresViewerProps> = ({
  structureDataA,
  structureDataB,
  proteinDomainsA,
  proteinDomainsB,
}) => {
  const { state } = useSequence();
  const { sequences, alignments, structureA, structureB } = state;
  const [useSecondaryColorsA, setUseSecondaryColorsA] = useState(true);
  const [useSecondaryColorsB, setUseSecondaryColorsB] = useState(true);
  const [highlightSafetyWindowsA, setHighlightSafetyWindowsA] = useState(true);
  const [highlightSafetyWindowsB, setHighlightSafetyWindowsB] = useState(true);
  // pLDDT is on by default (matches the AlphaFold DB's own default view) and, when on, takes
  // priority over "Color by Chain" for that structure.
  const [usePlddtColorsA, setUsePlddtColorsA] = useState(true);
  const [usePlddtColorsB, setUsePlddtColorsB] = useState(true);
  // Domain coloring is off by default and mutually exclusive with pLDDT - both repaint every
  // residue, so having both "on" would only ever show whichever won a silent priority contest.
  // Turning one on explicitly turns the other off, keeping the buttons honest about what is
  // actually being displayed.
  const [useDomainColorsA, setUseDomainColorsA] = useState(false);
  const [useDomainColorsB, setUseDomainColorsB] = useState(false);
  const hasDomainsA = (proteinDomainsA?.length ?? 0) > 0;
  const hasDomainsB = (proteinDomainsB?.length ?? 0) > 0;

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

  // Only wait on the shared fetch when there's no local upload and a uniprotId-based fetch
  // would otherwise happen (StructureViewer fetches on its own when given just a uniprotId) -
  // waiting avoids mounting StructureViewer with uniprotId first, which would kick off a
  // duplicate fetch before the shared preFetched content arrives.
  const waitingOnSharedFetchA = Boolean(
    !structureA?.fileContent && structureA?.uniprotId && structureDataA?.status === 'loading'
  );
  const waitingOnSharedFetchB = Boolean(
    !structureB?.fileContent && structureB?.uniprotId && structureDataB?.status === 'loading'
  );

  // Raw structure file text/format used for the plain "Download as PDB/mmCIF" buttons - reuses
  // whatever was already fetched or uploaded, no re-fetch or format conversion.
  const rawStructureContentA = structureA?.fileContent || structureDataA?.rawContent || null;
  const rawStructureFormatA = structureA?.fileType || structureDataA?.format || null;
  const rawStructureContentB = structureB?.fileContent || structureDataB?.rawContent || null;
  const rawStructureFormatB = structureB?.fileType || structureDataB?.format || null;

  return (
    <>
    <div className="alignment-structures-viewer">
      <h2 className="structures-title">Safety Windows Mapped on 3D structures</h2>
      <div className="structures-container">
        {/* Sequence A Structure */}
        {hasStructureA && (
          <div className="structure-panel">
            <div className="structure-header">
              <div className="structure-header-top">
                <h3>Sequence A: {sequences.descriptorA || 'Reference Sequence'}</h3>
                <div className="structure-panel-controls">
                  {structureDataA?.status === 'success' && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${usePlddtColorsA ? 'active' : ''}`}
                      onClick={() => {
                        setUsePlddtColorsA((prev) => !prev);
                        setUseDomainColorsA(false);
                      }}
                      title={usePlddtColorsA ? 'Switch off pLDDT coloring' : 'Color the structure by AlphaFold pLDDT confidence'}
                    >
                      Colour by pLDDT score: {usePlddtColorsA ? 'On' : 'Off'}
                    </button>
                  )}
                  {hasDomainsA && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${useDomainColorsA ? 'active' : ''}`}
                      onClick={() => {
                        setUseDomainColorsA((prev) => !prev);
                        setUsePlddtColorsA(false);
                      }}
                      title={useDomainColorsA
                        ? 'Switch off domain coloring'
                        : 'Color the structure by its UniProt domain annotations, using the same colors as the domain strip on the graph axes'}
                    >
                      Colour by domain: {useDomainColorsA ? 'On' : 'Off'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`structure-panel-toggle ${useSecondaryColorsA ? 'active' : ''}`}
                    onClick={() => setUseSecondaryColorsA((prev) => !prev)}
                    title={useSecondaryColorsA ? 'Switch to uniform coloring' : 'Switch to color by chain'}
                  >
                    Color by Chain: {useSecondaryColorsA ? 'On' : 'Off'}
                  </button>
                  {safetyWindowsA.length > 0 && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${highlightSafetyWindowsA ? 'active' : ''}`}
                      onClick={() => setHighlightSafetyWindowsA((prev) => !prev)}
                      title={highlightSafetyWindowsA ? 'Hide safety window highlighting' : 'Show safety window highlighting'}
                    >
                      Safety Windows (merged): {highlightSafetyWindowsA ? 'On' : 'Off'}
                    </button>
                  )}
                  {rawStructureContentA && rawStructureFormatA === 'pdb' && (
                    <button
                      type="button"
                      className="structure-panel-toggle"
                      onClick={() => downloadRawStructureFile(rawStructureContentA, 'pdb', `${sanitizeForFilename(sequences.descriptorA)}.pdb`)}
                      title="Download this structure as a PDB file"
                    >
                      Download PDB
                    </button>
                  )}
                  {rawStructureContentA && rawStructureFormatA === 'cif' && (
                    <button
                      type="button"
                      className="structure-panel-toggle"
                      onClick={() => downloadRawStructureFile(rawStructureContentA, 'cif', `${sanitizeForFilename(sequences.descriptorA)}.cif`)}
                      title="Download this structure as an mmCIF file"
                    >
                      Download mmCIF
                    </button>
                  )}
                </div>
              </div>
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
              </div>
            </div>
            {waitingOnSharedFetchA ? (
              <div className="structure-loading-placeholder">Loading structure…</div>
            ) : (
              <StructureViewer
                key={`structure-a-${structureA.uniprotId || structureA.pdbId || 'uploaded'}`}
                uniprotId={structureA.uniprotId || undefined}
                pdbId={structureA.pdbId || undefined}
                pdbContent={structureA.fileContent || structureDataA?.rawContent || undefined}
                structureFileType={structureA.fileType || structureDataA?.format || undefined}
                sequence={sequences.sequenceA}
                width="100%"
                height={500}
                showLoading={true}
                showSequence={true}
                safetyWindows={safetyWindowsA}
                enableSafetyWindowHighlighting={highlightSafetyWindowsA && safetyWindowsA.length > 0}
                cartoonColorScheme={useDomainColorsA
                  ? 'domain'
                  : (usePlddtColorsA ? 'b-factor' : (useSecondaryColorsA ? 'chain-id' : 'uniform'))}
                domains={proteinDomainsA}
                onStructureLoaded={() => console.log(`Structure A loaded`)}
                onError={(error) => console.error(`Structure A error:`, error)}
              />
            )}
          </div>
        )}

        {/* Sequence B Structure */}
        {hasStructureB && (
          <div className="structure-panel">
            <div className="structure-header">
              <div className="structure-header-top">
                <h3>Sequence B: {sequences.descriptorB || 'Member Sequence'}</h3>
                <div className="structure-panel-controls">
                  {structureDataB?.status === 'success' && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${usePlddtColorsB ? 'active' : ''}`}
                      onClick={() => {
                        setUsePlddtColorsB((prev) => !prev);
                        setUseDomainColorsB(false);
                      }}
                      title={usePlddtColorsB ? 'Switch off pLDDT coloring' : 'Color the structure by AlphaFold pLDDT confidence'}
                    >
                      Colour by pLDDT score: {usePlddtColorsB ? 'On' : 'Off'}
                    </button>
                  )}
                  {hasDomainsB && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${useDomainColorsB ? 'active' : ''}`}
                      onClick={() => {
                        setUseDomainColorsB((prev) => !prev);
                        setUsePlddtColorsB(false);
                      }}
                      title={useDomainColorsB
                        ? 'Switch off domain coloring'
                        : 'Color the structure by its UniProt domain annotations, using the same colors as the domain strip on the graph axes'}
                    >
                      Colour by domain: {useDomainColorsB ? 'On' : 'Off'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`structure-panel-toggle ${useSecondaryColorsB ? 'active' : ''}`}
                    onClick={() => setUseSecondaryColorsB((prev) => !prev)}
                    title={useSecondaryColorsB ? 'Switch to uniform coloring' : 'Switch to color by chain'}
                  >
                    Color by Chain: {useSecondaryColorsB ? 'On' : 'Off'}
                  </button>
                  {safetyWindowsB.length > 0 && (
                    <button
                      type="button"
                      className={`structure-panel-toggle ${highlightSafetyWindowsB ? 'active' : ''}`}
                      onClick={() => setHighlightSafetyWindowsB((prev) => !prev)}
                      title={highlightSafetyWindowsB ? 'Hide safety window highlighting' : 'Show safety window highlighting'}
                    >
                      Safety Windows (merged): {highlightSafetyWindowsB ? 'On' : 'Off'}
                    </button>
                  )}
                  {rawStructureContentB && rawStructureFormatB === 'pdb' && (
                    <button
                      type="button"
                      className="structure-panel-toggle"
                      onClick={() => downloadRawStructureFile(rawStructureContentB, 'pdb', `${sanitizeForFilename(sequences.descriptorB)}.pdb`)}
                      title="Download this structure as a PDB file"
                    >
                      Download PDB
                    </button>
                  )}
                  {rawStructureContentB && rawStructureFormatB === 'cif' && (
                    <button
                      type="button"
                      className="structure-panel-toggle"
                      onClick={() => downloadRawStructureFile(rawStructureContentB, 'cif', `${sanitizeForFilename(sequences.descriptorB)}.cif`)}
                      title="Download this structure as an mmCIF file"
                    >
                      Download mmCIF
                    </button>
                  )}
                </div>
              </div>
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
              </div>
            </div>
            {waitingOnSharedFetchB ? (
              <div className="structure-loading-placeholder">Loading structure…</div>
            ) : (
              <StructureViewer
                key={`structure-b-${structureB.uniprotId || structureB.pdbId || 'uploaded'}`}
                uniprotId={structureB.uniprotId || undefined}
                pdbId={structureB.pdbId || undefined}
                pdbContent={structureB.fileContent || structureDataB?.rawContent || undefined}
                structureFileType={structureB.fileType || structureDataB?.format || undefined}
                sequence={sequences.sequenceB}
                width="100%"
                height={500}
                showLoading={true}
                showSequence={true}
                safetyWindows={safetyWindowsB}
                enableSafetyWindowHighlighting={highlightSafetyWindowsB && safetyWindowsB.length > 0}
                cartoonColorScheme={useDomainColorsB
                  ? 'domain'
                  : (usePlddtColorsB ? 'b-factor' : (useSecondaryColorsB ? 'chain-id' : 'uniform'))}
                domains={proteinDomainsB}
                onStructureLoaded={() => console.log(`Structure B loaded`)}
                onError={(error) => console.error(`Structure B error:`, error)}
              />
            )}
          </div>
        )}
      </div>

      {/* Show info about missing structures */}
      {hasAlignments && !hasStructureA && !hasStructureB && (
        <div className="no-structures-message">
          <p>No 3D structures available for the aligned sequences.</p>
          <p>To view structures, use descriptors that include UniProt IDs or load PDB/CIF files:</p>
          <div className="examples">
            <code>sp|P02769|ALBU_HUMAN</code> or <code>P02769</code> (Human Serum Albumin)
            <br />
            <code>sp|P01308|INS_HUMAN</code> or <code>P01308</code> (Human Insulin)
          </div>
          <p>Structures are automatically loaded from the AlphaFold database for complete protein models.</p>
        </div>
      )}
    </div>

      {/* TM-align Superposition Panel — only shown when both structures are available */}
      <StructureSuperpositionPanel structureDataA={structureDataA} structureDataB={structureDataB} />
    </>
  );
};

export default AlignmentStructuresViewer;
