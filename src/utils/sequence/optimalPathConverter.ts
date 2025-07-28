// Utility functions for converting optimal path coordinates to sequence alignment

/**
 * Convert optimal path coordinates to gapped sequence alignment
 * @param optimalPath Array of [x, y] coordinates representing the optimal alignment path
 * @param refSeq Original reference sequence (ungapped) - maps to representative (X-axis)
 * @param memSeq Original member sequence (ungapped) - maps to member (Y-axis)
 * @param refDesc Reference sequence descriptor
 * @param memDesc Member sequence descriptor
 * @returns Object with gapped sequences following the optimal path
 */
export function convertOptimalPathToAlignment(
  optimalPath: [number, number][],
  refSeq: string,
  memSeq: string,
  refDesc: string,
  memDesc: string
): {
  representative: { sequence: string; descriptor: string };
  member: { sequence: string; descriptor: string };
} | null {
  
  if (!optimalPath || optimalPath.length === 0) {
    console.warn('No optimal path provided');
    return null;
  }

  if (!refSeq || !memSeq) {
    console.warn('Reference or member sequence is missing');
    return null;
  }

  // Initialize gapped sequences
  let gappedRefSeq = '';  // representative sequence (X-axis)
  let gappedMemSeq = '';  // member sequence (Y-axis)
  
  // Track current positions in the original sequences (0-indexed)
  let refPos = 0;  // position in representative sequence
  let memPos = 0;  // position in member sequence
  
  console.log('Converting optimal path to alignment:', {
    pathLength: optimalPath.length,
    refLength: refSeq.length,
    memLength: memSeq.length,
    firstPoint: optimalPath[0],
    lastPoint: optimalPath[optimalPath.length - 1],
    firstFewPoints: optimalPath.slice(0, Math.min(10, optimalPath.length))
  });

  // Process each step in the optimal path
  for (let i = 0; i < optimalPath.length - 1; i++) {
    const currentPoint = optimalPath[i];
    const nextPoint = optimalPath[i + 1];
    
    // Extract coordinates: x = representative position, y = member position
    // Note: coordinates represent matrix positions (how many chars consumed)
    const [currentX, currentY] = currentPoint;
    const [nextX, nextY] = nextPoint;
    
    // Calculate the movement direction
    const deltaX = nextX - currentX;  // movement in representative sequence
    const deltaY = nextY - currentY;  // movement in member sequence
    
    // Log the first few moves for debugging
    if (i < 10) {
      console.log(`Step ${i}: (${currentX}, ${currentY}) -> (${nextX}, ${nextY}) | delta: (${deltaX}, ${deltaY}) | refPos: ${refPos}, memPos: ${memPos}`);
    }
    
    // Determine the type of move:
    // - Diagonal (1,1): Match/mismatch - both sequences advance
    // - Horizontal (1,0): Gap in member sequence - only representative advances  
    // - Vertical (0,1): Gap in representative sequence - only member advances
    
    if (deltaX === 1 && deltaY === 1) {
      // Match/mismatch: both sequences advance
      // We consume currentX -> nextX from ref and currentY -> nextY from mem
      if (refPos < refSeq.length && memPos < memSeq.length) {
        gappedRefSeq += refSeq[refPos];    // representative sequence
        gappedMemSeq += memSeq[memPos];    // member sequence
        if (i < 10) {
          console.log(`  Match: ${refSeq[refPos]} vs ${memSeq[memPos]}`);
        }
        refPos++;
        memPos++;
      }
    } else if (deltaX === 1 && deltaY === 0) {
      // Horizontal move: gap in member sequence, only representative advances
      if (refPos < refSeq.length) {
        gappedRefSeq += refSeq[refPos];    // representative sequence
        gappedMemSeq += '-';               // gap in member sequence
        if (i < 10) {
          console.log(`  Gap in member: ${refSeq[refPos]} vs -`);
        }
        refPos++;
      }
    } else if (deltaX === 0 && deltaY === 1) {
      // Vertical move: gap in representative sequence, only member advances
      if (memPos < memSeq.length) {
        gappedRefSeq += '-';               // gap in representative sequence
        gappedMemSeq += memSeq[memPos];    // member sequence
        if (i < 10) {
          console.log(`  Gap in representative: - vs ${memSeq[memPos]}`);
        }
        memPos++;
      }
    } else {
      // Unexpected move pattern - log warning but continue
      console.warn(`Unexpected move pattern at step ${i}: (${deltaX}, ${deltaY})`);
      
      // Try to handle larger moves by adding appropriate gaps
      if (deltaX > deltaY) {
        // More horizontal movement - add gaps to member
        for (let j = 0; j < deltaX; j++) {
          if (refPos < refSeq.length) {
            gappedRefSeq += refSeq[refPos];
            refPos++;
          }
          if (j < deltaY && memPos < memSeq.length) {
            gappedMemSeq += memSeq[memPos];
            memPos++;
          } else {
            gappedMemSeq += '-';
          }
        }
      } else if (deltaY > deltaX) {
        // More vertical movement - add gaps to representative
        for (let j = 0; j < deltaY; j++) {
          if (memPos < memSeq.length) {
            gappedMemSeq += memSeq[memPos];
            memPos++;
          }
          if (j < deltaX && refPos < refSeq.length) {
            gappedRefSeq += refSeq[refPos];
            refPos++;
          } else {
            gappedRefSeq += '-';
          }
        }
      }
    }
  }

  console.log('Optimal path alignment result:', {
    originalRefLength: refSeq.length,
    originalMemLength: memSeq.length,
    gappedRefLength: gappedRefSeq.length,
    gappedMemLength: gappedMemSeq.length,
    refPosProcessed: refPos,
    memPosProcessed: memPos,
    gappedRefPreview: gappedRefSeq.substring(0, 50) + (gappedRefSeq.length > 50 ? '...' : ''),
    gappedMemPreview: gappedMemSeq.substring(0, 50) + (gappedMemSeq.length > 50 ? '...' : '')
  });

  return {
    representative: {
      sequence: gappedRefSeq,
      descriptor: refDesc
    },
    member: {
      sequence: gappedMemSeq,
      descriptor: memDesc
    }
  };
}
