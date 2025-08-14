// Alignment visualization
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';

export function drawAlignmentEdges(
  ctx: CanvasRenderingContext2D,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>
) {
  alignments.forEach(alignment => {
    alignment.edges.forEach(edge => {
      const [fromX, fromY] = edge.from;
      const [toX, toY] = edge.to;
      
      // Special styling for the optimal path (blue)
      if (alignment.color === 'blue') {
        ctx.strokeStyle = 'rgba(30, 144, 255, 1)'; // Dodger blue with good visibility
        ctx.lineWidth = 2.5; // Slightly thicker but still thin
        ctx.globalAlpha = 0.85; // Higher opacity for visibility
      } else {
        // Default styling for other alignments with subtle variations
        const opacity = Math.max(0.5, Math.min(0.7, edge.probability));
        const strokeWidth = Math.max(0.8, Math.min(2.2, edge.probability * 2.5));
        
        ctx.strokeStyle = alignment.color;
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = opacity;
      }
      
      ctx.beginPath();
      ctx.moveTo(x(fromX), y(fromY));
      ctx.lineTo(x(toX), y(toY));
      ctx.stroke();
    });
  });
  
  ctx.globalAlpha = 1;
}

export function drawAlignmentDots(
  ctx: CanvasRenderingContext2D,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>
) {
  alignments.forEach(alignment => {
    ctx.fillStyle = alignment.color || "orange";
    
    if (alignment.startDot) {
      ctx.beginPath();
      ctx.arc(x(alignment.startDot.x), y(alignment.startDot.y), 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    if (alignment.endDot) {
      ctx.beginPath();
      ctx.arc(x(alignment.endDot.x), y(alignment.endDot.y), 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}