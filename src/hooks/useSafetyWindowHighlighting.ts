// Custom hook for safety window highlighting optimization
import { useMemo, useRef, useEffect } from 'react';
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
 * Returns memoized safety window objects and tracks if they've changed 
 * to prevent unnecessary rerenders
 */
export function useSafetyWindowHighlighting(
  safetyWindows: SequenceSafetyWindow[],
  selectedSafetyWindowId: string | null,
  hoveredSafetyWindowId: string | null
) {
  // Keep track of previous values for change detection
  const previousWindowsRef = useRef<SequenceSafetyWindow[]>([]);
  const previousSelectedIdRef = useRef<string | null>(null);
  const previousHoveredIdRef = useRef<string | null>(null);
  
  // Track if there was a change that requires redrawing
  const hasChangedRef = useRef<boolean>(false);
  
  // Check for actual changes in safety windows
  useEffect(() => {
    const hasChanged = !areSafetyWindowsEqual(safetyWindows, previousWindowsRef.current);
    hasChangedRef.current = hasChanged;
    
    if (hasChanged) {
      previousWindowsRef.current = [...safetyWindows];
    }
  }, [safetyWindows]);

  // Memoized selected window
  const selectedWindow = useMemo(() => {
    if (selectedSafetyWindowId) {
      const index = parseInt(selectedSafetyWindowId.split('-')[2]);
      const window = safetyWindows[index] || null;
      
      // Check if selected window changed
      if (selectedSafetyWindowId !== previousSelectedIdRef.current) {
        previousSelectedIdRef.current = selectedSafetyWindowId;
        hasChangedRef.current = true;
      }
      
      return window;
    }
    
    // If selection was cleared, mark as changed
    if (previousSelectedIdRef.current !== null) {
      previousSelectedIdRef.current = null;
      hasChangedRef.current = true;
    }
    
    return null;
  }, [selectedSafetyWindowId, safetyWindows]);

  // Memoized hovered window
  const hoveredWindow = useMemo(() => {
    if (hoveredSafetyWindowId) {
      const index = parseInt(hoveredSafetyWindowId.split('-')[2]);
      const window = safetyWindows[index] || null;
      
      // Check if hovered window changed
      if (hoveredSafetyWindowId !== previousHoveredIdRef.current) {
        previousHoveredIdRef.current = hoveredSafetyWindowId;
        hasChangedRef.current = true;
      }
      
      return window;
    }
    
    // If hover was cleared, mark as changed
    if (previousHoveredIdRef.current !== null) {
      previousHoveredIdRef.current = null;
      hasChangedRef.current = true;
    }
    
    return null;
  }, [hoveredSafetyWindowId, safetyWindows]);

  // Function to reset the change flag after rendering
  const resetChangeFlag = () => {
    hasChangedRef.current = false;
  };
  
  // Function to check if highlighting has changed
  const hasChanged = () => hasChangedRef.current;
  
  return {
    selectedWindow,
    hoveredWindow,
    hasChanged,
    resetChangeFlag
  };
}
