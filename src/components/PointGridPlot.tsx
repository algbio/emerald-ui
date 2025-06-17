import { useRef, useEffect, useState } from 'react'
import * as d3 from "d3";
import { usePointGridScales } from '../hooks/usePointGridScales';
import { usePointGridTicks } from '../hooks/usePointGridTicks';
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
} from '../utils/canvas';
import type { PointGridPlotProps, Alignment } from '../types/PointGrid';

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
}

function PointGridPlot({
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
  yDomain
}: PointGridProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [highlightedWindow] = useState<Alignment | null>(null);

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
    y  // Now properly typed as d3.ScaleLinear
  });
  
  // Extract safety windows and helper function
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  const isInSafetyWindow = (position: number, axis: 'x' | 'y') => {
    return safetyWindows.some(window => {
      if (!window.startDot || !window.endDot) return false;
      const start = axis === 'x' ? window.startDot.x : window.startDot.y;
      const end = axis === 'x' ? window.endDot.x : window.endDot.y;
      return position >= start && position < end;
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

    // Draw safety windowsxDomain
    drawSafetyWindows(ctx, safetyWindows, x, y, fontSize, marginTop, marginLeft);
    
    // Draw safety window highlight if applicable
    if (highlightedWindow) {
      drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, highlightedWindow);
    }
    
    // Draw axes
    drawAxes(ctx, x, y, marginTop, marginLeft);
    
    // Draw axis labels
    drawAxisLabels(ctx, xTicks, yTicks, x, y, fontSize, marginTop, marginLeft, isInSafetyWindow);

    // Set up clipping and draw grid/data
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginLeft, marginTop, width - marginLeft - marginRight, height - marginTop - marginBottom);
    ctx.clip();

    drawGridLines(ctx, xTicks, yTicks, x, y);
    drawAlignmentEdges(ctx, alignments, x, y);
    drawAlignmentDots(ctx, alignments, x, y);

    // Draw hover highlight
    if (hoveredCell) {
      // Find all safety windows containing the hovered cell
      const matchingWindows = findSafetyWindowsForCell(hoveredCell, safetyWindows);
      
      // Draw each window that contains the hovered cell
      matchingWindows.forEach(window => {
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, window);
      });
      
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
  };

  // Mouse interaction
  const handleMouseMove = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Only consider the mouse within the plot area
    if (mouseX < marginLeft || mouseX > width - marginRight || 
        mouseY < marginTop || mouseY > height - marginBottom) {
      setHoveredCell(null);
      return;
    }

    const gridX = Math.floor(x.invert(mouseX));
    const gridY = Math.floor(y.invert(mouseY));

    // Make sure we're within the domain bounds
    if (gridX >= 0 && gridX < representative.length && 
        gridY >= 0 && gridY < member.length) {
      setHoveredCell({x: gridX, y: gridY});
    } else {
      setHoveredCell(null);
    }
  };

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(drawCanvas, 16);
    return () => clearTimeout(timeoutId);
  }, [transform, alignments, hoveredCell, fontSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoom = d3.zoom()
      .scaleExtent([0.1, 100])
      .on("zoom", (event) => setTransform(event.transform));

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
      style={{ cursor: 'grab' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredCell(null)}
    />
  );
}

export default PointGridPlot;
export type { Alignment, PointGridPlotProps };