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
  // Get canvas dimensions for bounds checking
  const canvasWidth = ctx.canvas.width;
  
  // Draw index markers every 10 positions for X axis
  ctx.font = `${Math.max(10, fontSize * 0.8)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate the visible range in domain units
  const xStart = Math.floor(x.invert(marginLeft));
  const xEnd = Math.ceil(x.invert(canvasWidth));
  
  // Find the first multiple of 10 in the visible range
  // Ensure we don't show negative indices
  const firstXMarker = Math.max(0, Math.ceil(xStart / 10) * 10);
  
  // Draw X axis index markers
  for (let i = firstXMarker; i < xEnd; i += 10) {
    // Skip negative indices
    if (i < 0) continue;
    
    const xPos = x(i);
    // Only draw if in visible range
    if (xPos >= marginLeft && xPos <= canvasWidth) {
      ctx.fillText(i.toString(), xPos, 5);
    }
  }
  
  // Calculate the visible range for Y axis
  const yStart = Math.floor(y.invert(0));
  const yEnd = Math.ceil(y.invert(y.range()[1]));
  // Ensure we don't show negative indices
  const firstYMarker = Math.max(0, Math.ceil(yStart / 10) * 10);
  
  // Draw Y axis index markers
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  for (let i = firstYMarker; i < yEnd; i += 10) {
    // Skip negative indices
    if (i < 0) continue;
    
    const yPos = y(i);
    // Only draw if in visible range
    if (yPos >= marginTop && yPos <= y.range()[1]) {
      ctx.fillText(i.toString(), marginLeft - 35, yPos);
    }
  }
  
  // X axis labels
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

  // Y axis labels
  ctx.textAlign = 'end';
  ctx.textBaseline = 'middle';
  
  yTicks.forEach(tick => {
    if (tick.label) {
      const yPos = y(tick.value + 0.5);
      const labelWidth = ctx.measureText(tick.label).width;
      
      // Only render if the label is within the canvas bounds
      // For y-axis, we need to ensure it doesn't go above or below the visible area
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
