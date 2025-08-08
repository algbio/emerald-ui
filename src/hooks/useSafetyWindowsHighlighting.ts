// Custom hook for safety window highlighting optimization
import { useRef, useMemo } from 'react';
import type { SequenceSafetyWindow } from '../utils/sequence/safetyWindowUtils';

/**
 * Deep equality check for safety window arrays
 */
function areSafetyWindowsEqual(
  windowsA: SequenceSafetyWindow[], 
  windowsB: SequenceSafetyWindow[]
): boolean {
  if (windowsA.length !== windowsB.length) {
    return false;
  }
  
  return windowsA.every((windowA, index) => {
    const windowB = windowsB[index];
    return (
      windowA.startPosition === windowB.startPosition &&
      windowA.endPosition === windowB.endPosition &&
      windowA.color === windowB.color
    );
  });
}

/**
 * Custom hook that optimizes safety window rendering
 * Tracks if safety windows have changed to prevent unnecessary rerenders
 * @param uniprotId The UniProt ID associated with the safety windows
 * @param safetyWindows The safety windows to process
 * @returns Memoized safety windows with change detection
 */
export function useSafetyWindowsHighlighting(
  uniprotId: string | null,
  safetyWindows: SequenceSafetyWindow[]
) {
  // Keep track of previous values for change detection
  const previousWindowsRef = useRef<SequenceSafetyWindow[]>([]);
  const previousIdRef = useRef<string | null>(null);
  
  // Track if there was a change that requires redrawing
  const hasChangedRef = useRef<boolean>(true); // Initially true to ensure first render
  
  // Memoize the safety windows processing
  const processedWindows = useMemo(() => {
    if (!uniprotId || safetyWindows.length === 0) {
      return [];
    }
    
    // Check if the data has actually changed
    const idChanged = uniprotId !== previousIdRef.current;
    const windowsChanged = !areSafetyWindowsEqual(safetyWindows, previousWindowsRef.current);
    
    if (idChanged || windowsChanged) {
      // Only log on actual changes
      console.log(`Applying safety window highlighting for ${uniprotId}:`, safetyWindows);
      
      // Update refs
      previousIdRef.current = uniprotId;
      previousWindowsRef.current = [...safetyWindows];
      hasChangedRef.current = true;
    }
    
    return safetyWindows;
  }, [uniprotId, safetyWindows]);
  
  return {
    safetyWindows: processedWindows,
    shouldUpdate: hasChangedRef.current && processedWindows.length > 0,
    resetChangeFlag: () => {
      hasChangedRef.current = false;
    }
  };
}
