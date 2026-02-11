import React, { useState, useMemo } from 'react';
import type { TextAlignment, PathSelectionResult } from '../../types/PointGrid';
import { exportAlignmentAsFasta, copyAlignmentFastaToClipboard } from '../../utils/export/fastaUtils';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import { extractUniProtId } from '../../utils/api/uniprotUtils';
import type { SequenceSafetyWindow } from '../../utils/sequence/safetyWindowUtils';
import './SequenceAlignmentViewer.css';

interface SequenceAlignmentViewerProps {
  alignment?: TextAlignment; // Optional optimal alignment
  pathSelectionResult?: PathSelectionResult | null; // Custom path alignment
  representativeDescriptor?: string;
  memberDescriptor?: string;
  representativeSafetyWindows?: SequenceSafetyWindow[]; // Safety windows for representative sequence
  memberSafetyWindows?: SequenceSafetyWindow[]; // Safety windows for member sequence
}

/**
 * Determines the CSS class for highlighting amino acids based on their properties
 * 
 * @param char Amino acid character
 * @returns CSS class for highlighting
 */
const getAminoAcidClass = (char: string): string => {
  if (char === '-') {
    return 'aa-gap';
  }
  
  // Define amino acid groups by properties
  const hydrophobic = ['A', 'V', 'L', 'I', 'M', 'F', 'W', 'Y'];
  const polar = ['S', 'T', 'N', 'Q'];
  const acidic = ['D', 'E'];
  const basic = ['K', 'R', 'H'];
  const special = ['C', 'P', 'G'];
  
  if (hydrophobic.includes(char)) return 'aa-hydrophobic';
  if (polar.includes(char)) return 'aa-polar';
  if (acidic.includes(char)) return 'aa-acidic';
  if (basic.includes(char)) return 'aa-basic';
  if (special.includes(char)) return 'aa-special';
  
  return 'aa-neutral';
};

/**
 * Calculate similarity score for a position in alignment
 */
const calculateSimilarity = (position: number, sequences: string[]): string => {
  const chars = sequences.map(seq => seq[position]);
  
  // If any gap exists, no similarity
  if (chars.includes('-')) {
    return 'similarity-none';
  }
  
  // Count occurrences of each character
  const counts: Record<string, number> = {};
  chars.forEach(char => {
    counts[char] = (counts[char] || 0) + 1;
  });
  
  // Get the most common character and its count
  let maxCount = 0;
  for (const char in counts) {
    if (counts[char] > maxCount) {
      maxCount = counts[char];
    }
  }
  
  // Calculate similarity based on conservation percentage
  const percentage = maxCount / chars.length;
  
  if (percentage === 1) return 'similarity-high'; // 100% identity
  if (percentage >= 0.5) return 'similarity-medium'; // 50-99% similarity
  return 'similarity-low'; // Less than 50% similar
};

/**
 * Renders sequence alignment with biological highlighting
 */
/**
 * Check if a character position (1-indexed, excluding gaps) falls within any safety window
 */
const isCharPositionInSafetyWindow = (
  charPosition: number, 
  safetyWindows: SequenceSafetyWindow[]
): SequenceSafetyWindow | null => {
  for (const window of safetyWindows) {
    if (charPosition >= window.startPosition && charPosition <= window.endPosition) {
      return window;
    }
  }
  return null;
};

/**
 * Check if a position is between two character positions that are in the same safety window
 * This is used to include gaps that appear within a safety window range
 */
const findActiveWindowForGap = (
  lastCharPosition: number,
  safetyWindows: SequenceSafetyWindow[]
): SequenceSafetyWindow | null => {
  // A gap is in a safety window if the last character we saw was inside a window
  // and we haven't yet passed the window's end position
  for (const window of safetyWindows) {
    if (lastCharPosition >= window.startPosition && lastCharPosition < window.endPosition) {
      return window;
    }
  }
  return null;
};

/**
 * Groups sequence characters into segments based on safety window boundaries
 * Tracks actual character positions (excluding gaps) for proper safety window matching
 * Gaps between characters in the same safety window are included in the window
 * Returns an array of segments, where each segment is either inside or outside a safety window
 */
