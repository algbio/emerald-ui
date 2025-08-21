// Axis drawing functions
import type { ScaleLinear } from 'd3-scale';

// Interface for safety window bounds
export interface SafetyWindowBounds {
  xStart?: number;
  xEnd?: number;
  yStart?: number;
  yEnd?: number;
}

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
  stringLength: number,
  marginTop: number,
  isInSafetyWindow?: (position: number, axis: 'x' | 'y') => boolean
) {
  // Get actual X axis range end point
  const xAxisEnd = x.range()[1];
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Calculate character height-based offset for vertical positioning
  // Use the same vertical positioning logic as safety window indices
  const charHeight = fontSize * 1.2; // Consistent with safety window indices
  const topOffset = charHeight * 1.5; // Space from top of axis area, matching safety window indices
  
  // Calculate the visible range in domain units
  const xStart = Math.floor(x.invert(marginLeft));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(xAxisEnd)));
  
  // Find the first multiple of 10 in the visible range
  const firstXMarker = Math.max(0, Math.ceil(xStart / 10) * 10);
  
  // Draw X axis index markers
  for (let i = firstXMarker; i < xEnd; i += 10) {
    // Skip if beyond string length
    if (i >= stringLength) break;
    
    // Position markers centered on characters (at i + 0.5)
    const xPos = x(i + 0.5);
    // Only draw if in visible range
    if (xPos >= marginLeft && xPos <= xAxisEnd) {
      // Check if in safety window and highlight if it is
      if (isInSafetyWindow) {
        const isInSafety = isInSafetyWindow(i, 'x');
        ctx.fillStyle = isInSafety ? 'green' : '#555';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
      }
      
      // Add 1 to index for display (1-indexed)
      ctx.fillText((i + 1).toString(), xPos, marginTop - topOffset);
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
  stringLength: number,
  isInSafetyWindow?: (position: number, axis: 'x' | 'y') => boolean
) {
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Calculate character width-based offset for horizontal positioning
  // Use the same horizontal positioning logic as safety window indices
  const charHeight = fontSize * 1.2; // Consistent with safety window indices
  const leftOffset = charHeight * 1.2; // Space for indices, matching safety window indices
  
  // Calculate the visible range for Y axis
  const yStart = Math.floor(y.invert(0));
  const yEnd = Math.min(stringLength, Math.ceil(y.invert(y.range()[1])));
  
  // Ensure we don't show negative indices
  const firstYMarker = Math.max(0, Math.ceil(yStart / 10) * 10);
  
  for (let i = firstYMarker; i < yEnd; i += 10) {
    // Skip if beyond string length
    if (i >= stringLength) break;
    
    // Position markers centered on characters (at i + 0.5)
    const yPos = y(i + 0.5);
    // Only draw if in visible range
    if (yPos >= marginTop && yPos <= y.range()[1]) {
      // Check if in safety window and highlight if it is
      if (isInSafetyWindow) {
        const isInSafety = isInSafetyWindow(i, 'y');
        ctx.fillStyle = isInSafety ? 'green' : '#555';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
      }
      
      // Add 1 to index for display (1-indexed)
      ctx.fillText((i + 1).toString(), marginLeft - leftOffset, yPos);
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
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean,
  selectedSafetyWindow?: SafetyWindowBounds,
  representativeDescriptor?: string,
  memberDescriptor?: string,
  showSequenceCharacters: boolean = true,
  showSequenceIndices: boolean = true
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
  
  // Draw index markers only if enabled (either full or minimal based on overlap)
  if (showSequenceIndices) {
    if (xOverlap) {
      drawMinimalXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength, marginTop, isInSafetyWindow);
    } else {
      drawXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength, marginTop, isInSafetyWindow);
    }
  }

  // Draw X axis descriptor (centered above axis)
  if (representativeDescriptor) {
    ctx.save();
    ctx.font = `bold ${Math.max(13, fontSize * 1.1)}px sans-serif`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xAxisCenter = marginLeft + (ctx.canvas.width - marginLeft) / 2;
    ctx.fillText(representativeDescriptor, xAxisCenter, 8);
    ctx.restore();
  }
  
  ctx.restore();
  
  // Apply clipping for the vertical axis
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, canvasHeight - marginTop);
  ctx.clip();
  
  // Draw Y index markers only if enabled
  if (showSequenceIndices) {
    if (yOverlap) {
      drawMinimalYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength, isInSafetyWindow);
    } else {
      drawYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength, isInSafetyWindow);
    }
  }

  // Draw Y axis descriptor (rotated, centered along Y axis)
  if (memberDescriptor) {
    ctx.save();
    ctx.font = `bold ${Math.max(13, fontSize * 1.1)}px sans-serif`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Center of Y axis area
    const yAxisCenter = marginTop + (ctx.canvas.height - marginTop) / 2;
    // Draw rotated text
    ctx.save();
    ctx.translate(18, yAxisCenter);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(memberDescriptor, 0, 0);
    ctx.restore();
    ctx.restore();
  }
  
  ctx.restore();
  
  // Draw character labels only if enabled (these functions apply their own clipping)
  if (showSequenceCharacters) {
    // Draw Y axis character labels first
    drawYLabels(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
    
    // Draw X axis character labels
    drawXLabels(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
  }
  
  // Draw selected safety window indices if provided
  if (selectedSafetyWindow) {
    drawSafetyWindowIndices(ctx, x, y, marginTop, marginLeft, fontSize, selectedSafetyWindow);
  }
}

// Draw minimal index markers for X axis showing just first, middle and last visible
export function drawMinimalXIndexMarkers(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginLeft: number,
  fontSize: number,
  stringLength: number,
  marginTop: number,
  isInSafetyWindow?: (position: number, axis: 'x' | 'y') => boolean,
) {
  // Get actual X axis range end point
  const xAxisEnd = x.range()[1];
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Calculate character height-based offset for vertical positioning
  // Use the same vertical positioning logic as safety window indices
  const charHeight = fontSize * 1.2; // Consistent with safety window indices
  const topOffset = charHeight * 1.5; // Space from top of axis area, matching safety window indices
  
  // Calculate the visible range in domain units
  const xStart = Math.max(0, Math.floor(x.invert(marginLeft)));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(xAxisEnd)));
  
  // Only proceed if we have a valid range
  if (xStart >= xEnd) return;
  
  // Calculate the middle index
  const xMiddle = Math.floor((xStart + xEnd) / 2);
  
  // Draw first index marker - always at the start of visible area (centered on character)
  const xStartPos = Math.max(marginLeft, x(xStart + 0.5));
  
  // Check if this position is in a safety window (if function provided)
  if (isInSafetyWindow) {
    const isInSafety = isInSafetyWindow(xStart, 'x');
    ctx.fillStyle = isInSafety ? 'green' : '#555';
    ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
  }
  
  // Add 1 to index for display (1-indexed)
  ctx.fillText((xStart + 1).toString(), xStartPos, marginTop - topOffset);
  
  // Draw middle index marker (only if it's different from start and end and we have enough space)
  const rangeWidth = Math.abs(x(xEnd) - x(xStart));
  if (xMiddle !== xStart && xMiddle !== xEnd && xMiddle < stringLength && rangeWidth > 60) {
    const xMiddlePos = x(xMiddle + 0.5);
    if (xMiddlePos >= marginLeft && xMiddlePos <= xAxisEnd) {
      // Check if this position is in a safety window (if function provided)
      if (isInSafetyWindow) {
        const isInSafety = isInSafetyWindow(xMiddle, 'x');
        ctx.fillStyle = isInSafety ? 'green' : '#555';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
      }
      
      // Add 1 to index for display (1-indexed)
      ctx.fillText((xMiddle + 1).toString(), xMiddlePos, marginTop - topOffset);
    }
  }
  
  // Draw last visible index marker
  if (xEnd > xStart && xEnd <= stringLength) {
    // Show the last index of the sequence if it's in view
    const lastIndex = stringLength - 1;
    if (lastIndex >= xStart && lastIndex < xEnd) {
      const lastIndexPos = x(lastIndex + 0.5);
      if (lastIndexPos >= marginLeft && lastIndexPos <= xAxisEnd) {
        // Check if this position is in a safety window (if function provided)
        if (isInSafetyWindow) {
          const isInSafety = isInSafetyWindow(lastIndex, 'x');
          ctx.fillStyle = isInSafety ? 'green' : '#555';
          ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
        }
        
        // Add 1 to index for display (1-indexed)
        ctx.fillText((lastIndex + 1).toString(), lastIndexPos, marginTop - topOffset);
      }
    } 
    // Otherwise show the last visible index
    else if (xEnd - 1 > xStart) {
      const xEndPos = Math.min(x(xEnd - 1 + 0.5), xAxisEnd - 5);
      if (xEndPos >= marginLeft && xEndPos <= xAxisEnd) {
        // Check if this position is in a safety window (if function provided)
        if (isInSafetyWindow) {
          const isInSafety = isInSafetyWindow(xEnd - 1, 'x');
          ctx.fillStyle = isInSafety ? 'green' : '#555';
          ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
        }
        
        // Add 1 to index for display (1-indexed)
        ctx.fillText((xEnd).toString(), xEndPos, marginTop - topOffset);
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
  isInSafetyWindow?: (position: number, axis: 'x' | 'y') => boolean,
) {
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Calculate character width-based offset for horizontal positioning
  // Use the same horizontal positioning logic as safety window indices
  const charHeight = fontSize * 1.2; // Consistent with safety window indices
  const leftOffset = charHeight * 1.2; // Space for indices, matching safety window indices
  
  // Calculate the visible range for Y axis
  const yStart = Math.max(0, Math.floor(y.invert(marginTop)));
  const yEnd = Math.min(stringLength, Math.ceil(y.invert(y.range()[1])));
  
  // Only proceed if we have a valid range
  if (yStart >= yEnd) return;
  
  // Calculate the middle index
  const yMiddle = Math.floor((yStart + yEnd) / 2);
  
  // Draw first index marker - always at the start of visible area (centered on character)
  const yStartPos = Math.max(marginTop, y(yStart + 0.5));
  
  // Check if this position is in a safety window (if function provided)
  if (isInSafetyWindow) {
    const isInSafety = isInSafetyWindow(yStart, 'y');
    ctx.fillStyle = isInSafety ? 'green' : '#555';
    ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
  }
  
  // Add 1 to index for display (1-indexed)
  ctx.fillText((yStart + 1).toString(), marginLeft - leftOffset, yStartPos);
  
  // Draw middle index marker (only if it's different from start and end and we have enough space)
  const rangeHeight = Math.abs(y(yEnd) - y(yStart));
  if (yMiddle !== yStart && yMiddle !== yEnd && yMiddle < stringLength && rangeHeight > 60) {
    const yMiddlePos = y(yMiddle + 0.5);
    if (yMiddlePos >= marginTop && yMiddlePos <= y.range()[1]) {
      // Check if this position is in a safety window (if function provided)
      if (isInSafetyWindow) {
        const isInSafety = isInSafetyWindow(yMiddle, 'y');
        ctx.fillStyle = isInSafety ? 'green' : '#555';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
      }
      
      // Add 1 to index for display (1-indexed)
      ctx.fillText((yMiddle + 1).toString(), marginLeft - leftOffset, yMiddlePos);
    }
  }
  
  // Draw last visible index marker
  if (yEnd > yStart && yEnd <= stringLength) {
    // Show the last index of the sequence if it's in view
    const lastIndex = stringLength - 1;
    if (lastIndex >= yStart && lastIndex < yEnd) {
      const lastIndexPos = y(lastIndex + 0.5);
      if (lastIndexPos >= marginTop && lastIndexPos <= y.range()[1]) {
        // Check if this position is in a safety window (if function provided)
        if (isInSafetyWindow) {
          const isInSafety = isInSafetyWindow(lastIndex, 'y');
          ctx.fillStyle = isInSafety ? 'green' : '#555';
          ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
        }
        
        // Add 1 to index for display (1-indexed)
        ctx.fillText((lastIndex + 1).toString(), marginLeft - leftOffset, lastIndexPos);
      }
    }
    // Otherwise show the last visible index
    else if (yEnd - 1 > yStart) {
      const yEndPos = Math.min(y(yEnd - 1 + 0.5), y.range()[1] - 5);
      if (yEndPos >= marginTop && yEndPos <= y.range()[1]) {
        // Check if this position is in a safety window (if function provided)
        if (isInSafetyWindow) {
          const isInSafety = isInSafetyWindow(yEnd - 1, 'y');
          ctx.fillStyle = isInSafety ? 'green' : '#555';
          ctx.font = `${isInSafety ? 'bold' : 'normal'} ${Math.max(10, fontSize * 0.8)}px monospace`;
        }
        
        // Add 1 to index for display (1-indexed)
        ctx.fillText((yEnd).toString(), marginLeft - leftOffset, yEndPos);
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
  
  // Calculate character height-based positioning
  const charHeight = fontSize * 1.2;
  const indexVerticalPosition = marginTop - (charHeight * 1.8); // Position indices further up
  const labelVerticalPosition = marginTop - (charHeight * 0.8); // Character labels closer to axis
  
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
        
        // Draw position index above the character (1-indexed)
        ctx.fillStyle = '#555';
        ctx.font = `${Math.max(10, fontSize * 0.6)}px monospace`;
        ctx.fillText((tick.value + 1).toString(), xPos, indexVerticalPosition);
        
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

// Draw the indices of a selected safety window
export function drawSafetyWindowIndices(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  fontSize: number,
  safetyWindow: SafetyWindowBounds
) {
  if (!safetyWindow || (!safetyWindow.xStart && !safetyWindow.yStart)) {
    return; // No safety window selected
  }
  
  // Save current context
  ctx.save();
  
  // Style for safety window indices
  ctx.fillStyle = 'green';
  ctx.font = `bold ${Math.max(11, fontSize * 0.9)}px monospace`;
  
  // Calculate character height-based offsets
  const charHeight = fontSize * 1.2; // Approximate height of a character with line spacing
  const xIndexOffset = charHeight * 1.5; // Vertical offset for X axis indices
  const yIndexOffset = charHeight * 1.2; // Horizontal offset for Y axis indices
  
  // Draw X axis safety window indices (horizontally along top axis)
  if (safetyWindow.xStart !== undefined && safetyWindow.xEnd !== undefined) {
    // Beginning index - place above the axis with vertical offset, centered on character
    const xStartPos = x(safetyWindow.xStart + 0.5); // +0.5 to center on character
    if (xStartPos >= marginLeft) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      // Add 1 for 1-indexed display
      ctx.fillText(`${safetyWindow.xStart + 1}`, xStartPos, marginTop - xIndexOffset);
    }
    
    // End index - place above the axis with vertical offset, centered on character
    // For end index, use the last included position (xEnd-1) + 0.5 for centering
    const xEndPos = x(safetyWindow.xEnd - 0.5); // -0.5 because end is exclusive
    if (xEndPos <= x.range()[1]) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${safetyWindow.xEnd}`, xEndPos, marginTop - xIndexOffset);
    }
  }
  
  // Draw Y axis safety window indices (vertically along left axis)
  if (safetyWindow.yStart !== undefined && safetyWindow.yEnd !== undefined) {
    // Beginning index - place to the left of the axis, centered on character
    const yStartPos = y(safetyWindow.yStart + 0.5); // +0.5 to center on character
    if (yStartPos >= marginTop) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      // Add 1 for 1-indexed display
      ctx.fillText(`${safetyWindow.yStart + 1}`, marginLeft - yIndexOffset, yStartPos);
    }
    
    // End index - place to the left of the axis, centered on character
    // For end index, use the last included position (yEnd-1) + 0.5 for centering
    const yEndPos = y(safetyWindow.yEnd - 0.5); // -0.5 because end is exclusive
    if (yEndPos <= y.range()[1]) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${safetyWindow.yEnd}`, marginLeft - yIndexOffset, yEndPos);
    }
  }
  
  // Restore context
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
  
  // Calculate character width-based positioning
  const charWidth = fontSize * 0.6; // Approximate width of a character
  const indexOffset = charWidth * 3.5; // Space for index digits (up to 3 digits)
  const labelOffset = charWidth * 1.5; // Space for character labels
  
  // Get the visible domain range (with a small buffer for partial visibility)
  const visibleYStart = Math.max(0, Math.floor(y.invert(marginTop)) - 1);
  const visibleYEnd = Math.ceil(y.invert(y.range()[1])) + 1;
  
  yTicks.forEach(tick => {
    // Only process labels within the visible domain range
    if (tick.label && tick.value >= visibleYStart && tick.value < visibleYEnd) {
      const yPos = y(tick.value + 0.5);
      const isInSafety = isInSafetyWindow(tick.value, 'y');
      
      // Draw position index to the left of the character (1-indexed)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#555';
      ctx.font = `${Math.max(10, fontSize * 0.6)}px monospace`;
      ctx.fillText((tick.value + 1).toString(), marginLeft - indexOffset, yPos);
      
      // Draw character label
      ctx.textAlign = 'end';
      ctx.fillStyle = isInSafety ? 'green' : 'black';
      ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
      ctx.fillText(tick.label, marginLeft - labelOffset, yPos);
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
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean,
  selectedSafetyWindow?: SafetyWindowBounds
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
  
  // Draw minimal X index markers with safety window highlighting
  drawMinimalXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength, marginTop, isInSafetyWindow);
  
  ctx.restore();
  
  // Apply clipping for Y axis index markers
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, marginTop, marginLeft, canvasHeight - marginTop);
  ctx.clip();
  
  // Draw minimal Y index markers with safety window highlighting
  drawMinimalYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength, isInSafetyWindow);
  
  ctx.restore();
  
  // Draw character labels with their indices (these functions apply their own clipping)
  // Draw Y labels first, then X labels
  drawYLabelsWithIndices(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
  drawXLabelsWithIndices(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
  
  // Draw selected safety window indices if provided
  if (selectedSafetyWindow) {
    drawSafetyWindowIndices(ctx, x, y, marginTop, marginLeft, fontSize, selectedSafetyWindow);
  }
}
