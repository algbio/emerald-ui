import { useMemo, useRef } from 'react';
import type { Alignment } from '../types/PointGrid';
import { 
  extractSafetyWindowsFromAlignments, 
  mergeSafetyWindows,
} from '../utils/sequence/safetyWindowUtils';
import type { AlignmentSafetyWindowMapping } from '../utils/sequence/safetyWindowUtils';

/**
 * Simple deep comparison for alignment arrays to prevent unnecessary re-calculations
 */
function areAlignmentsEqual(a: Alignment[], b: Alignment[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((alignA, index) => {
    const alignB = b[index];
    return alignA.color === alignB.color &&
           alignA.edges.length === alignB.edges.length &&
           alignA.edges.every((edgeA, idx) => {
             const edgeB = alignB.edges[idx];
             return edgeA.from[0] === edgeB.from[0] &&
                    edgeA.from[1] === edgeB.from[1] &&
                    edgeA.to[0] === edgeB.to[0] &&
                    edgeA.to[1] === edgeB.to[1] &&
                    edgeA.probability === edgeB.probability;
           });
  });
}

/**
 * Custom hook to extract and process safety windows from alignments with memoization
 * to prevent unnecessary recalculations and re-renders
 */
export function useSafetyWindows(alignments: Alignment[]) {
  const previousAlignmentsRef = useRef<Alignment[]>([]);
  const cachedMappingRef = useRef<AlignmentSafetyWindowMapping>({ sequenceA: [], sequenceB: [] });
  
  // Memoize the safety window extraction to prevent unnecessary recalculations
  const safetyWindowMapping = useMemo<AlignmentSafetyWindowMapping>(() => {
    if (!alignments.length) {
      const emptyMapping = { sequenceA: [], sequenceB: [] };
      previousAlignmentsRef.current = [];
      cachedMappingRef.current = emptyMapping;
      return emptyMapping;
    }
    
    // Check if alignments have actually changed
    if (areAlignmentsEqual(alignments, previousAlignmentsRef.current)) {
      return cachedMappingRef.current;
    }
    
    // Only extract if alignments have changed
    const newMapping = extractSafetyWindowsFromAlignments(alignments);
    previousAlignmentsRef.current = alignments.slice(); // Create a copy
    cachedMappingRef.current = newMapping;
    return newMapping;
  }, [alignments]);
  
  // Memoize the merged safety windows for both sequences
  const safetyWindowsA = useMemo(() => {
    return mergeSafetyWindows(safetyWindowMapping.sequenceA);
  }, [safetyWindowMapping.sequenceA]);
  
  const safetyWindowsB = useMemo(() => {
    return mergeSafetyWindows(safetyWindowMapping.sequenceB);
  }, [safetyWindowMapping.sequenceB]);
  
  return {
    safetyWindowMapping,
    safetyWindowsA,
    safetyWindowsB
  };
}
