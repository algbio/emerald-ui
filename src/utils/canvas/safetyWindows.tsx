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
  drawArrows: boolean = false,
  // The bracket spans the axis margin between two offsets measured inward from
  // marginTop/marginLeft, and opens *towards* the axis so the residues it marks sit inside it:
  //
  //        spine  ─────────────────      <- outer offset (…LabelClearance), clears the letters
  //   arm    │                    │  arm
  //          ╵                    ╵      <- inner offset (…StripOffset), just clear of the strips
  //          A  H  P  A  G                  the safety window's residues, enclosed
  //   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      <- pLDDT / domain strips
  //   ───────────────────────────────    <- axis (marginTop)
  //
  // Inner offset keeps the arm tips off the per-residue strips; outer offset puts the spine
  // beyond the residue letters, which are themselves positioned relative to the strip-enlarged
  // margin. The caller computes both, since only it knows the axis font size and which strips
  // are on. Grid-boundary visibility clipping still uses the true marginTop/marginLeft.
  topStripOffset: number = 0,
  leftStripOffset: number = 0,
  topLabelClearance: number = 0,
  leftLabelClearance: number = 0
) {
  // Arm tips stop just short of the strips; the spine sits at the outer offset, but never less
  // than a minimum depth so the bracket still reads as a bracket when no clearance is supplied.
  const minBracketSpan = Math.max(8, fontSize * 0.8);
  const armTipTop = marginTop - topStripOffset - 3;
  const spineTop = Math.min(marginTop - topLabelClearance, armTipTop - minBracketSpan);
  const armTipLeft = marginLeft - leftStripOffset - 3;
  const spineLeft = Math.min(marginLeft - leftLabelClearance, armTipLeft - minBracketSpan);

  safetyWindows.forEach(window => {
    if (!window.startDot || !window.endDot) return;

    // X-axis safety window - draw bracket above
    const charStartX = x(window.startDot.x);
    const charEndX = x(window.endDot.x);
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

      // Spine runs along the outer edge, so the residues sit between it and the axis
      ctx.beginPath();
      ctx.moveTo(clippedStartX, spineTop + bracketThickness/2);
      ctx.lineTo(clippedEndX, spineTop + bracketThickness/2);
      ctx.stroke();

      // Arms drop from the spine towards the axis, closing the bracket around the residues
      if (startXVisible) {
        ctx.beginPath();
        ctx.moveTo(clippedStartX, spineTop);
        ctx.lineTo(clippedStartX, armTipTop);
        ctx.stroke();
      }

      if (endXVisible) {
        ctx.beginPath();
        ctx.moveTo(clippedEndX, spineTop);
        ctx.lineTo(clippedEndX, armTipTop);
        ctx.stroke();
      }

      // Add arrow showing direction only if we have enough space
      const arrowSize = Math.min(6, (clippedEndX - clippedStartX) / 4);
      if (((clippedEndX - clippedStartX) > arrowSize * 3 )&& drawArrows) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        const arrowY = (spineTop + armTipTop) / 2;
        ctx.moveTo(clippedStartX + arrowSize * 2, arrowY);
        ctx.lineTo(clippedStartX + arrowSize, arrowY - arrowSize/2);
        ctx.lineTo(clippedStartX + arrowSize, arrowY + arrowSize/2);
        ctx.fill();
      }
    }

    // Y-axis safety window - draw bracket to the left
    const charStartY = y(window.startDot.y);
    const charEndY = y(window.endDot.y);

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
      const spineX = Math.max(5, spineLeft);

      // Draw bracket with square ends
      ctx.strokeStyle = 'green';
      ctx.lineWidth = bracketThickness;
      ctx.lineJoin = 'miter';

      // Spine runs along the outer edge, so the residues sit between it and the axis
      ctx.beginPath();
      ctx.moveTo(spineX + bracketThickness/2, clippedTopY);
      ctx.lineTo(spineX + bracketThickness/2, clippedBottomY);
      ctx.stroke();

      // Arms reach from the spine towards the axis, closing the bracket around the residues
      if (topYVisible) {
        ctx.beginPath();
        ctx.moveTo(spineX, clippedTopY);
        ctx.lineTo(armTipLeft, clippedTopY);
        ctx.stroke();
      }

      if (bottomYVisible) {
        ctx.beginPath();
        ctx.moveTo(spineX, clippedBottomY);
        ctx.lineTo(armTipLeft, clippedBottomY);
        ctx.stroke();
      }

      // Add arrow showing direction
      const arrowSize = Math.min(6, (clippedBottomY - clippedTopY) / 4);
      if ((clippedBottomY - clippedTopY) > arrowSize * 3 && drawArrows) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        const arrowX = (spineX + armTipLeft) / 2;
        ctx.moveTo(arrowX, clippedTopY + arrowSize * 2);
        ctx.lineTo(arrowX - arrowSize/2, clippedTopY + arrowSize);
        ctx.lineTo(arrowX + arrowSize/2, clippedTopY + arrowSize);
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

/**
 * Draw gap region highlighting on the axis and in the grid
 */
export function drawGapHighlight(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  gapInfo: {type: 'representative' | 'member'; start: number; end: number}
): void {
  // Save current state to restore later
  ctx.save();
  
  if (gapInfo.type === 'representative') {
    // For representative gaps (horizontal gaps on x-axis)
    const startX = x(gapInfo.start);
    const endX = x(gapInfo.end);
    
    // First draw the axis indicator
    ctx.fillStyle = 'rgba(255, 107, 71, 0.4)';
    const rectHeight = Math.max(8, marginTop * 0.15);
    ctx.fillRect(startX, marginTop - rectHeight, endX - startX, rectHeight);
    
    // Add a border to the axis indicator
    ctx.strokeStyle = 'rgb(255, 107, 71)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, marginTop - rectHeight, endX - startX, rectHeight);
    
    // Now add a light highlighting in the grid area
    ctx.fillStyle = 'rgba(255, 107, 71, 0.1)';
    // Draw a vertical strip through the grid area for this representative gap
    ctx.fillRect(startX, marginTop, endX - startX, y.range()[1] - marginTop);
  } else {
    // For member gaps (vertical gaps on y-axis)
    const startY = y(gapInfo.start);
    const endY = y(gapInfo.end);
    
    // First draw the axis indicator
    ctx.fillStyle = 'rgba(255, 107, 71, 0.4)';
    const rectWidth = Math.max(8, marginLeft * 0.15);
    ctx.fillRect(marginLeft - rectWidth, startY, rectWidth, endY - startY);
    
    // Add a border to the axis indicator
    ctx.strokeStyle = 'rgb(255, 107, 71)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(marginLeft - rectWidth, startY, rectWidth, endY - startY);
    
    // Now add a light highlighting in the grid area
    ctx.fillStyle = 'rgba(255, 107, 71, 0.1)';
    // Draw a horizontal strip through the grid area for this member gap
    ctx.fillRect(marginLeft, startY, x.range()[1] - marginLeft, endY - startY);
  }
  
  // Restore context state
  ctx.restore();
}

/**
 * Optimized gap highlighting with axis and grid rendering
 * Performance-optimized version for larger datasets
 */
export function drawGapHighlightOptimized(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  gapAlignment: Alignment,
  gapType: 'representative' | 'member'
): void {
  if (!gapAlignment.startDot || !gapAlignment.endDot) return;
  
  ctx.save();
  
  if (gapType === 'representative') {
    // For representative gaps (horizontal gaps on x-axis)
    const startX = x(gapAlignment.startDot.x);
    const endX = x(gapAlignment.endDot.x);
    
    // Calculate rectangle dimensions
    const rectHeight = Math.max(8, marginTop * 0.15);
    const top = marginTop - rectHeight;
    
    // First draw axis indicator
    ctx.fillStyle = 'rgba(255, 107, 71, 0.4)';
    ctx.fillRect(startX, top, endX - startX, rectHeight);
    
    // Add efficient borders (filled rectangles instead of strokes)
    ctx.fillStyle = 'rgba(255, 107, 71, 0.6)';
    ctx.fillRect(startX, top, endX - startX, 1); // Top border
    ctx.fillRect(startX, marginTop - 1, endX - startX, 1); // Bottom border
    ctx.fillRect(startX, top, 1, rectHeight); // Left border
    ctx.fillRect(endX - 1, top, 1, rectHeight); // Right border
    
    // Draw light highlight in grid area
    ctx.fillStyle = 'rgba(255, 107, 71, 0.1)';
    ctx.fillRect(startX, marginTop, endX - startX, y.range()[1] - marginTop);
  } else {
    // For member gaps (vertical gaps on y-axis)
    const startY = y(gapAlignment.startDot.y);
    const endY = y(gapAlignment.endDot.y);
    
    // Calculate rectangle dimensions
    const rectWidth = Math.max(8, marginLeft * 0.15);
    const left = marginLeft - rectWidth;
    
    // First draw axis indicator
    ctx.fillStyle = 'rgba(255, 107, 71, 0.4)';
    ctx.fillRect(left, startY, rectWidth, endY - startY);
    
    // Add efficient borders (filled rectangles instead of strokes)
    ctx.fillStyle = 'rgba(255, 107, 71, 0.6)';
    ctx.fillRect(left, startY, rectWidth, 1); // Top border
    ctx.fillRect(left, endY - 1, rectWidth, 1); // Bottom border
    ctx.fillRect(left, startY, 1, endY - startY); // Left border
    ctx.fillRect(marginLeft - 1, startY, 1, endY - startY); // Right border
    
    // Draw light highlight in grid area
    ctx.fillStyle = 'rgba(255, 107, 71, 0.1)';
    ctx.fillRect(marginLeft, startY, x.range()[1] - marginLeft, endY - startY);
  }
  
  ctx.restore();
}