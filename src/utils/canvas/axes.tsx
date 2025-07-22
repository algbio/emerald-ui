// Axis drawing functions
import type { ScaleLinear } from 'd3-scale';

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
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

// Get string length from ticks
function getStringLength(ticks: Array<{value: number; label: string}>): number {
  return ticks.length;
}

// Draw index markers for X axis
function drawXIndexMarkers(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginLeft: number,
  fontSize: number,
  stringLength: number
) {
  // Get actual X axis range end point
  const xAxisEnd = x.range()[1];
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate the visible range in domain units
  const xStart = Math.floor(x.invert(marginLeft));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(xAxisEnd)));
  
  // Find the first multiple of 10 in the visible range
  const firstXMarker = Math.max(0, Math.ceil(xStart / 10) * 10);
  
  // Draw X axis index markers
  for (let i = firstXMarker; i < xEnd; i += 10) {
    // Skip if beyond string length
    if (i >= stringLength) break;
    
    const xPos = x(i);
    // Only draw if in visible range
    if (xPos >= marginLeft && xPos <= xAxisEnd) {
      ctx.fillText(i.toString(), xPos, 5);
    }
  }
  
  // We no longer show the last index if not in view
}

// Draw index markers for Y axis
function drawYIndexMarkers(
  ctx: CanvasRenderingContext2D,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  stringLength: number
) {
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Calculate the visible range for Y axis
  const yStart = Math.floor(y.invert(0));
  const yEnd = Math.min(stringLength, Math.ceil(y.invert(y.range()[1])));
  
  // Ensure we don't show negative indices
  const firstYMarker = Math.max(0, Math.ceil(yStart / 10) * 10);
  
  for (let i = firstYMarker; i < yEnd; i += 10) {
    // Skip if beyond string length
    if (i >= stringLength) break;
    
    const yPos = y(i);
    // Only draw if in visible range
    if (yPos >= marginTop && yPos <= y.range()[1]) {
      ctx.fillText(i.toString(), marginLeft - 35, yPos);
    }
  }
  
  // We no longer show the last index if not in view
}

// Draw character labels for X axis
function drawXLabels(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; label: string}>,
  x: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  // Get actual X axis range end point instead of using full canvas width
  const xAxisEnd = x.range()[1];
  
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Get the visible domain range (with a small buffer for partial visibility)
  const visibleXStart = Math.max(0, Math.floor(x.invert(marginLeft)) - 1);
  const visibleXEnd = Math.ceil(x.invert(xAxisEnd)) + 1;
  
  // Calculate where to position text vertically (ensure it's visible)
  const verticalPosition = marginTop - 10;
  
  // Save current context
  ctx.save();
  
  // IMPORTANT: Strict bounds checking for characters
  // Only render characters whose center point is fully within the bounds
  xTicks.forEach(tick => {
    // Only process labels within the visible domain range
    if (tick.label && tick.value >= visibleXStart && tick.value < visibleXEnd) {
      const xPos = x(tick.value + 0.5);
      
      // Strict bounds checking - only draw if the character's center position is within the axis bounds
      if (xPos >= marginLeft && xPos <= xAxisEnd) {
        const isInSafety = isInSafetyWindow(tick.value, 'x');
        
        ctx.fillStyle = isInSafety ? 'green' : 'black';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
        ctx.fillText(tick.label, xPos, verticalPosition);
      }
    }
  });
  
  // Restore context after drawing
  ctx.restore();
}

// Draw character labels for Y axis
function drawYLabels(
  ctx: CanvasRenderingContext2D,
  yTicks: Array<{value: number; label: string}>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  ctx.textAlign = 'end';
  ctx.textBaseline = 'middle';
  
  // Get the visible domain range (with a small buffer for partial visibility)
  const visibleYStart = Math.max(0, Math.floor(y.invert(marginTop)) - 1);
  const visibleYEnd = Math.ceil(y.invert(y.range()[1])) + 1;
  
  // Save context and apply strict clipping to prevent drawing outside the axis area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, y.range()[1] - marginTop);
  ctx.clip();
  
  yTicks.forEach(tick => {
    // Only process labels within the visible domain range
    if (tick.label && tick.value >= visibleYStart && tick.value < visibleYEnd) {
      const yPos = y(tick.value + 0.5);
      
      // No need for additional bounds check since clipping will handle it
      const isInSafety = isInSafetyWindow(tick.value, 'y');
      
      ctx.fillStyle = isInSafety ? 'green' : 'black';
      ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
      ctx.fillText(tick.label, marginLeft - 12, yPos);
    }
  });
  
  // Restore context after drawing
  ctx.restore();
}

// Function to check if index labels would overlap based on zoom level
function wouldIndexLabelsOverlap(
  x: ScaleLinear<number, number>, 
  y: ScaleLinear<number, number>
): { xOverlap: boolean; yOverlap: boolean } {
  // Calculate the pixel distance between consecutive indices
  const pixelDistanceX = Math.abs(x(10) - x(0));
  const pixelDistanceY = Math.abs(y(10) - y(0));
  
  // Define minimum distance in pixels before we consider labels to be overlapping
  // This is approximately the width of a 2-3 digit number with some padding
  const minDistance = 30;
  
  return {
    xOverlap: pixelDistanceX < minDistance,
    yOverlap: pixelDistanceY < minDistance
  };
}

