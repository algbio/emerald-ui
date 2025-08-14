import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Alignment } from '../../types/PointGrid';
import VisualizationSettingsPanel from './VisualizationSettingsPanel';
import type { VisualizationSettings } from './VisualizationSettingsPanel';
// import AlignmentParamsPanel from './AlignmentParamsPanel';
import './SafetyWindowsInfoPanel.css';
import './SequenceAlignmentViewer.css'; // Import for amino acid coloring classes

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
  visualizationSettings?: VisualizationSettings;
  onVisualizationSettingsChange?: (settings: VisualizationSettings) => void;
  onGapHighlight?: (gapInfo: {type: 'representative' | 'member'; start: number; end: number} | null) => void;
  onWindowSelect?: (windowId: string | null) => void;
  // Path selection props
  pathSelectionResult?: import('../../types/PointGrid').PathSelectionResult | null;
  selectedEdges?: import('../../types/PointGrid').MultipleSelectedEdgesState | null;
  onClearPath?: () => void;
  onGeneratePath?: () => void;
  // Tab state management
  activeTab?: 'general-info' | 'safety-windows' | 'unsafe-windows' | 'visualization' | 'path-selection';
  onActiveTabChange?: (tab: 'general-info' | 'safety-windows' | 'unsafe-windows' | 'visualization' | 'path-selection') => void;
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
  memberDescriptor,
  visualizationSettings,
  onVisualizationSettingsChange,
  onGapHighlight,
  onWindowSelect,
  pathSelectionResult,
  selectedEdges,
  onClearPath,
  onGeneratePath,
  activeTab: externalActiveTab,
  onActiveTabChange
}) => {
  const [copyStatus, setCopyStatus] = useState<{id: string, success: boolean} | null>(null);
  const [internalActiveTab, setInternalActiveTab] = useState<'general-info' | 'safety-windows' | 'unsafe-windows' | 'visualization' | 'path-selection'>('general-info');  // Use external active tab if provided, otherwise use internal state
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = onActiveTabChange || setInternalActiveTab;
  
  // Default visualization settings if not provided
  const defaultSettings: VisualizationSettings = {
    showAxes: true,
    showAxisLabels: true,
    showAxisDescriptors: true, // Added missing property
    showGrid: true,
    showMinimap: true,
    showSafetyWindows: true,
    showAlignmentEdges: true,
    showAlignmentDots: true,
    showOptimalPath: true,
    enableSafetyWindowHighlighting: true,
    enableGapHighlighting: true,
    enablePathSelection: true  // Enable by default for better UX
  };

  const currentSettings = visualizationSettings || defaultSettings;
  
  // Function to copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyStatus({id, success: true});
        setTimeout(() => setCopyStatus(null), 2000);
      })
      .catch(() => {
        setCopyStatus({id, success: false});
        setTimeout(() => setCopyStatus(null), 2000);
      });
  };
  
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

  // Calculate safety statistics for general info - memoized for performance
  const safetyStats = useMemo(() => {
    if (safetyWindowsInfo.length === 0) {
      return {
        representativeSafetyPercentage: 0,
        memberSafetyPercentage: 0,
        totalSafePositions: 0,
        representativeSafePositions: 0,
        memberSafePositions: 0
      };
    }

    // Calculate unique safe positions for each sequence
    const representativeSafePositions = new Set<number>();
    const memberSafePositions = new Set<number>();

    safetyWindowsInfo.forEach(window => {
      // Add all positions within the safety window
      for (let x = window.xStart; x < window.xEnd; x++) {
        representativeSafePositions.add(x);
      }
      for (let y = window.yStart; y < window.yEnd; y++) {
        memberSafePositions.add(y);
      }
    });

    const representativeSafeCount = representativeSafePositions.size;
    const memberSafeCount = memberSafePositions.size;
    const representativeSafetyPercentage = representative.length > 0 ? 
      (representativeSafeCount / representative.length) * 100 : 0;
    const memberSafetyPercentage = member.length > 0 ? 
      (memberSafeCount / member.length) * 100 : 0;

    return {
      representativeSafetyPercentage: Math.round(representativeSafetyPercentage * 10) / 10,
      memberSafetyPercentage: Math.round(memberSafetyPercentage * 10) / 10,
      totalSafePositions: representativeSafeCount + memberSafeCount,
      representativeSafePositions: representativeSafeCount,
      memberSafePositions: memberSafeCount
    };
  }, [safetyWindowsInfo, representative.length, member.length]);

  // Calculate gap regions (non-safe areas) - memoized to prevent unnecessary recalculation
  const gapRegions = useMemo(() => {
    if (safetyWindowsInfo.length === 0) {
      return {
        representativeGaps: representative.length > 0 ? [{start: 0, end: representative.length}] : [],
        memberGaps: member.length > 0 ? [{start: 0, end: member.length}] : []
      };
    }

    const representativeSafePositions = new Set<number>();
    const memberSafePositions = new Set<number>();

    safetyWindowsInfo.forEach(window => {
      for (let x = window.xStart; x < window.xEnd; x++) {
        representativeSafePositions.add(x);
      }
      for (let y = window.yStart; y < window.yEnd; y++) {
        memberSafePositions.add(y);
      }
    });

    // Find gaps in representative sequence
    const representativeGaps: {start: number, end: number}[] = [];
    let gapStart = null;
    for (let i = 0; i <= representative.length; i++) {
      const isSafe = representativeSafePositions.has(i);
      if (!isSafe && gapStart === null) {
        gapStart = i;
      } else if (isSafe && gapStart !== null) {
        representativeGaps.push({start: gapStart, end: i});
        gapStart = null;
      }
    }
    if (gapStart !== null) {
      representativeGaps.push({start: gapStart, end: representative.length});
    }

    // Find gaps in member sequence
    const memberGaps: {start: number, end: number}[] = [];
    gapStart = null;
    for (let i = 0; i <= member.length; i++) {
      const isSafe = memberSafePositions.has(i);
      if (!isSafe && gapStart === null) {
        gapStart = i;
      } else if (isSafe && gapStart !== null) {
        memberGaps.push({start: gapStart, end: i});
        gapStart = null;
      }
    }
    if (gapStart !== null) {
      memberGaps.push({start: gapStart, end: member.length});
    }

    return { representativeGaps, memberGaps };
  }, [safetyWindowsInfo, representative, member]);

  // State for gap navigation
  const [currentGapType, setCurrentGapType] = useState<'representative' | 'member'>('representative');
  const [currentGapIndex, setCurrentGapIndex] = useState(0);
  const [hasManuallyUnselectedGap, setHasManuallyUnselectedGap] = useState(false);
  const [isNavigatingGaps, setIsNavigatingGaps] = useState(false); // Track if user is actively navigating

  const currentGaps = useMemo(() => 
    currentGapType === 'representative' ? gapRegions.representativeGaps : gapRegions.memberGaps, 
    [currentGapType, gapRegions]
  );
  const currentGap = useMemo(() => 
    currentGaps[currentGapIndex], 
    [currentGaps, currentGapIndex]
  );

  // Highly optimized gap highlighting - only highlight after user stops navigating
  const debouncedGapHighlight = useCallback((gapInfo: {type: 'representative' | 'member'; start: number; end: number} | null) => {
    // If user is actively navigating, don't highlight to prevent lag
    if (isNavigatingGaps) {
      onGapHighlight?.(null);
      return;
    }
    
    // Longer delay to ensure user has stopped navigating
    const timeoutId = setTimeout(() => {
      // Double-check that user isn't navigating before highlighting
      if (!isNavigatingGaps) {
        onGapHighlight?.(gapInfo);
      }
    }, 300); // Wait 300ms after navigation stops
    
    return () => clearTimeout(timeoutId);
  }, [onGapHighlight, isNavigatingGaps]);

  const handlePreviousGap = useCallback(() => {
    if (currentGaps.length === 0) return;
    
    // Mark that user is actively navigating to prevent laggy highlighting
    setIsNavigatingGaps(true);
    
    const newIndex = currentGapIndex > 0 ? currentGapIndex - 1 : currentGaps.length - 1;
    setCurrentGapIndex(newIndex);
    setHasManuallyUnselectedGap(false); // Reset manual unselection when navigating
    
    // Clear any existing highlighting immediately during navigation
    onGapHighlight?.(null);
    
    // Stop navigation state after a delay
    setTimeout(() => {
      setIsNavigatingGaps(false);
      
      // Only highlight if enabled and user hasn't manually unselected
      const newGap = currentGaps[newIndex];
      if (newGap && onGapHighlight && currentSettings.enableGapHighlighting && !hasManuallyUnselectedGap) {
        debouncedGapHighlight({
          type: currentGapType,
          start: newGap.start,
          end: newGap.end
        });
      }
    }, 200); // Allow navigation animation to complete
  }, [currentGaps, currentGapIndex, currentGapType, debouncedGapHighlight, currentSettings.enableGapHighlighting, onGapHighlight, hasManuallyUnselectedGap]);

  const handleNextGap = useCallback(() => {
    if (currentGaps.length === 0) return;
    
    // Mark that user is actively navigating to prevent laggy highlighting
    setIsNavigatingGaps(true);
    
    const newIndex = currentGapIndex < currentGaps.length - 1 ? currentGapIndex + 1 : 0;
    setCurrentGapIndex(newIndex);
    setHasManuallyUnselectedGap(false); // Reset manual unselection when navigating
    
    // Clear any existing highlighting immediately during navigation
    onGapHighlight?.(null);
    
    // Stop navigation state after a delay
    setTimeout(() => {
      setIsNavigatingGaps(false);
      
      // Only highlight if enabled and user hasn't manually unselected
      const newGap = currentGaps[newIndex];
      if (newGap && onGapHighlight && currentSettings.enableGapHighlighting && !hasManuallyUnselectedGap) {
        debouncedGapHighlight({
          type: currentGapType,
          start: newGap.start,
          end: newGap.end
        });
      }
    }, 200); // Allow navigation animation to complete
  }, [currentGaps, currentGapIndex, currentGapType, debouncedGapHighlight, currentSettings.enableGapHighlighting, onGapHighlight, hasManuallyUnselectedGap]);

  const handleGapTypeChange = useCallback((type: 'representative' | 'member') => {
    // Mark as navigating to prevent highlighting during type change
    setIsNavigatingGaps(true);
    
    setCurrentGapType(type);
    setCurrentGapIndex(0);
    setHasManuallyUnselectedGap(false); // Reset manual unselection when changing type
    
    // Clear highlighting immediately during type change
    onGapHighlight?.(null);
    
    // Stop navigation state after a delay
    setTimeout(() => {
      setIsNavigatingGaps(false);
      
      // Trigger gap highlighting for the new type's first gap only if enabled and not manually unselected
      const newGaps = type === 'representative' ? gapRegions.representativeGaps : gapRegions.memberGaps;
      if (newGaps.length > 0 && onGapHighlight && currentSettings.enableGapHighlighting && !hasManuallyUnselectedGap) {
        debouncedGapHighlight({
          type: type,
          start: newGaps[0].start,
          end: newGaps[0].end
        });
      }
    }, 200); // Allow UI to update before highlighting
  }, [gapRegions.representativeGaps, gapRegions.memberGaps, debouncedGapHighlight, currentSettings.enableGapHighlighting, hasManuallyUnselectedGap, onGapHighlight]);

  // Refs for synchronized scrolling of alignment sequences (DISABLED)
  // const xSequenceRef = useRef<HTMLSpanElement>(null);
  // const conservationRef = useRef<HTMLSpanElement>(null);
  // const ySequenceRef = useRef<HTMLSpanElement>(null);

  // Get current window index from external selection, return -1 if none selected
  const getCurrentWindowIndex = () => {
    if (selectedWindowId) {
      const index = safetyWindowsInfo.findIndex(window => window.id === selectedWindowId);
      return index !== -1 ? index : -1;
    }
    return -1; // No window selected
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

  // Simple gap sequence text (same as safety windows approach for performance)
  const gapSequenceText = useMemo(() => {
    if (!currentGap) return '';
    
    const sequence = currentGapType === 'representative' 
      ? representative.slice(currentGap.start, currentGap.end)
      : member.slice(currentGap.start, currentGap.end);
    
    return sequence;
  }, [currentGap, currentGapType, representative, member]);

  const currentWindow = currentWindowIndex >= 0 ? safetyWindowsInfo[currentWindowIndex] : null;
  useEffect(() => {
    if ((activeTab === 'visualization' || activeTab === 'general-info' || activeTab === 'safety-windows') && selectedWindowId && !currentSettings.enableSafetyWindowHighlighting) {
      onWindowHover?.(null);
    }
  }, [activeTab, selectedWindowId, onWindowHover, currentSettings.enableSafetyWindowHighlighting]);

  // Handle gap highlighting state changes
  useEffect(() => {
    // Reset manual gap unselection when switching to gap analysis tab
    if (activeTab === 'unsafe-windows') {
      setHasManuallyUnselectedGap(false);
    }
  }, [activeTab]);

  // Handle gap highlighting when tab or settings change
  useEffect(() => {
    // Clear gap highlighting when not on gap analysis tab or when highlighting is disabled
    if ((activeTab !== 'unsafe-windows' || !currentSettings.enableGapHighlighting) && onGapHighlight) {
      debouncedGapHighlight(null);
      return;
    }
    
    // Set gap highlighting when switching to gap analysis tab and highlighting is enabled
    // Only auto-highlight if user hasn't manually unselected
    if (activeTab === 'unsafe-windows' && onGapHighlight && currentSettings.enableGapHighlighting && !hasManuallyUnselectedGap) {
      if (currentGaps.length > 0 && currentGapIndex < currentGaps.length) {
        const currentGap = currentGaps[currentGapIndex];
        if (currentGap) {
          debouncedGapHighlight({
            type: currentGapType,
            start: currentGap.start,
            end: currentGap.end
          });
        }
      }
    }
  }, [activeTab, debouncedGapHighlight, currentSettings.enableGapHighlighting, hasManuallyUnselectedGap, currentGaps, currentGapIndex, currentGapType, onGapHighlight]);

  return (
    <div className="safety-windows-info-panel">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'general-info' ? 'active' : ''}`}
          onClick={() => setActiveTab('general-info')}
          title="View general alignment information and statistics"
        >
          <span className="tab-icon">📊</span>
          General Info
        </button>
        <button 
          className={`tab-button ${activeTab === 'safety-windows' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety-windows')}
          title="View and navigate safety windows"
        >
          <span className="tab-icon">🎯</span>
          Safety Windows
          {safetyWindowsInfo.length > 0 && (
            <span className="tab-badge">{safetyWindowsInfo.length}</span>
          )}
        </button>
         <button 
          className={`tab-button ${activeTab === 'unsafe-windows' ? 'active' : ''}`}
          onClick={() => setActiveTab('unsafe-windows')}
          title="Analyze gap regions and non-safe areas"
        >
          <span className="tab-icon">🔍</span>
          Unsafe Windows
        </button>
        <button 
          className={`tab-button ${activeTab === 'visualization' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualization')}
          title="Customize visualization settings"
        >
          <span className="tab-icon">⚙️</span>
          Visualization
        </button>
        <button 
          className={`tab-button ${activeTab === 'path-selection' ? 'active' : ''}`}
          onClick={() => setActiveTab('path-selection')}
          title="View path selection results and create custom alignments"
        >
          <span className="tab-icon">🎯</span>
          Path Selection
          {pathSelectionResult && (
            <span className="tab-badge">1</span>
          )}
        </button>
       
      </div>

      {/* Tab Content */}
      {activeTab === 'general-info' ? (
        <div className="general-info-content">
          <div className="panel-header">
            <h3>General Information</h3>
            <div className="panel-subtitle">
              Alignment overview and safety statistics
            </div>
          </div>
          
          <div className="stats-container">
            {/* Sequence Information */}
            <div className="stat-section">
              <h4>Sequence Information</h4>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Representative: <br/> {representativeDescriptor || 'Reference'}:</span>
                  <span className="stat-value">Length: {representative.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Member: <br/> {memberDescriptor || 'Member'}:</span>
                  <span className="stat-value">Length: {member.length}</span>
                </div>
              </div>
            </div>

            {/* Safety Window Statistics */}
            <div className="stat-section">
              <h4>Safety Window Statistics</h4>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Safety Windows:</span>
                  <span className="stat-value stat-highlight">{safetyWindowsInfo.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Representative Safe Positions:</span>
                  <span className="stat-value">{safetyStats.representativeSafePositions} / {representative.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Member Safe Positions:</span>
                  <span className="stat-value">{safetyStats.memberSafePositions} / {member.length}</span>
                </div>
              </div>
            </div>

            {/* Safety Percentages */}
            <div className="stat-section">
              <h4>Safety Percentages</h4>
              <div className="percentage-container">
                <div className="percentage-item">
                  <div className="percentage-header">
                    <span className="percentage-label">Representative Safety</span>
                    <span className="percentage-value">{safetyStats.representativeSafetyPercentage}%</span>
                  </div>
                  <div className="percentage-bar">
                    <div 
                      className="percentage-fill representative-fill" 
                      style={{ width: `${safetyStats.representativeSafetyPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="percentage-item">
                  <div className="percentage-header">
                    <span className="percentage-label">Member Safety</span>
                    <span className="percentage-value">{safetyStats.memberSafetyPercentage}%</span>
                  </div>
                  <div className="percentage-bar">
                    <div 
                      className="percentage-fill member-fill" 
                      style={{ width: `${safetyStats.memberSafetyPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="help-section">
              <div className="help-text">
                <strong>Safety Windows</strong> are regions where the EMERALD algorithm has high confidence in the alignment. 
                The safety percentage indicates what portion of each sequence is covered by these confident regions.
              </div>
              {safetyWindowsInfo.length > 0 && (
                <div className="help-text">
                  Switch to the <strong>Safety Windows</strong> tab to explore individual windows in detail.
                </div>
              )}
              <div className="help-text">
                Use the <strong>Gap Analysis</strong> tab to examine non-safe regions between safety windows.
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'safety-windows' ? (
        <div className="safety-windows-content">
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
                  disabled={safetyWindowsInfo.length === 0}
                >
                  <span className="nav-arrow">‹</span>
                </button>
                
                <div className="window-counter">
                  <span className={`current-window ${currentWindowIndex === -1 ? 'no-selection' : ''}`}>
                    {currentWindowIndex === -1 ? 'None' : currentWindowIndex + 1}
                  </span>
                  <span className="window-separator"> / </span>
                  <span className="total-windows">{safetyWindowsInfo.length}</span>
                </div>
                
                <button 
                  className="nav-button next-button"
                  onClick={handleNext}
                  disabled={safetyWindowsInfo.length === 0}
                >
                  <span className="nav-arrow">›</span>
                </button>
                
                <button 
                  className="unselect-button"
                  onClick={() => {
                    onWindowHover?.(null);
                    onWindowSelect?.(null);
                  }}
                  title="Clear safety window highlighting"
                >
                  ✕ Unselect
                </button>
              </div>

              {/* Current Window Display */}
              {currentWindow ? (
                <div className="current-window-container">
                  <div
                    className={`safety-window-item current-window ${
                      hoveredWindowId === currentWindow.id ? 'hovered' : ''
                    }`}
                    onMouseEnter={() => currentSettings.enableSafetyWindowHighlighting && onWindowHover?.(currentWindow.id)}
                    onMouseLeave={() => currentSettings.enableSafetyWindowHighlighting && onWindowHover?.(null)}
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
                          <div className="sequence-container">
                            <div className="sequence-segment">
                              {formatSequenceSegment(representative, currentWindow.xStart, currentWindow.xEnd)}
                            </div>
                            <button 
                              className="copy-button"
                              onClick={() => {
                                const sequence = formatSequenceSegment(representative, currentWindow.xStart, currentWindow.xEnd);
                                copyToClipboard(sequence, 'x-sequence');
                              }}
                              title="Copy to clipboard"
                            >
                              {copyStatus?.id === 'x-sequence' ? (
                                copyStatus.success ? '✓ Copied!' : '❌ Failed'
                              ) : (
                                <span className="copy-icon">📋</span>
                              )}
                            </button>
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
                          <div className="sequence-container">
                            <div className="sequence-segment">
                              {formatSequenceSegment(member, currentWindow.yStart, currentWindow.yEnd)}
                            </div>
                            <button 
                              className="copy-button"
                              onClick={() => {
                                const sequence = formatSequenceSegment(member, currentWindow.yStart, currentWindow.yEnd);
                                copyToClipboard(sequence, 'y-sequence');
                              }}
                              title="Copy to clipboard"
                            >
                              {copyStatus?.id === 'y-sequence' ? (
                                copyStatus.success ? '✓ Copied!' : '❌ Failed'
                              ) : (
                                <span className="copy-icon">📋</span>
                              )}
                            </button>
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
              ) : (
                <div className="no-selection-state">
                  <div className="no-selection-message">
                    <div className="no-selection-icon">🎯</div>
                    <h4>No Safety Window Selected</h4>
                    <p>Use the navigation buttons above to select a safety window to view details, or the visualization will show all windows without highlighting.</p>
                    <button 
                      className="select-first-button"
                      onClick={() => {
                        if (safetyWindowsInfo.length > 0) {
                          onWindowSelect?.(safetyWindowsInfo[0].id);
                        }
                      }}
                    >
                      Select First Window
                    </button>
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
              Use ← → arrow keys or navigation buttons to cycle through safety windows. Click "Unselect" to clear highlighting and enter an unselected state where no window is highlighted. Full sequences are displayed for each window.
            </div>
          </div>
        </div>
      ) : activeTab === 'visualization' ? (
        <div className="visualization-content">
          <VisualizationSettingsPanel
            settings={currentSettings}
            onSettingsChange={(settings) => onVisualizationSettingsChange?.(settings)}
          />
        </div>
      ) : activeTab === 'unsafe-windows' ? (
        <div className="unsafe-windows-content">
          <div className="panel-header">
            <h3>Gap Analysis</h3>
            <div className="panel-subtitle">
              Explore non-safe regions between safety windows
            </div>
          </div>
          
          <div className="stats-container">
            {/* Gap Type Selector */}
            <div className="stat-section">
              <h4>Select Sequence</h4>
              <div className="gap-type-selector">
                <button 
                  className={`gap-type-button ${currentGapType === 'representative' ? 'active' : ''}`}
                  onClick={() => handleGapTypeChange('representative')}
                  title={`${representativeDescriptor || 'Representative'} (${gapRegions.representativeGaps.length} gaps)`}
                >
                  <span className="button-main-text">
                    {(representativeDescriptor || 'Representative').length > 12 
                      ? (representativeDescriptor || 'Representative').substring(0, 12) + '...'
                      : (representativeDescriptor || 'Representative')
                    }
                  </span>
                  <span className="button-gap-count">({gapRegions.representativeGaps.length})</span>
                </button>
                <button 
                  className={`gap-type-button ${currentGapType === 'member' ? 'active' : ''}`}
                  onClick={() => handleGapTypeChange('member')}
                  title={`${memberDescriptor || 'Member'} (${gapRegions.memberGaps.length} gaps)`}
                >
                  <span className="button-main-text">
                    {(memberDescriptor || 'Member').length > 12 
                      ? (memberDescriptor || 'Member').substring(0, 12) + '...'
                      : (memberDescriptor || 'Member')
                    }
                  </span>
                  <span className="button-gap-count">({gapRegions.memberGaps.length})</span>
                </button>
              </div>
            </div>

            {/* Gap Navigation */}
            <div className="stat-section">
              <h4>Gap Regions</h4>
              {currentGaps.length > 0 ? (
                <div className="gap-navigation-container">
                  <div className="gap-nav-controls">
                    <button 
                      className="gap-nav-button"
                      onClick={handlePreviousGap}
                      disabled={currentGaps.length <= 1}
                      title="Previous gap"
                    >
                      ◀
                    </button>
                    <span className="gap-counter">
                      {currentGaps.length > 0 ? `${currentGapIndex + 1} / ${currentGaps.length}` : '0 / 0'}
                    </span>
                    <button 
                      className="gap-nav-button"
                      onClick={handleNextGap}
                      disabled={currentGaps.length <= 1}
                      title="Next gap"
                    >
                      ▶
                    </button>
                    
                    <button 
                      className="gap-unselect-button"
                      onClick={() => {
                        setHasManuallyUnselectedGap(true);
                        debouncedGapHighlight(null);
                      }}
                      title="Clear gap highlighting"
                    >
                      ✕ Unselect
                    </button>
                  </div>
                  
                  {currentGap && (
                    <div className="gap-info">
                      <div className="gap-info-header">
                        <span className="gap-info-title">
                          Gap {currentGapIndex + 1}
                        </span>
                        <span className="gap-info-position">
                          Position {currentGap.start + 1}-{currentGap.end} 
                          (Gap length: {currentGap.end - currentGap.start})
                        </span>
                      </div>
                      
                      <div className="gap-sequence-display">
                        <div className="sequence-container">
                          <div className="sequence-segment">
                            {gapSequenceText}
                          </div>
                          <button 
                            className="copy-button"
                            onClick={() => {
                              copyToClipboard(gapSequenceText, 'gap-sequence');
                            }}
                            title="Copy to clipboard"
                          >
                            {copyStatus?.id === 'gap-sequence' ? (
                              copyStatus.success ? '✓ Copied!' : '❌ Failed'
                            ) : (
                              <span className="copy-icon">📋</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-gaps-message">
                  <p>No gap regions found in {currentGapType === 'representative' ? (representativeDescriptor || 'representative') : (memberDescriptor || 'member')} sequence.</p>
                  <p>All positions are covered by safety windows.</p>
                </div>
              )}
            </div>

            {/* Summary Statistics */}
            <div className="stat-section">
              <h4>Gap Summary</h4>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Gap Regions</span>
                  <span className="stat-value">{currentGaps.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Unsafe Amino Acids</span>
                  <span className="stat-value">
                    {currentGaps.reduce((total, gap) => total + (gap.end - gap.start), 0)}
                  </span>
                </div>
                
              </div>
            </div>

            {/* Help Text */}
            <div className="help-section">
              <div className="help-text">
                <strong>Gap Regions</strong> are areas not covered by safety windows. These represent sections where 
                the EMERALD algorithm has lower confidence in the alignment quality.
              </div>
              <div className="help-text">
                Use the navigation controls to explore individual gap regions and examine the sequence content 
                in areas of uncertain alignment. Click "Unselect" to clear gap highlighting.
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'path-selection' ? (
        <div className="path-selection-content">
          {!pathSelectionResult ? (
            <div className="panel-header">
              <h3>Path Selection</h3>
              <div className="panel-subtitle">
                Click on edges in the graph to select a custom alignment path
              </div>
            </div>
          ) : (
            <div className="panel-header">
              <h3>Path Selection Result</h3>
              <div className="panel-actions">
                {onClearPath && (
                  <button 
                    className="clear-button" 
                    onClick={() => {
                      console.log('Clear path button clicked');
                      onClearPath();
                    }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="path-selection-body">
            {!selectedEdges && !pathSelectionResult ? (
              <div className="no-selection">
                <div className="no-selection-message">
                  <div className="no-selection-icon">🎯</div>
                  <h4>No Path Selected</h4>
                  <p>Click on any edge in the alignment graph to start building a custom alignment path.</p>
                  <div className="help-text">
                    <strong>How to use:</strong>
                    <ul>
                      <li>Path selection is only active when you're on this tab</li>
                      <li>Click on any edge in the alignment graph</li>
                      <li>The path will be selected (highlighted in orange)</li>
                      <li>Press the "Generate Alignment" button to create the alignment</li>
                    </ul>
                    <p><strong>Note:</strong> Path selection is disabled on other tabs to avoid accidental selections.</p>
                  </div>
                </div>
              </div>
            ) : selectedEdges && !pathSelectionResult ? (
              <div className="edges-selected-content">
                <div className="selected-edges-info">
                  <div className="selected-edges-icon">🔗</div>
                  <h4>Path Selected</h4>
                  <p>You have selected {selectedEdges.selectedEdges.length} edges. Click the button below to generate a complete alignment path.</p>
                  
                  <div className="generate-alignment-section">
                    <button 
                      className="generate-alignment-button"
                      onClick={() => {
                        console.log('Generate alignment button clicked');
                        if (onGeneratePath) {
                          console.log('Calling onGeneratePath');
                          onGeneratePath();
                        } else {
                          console.log('onGeneratePath is not defined');
                        }
                      }}
                      disabled={!selectedEdges.isValid}
                    >
                      Generate Complete Path
                    </button>
                    <p className="generate-help-text">
                      This will create a complete alignment path from (0,0) to the end that goes through your selected edges.
                    </p>
                  </div>
                </div>
              </div>
            ) : pathSelectionResult ? (
              <div className="path-result-content">
                <div className="result-stats">
                  <div className="stat-item">
                    <label>Path Length:</label>
                    <span>{pathSelectionResult.pathLength} edges</span>
                  </div>
                  <div className="stat-item">
                    <label>Distance from Optimal:</label>
                    <span>{pathSelectionResult.distanceFromOptimal}%</span>
                  </div>
                </div>

                <div className="alignment-info">
                  <h4>Alignment Details</h4>
                  <p>The custom path alignment is displayed in the main sequence alignment viewer below the graph. You can switch between the optimal alignment and your custom path using the tabs.</p>
                  
                  <div className="quick-actions">
                    <button 
                      className="copy-path-button"
                      onClick={() => {
                        const pathData = `Path Length: ${pathSelectionResult.pathLength}\nDistance from Optimal: ${pathSelectionResult.distanceFromOptimal}%\nRepresentative: ${pathSelectionResult.alignedRepresentative}\nMember: ${pathSelectionResult.alignedMember}`;
                        navigator.clipboard.writeText(pathData).then(() => {
                          console.log('Path data copied to clipboard');
                        });
                      }}
                    >
                      📋 Copy Path Data
                    </button>
                  </div>
                </div>

                <div className="usage-info">
                  <h4>Path Selection Info</h4>
                  <ul>
                    <li>The path starts from (0,0) and ends at the bottom-right corner</li>
                    <li>The path goes through all your selected edges in optimal order</li>
                    <li>Distance from Optimal shows how much your path differs from the optimal alignment (0% = identical, 100% = completely different)</li>
                    <li>Diagonal moves (1,1) represent character alignments</li>
                    <li>Horizontal moves represent gaps in the member sequence</li>
                    <li>Vertical moves represent gaps in the representative sequence</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SafetyWindowsInfoPanel;