interface SequenceSegment {
  startIdx: number;
  endIdx: number;
  chars: string[];
  safetyWindow: SequenceSafetyWindow | null;
}

const groupBySegments = (
  sequence: string,
  safetyWindows: SequenceSafetyWindow[]
): SequenceSegment[] => {
  if (sequence.length === 0) return [];
  
  const segments: SequenceSegment[] = [];
  let currentSegment: SequenceSegment | null = null;
  let charPosition = 0; // Track actual character position (excluding gaps), 1-indexed
  
  for (let i = 0; i < sequence.length; i++) {
    const char = sequence[i];
    const isGap = char === '-';
    
    let window: SequenceSafetyWindow | null = null;
    
    if (!isGap) {
      // Increment character position for non-gap characters
      charPosition++;
      // Check if this character is in a safety window
      window = isCharPositionInSafetyWindow(charPosition, safetyWindows);
    } else {
      // For gaps, check if we're currently inside a safety window
      // (i.e., the last character was in a window and we haven't passed the end)
      window = findActiveWindowForGap(charPosition, safetyWindows);
    }
    
    // Check if we need to start a new segment
    const windowId = window ? `${window.startPosition}-${window.endPosition}` : null;
    const currentWindowId = currentSegment?.safetyWindow 
      ? `${currentSegment.safetyWindow.startPosition}-${currentSegment.safetyWindow.endPosition}` 
      : null;
    
    if (!currentSegment || windowId !== currentWindowId) {
      // Start new segment
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        startIdx: i,
        endIdx: i,
        chars: [char],
        safetyWindow: window
      };
    } else {
      // Continue current segment
      currentSegment.endIdx = i;
      currentSegment.chars.push(char);
    }
  }
  
  // Push the last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
};

/**
 * Checks if an aligned pair falls ON the diagonal line of a safety window.
 * A safety window is a diagonal from (repStart, memStart) to (repEnd, memEnd).
 * A point is on this diagonal if the offset from start is the same for both sequences.
 */
const isOnSafetyWindowDiagonal = (
  repPos: number,
  memPos: number,
  repWindow: SequenceSafetyWindow,
  memWindow: SequenceSafetyWindow
): boolean => {
  // Check if position is within bounds of both windows
  if (repPos < repWindow.startPosition || repPos > repWindow.endPosition) return false;
  if (memPos < memWindow.startPosition || memPos > memWindow.endPosition) return false;
  
  // Check if the offset from start is the same (point is on the diagonal)
  const repOffset = repPos - repWindow.startPosition;
  const memOffset = memPos - memWindow.startPosition;
  
  return repOffset === memOffset;
};

/**
 * Filters and clips safety windows to only include the portions that the alignment path goes through.
 * A safety window is "traversed" if there's at least one alignment position where
 * both sequences have a non-gap character that falls ON the diagonal line of the safety window.
 * 
 * The returned windows are clipped to only cover the range that the path actually traverses.
 * 
 * Note: repSafetyWindows[i] and memSafetyWindows[i] are paired - they come from the same
 * alignment entry and represent the same diagonal line in the alignment plot.
 */
const filterSafetyWindowsByPath = (
  repSeq: string,
  memSeq: string,
  repSafetyWindows: SequenceSafetyWindow[],
  memSafetyWindows: SequenceSafetyWindow[]
): { filteredRepWindows: SequenceSafetyWindow[]; filteredMemWindows: SequenceSafetyWindow[] } => {
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
  
  const filteredRepWindows: SequenceSafetyWindow[] = [];
  const filteredMemWindows: SequenceSafetyWindow[] = [];
  
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
      
      filteredRepWindows.push({
        startPosition: minRepPos,
        endPosition: maxRepPos,
        color: repWindow.color
      });
      
      filteredMemWindows.push({
        startPosition: minMemPos,
        endPosition: maxMemPos,
        color: memWindow.color
      });
    }
  }
  
  return { filteredRepWindows, filteredMemWindows };
};