// Main function that uses all the helper functions
export function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  fontSize: number,
  marginTop: number,
  marginLeft: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Calculate string lengths
  const xStringLength = getStringLength(xTicks);
  const yStringLength = getStringLength(yTicks);
  
  // Check if labels would overlap at current zoom level
  const { xOverlap, yOverlap } = wouldIndexLabelsOverlap(x, y);
  
  // Apply clipping for the axis areas to prevent drawing outside the axis
  ctx.save();
  // Clipping region for horizontal axis - only show content within the plot area width
  ctx.beginPath();
  ctx.rect(marginLeft, 0, canvasWidth - marginLeft, marginTop);
  ctx.clip();
  
  // Draw index markers (either full or minimal based on overlap)
  if (xOverlap) {
    drawMinimalXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength);
  } else {
    drawXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength);
  }
  
  ctx.restore();
  
  // Apply clipping for the vertical axis
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, canvasHeight - marginTop);
  ctx.clip();
  
  if (yOverlap) {
    drawMinimalYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength);
  } else {
    drawYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength);
  }
  
  ctx.restore();
  
  // Draw Y axis character labels first (this function applies its own clipping)
  drawYLabels(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
  
  // Draw X axis character labels (this function applies its own clipping)
  drawXLabels(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
}

// Draw minimal index markers for X axis showing just first, middle and last visible
export function drawMinimalXIndexMarkers(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginLeft: number,
  fontSize: number,
  stringLength: number,
) {
  // Get actual X axis range end point
  const xAxisEnd = x.range()[1];
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate the visible range in domain units
  const xStart = Math.max(0, Math.floor(x.invert(marginLeft)));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(xAxisEnd)));
  
  // Only proceed if we have a valid range
  if (xStart >= xEnd) return;
  
  // Calculate the middle index
  const xMiddle = Math.floor((xStart + xEnd) / 2);
  
  // Draw first index marker - always at the start of visible area
  const xStartPos = Math.max(marginLeft, x(xStart));
  ctx.fillText(xStart.toString(), xStartPos, 5);
  
  // Draw middle index marker (only if it's different from start and end and we have enough space)
  const rangeWidth = Math.abs(x(xEnd) - x(xStart));
  if (xMiddle !== xStart && xMiddle !== xEnd && xMiddle < stringLength && rangeWidth > 60) {
    const xMiddlePos = x(xMiddle);
    if (xMiddlePos >= marginLeft && xMiddlePos <= xAxisEnd) {
      ctx.fillText(xMiddle.toString(), xMiddlePos, 5);
    }
  }
  
  // Draw last visible index marker
  if (xEnd > xStart && xEnd <= stringLength) {
    // Show the last index of the sequence if it's in view
    const lastIndex = stringLength - 1;
    if (lastIndex >= xStart && lastIndex < xEnd) {
      const lastIndexPos = x(lastIndex);
      if (lastIndexPos >= marginLeft && lastIndexPos <= xAxisEnd) {
        ctx.fillText(lastIndex.toString(), lastIndexPos, 5);
      }
    } 
    // Otherwise show the last visible index
    else if (xEnd - 1 > xStart) {
      const xEndPos = Math.min(x(xEnd - 1), xAxisEnd - 5);
      if (xEndPos >= marginLeft && xEndPos <= xAxisEnd) {
        ctx.fillText((xEnd - 1).toString(), xEndPos, 5);
      }
    }
  }
}

// Draw minimal index markers for Y axis showing just first, middle and last visible
export function drawMinimalYIndexMarkers(
  ctx: CanvasRenderingContext2D,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  stringLength: number,
) {
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Calculate the visible range for Y axis
  const yStart = Math.max(0, Math.floor(y.invert(marginTop)));
  const yEnd = Math.min(stringLength, Math.ceil(y.invert(y.range()[1])));
  
  // Only proceed if we have a valid range
  if (yStart >= yEnd) return;
  
  // Calculate the middle index
  const yMiddle = Math.floor((yStart + yEnd) / 2);
  
  // Draw first index marker - always at the start of visible area
  const yStartPos = Math.max(marginTop, y(yStart));
  ctx.fillText(yStart.toString(), marginLeft - 35, yStartPos);
  
  // Draw middle index marker (only if it's different from start and end and we have enough space)
  const rangeHeight = Math.abs(y(yEnd) - y(yStart));
  if (yMiddle !== yStart && yMiddle !== yEnd && yMiddle < stringLength && rangeHeight > 60) {
    const yMiddlePos = y(yMiddle);
    if (yMiddlePos >= marginTop && yMiddlePos <= y.range()[1]) {
      ctx.fillText(yMiddle.toString(), marginLeft - 35, yMiddlePos);
    }
  }
  
  // Draw last visible index marker
  if (yEnd > yStart && yEnd <= stringLength) {
    // Show the last index of the sequence if it's in view
    const lastIndex = stringLength - 1;
    if (lastIndex >= yStart && lastIndex < yEnd) {
      const lastIndexPos = y(lastIndex);
      if (lastIndexPos >= marginTop && lastIndexPos <= y.range()[1]) {
        ctx.fillText(lastIndex.toString(), marginLeft - 35, lastIndexPos);
      }
    }
    // Otherwise show the last visible index
    else if (yEnd - 1 > yStart) {
      const yEndPos = Math.min(y(yEnd - 1), y.range()[1] - 5);
      if (yEndPos >= marginTop && yEndPos <= y.range()[1]) {
        ctx.fillText((yEnd - 1).toString(), marginLeft - 35, yEndPos);
      }
    }
  }
}

