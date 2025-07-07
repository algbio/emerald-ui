import React, { useEffect } from 'react';
import type { Alignment } from '../types/PointGrid';
import './SafetyWindowsInfoPanel.css';

interface SafetyWindowInfo {
  id: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  xLength: number;
  yLength: number;
  color: string;
  alignment: Alignment;
}

interface SafetyWindowsInfoPanelProps {
  safetyWindows: Alignment[];
  selectedWindowId?: string | null;
  hoveredWindowId?: string | null;
  onWindowHover?: (windowId: string | null) => void;
  onNavigateToPrevious?: () => void;
  onNavigateToNext?: () => void;
  representative: string;
  member: string;
  representativeDescriptor?: string;
  memberDescriptor?: string;
}

export const SafetyWindowsInfoPanel: React.FC<SafetyWindowsInfoPanelProps> = ({
  safetyWindows,
  selectedWindowId,
  hoveredWindowId,
  onWindowHover,
  onNavigateToPrevious,
  onNavigateToNext,
  representative,
  member,
  representativeDescriptor,
  memberDescriptor
}) => {
  // Convert alignments to safety window info objects
  const safetyWindowsInfo: SafetyWindowInfo[] = safetyWindows
    .filter(window => window.startDot && window.endDot)
    .map((window, index) => {
      const id = `safety-window-${index}`;
      const xStart = Math.floor(window.startDot!.x);
      const xEnd = Math.floor(window.endDot!.x);
      const yStart = Math.floor(window.startDot!.y);
      const yEnd = Math.floor(window.endDot!.y);
      
      return {
        id,
        xStart,
        xEnd,
        yStart,
        yEnd,
        xLength: xEnd - xStart,
        yLength: yEnd - yStart,
        color: window.color || '#90EE90',
        alignment: window
      };
    });

  // Refs for synchronized scrolling of alignment sequences (DISABLED)
  // const xSequenceRef = useRef<HTMLSpanElement>(null);
  // const conservationRef = useRef<HTMLSpanElement>(null);
  // const ySequenceRef = useRef<HTMLSpanElement>(null);

  // Get current window index from external selection, default to 0
  const getCurrentWindowIndex = () => {
    if (selectedWindowId) {
      const index = safetyWindowsInfo.findIndex(window => window.id === selectedWindowId);
      return index !== -1 ? index : 0;
    }
    return 0;
  };

  const currentWindowIndex = getCurrentWindowIndex();

  const handlePrevious = () => {
    onNavigateToPrevious?.();
  };

  const handleNext = () => {
    onNavigateToNext?.();
  };

  // Synchronized scrolling for alignment sequences (DISABLED)
  /*
  const handleAlignmentScroll = (sourceRef: React.RefObject<HTMLSpanElement | null>) => {
    return () => {
      if (!sourceRef.current) return;
      
      const scrollLeft = sourceRef.current.scrollLeft;
      
      // Sync all other refs to match the scroll position
      if (xSequenceRef.current && sourceRef !== xSequenceRef) {
        xSequenceRef.current.scrollLeft = scrollLeft;
      }
      if (conservationRef.current && sourceRef !== conservationRef) {
        conservationRef.current.scrollLeft = scrollLeft;
      }
      if (ySequenceRef.current && sourceRef !== ySequenceRef) {
        ySequenceRef.current.scrollLeft = scrollLeft;
      }
    };
  };
  */

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (safetyWindowsInfo.length === 0) return;
      
      if (event.key === 'ArrowLeft') {
        onNavigateToPrevious?.();
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        onNavigateToNext?.();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateToPrevious, onNavigateToNext]);

  // Function to search sequence in UniProt BLAST
  const searchInUniProt = (sequence: string) => {
    // Create a form and submit it to UniProt BLAST
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.uniprot.org/blast/';
    form.target = '_blank';
    
    const queryInput = document.createElement('input');
    queryInput.type = 'hidden';
    queryInput.name = 'query';
    queryInput.value = sequence;
    
    const aboutInput = document.createElement('input');
    aboutInput.type = 'hidden';
    aboutInput.name = 'about';
    aboutInput.value = 'identity';
    
    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'hidden';
    thresholdInput.name = 'threshold';
    thresholdInput.value = '0.1';
    
    const runInput = document.createElement('input');
    runInput.type = 'hidden';
    runInput.name = 'run';
    runInput.value = 'blast';
    
    form.appendChild(queryInput);
    form.appendChild(aboutInput);
    form.appendChild(thresholdInput);
    form.appendChild(runInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const formatSequenceSegment = (sequence: string, start: number, end: number) => {
    return sequence.slice(start, end);
  };

  // Function to create full alignment display with highlighted safety window (DISABLED)
  /*
  const createFullAlignmentDisplay = () => {
    if (!currentWindow) return null;

    // Create simple alignment by padding shorter sequence to match longer one
    const maxLength = Math.max(representative.length, member.length);
    const paddedXSeq = representative.padEnd(maxLength, '-');
    const paddedYSeq = member.padEnd(maxLength, '-');
    
    // Create conservation line (simple match/mismatch)
    const conservation = paddedXSeq.split('').map((char, index) => {
      if (char === paddedYSeq[index] && char !== '-') {
        return '|'; // exact match
      } else if (char !== '-' && paddedYSeq[index] !== '-') {
        return '.'; // mismatch
      } else {
        return ' '; // gap
      }
    }).join('');

    // Create highlight arrays to mark safety window regions
    const highlightX = new Array(maxLength).fill(false);
    const highlightY = new Array(maxLength).fill(false);
    
    // Mark the safety window regions
    for (let i = currentWindow.xStart; i < currentWindow.xEnd && i < maxLength; i++) {
      highlightX[i] = true;
    }
    for (let i = currentWindow.yStart; i < currentWindow.yEnd && i < maxLength; i++) {
      highlightY[i] = true;
    }

    return {
      xSequence: paddedXSeq,
      ySequence: paddedYSeq,
      conservation: conservation,
      highlightX: highlightX,
      highlightY: highlightY,
      length: maxLength
    };
  };
  */

  const currentWindow = safetyWindowsInfo[currentWindowIndex];

  return (
    <div className="safety-windows-info-panel">
      <div className="panel-header">
        <h3>Safety Windows</h3>
        <div className="panel-subtitle">
          {safetyWindowsInfo.length} window{safetyWindowsInfo.length !== 1 ? 's' : ''} detected
        </div>
      </div>
      
      {safetyWindowsInfo.length === 0 ? (
        <div className="no-windows-message">
          <p>No safety windows detected in this alignment.</p>
          <p className="help-text">
            Safety windows appear when EMERALD identifies regions with confident alignment.
          </p>
        </div>
      ) : (
        <>
          {/* Navigation Controls */}
          <div className="window-navigation">
            <button 
              className="nav-button prev-button"
              onClick={handlePrevious}
              disabled={safetyWindowsInfo.length <= 1}
            >
              <span className="nav-arrow">‹</span>
            </button>
            
            <div className="window-counter">
              <span className="current-window">{currentWindowIndex + 1}</span>
              <span className="window-separator"> / </span>
              <span className="total-windows">{safetyWindowsInfo.length}</span>
            </div>
            
            <button 
              className="nav-button next-button"
              onClick={handleNext}
              disabled={safetyWindowsInfo.length <= 1}
            >
              <span className="nav-arrow">›</span>
            </button>
          </div>

          {/* Alignment Display - DISABLED - Contains full sequence alignment with synchronized scrolling */}

          {/* Current Window Display */}
          {currentWindow && (
            <div className="current-window-container">
              <div
                className={`safety-window-item current-window ${
                  hoveredWindowId === currentWindow.id ? 'hovered' : ''
                }`}
                onMouseEnter={() => onWindowHover?.(currentWindow.id)}
                onMouseLeave={() => onWindowHover?.(null)}
              >
                <div className="window-header">
                  <div 
                    className="window-color-indicator"
                    style={{ backgroundColor: currentWindow.color }}
                  />
                  <div className="window-title">
                    Window {currentWindow.id.split('-')[2]}
                  </div>
                  <div className="window-dimensions">
                    {currentWindow.xLength} × {currentWindow.yLength}
                  </div>
                </div>
                
                <div className="window-details">
                  <div className="coordinate-info">
                    <div className="axis-info">
                      <span className="axis-label">X-axis ({representativeDescriptor || 'Reference'}):</span>
                      <span className="coordinates">{currentWindow.xStart + 1}-{currentWindow.xEnd}</span>
                    </div>
                    <div className="axis-info">
                      <span className="axis-label">Y-axis ({memberDescriptor || 'Member'}):</span>
                      <span className="coordinates">{currentWindow.yStart + 1}-{currentWindow.yEnd}</span>
                    </div>
                  </div>
                  
                  <div className="sequence-preview">
                    <div className="sequence-info">
                      <div className="sequence-label">X-sequence:</div>
                      <div className="sequence-segment">
                        {formatSequenceSegment(representative, currentWindow.xStart, currentWindow.xEnd)}
                      </div>
                      <button 
                        className="uniprot-search-button"
                        onClick={() => {
                          const sequence = formatSequenceSegment(representative, currentWindow.xStart, currentWindow.xEnd);
                          searchInUniProt(sequence);
                        }}
                        title="Search this sequence in UniProt BLAST (temporarily disabled)"
                        disabled
                      >
                        🔍 Search in UniProt
                      </button>
                    </div>
                    <div className="sequence-info">
                      <div className="sequence-label">Y-sequence:</div>
                      <div className="sequence-segment">
                        {formatSequenceSegment(member, currentWindow.yStart, currentWindow.yEnd)}
                      </div>
                      <button 
                        className="uniprot-search-button"
                        onClick={() => {
                          const sequence = formatSequenceSegment(member, currentWindow.yStart, currentWindow.yEnd);
                          searchInUniProt(sequence);
                        }}
                        title="Search this sequence in UniProt BLAST (temporarily disabled)"
                        disabled
                      >
                        🔍 Search in UniProt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="panel-footer">
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#90EE90' }} />
            <span>Safety window region</span>
          </div>
        </div>
        <div className="help-text">
          Use ← → arrow keys or navigation buttons to cycle through safety windows. Full sequences are displayed for each window.
        </div>
      </div>
    </div>
  );
};

export default SafetyWindowsInfoPanel;
