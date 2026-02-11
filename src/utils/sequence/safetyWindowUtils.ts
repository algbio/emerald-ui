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
