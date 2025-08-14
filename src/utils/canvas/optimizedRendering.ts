// Optimized alignment visualization
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';
import { isAlignmentVisible } from './optimization';

/**
 * Optimized function to draw alignment edges with batched rendering
 */
export function drawAlignmentEdgesOptimized(
  ctx: CanvasRenderingContext2D,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  transform: any
) {
  // Determine visible area in data coordinates
  const xDomain = x.domain();
  const yDomain = y.domain();
  const visibleXRange: [number, number] = [Math.floor(xDomain[0]), Math.ceil(xDomain[1])];
  const visibleYRange: [number, number] = [Math.floor(yDomain[0]), Math.ceil(yDomain[1])];

  // Group edges by color for batch rendering
  const edgesByColor: { [color: string]: { 
    edges: Array<{from: [number, number], to: [number, number], probability: number}>,
    isOptimalPath: boolean
  }} = {};
  
  // Filter visible alignments and collect edges by color
  alignments.forEach(alignment => {
    // Skip invisible alignments for performance
    if (!isAlignmentVisible(alignment, visibleXRange, visibleYRange)) {
      return;
    }
    
    const isOptimalPath = alignment.color === 'blue';
    
    if (!edgesByColor[alignment.color]) {
      edgesByColor[alignment.color] = { 
        edges: [],
        isOptimalPath
      };
    }
    
    alignment.edges.forEach(edge => {
      edgesByColor[alignment.color].edges.push(edge);
    });
  });
  
  // Draw edges by color in batches
  Object.entries(edgesByColor).forEach(([color, { edges, isOptimalPath }]) => {
    ctx.strokeStyle = color;
    
    // Special styling for the optimal path
    if (isOptimalPath) {
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.85;
    }

    // Use requestAnimationFrame for better performance if needed
    const batchSize = 1000; // Adjust based on performance needs
    
    // Calculate how many edges to render based on zoom level
    const zoomFactor = transform.k;
    const skipFactor = zoomFactor < 1 ? Math.max(1, Math.floor(5 / zoomFactor)) : 1;
    
    // Draw edges in batches
    for (let i = 0; i < edges.length; i += skipFactor) {
      const edge = edges[i];
      const opacity = Math.max(0.5, Math.min(0.7, edge.probability));
      const strokeWidth = Math.max(0.8, Math.min(2.2, edge.probability * 2.5));
      
      if (!isOptimalPath) {
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = opacity;
      }
      
      // Use a single path for all edges of same color in current batch
      if (i % batchSize === 0) {
        ctx.beginPath();
      }
      
      // Draw the line
      const [fromX, fromY] = edge.from;
      const [toX, toY] = edge.to;
      ctx.moveTo(x(fromX), y(fromY));
      ctx.lineTo(x(toX), y(toY));
      
      // Stroke the batch when it's full or on the last edge
      if ((i % batchSize === batchSize - 1) || (i === edges.length - 1)) {
        ctx.stroke();
      }
    }
  });
  
  ctx.globalAlpha = 1;
}

/**
 * Optimized function to draw alignment dots with batched rendering
 */
export function drawAlignmentDotsOptimized(
  ctx: CanvasRenderingContext2D,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  transform: any
) {
  // Determine visible area in data coordinates
  const xDomain = x.domain();
  const yDomain = y.domain();
  const visibleXRange: [number, number] = [Math.floor(xDomain[0]), Math.ceil(xDomain[1])];
  const visibleYRange: [number, number] = [Math.floor(yDomain[0]), Math.ceil(yDomain[1])];
  
  // Group dots by color for batch rendering
  const dotsByColor: { [color: string]: Array<{x: number, y: number}> } = {};
  
  // Filter visible alignments and collect dots
  alignments.forEach(alignment => {
    // Skip invisible alignments
    if (!isAlignmentVisible(alignment, visibleXRange, visibleYRange)) {
      return;
    }
    
    if (!dotsByColor[alignment.color]) {
      dotsByColor[alignment.color] = [];
    }
    
    if (alignment.startDot && 
        alignment.startDot.x >= visibleXRange[0] - 1 && 
        alignment.startDot.x <= visibleXRange[1] + 1 && 
        alignment.startDot.y >= visibleYRange[0] - 1 && 
        alignment.startDot.y <= visibleYRange[1] + 1) {
      dotsByColor[alignment.color].push(alignment.startDot);
    }
    
    if (alignment.endDot && 
        alignment.endDot.x >= visibleXRange[0] - 1 && 
        alignment.endDot.x <= visibleXRange[1] + 1 && 
        alignment.endDot.y >= visibleYRange[0] - 1 && 
        alignment.endDot.y <= visibleYRange[1] + 1) {
      dotsByColor[alignment.color].push(alignment.endDot);
    }
  });
  
  // Calculate dot size based on zoom level - larger dots when zoomed out
  const zoomFactor = transform.k;
  const dotRadius = Math.min(7, Math.max(3, 5 / Math.sqrt(zoomFactor)));
  
  // Draw dots by color in batches
  Object.entries(dotsByColor).forEach(([color, dots]) => {
    ctx.fillStyle = color;
    
    // Use a single path for all dots of the same color
    ctx.beginPath();
    
    dots.forEach(dot => {
      ctx.moveTo(x(dot.x) + dotRadius, y(dot.y));
      ctx.arc(x(dot.x), y(dot.y), dotRadius, 0, 2 * Math.PI);
    });
    
    // Fill all dots at once
    ctx.fill();
  });
}