// Modified function to draw X labels with indices on top
function drawXLabelsWithIndices(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; label: string}>,
  x: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  // Get actual X axis range end point
  const xAxisEnd = x.range()[1];
  
  // Calculate safe vertical positions
  const indexVerticalPosition = marginTop - 25;
  const labelVerticalPosition = marginTop - 10;
  
  // Save current context
  ctx.save();
  
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Get the visible domain range (with a small buffer for partial visibility)
  const visibleXStart = Math.max(0, Math.floor(x.invert(marginLeft)) - 1);
  const visibleXEnd = Math.ceil(x.invert(xAxisEnd)) + 1;
  
  // IMPORTANT: Strict bounds checking for characters
  // Only render characters whose center point is fully within the bounds
  xTicks.forEach(tick => {
    // Only process labels within the visible domain range
    if (tick.label && tick.value >= visibleXStart && tick.value < visibleXEnd) {
      const xPos = x(tick.value + 0.5);
      
      // Strict bounds checking - only draw if the character's center position is within the axis bounds
      if (xPos >= marginLeft && xPos <= xAxisEnd) {
        const isInSafety = isInSafetyWindow(tick.value, 'x');
        
        // Draw position index above the character
        ctx.fillStyle = '#555';
        ctx.font = `${Math.max(10, fontSize * 0.6)}px monospace`;
        ctx.fillText(tick.value.toString(), xPos, indexVerticalPosition);
        
        // Draw character label
        ctx.fillStyle = isInSafety ? 'green' : 'black';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
        ctx.fillText(tick.label, xPos, labelVerticalPosition);
      }
    }
  });
  
  // Restore context after drawing
  ctx.restore();
}

// Modified function to draw Y labels with indices
function drawYLabelsWithIndices(
  ctx: CanvasRenderingContext2D,
  yTicks: Array<{value: number; label: string}>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  // Save context and apply strict clipping to prevent drawing outside the axis area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, y.range()[1] - marginTop);
  ctx.clip();
  
  ctx.textBaseline = 'middle';
  
  // Get the visible domain range (with a small buffer for partial visibility)
  const visibleYStart = Math.max(0, Math.floor(y.invert(marginTop)) - 1);
  const visibleYEnd = Math.ceil(y.invert(y.range()[1])) + 1;
  
  yTicks.forEach(tick => {
    // Only process labels within the visible domain range
    if (tick.label && tick.value >= visibleYStart && tick.value < visibleYEnd) {
      const yPos = y(tick.value + 0.5);
      const isInSafety = isInSafetyWindow(tick.value, 'y');
      
      // Draw position index to the left of the character
      ctx.textAlign = 'right';
      ctx.fillStyle = '#555';
      ctx.font = `${Math.max(10, fontSize * 0.6)}px monospace`;
      ctx.fillText(tick.value.toString(), marginLeft - 25, yPos);
      
      // Draw character label
      ctx.textAlign = 'end';
      ctx.fillStyle = isInSafety ? 'green' : 'black';
      ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
      ctx.fillText(tick.label, marginLeft - 12, yPos);
    }
  });
  
  // Restore context after drawing
  ctx.restore();
}

// Alternative axis labels function that shows indices above characters
export function drawIndexedAxisLabels(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  fontSize: number,
  marginTop: number,
  marginLeft: number,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Calculate string lengths
  const xStringLength = getStringLength(xTicks);
  const yStringLength = getStringLength(yTicks);
  
  // Apply clipping for X axis index markers
  ctx.save();
  ctx.beginPath();
  ctx.rect(marginLeft, 0, canvasWidth - marginLeft, marginTop);
  ctx.clip();
  
  // Draw minimal X index markers
  drawMinimalXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength);
  
  ctx.restore();
  
  // Apply clipping for Y axis index markers
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, canvasHeight - marginTop);
  ctx.clip();
  
  // Draw minimal Y index markers
  drawMinimalYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength);
  
  ctx.restore();
  
  // Draw character labels with their indices (these functions apply their own clipping)
  // Draw Y labels first, then X labels
  drawYLabelsWithIndices(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
  drawXLabelsWithIndices(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
}
