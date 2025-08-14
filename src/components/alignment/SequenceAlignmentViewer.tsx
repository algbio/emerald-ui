import React, { useState } from 'react';
import type { TextAlignment, PathSelectionResult } from '../../types/PointGrid';
import './SequenceAlignmentViewer.css';

interface SequenceAlignmentViewerProps {
  alignment?: TextAlignment; // Optional optimal alignment
  pathSelectionResult?: PathSelectionResult | null; // Custom path alignment
  representativeDescriptor?: string;
  memberDescriptor?: string;
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
const SequenceAlignmentViewer: React.FC<SequenceAlignmentViewerProps> = ({ 
  alignment, 
  pathSelectionResult,
  representativeDescriptor,
  memberDescriptor 
}) => {
  const [activeTab, setActiveTab] = useState<'optimal' | 'custom'>('optimal');
  
  // Determine what alignments we have
  const hasOptimalAlignment = alignment && alignment.representative && alignment.member;
  const hasCustomAlignment = pathSelectionResult && pathSelectionResult.alignedRepresentative && pathSelectionResult.alignedMember;
  
  // If we only have one type, don't show tabs
  const showTabs = hasOptimalAlignment && hasCustomAlignment;
  
  // Default to custom if we only have custom, optimal if we only have optimal
  const effectiveActiveTab = showTabs ? activeTab : (hasCustomAlignment ? 'custom' : 'optimal');
  
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
  
  // Extract sequence name from descriptor (take text before first |)
  const getSequenceName = (descriptor: string): string => {
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

  return (
    <div className="sequence-alignment-viewer">
      <div className="alignment-section-header">
        <h3>Sequence Alignment</h3>
        {effectiveActiveTab === 'custom' && pathSelectionResult && (
          <div className="alignment-stats">
            <span>Path Length: {pathSelectionResult.pathLength}</span>
            <span>Distance from Optimal: {pathSelectionResult.distanceFromOptimal}%</span>
          </div>
        )}
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
                {Array.from(repSeq).map((char, idx) => (
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
                ))}
              </div>
            </div>
          </div>
          
          {/* Member sequence */}
          <div className="alignment-row">
            <div className="sequence-name">{memName}</div>
            <div className="alignment-row-content">
              <div className="sequence-content">
                {Array.from(memSeq).map((char, idx) => (
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
                ))}
              </div>
            </div>
          </div>
          
          {/* Similarity bar */}
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
              <span className="legend-color similarity-high"></span>
              <span>100% identical</span>
            </div>
            <div className="legend-item">
              <span className="legend-color similarity-medium"></span>
              <span>Similar</span>
            </div>
            <div className="legend-item">
              <span className="legend-color similarity-low"></span>
              <span>Different</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAlignmentViewer;
