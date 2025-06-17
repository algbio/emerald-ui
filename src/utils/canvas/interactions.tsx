// Interaction-related functions
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';

export function drawHoverHighlight(
  ctx: CanvasRenderingContext2D,
  hoveredCell: {x: number; y: number},
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  representative: string,
  member: string,
  alignments: Alignment[] = []
) {
  const cellX = x(hoveredCell.x);
  const cellY = y(hoveredCell.y);
  const cellW = x(hoveredCell.x + 1) - cellX;
  const cellH = y(hoveredCell.y + 1) - cellY;
  
  // Highlight cell
  ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
  ctx.fillRect(cellX, cellY, cellW, cellH);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(cellX, cellY, cellW, cellH);
  
  // Highlight axes
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cellX, marginTop - 30);
  ctx.lineTo(cellX + cellW, marginTop);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(marginLeft - 30, cellY);
  ctx.lineTo(marginLeft, cellY + cellH);
  ctx.stroke();
  
  // Find alignment weights for this cell if available
  const matchingEdges = alignments.flatMap(alignment => 
    alignment.edges.filter(edge =>  
      edge.from[0] === hoveredCell.x &&
      edge.from[1] === hoveredCell.y &&
      !(edge.from[0] === edge.to[0] && edge.from[1] === edge.to[1]) // skip self-edges
    )
  );
  
  // Prepare text lines
  const baseText = `${representative[hoveredCell.x]} → ${member[hoveredCell.y]}, (${hoveredCell.x}, ${hoveredCell.y})`;
  const textLines = [baseText];
  
  // Add weight information as additional lines if available
  if (matchingEdges.length > 0) {
    textLines.push('Weights:');
    matchingEdges.forEach(edge => {
      let fromChar = '_';
      let toChar = '_';
      // If edge is diagonal (1,1), it's an alignment: show both chars
      if (
        edge.to[0] - edge.from[0] === 1 &&
        edge.to[1] - edge.from[1] === 1
      ) {
        fromChar = representative[edge.from[0]] ?? '_';
        toChar = member[edge.from[1]] ?? '_';
      } else if (edge.to[0] - edge.from[0] === 1) {
        // Horizontal: representative advances, member is gap
        fromChar = representative[edge.from[0]] ?? '_';
        toChar = '_';
      } else if (edge.to[1] - edge.from[1] === 1) {
        // Vertical: member advances, representative is gap
        fromChar = '_';
        toChar = member[edge.from[1]] ?? '_';
      }
      textLines.push(`  ${fromChar} → ${toChar} : (${edge.probability.toFixed(2)})`);
      
    });
  }
  
  // Set up text rendering
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'start';
  ctx.textBaseline = 'top';
  
  // Calculate size for background
  const lineHeight = 16;
  const textWidth = Math.max(...textLines.map(line => ctx.measureText(line).width));
  const textHeight = lineHeight * textLines.length;
  const padding = 4;
  
  // Draw background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(
    cellX + 8,
    cellY - textHeight - padding * 2 - 5,
    textWidth + padding * 2,
    textHeight + padding * 2
  );
  
  // Draw text lines
  ctx.fillStyle = 'black';
  textLines.forEach((line, i) => {
    ctx.fillText(line, cellX + 10, cellY - textHeight - padding + (i * lineHeight));
  });
}

export function findSafetyWindowsForCell(
  cell: {x: number; y: number},
  safetyWindows: Alignment[]
): Alignment[] {
  return safetyWindows.filter(window => {
    if (!window.startDot || !window.endDot) return false;
    
    // Check if cell coordinates are within this safety window
    const xInWindow = cell.x >= window.startDot.x && cell.x < window.endDot.x;
    const yInWindow = cell.y >= window.startDot.y && cell.y < window.endDot.y;
    
    return xInWindow && yInWindow;
  });
}
