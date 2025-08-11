import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import * as d3 from "d3";
import { usePointGridScales } from '../../hooks/usePointGridScales';
import { usePointGridTicks } from '../../hooks/usePointGridTicks';
import { 
  drawSafetyWindows, 
  drawAxes, 
  drawAxisLabels, 
  drawGridLines, 
  drawHoverHighlight,
  drawSafetyWindowHighlight,
  drawGapHighlightOptimized,
  findSafetyWindowsForCell,
  drawMinimap,
  handleMinimapInteraction as handleMinimapInteractionUtil,
  isMouseInMinimap
} from '../../utils/canvas';
import { renderGraph, findClosestEdge, getAllEdges } from '../../utils/canvas/graphRenderer';
import { buildPathFromEdge, generateAlignmentFromPath, validatePath, type SelectedPath } from '../../utils/canvas/pathSelection';
import type { SafetyWindowBounds } from '../../utils/canvas';
import type { PointGridPlotProps, Alignment, PathSelectionResult } from '../../types/PointGrid';

// Extended ref interface that includes export functionality
export interface PointGridPlotRef {
  canvas: HTMLCanvasElement | null;
  clearSelectedPath: () => void;
  getExportData: () => {
    alignments: Alignment[];
    representative: string;
    member: string;
    xTicks: Array<{value: number; label: string}>;
    yTicks: Array<{value: number; label: string}>;
    transform: any;
    visualizationSettings: {
      showAxes: boolean;
      showAxisLabels: boolean;
      showGrid: boolean;
      showMinimap: boolean;
      showSafetyWindows: boolean;
      showAlignmentEdges: boolean;
      showAlignmentDots: boolean;
    };
  };
}

interface PointGridProps {
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  representative: string;
  member: string;
  alignments: Alignment[];
  xDomain: number[];
  yDomain: number[];
  showMinimap?: boolean;  
  minimapSize?: number;    
  minimapPadding?: number; 
  // Visualization settings
  showAxes?: boolean;
  showAxisLabels?: boolean;
  showGrid?: boolean;
  showSafetyWindows?: boolean;
  showAlignmentEdges?: boolean;
  showAlignmentDots?: boolean;
  showOptimalPath?: boolean;
  // Sequence descriptors for axis labeling
  representativeDescriptor?: string;
  memberDescriptor?: string;
  // Safety window interaction props
  selectedSafetyWindowId?: string | null;
  hoveredSafetyWindowId?: string | null;
  onSafetyWindowHover?: (windowId: string | null, alignment?: Alignment | null) => void;
  onSafetyWindowSelect?: (windowId: string | null, alignment?: Alignment | null) => void;
  // Gap highlighting props
  highlightedGap?: {type: 'representative' | 'member'; start: number; end: number} | null;
  // Zoom transform callback
  onTransformChange?: (transform: any) => void;
  // NEW: Path selection props
  enablePathSelection?: boolean;
  onPathSelected?: (result: PathSelectionResult) => void;
}

