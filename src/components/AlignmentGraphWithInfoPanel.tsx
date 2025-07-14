import React, { useState } from 'react';
import PointGridPlot from './PointGridPlot';
import SafetyWindowsInfoPanel from './SafetyWindowsInfoPanel';
import SequenceAlignmentViewer from './SequenceAlignmentViewer';
import type { Alignment } from '../types/PointGrid';
import './AlignmentGraphWithInfoPanel.css';

interface AlignmentGraphWithInfoPanelProps {
  representative: string;
  member: string;
  representativeDescriptor?: string;
  memberDescriptor?: string;
  alignments: Alignment[];
  width?: number;
  height?: number;
  showMinimap?: boolean;
  minimapSize?: number;
  minimapPadding?: number;
}

export const AlignmentGraphWithInfoPanel: React.FC<AlignmentGraphWithInfoPanelProps> = ({
  representative,
  member,
  representativeDescriptor,
  memberDescriptor,
  alignments,
  width = 900,
  height = 900,
  showMinimap = true,
  minimapSize = 250,
  minimapPadding = 100
}) => {
  const [selectedSafetyWindowId, setSelectedSafetyWindowId] = useState<string | null>(null);
  const [hoveredSafetyWindowId, setHoveredSafetyWindowId] = useState<string | null>(null);

  // Extract safety windows from alignments
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Initialize selection to first window if available
  React.useEffect(() => {
    if (safetyWindows.length > 0 && !selectedSafetyWindowId) {
      setSelectedSafetyWindowId('safety-window-0');
    }
  }, [safetyWindows.length, selectedSafetyWindowId]);

  const handleSafetyWindowHover = (windowId: string | null) => {
    setHoveredSafetyWindowId(windowId);
    // When hovering over a window, make it the selected window
    if (windowId) {
      setSelectedSafetyWindowId(windowId);
    }
  };

  const handleSafetyWindowSelect = (windowId: string | null) => {
    setSelectedSafetyWindowId(windowId);
  };

  const handleNavigateToPrevious = () => {
    if (safetyWindows.length === 0) return;
    
    const currentIndex = selectedSafetyWindowId 
      ? parseInt(selectedSafetyWindowId.split('-')[2]) 
      : 0;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : safetyWindows.length - 1;
    setSelectedSafetyWindowId(`safety-window-${newIndex}`);
  };

  const handleNavigateToNext = () => {
    if (safetyWindows.length === 0) return;
    
    const currentIndex = selectedSafetyWindowId 
      ? parseInt(selectedSafetyWindowId.split('-')[2]) 
      : 0;
    const newIndex = currentIndex < safetyWindows.length - 1 ? currentIndex + 1 : 0;
    setSelectedSafetyWindowId(`safety-window-${newIndex}`);
  };

  return (
    <div className="alignment-graph-with-info-panel">
      {/* Display sequence alignment if available */}
      {alignments.some(a => a.textAlignment) && (
        <div className="sequence-alignment-viewer-container">
          <SequenceAlignmentViewer 
            alignment={alignments.find(a => a.textAlignment)?.textAlignment!} 
          />
        </div>
      )}
      
      <div className="graph-and-info-container" style={{ display: 'flex', gap: '20px', width: '100%' }}>
        <div className="graph-container">
          <PointGridPlot
            representative={representative}
            member={member}
            alignments={alignments}
            width={width}
            height={height}
            xDomain={[0, representative.length]}
            yDomain={[0, member.length]}
            showMinimap={showMinimap}
            minimapSize={minimapSize}
            minimapPadding={minimapPadding}
            selectedSafetyWindowId={selectedSafetyWindowId}
            hoveredSafetyWindowId={hoveredSafetyWindowId}
            onSafetyWindowHover={handleSafetyWindowHover}
            onSafetyWindowSelect={handleSafetyWindowSelect}
          />
        </div>
        
        <div className="info-panel-container">
          <SafetyWindowsInfoPanel
            safetyWindows={safetyWindows}
            selectedWindowId={selectedSafetyWindowId}
            hoveredWindowId={hoveredSafetyWindowId}
            onWindowHover={handleSafetyWindowHover}
            onNavigateToPrevious={handleNavigateToPrevious}
            onNavigateToNext={handleNavigateToNext}
            representative={representative}
            member={member}
            representativeDescriptor={representativeDescriptor}
            memberDescriptor={memberDescriptor}
          />
        </div>
      </div>
    </div>
  );
};

export default AlignmentGraphWithInfoPanel;
