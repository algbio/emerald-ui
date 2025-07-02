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

// Get max string length from ticks
function getStringLength(ticks: Array<{value: number; label: string}>): number {
  return Math.max(...ticks.map(tick => tick.value)) + 1;
}

// Draw index markers for X axis
function drawXIndexMarkers(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginLeft: number,
  fontSize: number,
  stringLength: number
) {
  const canvasWidth = ctx.canvas.width;
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate the visible range in domain units
  const xStart = Math.floor(x.invert(marginLeft));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(canvasWidth)));
  
  // Find the first multiple of 10 in the visible range
  const firstXMarker = Math.max(0, Math.ceil(xStart / 10) * 10);
  
  // Draw X axis index markers
  for (let i = firstXMarker; i < xEnd; i += 10) {
    // Skip if beyond string length
    if (i >= stringLength) break;
    
    const xPos = x(i);
    // Only draw if in visible range
    if (xPos >= marginLeft && xPos <= canvasWidth) {
      ctx.fillText(i.toString(), xPos, 5);
    }
  }
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
  const canvasWidth = ctx.canvas.width;
  
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  xTicks.forEach(tick => {
    if (tick.label) {
      const xPos = x(tick.value + 0.5);
      const labelWidth = ctx.measureText(tick.label).width;
      
      // Only render if the label is within the canvas bounds
      if (xPos >= marginLeft && xPos <= canvasWidth && 
          xPos - labelWidth/2 >= marginLeft && xPos + labelWidth/2 <= canvasWidth) {
        const isInSafety = isInSafetyWindow(tick.value, 'x');
        
        ctx.fillStyle = isInSafety ? 'green' : 'black';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
        ctx.fillText(tick.label, xPos, marginTop - 10);
      }
    }
  });
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
  
  yTicks.forEach(tick => {
    if (tick.label) {
      const yPos = y(tick.value + 0.5);
      const labelWidth = ctx.measureText(tick.label).width;
      
      // Only render if the label is within the bounds
      if (yPos >= marginTop && yPos <= y.range()[1] &&
          marginLeft - labelWidth >= 0) {
        const isInSafety = isInSafetyWindow(tick.value, 'y');
        
        ctx.fillStyle = isInSafety ? 'green' : 'black';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
        ctx.fillText(tick.label, marginLeft - 12, yPos);
      }
    }
  });
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
  // Calculate string lengths
  const xStringLength = getStringLength(xTicks);
  const yStringLength = getStringLength(yTicks);
  
  // Draw index markers
  drawXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength);
  drawYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength);
  
  // Draw character labels
  drawXLabels(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
  drawYLabels(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
}

// Draw minimal index markers for X axis showing just first, middle and last visible
export function drawMinimalXIndexMarkers(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginLeft: number,
  fontSize: number,
  stringLength: number,
) {
  const canvasWidth = ctx.canvas.width;
  
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate the visible range in domain units
  const xStart = Math.max(0, Math.floor(x.invert(marginLeft)));
  const xEnd = Math.min(stringLength, Math.ceil(x.invert(canvasWidth)));
  
  // Only proceed if we have a valid range
  if (xStart >= xEnd) return;
  
  // Calculate the middle index
  const xMiddle = Math.floor((xStart + xEnd) / 2);
  
  // Draw first index marker - always at the start of visible area
  ctx.fillText(xStart.toString(), marginLeft, 5);
  
  // Draw middle index marker (only if it's different from start and end)
  if (xMiddle !== xStart && xMiddle !== xEnd && xMiddle < stringLength) {
    const xMiddlePos = x(xMiddle);
    if (xMiddlePos >= marginLeft && xMiddlePos <= canvasWidth) {
      ctx.fillText(xMiddle.toString(), xMiddlePos, 5);
    }
  }
  
  // Draw last index marker
  if (xEnd > xStart && xEnd < stringLength) {
    const xEndPos = x(xEnd - 1);
    if (xEndPos >= marginLeft && xEndPos <= canvasWidth) {
      ctx.fillText((xEnd - 1).toString(), xEndPos, 5);
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
  ctx.fillText(yStart.toString(), marginLeft - 35, marginTop);
  
  // Draw middle index marker (only if it's different from start and end)
  if (yMiddle !== yStart && yMiddle !== yEnd && yMiddle < stringLength) {
    const yMiddlePos = y(yMiddle);
    if (yMiddlePos >= marginTop && yMiddlePos <= y.range()[1]) {
      ctx.fillText(yMiddle.toString(), marginLeft - 35, yMiddlePos);
    }
  }
  
  // Draw last index marker
  if (yEnd > yStart && yEnd < stringLength) {
    const yEndPos = y(yEnd - 1);
    if (yEndPos >= marginTop && yEndPos <= y.range()[1]) {
      ctx.fillText((yEnd - 1).toString(), marginLeft - 35, yEndPos);
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
  const canvasWidth = ctx.canvas.width;
  
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  xTicks.forEach(tick => {
    if (tick.label) {
      const xPos = x(tick.value + 0.5);
      const labelWidth = ctx.measureText(tick.label).width;
      
      // Only render if the label is within the canvas bounds
      if (xPos >= marginLeft && xPos <= canvasWidth && 
          xPos - labelWidth/2 >= marginLeft && xPos + labelWidth/2 <= canvasWidth) {
        const isInSafety = isInSafetyWindow(tick.value, 'x');
        
        // Draw position index above the character
        ctx.fillStyle = '#555';
        ctx.font = `${Math.max(10, fontSize * 0.6)}px monospace`;
        ctx.fillText(tick.value.toString(), xPos, marginTop - 25);
        
        // Draw character label
        ctx.fillStyle = isInSafety ? 'green' : 'black';
        ctx.font = `${isInSafety ? 'bold' : 'normal'} ${fontSize}px monospace`;
        ctx.fillText(tick.label, xPos, marginTop - 10);
      }
    }
  });
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
  ctx.textBaseline = 'middle';
  
  yTicks.forEach(tick => {
    if (tick.label) {
      const yPos = y(tick.value + 0.5);
      
      // Only render if the label is within the bounds
      if (yPos >= marginTop && yPos <= y.range()[1]) {
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
    }
  });
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
  // Calculate string lengths
  const xStringLength = getStringLength(xTicks);
  const yStringLength = getStringLength(yTicks);
  
  // Draw minimal index markers along the axes
  drawMinimalXIndexMarkers(ctx, x, marginLeft, fontSize, xStringLength);
  drawMinimalYIndexMarkers(ctx, y, marginTop, marginLeft, fontSize, yStringLength);
  
  // Draw character labels with their indices
  drawXLabelsWithIndices(ctx, xTicks, x, marginTop, marginLeft, fontSize, isInSafetyWindow);
  drawYLabelsWithIndices(ctx, yTicks, y, marginTop, marginLeft, fontSize, isInSafetyWindow);
}
