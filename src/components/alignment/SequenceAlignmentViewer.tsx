import React, { useState, useMemo, useEffect } from 'react';
import type { TextAlignment, PathSelectionResult } from '../../types/PointGrid';
import { exportAlignmentAsFasta, copyAlignmentFastaToClipboard } from '../../utils/export/fastaUtils';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import { extractUniProtId } from '../../utils/api/uniprotUtils';
import type { SequenceSafetyWindow } from '../../utils/sequence/safetyWindowUtils';
import { CostMatrixType, type CostMatrixTypeValue } from '../../utils/api/EmeraldService';
import { scoreGappedAlignment } from '../../utils/sequence/alignmentScoring';
import './SequenceAlignmentViewer.css';

interface SequenceAlignmentViewerProps {
  alignment?: TextAlignment; // Optional optimal alignment
  pathSelectionResult?: PathSelectionResult | null; // Custom path alignment
  representativeDescriptor?: string;
  memberDescriptor?: string;
  representativeSafetyWindows?: SequenceSafetyWindow[]; // Safety windows for representative sequence
  memberSafetyWindows?: SequenceSafetyWindow[]; // Safety windows for member sequence
  costMatrixType?: CostMatrixTypeValue;
  gapCost?: number;
  startGap?: number;
  // Controlled active-tab state, lifted to the shared parent so sibling panels (e.g. the
  // Safety/Unsafe Windows copy buttons) can know which alignment is currently on screen.
  // Falls back to internal state when not provided.
  activeTab?: 'optimal' | 'custom';
  onActiveTabChange?: (tab: 'optimal' | 'custom') => void;
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

const SequenceAlignmentViewer: React.FC<SequenceAlignmentViewerProps> = ({
  alignment, 
  pathSelectionResult,
  representativeDescriptor,
  memberDescriptor,
  representativeSafetyWindows = [],
  memberSafetyWindows = [],
  costMatrixType = CostMatrixType.BLOSUM62,
  gapCost,
  startGap,
  activeTab: controlledActiveTab,
  onActiveTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'optimal' | 'custom'>('optimal');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  // controlledActiveTab is always defined once a parent passes it (default 'optimal'), so it
  // always wins over internalActiveTab above - clicking must therefore notify the parent
  // directly via onActiveTabChange, not just update the (otherwise-ignored) internal state.
  const setActiveTab = (tab: 'optimal' | 'custom') => {
    setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  };
  const [showSafetyWindowHighlight, setShowSafetyWindowHighlight] = useState(true);
  const { notifySuccess, notifyError, notifyCopySuccess } = useFeedbackNotifications();
  
  // Determine what alignments we have
  const hasOptimalAlignment = alignment && alignment.representative && alignment.member;
  const hasCustomAlignment = pathSelectionResult && pathSelectionResult.alignedRepresentative && pathSelectionResult.alignedMember;
  
  // If we only have one type, don't show tabs
  const showTabs = hasOptimalAlignment && hasCustomAlignment;
  
  // Default to custom if we only have custom, optimal if we only have optimal
  const effectiveActiveTab = showTabs ? activeTab : (hasCustomAlignment ? 'custom' : 'optimal');

  // Report the effective (not just clicked) tab up to the parent, so sibling panels know
  // which alignment is actually on screen even when tabs aren't shown (only one type exists).
  useEffect(() => {
    onActiveTabChange?.(effectiveActiveTab);
  }, [effectiveActiveTab, onActiveTabChange]);
  
  // Safety window highlighting here uses the raw, unclipped window positions (the same
  // startPosition/endPosition the graph's own bracket annotations are drawn from - see
  // extractSafetyWindowsFromAlignments), rather than clipping each window down to only the
  // portion that lands exactly on the alignment's diagonal. That diagonal-only clipping breaks
  // as soon as a gap appears anywhere inside a window's range: a gap shifts the rep/mem offset
  // relationship, so every position after it stops satisfying the "on the diagonal" check and
  // gets excluded, silently truncating the highlight at the first internal gap even though nothing
  // is actually wrong with the window. Using the raw window range keeps this panel's highlighting
  // identical to what the graph shows, gaps included, for both the optimal and custom tabs (a
  // window's positions are defined in the original ungapped sequences, so they apply to any
  // complete alignment of the same two sequences, not just the one they were first computed from).

  // Real substitution-matrix alignment score/match/mismatch/gap counts, computed client-side
  // using the exact matrices and gap formula from the EMERALD WASM build (see substitutionMatrices.ts)
  const optimalScoreBreakdown = useMemo(() => {
    if (!hasOptimalAlignment) return null;
    return scoreGappedAlignment(
      alignment.representative.sequence,
      alignment.member.sequence,
      costMatrixType,
      gapCost,
      startGap
    );
  }, [hasOptimalAlignment, alignment, costMatrixType, gapCost, startGap]);

  const customScoreBreakdown = useMemo(() => {
    if (!hasCustomAlignment) return null;
    return scoreGappedAlignment(
      pathSelectionResult.alignedRepresentative,
      pathSelectionResult.alignedMember,
      costMatrixType,
      gapCost,
      startGap
    );
  }, [hasCustomAlignment, pathSelectionResult, costMatrixType, gapCost, startGap]);

  // Score difference from optimal: true substitution-matrix score delta, distinct from the
  // existing edge-probability-based "Distance from Optimal" metric shown for custom paths
  const scoreDifferenceFromOptimal = useMemo(() => {
    if (!optimalScoreBreakdown || !customScoreBreakdown) return null;
    return customScoreBreakdown.score - optimalScoreBreakdown.score;
  }, [optimalScoreBreakdown, customScoreBreakdown]);

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
  
  // Raw window positions (same for either tab - see comment above)
  const filteredRepWindows = representativeSafetyWindows;
  const filteredMemWindows = memberSafetyWindows;

  // Check if we have any safety windows to highlight
  const hasFilteredSafetyWindows = filteredRepWindows.length > 0 || filteredMemWindows.length > 0;

  // Score/match/mismatch/gap stats for whichever tab is currently active
  const activeScoreBreakdown = effectiveActiveTab === 'custom' ? customScoreBreakdown : optimalScoreBreakdown;
  
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

  // "Path Length" for the custom path is the edge count already computed elsewhere
  // (pathSelectionResult.pathLength); the optimal alignment has no equivalent precomputed
  // value, so use the alignment's own column count (repSeq.length), which is the same
  // "number of steps through the DP grid" concept.
  const effectivePathLength = effectiveActiveTab === 'custom' && pathSelectionResult
    ? pathSelectionResult.pathLength
    : repSeq.length;

  return (
    <div className="sequence-alignment-viewer">
      <div className="alignment-section-header">
        <div className="alignment-header-left">
          <h3>Safety Windows Mapped on Sequence Alignment</h3>
        </div>
        <div className="alignment-actions">
          {hasFilteredSafetyWindows && (
            <button
              onClick={() => setShowSafetyWindowHighlight(!showSafetyWindowHighlight)}
              className={`safety-window-toggle ${showSafetyWindowHighlight ? 'active' : ''}`}
              title={showSafetyWindowHighlight ? 'Hide safety window highlighting' : 'Show safety window highlighting'}
            >
              Safety Windows (merged): {showSafetyWindowHighlight ? 'On' : 'Off'}
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

      {activeScoreBreakdown && (
        <div className="alignment-stats">
          <div className="alignment-stats-row">
            <span>Path Length: {effectivePathLength}</span>
            <span>Score: {activeScoreBreakdown.score}</span>
            <span>Matches: {activeScoreBreakdown.matches}</span>
            <span>Mismatches: {activeScoreBreakdown.mismatches}</span>
            <span>Gaps: {activeScoreBreakdown.gapCount}</span>
          </div>
          {effectiveActiveTab === 'custom' && pathSelectionResult && (
            <div className="alignment-stats-row">
              <span>Distance from Optimal: {pathSelectionResult.distanceFromOptimal}%</span>
              {scoreDifferenceFromOptimal !== null && (
                <span>Score from Optimal: {scoreDifferenceFromOptimal > 0 ? '+' : ''}{scoreDifferenceFromOptimal}</span>
              )}
            </div>
          )}
        </div>
      )}

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
