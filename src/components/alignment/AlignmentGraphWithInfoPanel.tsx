import React, { useState, useRef } from 'react';
import PointGridPlot from './PointGridPlot';
import type { PointGridPlotRef } from './PointGridPlot';
import SafetyWindowsInfoPanel from './SafetyWindowsInfoPanel';
import SequenceAlignmentViewer from './SequenceAlignmentViewer';
import type { Alignment } from '../../types/PointGrid';
import type { VisualizationSettings } from './VisualizationSettingsPanel';
import './AlignmentGraphWithInfoPanel.css';
import { AlignmentStructuresViewer } from '../structure/AlignmentStructuresViewer'


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
  const [highlightedGap, setHighlightedGap] = useState<{type: 'representative' | 'member'; start: number; end: number} | null>(null);
  const [hasManuallyUnselected, setHasManuallyUnselected] = useState(false);
  
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
    showAlignmentDots: true,
    showOptimalPath: true,
    enableSafetyWindowHighlighting: true,
    enableGapHighlighting: true,
    showAxisDescriptors: true
  });

  // Extract safety windows from alignments
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Initialize selection to first window if available, but only if user hasn't manually unselected
  React.useEffect(() => {
    if (safetyWindows.length > 0 && !selectedSafetyWindowId && !hasManuallyUnselected) {
      setSelectedSafetyWindowId('safety-window-0');
    }
  }, [safetyWindows.length, selectedSafetyWindowId, hasManuallyUnselected]);

  const handleSafetyWindowHover = (windowId: string | null) => {
    // Only update hover state if highlighting is enabled
    if (visualizationSettings.enableSafetyWindowHighlighting) {
      setHoveredSafetyWindowId(windowId);
      // When hovering over a window, make it the selected window
      if (windowId) {
        setSelectedSafetyWindowId(windowId);
        setHasManuallyUnselected(false);
      }
    }
  };

  const handleSafetyWindowSelect = (windowId: string | null) => {
    setSelectedSafetyWindowId(windowId);
    if (windowId === null) {
      // User manually unselected
      setHasManuallyUnselected(true);
      setHoveredSafetyWindowId(null);
    } else {
      // User selected a window, reset the manual unselection flag
      setHasManuallyUnselected(false);
    }
  };

  const handleNavigateToPrevious = () => {
    if (safetyWindows.length === 0) return;
    
    if (!selectedSafetyWindowId) {
      // No window selected, go to last window
      setSelectedSafetyWindowId(`safety-window-${safetyWindows.length - 1}`);
    } else {
      const currentIndex = parseInt(selectedSafetyWindowId.split('-')[2]);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : safetyWindows.length - 1;
      setSelectedSafetyWindowId(`safety-window-${newIndex}`);
    }
    setHasManuallyUnselected(false); // Reset manual unselection when navigating
  };

  const handleNavigateToNext = () => {
    if (safetyWindows.length === 0) return;
    
    if (!selectedSafetyWindowId) {
      // No window selected, go to first window
      setSelectedSafetyWindowId('safety-window-0');
    } else {
      const currentIndex = parseInt(selectedSafetyWindowId.split('-')[2]);
      const newIndex = currentIndex < safetyWindows.length - 1 ? currentIndex + 1 : 0;
      setSelectedSafetyWindowId(`safety-window-${newIndex}`);
    }
    setHasManuallyUnselected(false); // Reset manual unselection when navigating
  };

  return (
    <div className="alignment-graph-with-info-panel">
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
            showOptimalPath={visualizationSettings.showOptimalPath}
            minimapSize={minimapSize}
            minimapPadding={minimapPadding}
            selectedSafetyWindowId={selectedSafetyWindowId}
            hoveredSafetyWindowId={hoveredSafetyWindowId}
            onSafetyWindowHover={handleSafetyWindowHover}
            onSafetyWindowSelect={handleSafetyWindowSelect}
            highlightedGap={highlightedGap}
            representativeDescriptor={visualizationSettings.showAxisDescriptors ? representativeDescriptor : undefined}
            memberDescriptor={visualizationSettings.showAxisDescriptors ? memberDescriptor : undefined}
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
            onGapHighlight={setHighlightedGap}
            onWindowSelect={handleSafetyWindowSelect}
          />
        </div>
      </div>
      
      <AlignmentStructuresViewer/>
            {/* Display sequence alignment if available */}
      {alignments.some(a => a.textAlignment) && (
        <div className="sequence-alignment-viewer-container">
          <SequenceAlignmentViewer 
            alignment={alignments.find(a => a.textAlignment)?.textAlignment!} 
          />
        </div>
      )}
    </div>
  );
};

export default AlignmentGraphWithInfoPanel;
