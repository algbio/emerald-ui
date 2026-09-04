// Utility functions for converting alignment safety windows to sequence positions

import type { Alignment } from '../../types/PointGrid';

export interface SequenceSafetyWindow {
  startPosition: number;
  endPosition: number;
  color?: string;
}

export interface AlignmentSafetyWindowMapping {
  sequenceA: SequenceSafetyWindow[];
  sequenceB: SequenceSafetyWindow[];
}

/**
 * Extract safety windows from alignment data and convert to sequence positions
 * @param alignments Array of alignment data containing safety windows
 * @returns Object with safety windows for both sequences
 */
export function extractSafetyWindowsFromAlignments(
  alignments: Alignment[]
): AlignmentSafetyWindowMapping {
  const sequenceA: SequenceSafetyWindow[] = [];
  const sequenceB: SequenceSafetyWindow[] = [];

  alignments.forEach((alignment) => {
    if (alignment.startDot && alignment.endDot) {
      // Safety windows represent segments in the alignment plot
      // X-axis typically represents sequence B (member)
      // Y-axis typically represents sequence A (representative)
      
      // For sequence A (Y-axis), use the Y coordinates
      // startPosition is 1-indexed, endPosition is inclusive
      const seqAWindow: SequenceSafetyWindow = {
        startPosition: Math.floor(alignment.startDot.x) + 1, // Convert to 1-indexed
        endPosition: Math.floor(alignment.endDot.x),         // Already 1-indexed (end is inclusive)
        color: alignment.color || '#90EE90'
      };
      
      // For sequence B (X-axis), use the X coordinates  
      const seqBWindow: SequenceSafetyWindow = {
        startPosition: Math.floor(alignment.startDot.y) + 1, // Convert to 1-indexed
        endPosition: Math.floor(alignment.endDot.y),         // Already 1-indexed (end is inclusive)
        color: alignment.color || '#90EE90'
      };
      
      // Only add valid windows (start <= end and positive positions)
      // Allow single-character windows where start === end
      if (seqAWindow.startPosition > 0 && seqAWindow.endPosition >= seqAWindow.startPosition) {
        sequenceA.push(seqAWindow);
      }
      
      if (seqBWindow.startPosition > 0 && seqBWindow.endPosition >= seqBWindow.startPosition) {
        sequenceB.push(seqBWindow);
      }
    }
  });

  console.log('Extracted safety windows:', {
    sequenceA: sequenceA.length,
    sequenceB: sequenceB.length,
    sequenceAWindows: sequenceA,
    sequenceBWindows: sequenceB
  });

  return { sequenceA, sequenceB };
}

/**
 * Checks if an aligned pair falls ON the diagonal line of a safety window.
 * A safety window is a diagonal from (repStart, memStart) to (repEnd, memEnd).
 * A point is on this diagonal if the offset from start is the same for both sequences.
 */
function isOnSafetyWindowDiagonal(
  repPos: number,
  memPos: number,
  repWindow: SequenceSafetyWindow,
  memWindow: SequenceSafetyWindow
): boolean {
  // Check if position is within bounds of both windows
  if (repPos < repWindow.startPosition || repPos > repWindow.endPosition) return false;
  if (memPos < memWindow.startPosition || memPos > memWindow.endPosition) return false;

  // Check if the offset from start is the same (point is on the diagonal)
  const repOffset = repPos - repWindow.startPosition;
  const memOffset = memPos - memWindow.startPosition;

  return repOffset === memOffset;
}

/**
 * Filters and clips safety windows to only include the portions that a gapped alignment
 * actually traverses. A safety window is "traversed" if there's at least one alignment
 * position where both sequences have a non-gap character that falls ON the diagonal line
 * of the safety window; the returned window is clipped to only that traversed range.
 *
 * Note: repSafetyWindows[i] and memSafetyWindows[i] are paired - they come from the same
 * alignment entry and represent the same diagonal line in the alignment plot.
 *
 * The output arrays are always the same length as the input arrays: index i in the output
 * always corresponds to the i-th input window. A window with zero on-diagonal aligned pairs
 * (nothing to clip to) is represented as `null` at that index rather than being dropped, so
 * callers can reliably look up "the clipped version of safety window i" by index.
 *
 * This is the single source of truth for "what does safety window i actually cover in this
 * alignment" - used both for the "Safety Windows (merged)" highlight in the Sequence
 * Alignment panel and for the Safety Windows tab's copy/extraction, so the two can't disagree.
 */
