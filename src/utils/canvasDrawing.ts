import type { Alignment } from '../types/PointGrid';

export function drawSafetyWindows1(
  ctx: CanvasRenderingContext2D,
  safetyWindows: Alignment[],
  x: (value: number) => number, // d3 range function to convert x value to canvas coordinate
  y: (value: number) => number, // d3 range function to convert y value to canvas coordinate
  fontSize: number,
  marginTop: number,
  marginLeft: number
) {
  safetyWindows.forEach(window => {
    if (!window.startDot || !window.endDot) return;
    
    // X-axis safety window - clip to canvas width
    const charStartX = x(window.startDot.x);
    const charEndX = x(window.endDot.x);
    const rectHeight = Math.max(8, fontSize * 0.8);
    
    // Only draw if the rectangle would be visible
    const clippedStartX = Math.max(marginLeft, charStartX);
    const clippedEndX = Math.min(x.range()[1], charEndX);
    
    if (clippedEndX > clippedStartX) {
      ctx.fillStyle = 'rgba(144, 238, 144, 0.6)';
      ctx.fillRect(clippedStartX, marginTop - rectHeight - 5, clippedEndX - clippedStartX, rectHeight);
      ctx.strokeStyle = 'green';
      ctx.lineWidth = Math.max(1, fontSize * 0.1);
      ctx.strokeRect(clippedStartX, marginTop - rectHeight - 5, clippedEndX - clippedStartX, rectHeight);
    }
    
    // Y-axis safety window - clip to canvas height
    const charStartY = y(window.startDot.y);
    const charEndY = y(window.endDot.y);
    const rectWidth = Math.max(8, fontSize * 0.8);
    
    // In canvas, Y increases downward, so we need to ensure the correct ordering
    const topY = Math.min(charStartY, charEndY);
    const bottomY = Math.max(charStartY, charEndY);
    
    // Only draw if the rectangle would be visible
    const clippedTopY = Math.max(marginTop, topY);
    const clippedBottomY = Math.min(y.range()[1], bottomY);
    
    if (clippedBottomY > clippedTopY) {  // Now this is correct - bottom should be greater than top
      const rectLeft = Math.max(0, marginLeft - rectWidth - 5);
      const rectActualWidth = Math.min(rectWidth, marginLeft - 5);
      
      ctx.fillStyle = 'rgba(144, 238, 144, 0.6)';
      ctx.fillRect(rectLeft, clippedTopY, rectActualWidth, clippedBottomY - clippedTopY);
      ctx.strokeStyle = 'green';
      ctx.lineWidth = Math.max(1, fontSize * 0.1);
      ctx.strokeRect(rectLeft, clippedTopY, rectActualWidth, clippedBottomY - clippedTopY);
    }
  });


}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  x: (value: number) => number,
  y: (value: number) => number,
  marginTop: number,
  marginLeft: number
) {
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  
  // X Axis (top)
  ctx.beginPath();
  ctx.moveTo(x.range()[0], marginTop);
  ctx.lineTo(x.range()[1], marginTop);
  ctx.stroke();
  
  // Y Axis (left)
  ctx.beginPath();
  ctx.moveTo(marginLeft, y.range()[1]);
  ctx.lineTo(marginLeft, y.range()[0]);
  ctx.stroke();
}

export function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>,
  x: (value: number) => number,
  y: (value: number) => number,
  fontSize: number,
  marginTop: number,
  marginLeft: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  // X axis labels
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  xTicks.forEach(tick => {
    if (tick.label) {
      const xPos = x(tick.value + 0.5);
      const isInSafety = isInSafetyWindow(tick.value, 'x');
      
      ctx.fillStyle = isInSafety ? 'green' : 'black';
      ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
      ctx.fillText(tick.label, xPos, marginTop - 10);
    }
  });

  // Y axis labels
  ctx.textAlign = 'end';
  ctx.textBaseline = 'middle';
  
  yTicks.forEach(tick => {
    if (tick.label) {
      const yPos = y(tick.value + 0.5);
      const isInSafety = isInSafetyWindow(tick.value, 'y');
      
      ctx.fillStyle = isInSafety ? 'green' : 'black';
      ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
      ctx.fillText(tick.label, marginLeft - 12, yPos);
    }
  });
}

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{xOffset: number}>,
  yTicks: Array<{yOffset: number}>,
  x: (value: number) => number,
  y: (value: number) => number
) {
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  // Vertical grid lines
  xTicks.forEach(tick => {
    ctx.beginPath();
    ctx.moveTo(tick.xOffset, y.range()[1]);
    ctx.lineTo(tick.xOffset, y.range()[0]);
    ctx.stroke();
  });
  
  // Horizontal grid lines
  yTicks.forEach(tick => {
    ctx.beginPath();
    ctx.moveTo(x.range()[0], tick.yOffset);
    ctx.lineTo(x.range()[1], tick.yOffset);
    ctx.stroke();
  });

  ctx.setLineDash([]);
}

