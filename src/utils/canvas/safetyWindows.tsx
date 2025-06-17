// Safety window visualization
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';

export function drawSafetyWindows(
  ctx: CanvasRenderingContext2D,
  safetyWindows: Alignment[],
  x: ScaleLinear<number, number>, 
  y: ScaleLinear<number, number>, 
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

export function drawSafetyWindows1(
  ctx: CanvasRenderingContext2D,
  safetyWindows: Alignment[],
  x: ScaleLinear<number, number>, // d3 range function to convert x value to canvas coordinate
  y: ScaleLinear<number, number>, // d3 range function to convert y value to canvas coordinate
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

export function drawSafetyWindowHighlight(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  window: Alignment
): void {
  // Skip invalid windows
  if (!window.startDot || !window.endDot) return;
  
  // Get coordinates for this window
  const startX = x(window.startDot.x);
  const endX = x(window.endDot.x);
  const startY = y(window.startDot.y);
  const endY = y(window.endDot.y);
  
  // Save current state to restore later
  ctx.save();
  
  // Highlight columns from safety window leftward to the y-axis
  ctx.fillStyle = 'rgba(144, 238, 144, 0.15)'; // Light green with transparency
  
  // Fill from left edge to safety window (column highlights)
  ctx.fillRect(marginLeft, startY, startX - marginLeft, endY - startY);
  
  // Fill from top edge to safety window (row highlights)
  ctx.fillRect(startX, marginTop, endX - startX, startY - marginTop);
  
  // Highlight the x-axis portion of the safety window (more prominent)
  ctx.fillStyle = 'rgba(144, 238, 144, 0.4)'; 
  ctx.fillRect(startX, 0, endX - startX, marginTop);
  
  // Highlight the y-axis portion of the safety window (more prominent)
  ctx.fillRect(0, startY, marginLeft, endY - startY);
  
  // Highlight the grid area within the safety window with stronger color
  ctx.fillStyle = 'rgba(144, 238, 144, 0.25)';
  ctx.fillRect(startX, startY, endX - startX, endY - startY);
  
  // Use the window's color if available, otherwise use a default color
  const borderColor = window.color || 'green';
  
  // Draw a dashed border around the highlighted safety window area
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(startX, startY, endX - startX, endY - startY);
  ctx.setLineDash([]);
  
  // Restore context state
  ctx.restore();
}