const SequenceAlignmentViewer: React.FC<SequenceAlignmentViewerProps> = ({ 
  alignment, 
  pathSelectionResult,
  representativeDescriptor,
  memberDescriptor,
  representativeSafetyWindows = [],
  memberSafetyWindows = []
}) => {
  const [activeTab, setActiveTab] = useState<'optimal' | 'custom'>('optimal');
  const [showSafetyWindowHighlight, setShowSafetyWindowHighlight] = useState(true);
  const { notifySuccess, notifyError, notifyCopySuccess } = useFeedbackNotifications();
  
  // Determine what alignments we have
  const hasOptimalAlignment = alignment && alignment.representative && alignment.member;
  const hasCustomAlignment = pathSelectionResult && pathSelectionResult.alignedRepresentative && pathSelectionResult.alignedMember;
  
  // If we only have one type, don't show tabs
  const showTabs = hasOptimalAlignment && hasCustomAlignment;
  
  // Default to custom if we only have custom, optimal if we only have optimal
  const effectiveActiveTab = showTabs ? activeTab : (hasCustomAlignment ? 'custom' : 'optimal');
  
  // Pre-compute filtered safety windows for optimal path
  const optimalFilteredWindows = useMemo(() => {
    if (!hasOptimalAlignment || representativeSafetyWindows.length === 0 || memberSafetyWindows.length === 0) {
      return { filteredRepWindows: [], filteredMemWindows: [] };
    }
    return filterSafetyWindowsByPath(
      alignment.representative.sequence,
      alignment.member.sequence,
      representativeSafetyWindows,
      memberSafetyWindows
    );
  }, [hasOptimalAlignment, alignment, representativeSafetyWindows, memberSafetyWindows]);
  
  // Pre-compute filtered safety windows for custom path
  const customFilteredWindows = useMemo(() => {
    if (!hasCustomAlignment || representativeSafetyWindows.length === 0 || memberSafetyWindows.length === 0) {
      return { filteredRepWindows: [], filteredMemWindows: [] };
    }
    return filterSafetyWindowsByPath(
      pathSelectionResult.alignedRepresentative,
      pathSelectionResult.alignedMember,
      representativeSafetyWindows,
      memberSafetyWindows
    );
  }, [hasCustomAlignment, pathSelectionResult, representativeSafetyWindows, memberSafetyWindows]);
  
  // Early return if no alignment data
  if (!hasOptimalAlignment && !hasCustomAlignment) {
    return (
      <div className="sequence-alignment-viewer">
        <div className="no-alignment">
          <p>No alignment data available</p>
        </div>
      </div>
    );
  }
  
  // Prepare alignment data based on active tab
  let repSeq: string, memSeq: string, repDesc: string, memDesc: string;
  
  if (effectiveActiveTab === 'custom' && hasCustomAlignment) {
    repSeq = pathSelectionResult.alignedRepresentative;
    memSeq = pathSelectionResult.alignedMember;
    repDesc = representativeDescriptor || 'Representative';
    memDesc = memberDescriptor || 'Member';
  } else if (effectiveActiveTab === 'optimal' && hasOptimalAlignment) {
    repSeq = alignment.representative.sequence;
    memSeq = alignment.member.sequence;
    repDesc = alignment.representative.descriptor;
    memDesc = alignment.member.descriptor;
  } else {
    return null;
  }
  
  // Select the appropriate filtered windows based on active tab
  const { filteredRepWindows, filteredMemWindows } = effectiveActiveTab === 'custom' 
    ? customFilteredWindows 
    : optimalFilteredWindows;
  
  // Check if we have any filtered safety windows to highlight
  const hasFilteredSafetyWindows = filteredRepWindows.length > 0 || filteredMemWindows.length > 0;
  
  // Extract sequence name from descriptor
  // Prefer UniProt accession code if available, otherwise fall back to title
  const getSequenceName = (descriptor: string): string => {
    // First try to extract a UniProt accession code
    const accession = extractUniProtId(descriptor);
    if (accession) {
      return accession;
    }
    
    // Fall back to extracting the first word/identifier from the descriptor
    const match = descriptor.match(/^>?(\w+)/);
    return match ? match[1] : 'Sequence';
  };
  
  const repName = getSequenceName(repDesc);
  const memName = getSequenceName(memDesc);
  
  // Generate position markers (every 10 positions)
  const positionMarkers = [];
  console.log('Generating position markers for sequence length:', repSeq.length);
  for (let i = 0; i < repSeq.length; i++) {
    if (i % 10 === 0) {
      const position = i + 1; // 1-based indexing for biology
      positionMarkers.push(
        <span 
          key={i} 
          className="position-marker" 
          style={{ 
            width: '16px', 
            display: 'inline-block',
            textAlign: 'center',
            fontSize: '10px',
            color: '#AAAAAA'
          }}
        >
          {position}
        </span>
      );
    } else {
      positionMarkers.push(
        <span 
          key={i} 
          style={{ 
            width: '16px', 
            display: 'inline-block'
          }}
        >
        </span>
      );
    }
  }
  
  // Add final position marker if not already included
  const lastMarkerPosition = Math.floor((repSeq.length - 1) / 10) * 10;
  if (lastMarkerPosition + 1 < repSeq.length) {
    const finalPosition = repSeq.length;
    positionMarkers[repSeq.length - 1] = (
      <span 
        key={repSeq.length - 1} 
        className="position-marker" 
        style={{ 
          width: '16px', 
          display: 'inline-block',
          textAlign: 'center',
          fontSize: '10px',
          color: '#AAAAAA'
        }}
      >
        {finalPosition}
      </span>
    );
  }
  
  // Calculate similarity for each position
  const similarityClasses = [];
  for (let i = 0; i < repSeq.length; i++) {
    similarityClasses.push(calculateSimilarity(i, [repSeq, memSeq]));
  }

  // Export functions
  const handleExportFasta = () => {
    try {
      exportAlignmentAsFasta(
        repSeq,
        memSeq,
        repDesc,
        memDesc,
        effectiveActiveTab
      );
      notifySuccess('FASTA Exported', `Successfully exported ${effectiveActiveTab} alignment as FASTA file`);
    } catch (error) {
      console.error('Failed to export FASTA:', error);
      notifyError('Export Failed', 'Failed to export FASTA file');
    }
  };

  const handleCopyFasta = async () => {
    try {
      await copyAlignmentFastaToClipboard(
        repSeq,
        memSeq,
        repDesc,
        memDesc,
        effectiveActiveTab
      );
      notifyCopySuccess('FASTA copied to clipboard');
    } catch (error) {
      console.error('Failed to copy FASTA:', error);
      notifyError('Copy Failed', 'Failed to copy FASTA to clipboard');
    }
  };

  return (
    <div className="sequence-alignment-viewer">
      <div className="alignment-section-header">
        <div className="alignment-header-left">
          <h3>Safety Windows Mapped on Sequence Alignment</h3>
          {effectiveActiveTab === 'custom' && pathSelectionResult && (
            <div className="alignment-stats">
              <span>Path Length: {pathSelectionResult.pathLength}</span>
              <span>Distance from Optimal: {pathSelectionResult.distanceFromOptimal}%</span>
            </div>
          )}
        </div>
        <div className="alignment-actions">
          {hasFilteredSafetyWindows && (
            <button
              onClick={() => setShowSafetyWindowHighlight(!showSafetyWindowHighlight)}
              className={`safety-window-toggle ${showSafetyWindowHighlight ? 'active' : ''}`}
              title={showSafetyWindowHighlight ? 'Hide safety window highlighting' : 'Show safety window highlighting'}
            >
              🛡️ Safety Windows {showSafetyWindowHighlight ? 'ON' : 'OFF'}
            </button>
          )}
          <div className="export-buttons">
            <button
              onClick={handleCopyFasta}
              className="copy-fasta-button"
              title="Copy alignment to clipboard in FASTA format"
            >
              📋 Copy FASTA
            </button>
            <button
              onClick={handleExportFasta}
              className="export-fasta-button"
              title="Download alignment as FASTA file"
            >
              💾 Export FASTA
            </button>
          </div>
        </div>
      </div>
      
      {showTabs && (
        <div className="alignment-tabs">
          <button 
            className={`tab-button ${effectiveActiveTab === 'optimal' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimal')}
          >
            Optimal Alignment
          </button>
          <button 
            className={`tab-button ${effectiveActiveTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Path {pathSelectionResult && `(Distance: ${pathSelectionResult.distanceFromOptimal}%)`}
          </button>
        </div>
      )}
      
      <div className="scrollable-alignment">
        <div className="alignment-container">
          {/* Position indicators */}
          <div className="alignment-row">
            <div className="sequence-name"></div>
            <div className="alignment-row-content">
              <div className="sequence-content" style={{ height: '15px', fontSize: '10px', color: '#AAAAAA' }}>
                {positionMarkers}
              </div>
            </div>
          </div>
          
          {/* Representative sequence */}
          <div className="alignment-row">
            <div className="sequence-name">{repName}</div>
            <div className="alignment-row-content">
              <div className="sequence-content">
                {showSafetyWindowHighlight && filteredRepWindows.length > 0
                  ? groupBySegments(repSeq, filteredRepWindows).map((segment, segIdx) => (
                      <span
                        key={`seg-${segIdx}`}
                        title={segment.safetyWindow ? `Safety Window: ${segment.safetyWindow.startPosition}-${segment.safetyWindow.endPosition}` : undefined}
                      >
                        {segment.chars.map((char, charIdx) => (
                          <span 
                            key={segment.startIdx + charIdx} 
                            className={`${getAminoAcidClass(char)}${segment.safetyWindow ? ' safety-window-char' : ''}`}
                            style={{ 
                              width: '16px', 
                              display: 'inline-block', 
                              textAlign: 'center',
                              boxSizing: 'border-box'
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    ))
                  : Array.from(repSeq).map((char, idx) => (
                      <span 
                        key={idx} 
                        className={getAminoAcidClass(char)}
                        style={{ 
                          width: '16px', 
                          display: 'inline-block', 
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      >
                        {char}
                      </span>
                    ))
                }
              </div>
            </div>
          </div>
          
          {/* Member sequence */}
          <div className="alignment-row">
            <div className="sequence-name">{memName}</div>
            <div className="alignment-row-content">
              <div className="sequence-content">
                {showSafetyWindowHighlight && filteredMemWindows.length > 0
                  ? groupBySegments(memSeq, filteredMemWindows).map((segment, segIdx) => (
                      <span
                        key={`seg-${segIdx}`}
                        title={segment.safetyWindow ? `Safety Window: ${segment.safetyWindow.startPosition}-${segment.safetyWindow.endPosition}` : undefined}
                      >
                        {segment.chars.map((char, charIdx) => (
                          <span 
                            key={segment.startIdx + charIdx} 
                            className={`${getAminoAcidClass(char)}${segment.safetyWindow ? ' safety-window-char' : ''}`}
                            style={{ 
                              width: '16px', 
                              display: 'inline-block', 
                              textAlign: 'center',
                              boxSizing: 'border-box'
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    ))
                  : Array.from(memSeq).map((char, idx) => (
                      <span 
                        key={idx} 
                        className={getAminoAcidClass(char)}
                        style={{ 
                          width: '16px', 
                          display: 'inline-block', 
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      >
                        {char}
                      </span>
                    ))
                }
              </div>
            </div>
          </div>
          
          {/* Conservation / Similarity bar */}
          <div className="alignment-row conservation-row">
            <div className="sequence-name">Conservation</div>
            <div className="alignment-row-content">
              <div className="similarity-row">
                {similarityClasses.map((cls, idx) => (
                  <span 
                    key={idx} 
                    className={cls} 
                    style={{ 
                      width: '16px', 
                      height: '8px', 
                      display: 'inline-block',
                      boxSizing: 'border-box'
                    }}
                  ></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="legend">
        <div className="legend-section">
          <div className="legend-title">Amino Acid Properties</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color aa-hydrophobic"></span>
              <span>Hydrophobic (A,V,L,I,M,F,W,Y)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color aa-polar"></span>
              <span>Polar (S,T,N,Q)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color aa-acidic"></span>
              <span>Acidic (D,E)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color aa-basic"></span>
              <span>Basic (K,R,H)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color aa-special"></span>
              <span>Special (C,P,G)</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <div className="legend-title">Conservation</div>
          <div className="legend-items">
            <div className="legend-item">
              <p></p>
              <span className="legend-color similarity-high"></span>
              <span>Match</span>
            </div>
            <div className="legend-item">
              <span className="legend-color similarity-medium"></span>
              <span>Mismatch</span>
            </div>
            <div className="legend-item">
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAlignmentViewer;
