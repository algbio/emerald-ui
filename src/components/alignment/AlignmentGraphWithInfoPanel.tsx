import React, { useState, useRef } from 'react';
import PointGridPlot from './PointGridPlot';
import type { PointGridPlotRef } from './PointGridPlot';
import SafetyWindowsInfoPanel from './SafetyWindowsInfoPanel';
import SequenceAlignmentViewer from './SequenceAlignmentViewer';
import type { Alignment } from '../../types/PointGrid';
import type { VisualizationSettings } from './VisualizationSettingsPanel';
import './AlignmentGraphWithInfoPanel.css';

interface AlignmentGraphWithInfoPanelProps {
  representative: string;
  member: string;
  representativeDescriptor?: string;
  memberDescriptor?: string;
  alignments: Alignment[];
  width?: number;
  height?: number;
  minimapSize?: number;
  minimapPadding?: number;
  onCanvasRef?: (ref: React.RefObject<HTMLCanvasElement | null>) => void;
  onPointGridRef?: (ref: React.RefObject<PointGridPlotRef>) => void;
}

export const AlignmentGraphWithInfoPanel: React.FC<AlignmentGraphWithInfoPanelProps> = ({
  representative,
  member,
  representativeDescriptor,
  memberDescriptor,
  alignments,
  width = 900,
  height = 900,
  minimapSize = 250,
  minimapPadding = 100,
  onCanvasRef,
  onPointGridRef
}) => {
  const [selectedSafetyWindowId, setSelectedSafetyWindowId] = useState<string | null>(null);
  const [hoveredSafetyWindowId, setHoveredSafetyWindowId] = useState<string | null>(null);
  
  // Create ref for the PointGridPlot component
  const pointGridRef = useRef<PointGridPlotRef>(null);
  
  // Default visualization settings
  const [visualizationSettings, setVisualizationSettings] = useState<VisualizationSettings>({
    showAxes: true,
    showAxisLabels: true,
    showGrid: true,
    showMinimap: true,
    showSafetyWindows: true,
    showAlignmentEdges: true,
    showAlignmentDots: true
  });

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
    // ... existing code
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
            showMinimap={visualizationSettings.showMinimap}
            showAxes={visualizationSettings.showAxes}
            showAxisLabels={visualizationSettings.showAxisLabels}
            showGrid={visualizationSettings.showGrid}
            showSafetyWindows={visualizationSettings.showSafetyWindows}
            showAlignmentEdges={visualizationSettings.showAlignmentEdges}
            showAlignmentDots={visualizationSettings.showAlignmentDots}
            minimapSize={minimapSize}
            minimapPadding={minimapPadding}
            selectedSafetyWindowId={selectedSafetyWindowId}
            hoveredSafetyWindowId={hoveredSafetyWindowId}
            onSafetyWindowHover={handleSafetyWindowHover}
            onSafetyWindowSelect={handleSafetyWindowSelect}
            ref={(pointGridElement) => {
              // Store the PointGridPlot ref
              pointGridRef.current = pointGridElement;
              
              // Extract canvas and pass to parent if needed
              if (onCanvasRef && pointGridElement) {
                const canvasRefObj = { current: pointGridElement.canvas };
                onCanvasRef(canvasRefObj);
              }
              
              // Pass the PointGridPlot ref to parent if needed
              if (onPointGridRef && pointGridElement) {
                const pointGridRefObj = { current: pointGridElement };
                onPointGridRef(pointGridRefObj);
              }
            }}
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
            visualizationSettings={visualizationSettings}
            onVisualizationSettingsChange={setVisualizationSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default AlignmentGraphWithInfoPanel;
