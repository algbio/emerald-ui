// Custom hook for safety window highlighting optimization
import { useMemo, useRef, useEffect } from 'react';
import type { Alignment } from '../types/PointGrid';
import type { SequenceSafetyWindow } from '../utils/sequence/safetyWindowUtils';
import isEqual from 'lodash/isEqual';

/**
 * Custom hook that optimizes safety window rendering
 * Returns memoized safety window objects and tracks if they've changed 
 * to prevent unnecessary rerenders
 */
export function useSafetyWindowHighlighting(
  safetyWindows: SequenceSafetyWindow[],
  enableHighlighting: boolean
) {
  // Keep track of previous values for change detection
  const previousWindowsRef = useRef<SequenceSafetyWindow[]>([]);
  
  // Track if there was a change that requires redrawing
  const hasChangedRef = useRef<boolean>(false);
  
  // Check for actual changes in safety windows
  useEffect(() => {
    const hasChanged = !isEqual(safetyWindows, previousWindowsRef.current);
    hasChangedRef.current = hasChanged;
    
    if (hasChanged) {
      previousWindowsRef.current = [...safetyWindows];
    }
  }, [safetyWindows]);
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