export function drawAlignmentEdges(
  ctx: CanvasRenderingContext2D,
  alignments: Alignment[],
  x: (value: number) => number,
  y: (value: number) => number
) {
  alignments.forEach(alignment => {
    alignment.edges.forEach(edge => {
      const [fromX, fromY] = edge.from;
      const [toX, toY] = edge.to;
      
      const opacity = Math.max(0.5, edge.probability);
      const strokeWidth = Math.max(2, edge.probability * 4);
      
      ctx.strokeStyle = alignment.color;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = opacity;
      
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
  x: (value: number) => number,
  y: (value: number) => number
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

export function drawHoverHighlight(
  ctx: CanvasRenderingContext2D,
  hoveredCell: {x: number; y: number},
  x: (value: number) => number,
  y: (value: number) => number,
  marginTop: number,
  marginLeft: number,
  representative: string,
  member: string
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
  
  // Tooltip
  ctx.fillStyle = 'black';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'start';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    `(${hoveredCell.x}, ${hoveredCell.y}): ${representative[hoveredCell.x]} → ${member[hoveredCell.y]}`,
    cellX + 10,
    cellY - 10
  );
}

export function drawSafetyWindows(
  ctx: CanvasRenderingContext2D,
  safetyWindows: Alignment[],
  x: (value: number) => number, 
  y: (value: number) => number, 
  fontSize: number,
  marginTop: number,
  marginLeft: number,
  drawArrows: boolean = false
) {
  safetyWindows.forEach(window => {
    if (!window.startDot || !window.endDot) return;
    
    // X-axis safety window - draw bracket above
    const charStartX = x(window.startDot.x);
    const charEndX = x(window.endDot.x);
    const bracketHeight = Math.max(8, fontSize * 0.8);
    const bracketThickness = Math.max(2, fontSize * 0.15);
    
    // Determine if start and end points are within visible area
    const startXVisible = charStartX >= marginLeft && charStartX <= x.range()[1];
    const endXVisible = charEndX >= marginLeft && charEndX <= x.range()[1];
    
    // Only draw if any part of the bracket would be visible
    const clippedStartX = Math.max(marginLeft, charStartX);
    const clippedEndX = Math.min(x.range()[1], charEndX);
    
    if (clippedEndX > clippedStartX) {
      // Draw bracket with square ends
      ctx.strokeStyle = 'green';
      ctx.lineWidth = bracketThickness;
      ctx.lineJoin = 'miter';
      
      // Draw the horizontal line regardless
      ctx.beginPath();
      ctx.moveTo(clippedStartX, marginTop - 5 - bracketThickness/2);
      ctx.lineTo(clippedEndX, marginTop - 5 - bracketThickness/2);
      ctx.stroke();
      
      // Only draw start vertical if it's visible
      if (startXVisible) {
        ctx.beginPath();
        ctx.moveTo(clippedStartX, marginTop - bracketHeight - 5);
        ctx.lineTo(clippedStartX, marginTop - 5);
        ctx.stroke();
      }
      
      // Only draw end vertical if it's visible
      if (endXVisible) {
        ctx.beginPath();
        ctx.moveTo(clippedEndX, marginTop - 5);
        ctx.lineTo(clippedEndX, marginTop - bracketHeight - 5);
        ctx.stroke();
      }
      
      // Add arrow showing direction only if we have enough space
      const arrowSize = Math.min(6, (clippedEndX - clippedStartX) / 4);
      if (((clippedEndX - clippedStartX) > arrowSize * 3 )&& drawArrows) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(clippedStartX + arrowSize * 2, marginTop - bracketHeight/2 - 5);
        ctx.lineTo(clippedStartX + arrowSize, marginTop - bracketHeight/2 - 5 - arrowSize/2);
        ctx.lineTo(clippedStartX + arrowSize, marginTop - bracketHeight/2 - 5 + arrowSize/2);
        ctx.fill();
      }
    }
    
    // Y-axis safety window - draw bracket to the left
    const charStartY = y(window.startDot.y);
    const charEndY = y(window.endDot.y);
    const bracketWidth = Math.max(8, fontSize * 0.8);
    
    // In canvas, Y increases downward, so we need to ensure the correct ordering
    const topY = Math.min(charStartY, charEndY);
    const bottomY = Math.max(charStartY, charEndY);
    
    // Determine if top and bottom points are within visible area
    const topYVisible = topY >= marginTop && topY <= y.range()[1];
    const bottomYVisible = bottomY >= marginTop && bottomY <= y.range()[1];
    
    // Only draw if the rectangle would be visible
    const clippedTopY = Math.max(marginTop, topY);
    const clippedBottomY = Math.min(y.range()[1], bottomY);
    
    if (clippedBottomY > clippedTopY) {
      const rectLeft = Math.max(5, marginLeft - bracketWidth - 5);
      
      // Draw bracket with square ends
      ctx.strokeStyle = 'green';
      ctx.lineWidth = bracketThickness;
      ctx.lineJoin = 'miter';
      
      // Draw vertical line regardless
      ctx.beginPath();
      ctx.moveTo(marginLeft - 5 - bracketThickness/2, clippedTopY);
      ctx.lineTo(marginLeft - 5 - bracketThickness/2, clippedBottomY);
      ctx.stroke();
      
      // Only draw top horizontal if it's visible
      if (topYVisible) {
        ctx.beginPath();
        ctx.moveTo(rectLeft, clippedTopY);
        ctx.lineTo(marginLeft - 5, clippedTopY);
        ctx.stroke();
      }
      
      // Only draw bottom horizontal if it's visible
      if (bottomYVisible) {
        ctx.beginPath();
        ctx.moveTo(rectLeft, clippedBottomY);
        ctx.lineTo(marginLeft - 5, clippedBottomY);
        ctx.stroke();
      }
      
      // Add arrow showing direction
      const arrowSize = Math.min(6, (clippedBottomY - clippedTopY) / 4);
      if ((clippedBottomY - clippedTopY) > arrowSize * 3 && drawArrows) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(rectLeft + bracketWidth/2, clippedTopY + arrowSize * 2);
        ctx.lineTo(rectLeft + bracketWidth/2 - arrowSize/2, clippedTopY + arrowSize);
        ctx.lineTo(rectLeft + bracketWidth/2 + arrowSize/2, clippedTopY + arrowSize);
        ctx.fill();
      }
    }
  });
}