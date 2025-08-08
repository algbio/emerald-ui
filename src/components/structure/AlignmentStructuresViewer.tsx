import React, { useMemo } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { StructureViewer } from './StructureViewer';
import { useSafetyWindows } from '../../hooks/useSafetyWindows';
import './AlignmentStructuresViewer.css';

export const AlignmentStructuresViewer: React.FC = () => {
  const { state } = useSequence();
  const { alignments, structureA, structureB } = state;

  // Memoize basic checks to prevent unnecessary re-renders
  const hasAlignments = useMemo(() => Array.isArray(alignments) && alignments.length > 0, [alignments]);

  if (!hasAlignments) return null;
  
  // Get UniProt IDs for structures - memoize these as well
  const structureInfo = useMemo(() => ({
    hasStructureA: structureA?.uniprotId,
    hasStructureB: structureB?.uniprotId,
  }), [structureA?.uniprotId, structureB?.uniprotId]);

  // Decide which structure to show (we only show one at a time)
  const shouldShowStructures = structureInfo.hasStructureA || structureInfo.hasStructureB;
  
  // Use our custom hook to get memoized safety windows
  const { safetyWindowMapping } = useSafetyWindows(alignments);

  if (!shouldShowStructures) {
    return null;
  }
  
  return (
    <div className="alignment-structures-viewer">
      {structureInfo.hasStructureA && (
        <div className="structure-container">
          <h3>Structure A: {structureInfo.hasStructureA}</h3>
          <StructureViewer
            uniprotId={structureInfo.hasStructureA}
            safetyWindows={safetyWindowMapping.sequenceA}
            enableSafetyWindowHighlighting={true}
            height={400}
            onError={(err) => console.error("Structure A error:", err)}
            onStructureLoaded={() => console.log("Structure A loaded")}
          />
        </div>
      )}
      {structureInfo.hasStructureB && (
        <div className="structure-container">
          <h3>Structure B: {structureInfo.hasStructureB}</h3>
          <StructureViewer
            uniprotId={structureInfo.hasStructureB}
            safetyWindows={safetyWindowMapping.sequenceB}
            enableSafetyWindowHighlighting={true}
            height={400}
            onError={(err) => console.error("Structure B error:", err)}
            onStructureLoaded={() => console.log("Structure B loaded")}
          />
        </div>
      )}
    </div>
  );
};
