import React, { useState, useRef } from 'react';
import PointGridPlot from './PointGridPlot';
import type { PointGridPlotRef } from './PointGridPlot';
import SafetyWindowsInfoPanel from './SafetyWindowsInfoPanel';
import SequenceAlignmentViewer from './SequenceAlignmentViewer';
import type { Alignment, PathSelectionResult, MultipleSelectedEdgesState } from '../../types/PointGrid';
import type { VisualizationSettings } from './VisualizationSettingsPanel';
import './AlignmentGraphWithInfoPanel.css';
import { AlignmentStructuresViewer } from '../structure/AlignmentStructuresViewer';
import { validatePath, generateAlignmentFromPath, buildPathThroughSelectedEdges, calculateDistanceFromOptimalPath } from '../../utils/canvas/pathSelection';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';


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
  // Export functionality props
  alpha?: number;
  delta?: number;
  accessionA?: string;
  accessionB?: string;
  gapCost?: number;
  startGap?: number;
  costMatrixType?: number;
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
  onPointGridRef,
  alpha,
  delta,
  accessionA,
  accessionB,
  gapCost: _gapCost,
  startGap: _startGap,
  costMatrixType: _costMatrixType
}) => {
  const [selectedSafetyWindowId, setSelectedSafetyWindowId] = useState<string | null>(null);
  const [hoveredSafetyWindowId, setHoveredSafetyWindowId] = useState<string | null>(null);
  const [highlightedGap, setHighlightedGap] = useState<{type: 'representative' | 'member'; start: number; end: number} | null>(null);
  const [hasManuallyUnselected, setHasManuallyUnselected] = useState(false);
  
  // Feedback notifications hook
  const { notifySuccess, notifyError } = useFeedbackNotifications();
  
  // Create ref for the PointGridPlot component
  const pointGridRef = useRef<PointGridPlotRef>(null);
  
  // Canvas ref for export functionality
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Default visualization settings
  const [visualizationSettings, setVisualizationSettings] = useState<VisualizationSettings>({
    showAxes: true,
    showSequenceCharacters: true,
    showSequenceIndices: true,
    showGrid: true,
    showMinimap: true,
    showSafetyWindows: true,
    showAlignmentEdges: true,
    showAlignmentDots: true,
    showOptimalPath: true,
    enableSafetyWindowHighlighting: true,
    enableGapHighlighting: true,
    showAxisDescriptors: true,
    enablePathSelection: true  // Enable by default for better UX
  });
  
  // NEW: Path selection state
  const [pathSelectionResult, setPathSelectionResult] = useState<PathSelectionResult | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<MultipleSelectedEdgesState | null>(null);
  const [generatedPath, setGeneratedPath] = useState<import('../../utils/canvas/pathSelection').SelectedPath | null>(null);
  
  // Active tab state for side panel
  const [activeTab, setActiveTab] = useState<'general-info' | 'safety-windows' | 'unsafe-windows' | 'visualization' | 'path-selection' | 'export'>('general-info');

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

  // NEW: Handle edge selection (without immediate path generation)
  const handleEdgeSelected = (selectedEdgeState: MultipleSelectedEdgesState) => {
    console.log('handleEdgeSelected called with:', selectedEdgeState);
    console.log('New selected edges count:', selectedEdgeState.selectedEdges.length);
    console.log('New selected edges:', selectedEdgeState.selectedEdges);
    
    setSelectedEdges(selectedEdgeState);
    console.log('Updated selectedEdges state');
  };

  // NEW: Generate path from selected edges
  const handleGeneratePath = () => {
    console.log('handleGeneratePath called');
    console.log('selectedEdges state:', selectedEdges);
    console.log('selectedEdges.selectedEdges array:', selectedEdges?.selectedEdges);
    console.log('selectedEdges.selectedEdges.length:', selectedEdges?.selectedEdges?.length);
    
    if (!selectedEdges || selectedEdges.selectedEdges.length === 0) {
      console.log('No selected edges, returning early');
      notifyError(
        'No Edges Selected', 
        'Please select at least one edge in the alignment graph before generating a path'
      );
      return;
    }
    
    console.log('Building path through', selectedEdges.selectedEdges.length, 'selected edges');
    
    // Build path that goes through all selected edges
    const allEdges = alignments.flatMap(alignment => alignment.edges);
    console.log('Total available edges:', allEdges.length);
    
    const path = buildPathThroughSelectedEdges(
      selectedEdges.selectedEdges, 
      allEdges, 
      representative.length, 
      member.length
    );
    console.log('Generated path:', path);
    console.log('Generated path edge count:', path.edges.length);
    console.log('Selected edges passed to buildPathThroughSelectedEdges:', selectedEdges.selectedEdges);
    
    // Debug: Let's validate the path step by step to see what fails
    console.log('=== PATH VALIDATION DEBUG ===');
    console.log('path.isValid:', path.isValid);
    console.log('path.edges.length:', path.edges.length);
    
    let validationFailureReason = '';
    
    if (!path.isValid || path.edges.length === 0) {
      validationFailureReason = `Path is marked invalid or has no edges (isValid: ${path.isValid}, length: ${path.edges.length})`;
    } else {
      // Check each edge exists
      for (let i = 0; i < path.edges.length; i++) {
        const pathEdge = path.edges[i];
        const edgeExists = allEdges.some(edge =>
          edge.from[0] === pathEdge.from[0] &&
          edge.from[1] === pathEdge.from[1] &&
          edge.to[0] === pathEdge.to[0] &&
          edge.to[1] === pathEdge.to[1]
        );
        
        if (!edgeExists) {
          validationFailureReason = `Edge ${i} doesn't exist in available edges: from (${pathEdge.from[0]}, ${pathEdge.from[1]}) to (${pathEdge.to[0]}, ${pathEdge.to[1]})`;
          break;
        }
        
        // Check direction
        if (pathEdge.to[0] < pathEdge.from[0] || pathEdge.to[1] < pathEdge.from[1]) {
          validationFailureReason = `Edge ${i} has invalid direction: from (${pathEdge.from[0]}, ${pathEdge.from[1]}) to (${pathEdge.to[0]}, ${pathEdge.to[1]}) - only right/down movement allowed`;
          break;
        }
      }
      
      // Check continuity if no other issues found
      if (!validationFailureReason) {
        for (let i = 0; i < path.edges.length - 1; i++) {
          const currentEdge = path.edges[i];
          const nextEdge = path.edges[i + 1];
          
          if (currentEdge.to[0] !== nextEdge.from[0] || currentEdge.to[1] !== nextEdge.from[1]) {
            validationFailureReason = `Path discontinuity between edge ${i} ending at (${currentEdge.to[0]}, ${currentEdge.to[1]}) and edge ${i+1} starting at (${nextEdge.from[0]}, ${nextEdge.from[1]})`;
            break;
          }
        }
      }
    }
    
    console.log('Validation failure reason:', validationFailureReason);
    console.log('=== END DEBUG ===');
    
    // Validate the path
    if (validatePath(path, allEdges)) {
      console.log('Path is valid, generating alignment');
      
      // Set the generated path for visualization
      setGeneratedPath(path);
      
      // Generate alignment from path
      const alignmentResult = generateAlignmentFromPath(path, representative, member);
      console.log('Alignment result:', alignmentResult);
      
      // Calculate distance from optimal path
      const distanceFromOptimal = calculateDistanceFromOptimalPath(path, alignments);
      console.log('Distance from optimal:', distanceFromOptimal + '%');
      
      // Create path selection result
      const result: PathSelectionResult = {
        alignedRepresentative: alignmentResult.alignedRep,
        alignedMember: alignmentResult.alignedMem,
        score: alignmentResult.score,
        pathLength: path.edges.length,
        distanceFromOptimal: distanceFromOptimal
      };
      
      setPathSelectionResult(result);
      console.log('Path generated and state updated:', result);
      
      // Show success feedback notification
      notifySuccess(
        'Path Generated Successfully!', 
        `Generated path with ${path.edges.length} edges (${distanceFromOptimal.toFixed(1)}% from optimal)`
      );
    } else {
      console.warn('Invalid path generated from selected edges');
      console.warn('Path details:', { isValid: path.isValid, edgeCount: path.edges.length });
      
      const selectedEdgeCount = selectedEdges.selectedEdges.length;
      const generatedPathLength = path.edges.length;
      
      // Create a more informative error message
      let errorMessage: string;
      if (generatedPathLength === 0) {
        errorMessage = `Failed to generate any path from your ${selectedEdgeCount} selected edge${selectedEdgeCount === 1 ? '' : 's'}. This likely means the selected edges cannot be connected due to missing intermediate edges in the graph.`;
      } else if (!path.isValid) {
        errorMessage = `The path construction failed during validation. Generated ${generatedPathLength} edges but the path contains invalid moves or discontinuities. Check the browser console for detailed error information.`;
      } else {
        errorMessage = `Path generation failed for unknown reasons. Generated ${generatedPathLength} edges from ${selectedEdgeCount} selected edge${selectedEdgeCount === 1 ? '' : 's'} but validation failed.`;
      }
      
      notifyError(
        'Path Generation Failed', 
        errorMessage
      );
    }
  };

  // Clear path selection
  const handleClearPath = () => {
    console.log('handleClearPath called');
    setPathSelectionResult(null);
    setSelectedEdges(null);
    setGeneratedPath(null);
    // Also clear the selected path in the PointGridPlot component
    if (pointGridRef.current?.clearSelectedPath) {
      pointGridRef.current.clearSelectedPath();
    }
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
            showSequenceCharacters={visualizationSettings.showSequenceCharacters}
            showSequenceIndices={visualizationSettings.showSequenceIndices}
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
            enablePathSelection={visualizationSettings.enablePathSelection && activeTab === 'path-selection'}
            onEdgeSelected={handleEdgeSelected}
            generatedPath={generatedPath}
            ref={(pointGridElement) => {
              // Store the PointGridPlot ref
              pointGridRef.current = pointGridElement;
              
              // Store canvas ref for internal use
              if (pointGridElement) {
                canvasRef.current = pointGridElement.canvas;
              }
              
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
            pathSelectionResult={pathSelectionResult}
            selectedEdges={selectedEdges}
            onClearPath={handleClearPath}
            onGeneratePath={handleGeneratePath}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            canvasRef={canvasRef}
            pointGridRef={pointGridRef}
            alpha={alpha}
            delta={delta}
            accessionA={accessionA}
            accessionB={accessionB}
          />
        </div>
      </div>
      
      <AlignmentStructuresViewer/>
      {/* Display sequence alignment if available OR path selection result exists */}
      {(alignments.some(a => a.textAlignment) || pathSelectionResult) && (
        <div className="sequence-alignment-viewer-container">
          <SequenceAlignmentViewer 
            alignment={alignments.find(a => a.textAlignment)?.textAlignment} 
            pathSelectionResult={pathSelectionResult}
            representativeDescriptor={representativeDescriptor}
            memberDescriptor={memberDescriptor}
          />
        </div>
      )}
    </div>
  );
};

export default AlignmentGraphWithInfoPanel;
