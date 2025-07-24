import { useRef, useEffect, useState, forwardRef } from 'react'
import * as d3 from "d3";
import { usePointGridScales } from '../../hooks/usePointGridScales';
import { usePointGridTicks } from '../../hooks/usePointGridTicks';
import { 
  drawSafetyWindows, 
  drawAxes, 
  drawAxisLabels, 
  drawGridLines, 
  drawAlignmentEdges, 
  drawAlignmentDots, 
  drawHoverHighlight,
  drawSafetyWindowHighlight,
  findSafetyWindowsForCell,
  drawMinimap,
  handleMinimapInteraction as handleMinimapInteractionUtil,
  isMouseInMinimap
} from '../../utils/canvas';
import type { SafetyWindowBounds } from '../../utils/canvas';
import type { PointGridPlotProps, Alignment } from '../../types/PointGrid';

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
  // Safety window interaction props
  selectedSafetyWindowId?: string | null;
  hoveredSafetyWindowId?: string | null;
  onSafetyWindowHover?: (windowId: string | null, alignment?: Alignment | null) => void;
  onSafetyWindowSelect?: (windowId: string | null, alignment?: Alignment | null) => void;
  // Zoom transform callback
  onTransformChange?: (transform: any) => void;
}

const PointGridPlot = forwardRef<HTMLCanvasElement, PointGridProps>(({
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
  selectedSafetyWindowId,
  hoveredSafetyWindowId,
  onSafetyWindowHover,
  onSafetyWindowSelect,
  onTransformChange
}, ref) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // If a ref is forwarded, merge it with our internal ref
  const mergedRef = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [highlightedWindow] = useState<Alignment | null>(null);
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);

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
  
  // Extract safety windows and helper function
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Get the currently selected or hovered safety window
  const getSelectedWindow = () => {
    if (selectedSafetyWindowId) {
      const index = parseInt(selectedSafetyWindowId.split('-')[2]);
      return safetyWindows[index] || null;
    }
    return null;
  };

  const getHoveredWindow = () => {
    if (hoveredSafetyWindowId) {
      const index = parseInt(hoveredSafetyWindowId.split('-')[2]);
      return safetyWindows[index] || null;
    }
    return null;
  };

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

      // Draw external selection highlights
      const selectedWindow = getSelectedWindow();
      const hoveredWindow = getHoveredWindow();
      
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
    
    // Draw axes if enabled
    if (showAxes) {
      drawAxes(ctx, x, y, marginTop, marginLeft);
    }
    
    // Create safety window bounds object for display
    const selectedWindow = getSelectedWindow();
    const safetyWindowBounds: SafetyWindowBounds | undefined = (showSafetyWindows && selectedWindow) ? {
      // Match the axis orientation from the isInSafetyWindow function
      xStart: selectedWindow.startDot?.x,
      xEnd: selectedWindow.endDot?.x,
      yStart: selectedWindow.startDot?.y,
      yEnd: selectedWindow.endDot?.y
    } : undefined;

    // Draw axis labels if enabled
    if (showAxisLabels) {
      drawAxisLabels(ctx, xTicks, yTicks, x, y, fontSize, marginTop, marginLeft, isInSafetyWindow, safetyWindowBounds);
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
    
    // Draw alignment elements if enabled
    if (showAlignmentEdges) {
      drawAlignmentEdges(ctx, alignments, x, y);
    }
    if (showAlignmentDots) {
      drawAlignmentDots(ctx, alignments, x, y);
    }

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
      onSafetyWindowHover?.(null);
      return;
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
      // Handle safety window clicking in the main plot area
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Only handle clicks within the plot area
      if (mouseX >= marginLeft && mouseX <= width - marginRight && 
          mouseY >= marginTop && mouseY <= height - marginBottom) {
        handleSafetyWindowClick(mouseX, mouseY);
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsMinimapDragging(false);
  };

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(drawCanvas, 16);
    return () => clearTimeout(timeoutId);
  }, [transform, alignments, hoveredCell, fontSize, showMinimap, selectedSafetyWindowId, hoveredSafetyWindowId, showAxes, showAxisLabels, showGrid, showSafetyWindows, showAlignmentEdges, showAlignmentDots]);

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
      ref={mergedRef}
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