export function filterSafetyWindowsByPath(
  repSeq: string,
  memSeq: string,
  repSafetyWindows: SequenceSafetyWindow[],
  memSafetyWindows: SequenceSafetyWindow[]
): { filteredRepWindows: (SequenceSafetyWindow | null)[]; filteredMemWindows: (SequenceSafetyWindow | null)[] } {
  // Build a set of (repCharPos, memCharPos) pairs that represent diagonal moves in the alignment
  // These are positions where the path goes through a cell (both sequences align)
  const alignedPairs: Array<{ repPos: number; memPos: number }> = [];

  let repCharPos = 0;
  let memCharPos = 0;

  for (let i = 0; i < repSeq.length; i++) {
    const repChar = repSeq[i];
    const memChar = memSeq[i];
    const repIsGap = repChar === '-';
    const memIsGap = memChar === '-';

    if (!repIsGap) repCharPos++;
    if (!memIsGap) memCharPos++;

    // A diagonal move (match/mismatch) is when neither sequence has a gap
    if (!repIsGap && !memIsGap) {
      alignedPairs.push({ repPos: repCharPos, memPos: memCharPos });
    }
  }

  const filteredRepWindows: (SequenceSafetyWindow | null)[] = [];
  const filteredMemWindows: (SequenceSafetyWindow | null)[] = [];

  // The windows are paired by index - check each pair together
  const numPairs = Math.min(repSafetyWindows.length, memSafetyWindows.length);

  for (let i = 0; i < numPairs; i++) {
    const repWindow = repSafetyWindows[i];
    const memWindow = memSafetyWindows[i];

    // Find all aligned pairs that fall ON the diagonal line of this safety window
    const pairsOnDiagonal = alignedPairs.filter(pair =>
      isOnSafetyWindowDiagonal(pair.repPos, pair.memPos, repWindow, memWindow)
    );

    if (pairsOnDiagonal.length > 0) {
      // Clip the windows to only the range that the path actually traverses
      const minRepPos = Math.min(...pairsOnDiagonal.map(p => p.repPos));
      const maxRepPos = Math.max(...pairsOnDiagonal.map(p => p.repPos));
      const minMemPos = Math.min(...pairsOnDiagonal.map(p => p.memPos));
      const maxMemPos = Math.max(...pairsOnDiagonal.map(p => p.memPos));

      filteredRepWindows.push({ startPosition: minRepPos, endPosition: maxRepPos, color: repWindow.color });
      filteredMemWindows.push({ startPosition: minMemPos, endPosition: maxMemPos, color: memWindow.color });
    } else {
      filteredRepWindows.push(null);
      filteredMemWindows.push(null);
    }
  }

  return { filteredRepWindows, filteredMemWindows };
}

/**
 * Merge overlapping safety windows to avoid redundant highlighting
 * @param windows Array of safety windows to merge
 * @returns Array of merged safety windows
 */
export function mergeSafetyWindows(windows: SequenceSafetyWindow[]): SequenceSafetyWindow[] {
  if (windows.length === 0) return [];
  
  // Sort by start position
  const sorted = [...windows].sort((a, b) => a.startPosition - b.startPosition);
  const merged: SequenceSafetyWindow[] = [];
  
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // Check if windows overlap or are adjacent
    if (next.startPosition <= current.endPosition + 1) {
      // Merge windows
      current = {
        startPosition: current.startPosition,
        endPosition: Math.max(current.endPosition, next.endPosition),
        color: current.color // Keep the first color
      };
    } else {
      // No overlap, add current and move to next
      merged.push(current);
      current = next;
    }
  }
  
  // Add the last window
  merged.push(current);
  
  return merged;
}