const PointGridPlot = forwardRef<PointGridPlotRef, PointGridProps>(({
  width = 800,
  height = 800,
  marginTop = 80,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 80,
  representative = "MSFDLKSKFLG",
  member = "MSKLKDFLFKS",
  alignments = [],
  xDomain,
  yDomain,
  showMinimap = true,       // Default to showing minimap
  minimapSize = 250,         // Default size of minimap
  minimapPadding = 100,      // Padding around minimap
  // Visualization settings with defaults
  showAxes = true,
  showAxisLabels = true,
  showGrid = true,
  showSafetyWindows = true,
  showAlignmentEdges = true,
  showAlignmentDots = true,
  showOptimalPath = true,
  selectedSafetyWindowId,
  hoveredSafetyWindowId,
  onSafetyWindowHover,
  onSafetyWindowSelect,
  highlightedGap,
  onTransformChange,
  representativeDescriptor,
  memberDescriptor,
  // NEW: Path selection props
  enablePathSelection = false,
  onPathSelected
}, ref) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [highlightedWindow] = useState<Alignment | null>(null);
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  
  // NEW: Path selection state
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<import('../../types/PointGrid').Edge | null>(null);

  // Clear path function for better UX
  const clearSelectedPath = useCallback(() => {
    setSelectedPath(null);
  }, []);

  // Keyboard event handling for path selection
  useEffect(() => {
    if (!enablePathSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedPath) {
        clearSelectedPath();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enablePathSelection, selectedPath, clearSelectedPath]);

  const { x, y, fontSize } = usePointGridScales({
    width, height, marginTop, marginRight, marginBottom, marginLeft,
    representative, member, transform
  });

  // Now for usePointGridTicks, create proper tuples:
  const xDomainTuple: [number, number] = [xDomain[0], xDomain[1]];
  const yDomainTuple: [number, number] = [yDomain[0], yDomain[1]];

  const { xTicks, yTicks } = usePointGridTicks({
    xDomain: xDomainTuple,
    yDomain: yDomainTuple,
    representative, 
    member, 
    x, // Now properly typed as d3.ScaleLinear
    y, // Now properly typed as d3.ScaleLinear
    transform // Pass the current transform to control tick density
  });

  // Expose canvas and export data through ref
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    clearSelectedPath,
    getExportData: () => ({
      alignments,
      representative,
      member,
      xTicks: xTicks.map(tick => ({ value: tick.value, label: tick.label })),
      yTicks: yTicks.map(tick => ({ value: tick.value, label: tick.label })),
      transform,
      visualizationSettings: {
        showAxes,
        showAxisLabels,
        showGrid,
        showMinimap,
        showSafetyWindows,
        showAlignmentEdges,
        showAlignmentDots,
        showOptimalPath
      }
    })
  }), [alignments, representative, member, xTicks, yTicks, transform, showAxes, showAxisLabels, showGrid, showMinimap, showSafetyWindows, showAlignmentEdges, showAlignmentDots, showOptimalPath, clearSelectedPath]);
  
  // Extract safety windows and helper function
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Simple safety window selection logic
  const selectedWindow = selectedSafetyWindowId ? 
    safetyWindows.find((_, index) => `safety-window-${index}` === selectedSafetyWindowId) : 
    null;
    
  const hoveredWindow = hoveredSafetyWindowId ? 
    safetyWindows.find((_, index) => `safety-window-${index}` === hoveredSafetyWindowId) : 
    null;
    
  const safetyWindowsChanged = () => false;
  const resetSafetyWindowsChanged = () => {};

  const isInSafetyWindow = (position: number, axis: 'x' | 'y') => {
    return safetyWindows.some(window => {
      if (!window.startDot || !window.endDot) return false;
      const start = axis === 'x' ? window.startDot.x : window.startDot.y;
      const end = axis === 'x' ? window.endDot.x : window.endDot.y;
      return position >= start && position < end;
    });
  };

  // Handle safety window clicking
  const handleSafetyWindowClick = (clickX: number, clickY: number) => {
    // Convert click coordinates to grid coordinates
    const gridX = Math.floor(x.invert(clickX));
    const gridY = Math.floor(y.invert(clickY));
    
    // Find which safety window contains this point
    const clickedWindow = safetyWindows.find((window, index) => {
      if (!window.startDot || !window.endDot) return false;
      
      const xInWindow = gridX >= window.startDot.x && gridX < window.endDot.x;
      const yInWindow = gridY >= window.startDot.y && gridY < window.endDot.y;
      
      if (xInWindow && yInWindow) {
        // Store the index for ID generation
        (window as any)._index = index;
        return true;
      }
      return false;
    });

    if (clickedWindow) {
      const windowId = `safety-window-${(clickedWindow as any)._index}`;
      const isCurrentlySelected = selectedSafetyWindowId === windowId;
      onSafetyWindowSelect?.(isCurrentlySelected ? null : windowId, isCurrentlySelected ? null : clickedWindow);
    } else {
      onSafetyWindowSelect?.(null, null);
    }
  };

  // Draw minimap using the utility function
  const drawMinimapFn = (ctx: CanvasRenderingContext2D) => {
    return drawMinimap(ctx, {
      width, height, marginTop, marginRight, marginBottom, marginLeft,
      x, y, representative, member, alignments, safetyWindows,
      minimapSize, minimapPadding, showMinimap
    });
  };

  // Main drawing function
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw safety windows if enabled
    if (showSafetyWindows) {
      drawSafetyWindows(ctx, safetyWindows, x, y, fontSize, marginTop, marginLeft);
      
      // Draw safety window highlight if applicable
      if (highlightedWindow) {
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, highlightedWindow);
      }

      // Draw external selection highlights - using memoized values
      // We use the optimized values from our custom hook
      
      if (selectedWindow) {
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, selectedWindow);
      }
      
      if (hoveredWindow && hoveredWindow !== selectedWindow) {
        // Draw a lighter highlight for hovered windows
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, hoveredWindow);
        ctx.restore();
      }
    }
    
    // Draw gap highlighting using the same batched approach as alignment edges
    // This integrates gap highlighting into the pooled rendering system for better performance
    if (highlightedGap) {
      // Create a temporary "alignment" object that represents the gap for efficient rendering
      const gapAsAlignment: Alignment = {
        startDot: highlightedGap.type === 'representative' 
          ? { x: highlightedGap.start, y: 0 }
          : { x: 0, y: highlightedGap.start },
        endDot: highlightedGap.type === 'representative'
          ? { x: highlightedGap.end, y: member.length }
          : { x: representative.length, y: highlightedGap.end },
        edges: [],
        color: 'rgba(255, 107, 71, 0.4)', // Orange-red for gaps
        _isGapHighlight: true // Mark as gap highlight for special handling
      } as Alignment & { _isGapHighlight: boolean };

      // Render gap highlight as a filled rectangle using the same efficient system
      drawGapHighlightOptimized(ctx, x, y, marginTop, marginLeft, gapAsAlignment, highlightedGap.type);
    }
    
    // Draw axes if enabled
    if (showAxes) {
      drawAxes(ctx, x, y, marginTop, marginLeft);
    }
    
    // Create safety window bounds object for display - using memoized value
    const safetyWindowBounds: SafetyWindowBounds | undefined = (showSafetyWindows && selectedWindow) ? {
      // Match the axis orientation from the isInSafetyWindow function
      xStart: selectedWindow.startDot?.x,
      xEnd: selectedWindow.endDot?.x,
      yStart: selectedWindow.startDot?.y,
      yEnd: selectedWindow.endDot?.y
    } : undefined;

    // Draw axis labels if enabled
    if (showAxisLabels) {
      drawAxisLabels(
        ctx,
        xTicks,
        yTicks,
        x,
        y,
        fontSize,
        marginTop,
        marginLeft,
        isInSafetyWindow,
        safetyWindowBounds,
        representativeDescriptor,
        memberDescriptor
      );
    }

    // Set up clipping and draw grid/data
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginLeft, marginTop, width - marginLeft - marginRight, height - marginTop - marginBottom);
    ctx.clip();

    // Draw grid if enabled
    if (showGrid) {
      drawGridLines(ctx, xTicks, yTicks, x, y);
    }
    
    // Draw alignment elements using new simplified renderer
    renderGraph(
      {
        ctx,
        x,
        y,
        width,
        height,
        marginTop,
        marginLeft
      },
      alignments,
      {
        showAlignmentEdges,
        showAlignmentDots,
        showOptimalPath,
        showSelectedPath: enablePathSelection && selectedPath !== null,
        selectedPath: selectedPath || undefined,
        hoveredEdge: hoveredEdge || undefined
      }
    );

    // Draw hover highlight (always shown when hovering for usability)
    if (hoveredCell) {
      // Find all safety windows containing the hovered cell (only if safety windows are shown)
      if (showSafetyWindows) {
        const matchingWindows = findSafetyWindowsForCell(hoveredCell, safetyWindows);
        
        // Draw each window that contains the hovered cell
        matchingWindows.forEach(window => {
          drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, window);
        });
      }
      
      // Draw hover highlight on top
      drawHoverHighlight(
        ctx, 
        hoveredCell, 
        x, 
        y, 
        marginTop, 
        marginLeft, 
        representative, 
        member,
        alignments
      );
    }

    ctx.restore();
    
    // Draw minimap on top of everything if enabled
    if (showMinimap) {
      drawMinimapFn(ctx);
    }
  };

  // Handle minimap interactions using utility function
  const handleMinimapInteraction = (event: React.MouseEvent, isDragging: boolean = false) => {
    return handleMinimapInteractionUtil(
      event,
      {
        canvas: canvasRef.current,
        isDragging,
        isMinimapDragging,
        width,
        height,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        minimapSize,
        minimapPadding,
        showMinimap,
        transform,
        x,
        y,
        representative,
        member
      },
      setTransform
    );
  };

  // Mouse interaction
  const handleMouseMove = (event: React.MouseEvent) => {
    // First check if we're interacting with the minimap
    if (handleMinimapInteraction(event, isMinimapDragging)) {
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Only consider the mouse within the plot area
    if (mouseX < marginLeft || mouseX > width - marginRight || 
        mouseY < marginTop || mouseY > height - marginBottom) {
      setHoveredCell(null);
      setHoveredEdge(null);
      onSafetyWindowHover?.(null);
      return;
    }

    // NEW: Path selection - check for edge hover
    if (enablePathSelection) {
      const closestEdge = findClosestEdge(mouseX, mouseY, alignments, x, y, 12);
      setHoveredEdge(closestEdge);
      
      // Enhanced cursor feedback for better UX
      if (closestEdge) {
        canvas.style.cursor = 'crosshair'; // More specific cursor for path selection
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      setHoveredEdge(null);
      canvas.style.cursor = 'default';
    }

    const gridX = Math.floor(x.invert(mouseX));
    const gridY = Math.floor(y.invert(mouseY));

    // Make sure we're within the domain bounds
    if (gridX >= 0 && gridX < representative.length && 
        gridY >= 0 && gridY < member.length) {
      setHoveredCell({x: gridX, y: gridY});
      
      // Check if mouse is over a safety window
      const hoveredWindow = safetyWindows.find((window, index) => {
        if (!window.startDot || !window.endDot) return false;
        
        const xInWindow = gridX >= window.startDot.x && gridX < window.endDot.x;
        const yInWindow = gridY >= window.startDot.y && gridY < window.endDot.y;
        
        if (xInWindow && yInWindow) {
          (window as any)._index = index;
          return true;
        }
        return false;
      });

      if (hoveredWindow) {
        const windowId = `safety-window-${(hoveredWindow as any)._index}`;
        onSafetyWindowHover?.(windowId);
      } else {
        onSafetyWindowHover?.(null);
      }
    } else {
      setHoveredCell(null);
      onSafetyWindowHover?.(null);
    }
  };

  // NEW: Handle edge click for path selection
  const handleEdgeClick = (clickedEdge: import('../../types/PointGrid').Edge) => {
    if (!enablePathSelection || !onPathSelected) return;

    // Build path from the clicked edge
    const allEdges = getAllEdges(alignments);
    const newPath = buildPathFromEdge(clickedEdge, allEdges);
    
    // Validate the path
    if (validatePath(newPath, allEdges)) {
      setSelectedPath(newPath);
      
      // Generate alignment from path
      const alignmentResult = generateAlignmentFromPath(newPath, representative, member);
      
      // Visual feedback - brief cursor change to indicate success
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'wait';
        setTimeout(() => {
          canvas.style.cursor = enablePathSelection ? 'crosshair' : 'default';
        }, 200);
      }
      
      // Call the callback with the result
      onPathSelected({
        alignedRepresentative: alignmentResult.alignedRep,
        alignedMember: alignmentResult.alignedMem,
        score: alignmentResult.score,
        pathLength: newPath.edges.length
      });
    } else {
      // Visual feedback for invalid path
      console.warn('Invalid path selected');
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'not-allowed';
        setTimeout(() => {
          canvas.style.cursor = enablePathSelection ? 'crosshair' : 'default';
        }, 300);
      }
    }
  };
  
  const handleMouseDown = (event: React.MouseEvent) => {
    // Check if click is in minimap using utility
    const isInMinimap = isMouseInMinimap(event, {
      canvas: canvasRef.current,
      width,
      minimapSize,
      minimapPadding
    });
                       
    if (isInMinimap) {
      setIsMinimapDragging(true);
      handleMinimapInteraction(event, true);
    } else {
      // Handle clicks in the main plot area
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Only handle clicks within the plot area
      if (mouseX >= marginLeft && mouseX <= width - marginRight && 
          mouseY >= marginTop && mouseY <= height - marginBottom) {
        
        // NEW: Path selection - handle edge clicks
        if (enablePathSelection && hoveredEdge) {
          handleEdgeClick(hoveredEdge);
        } else {
          // Default behavior: safety window clicking
          handleSafetyWindowClick(mouseX, mouseY);
        }
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsMinimapDragging(false);
  };

  // Effects - Split rendering effects to prevent unnecessary rerenders
  
  // This effect handles static/structural changes that require full redraws
  useEffect(() => {
    drawCanvas();
  }, [transform, alignments, fontSize, showMinimap, showAxes, showAxisLabels, showGrid, showSafetyWindows, showAlignmentEdges, showAlignmentDots, showOptimalPath, width, height, marginTop, marginRight, marginBottom, marginLeft]);
  
  // This effect handles hover state changes
  useEffect(() => {
    if (hoveredCell) {
      requestAnimationFrame(drawCanvas);
    }
  }, [hoveredCell]);
  
  // This effect handles gap highlight changes
  useEffect(() => {
    if (highlightedGap) {
      requestAnimationFrame(drawCanvas);
    }
  }, [highlightedGap]);
  
  // This effect monitors safety window changes using our optimized hook
  useEffect(() => {
    // Only redraw if safety windows have actually changed
    if (safetyWindowsChanged()) {
      requestAnimationFrame(() => {
        drawCanvas();
        resetSafetyWindowsChanged();
      });
    }
  }, [selectedWindow, hoveredWindow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoom = d3.zoom()
      .scaleExtent([0.1, 100])
      .on("zoom", (event) => {
        setTransform(event.transform);
        // Notify parent component of transform change
        if (onTransformChange) {
          onTransformChange(event.transform);
        }
      });

    // Use type assertion to fix the incompatible call
    const selection = d3.select(canvasRef.current);
    (selection as any).call(zoom);

    return () => {
      selection.on('.zoom', null);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ cursor: isMinimapDragging ? 'move' : 'grab' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredCell(null);
        onSafetyWindowHover?.(null);
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
});

PointGridPlot.displayName = 'PointGridPlot';

export default PointGridPlot;
export type { Alignment, PointGridPlotProps };