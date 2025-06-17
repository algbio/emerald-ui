// Grid lines
import type { ScaleLinear } from 'd3-scale';

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{xOffset: number}>,
  yTicks: Array<{yOffset: number}>,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
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