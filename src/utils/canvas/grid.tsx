// Grid lines
import type { ScaleLinear } from 'd3-scale';

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  xTicks: Array<{value: number; xOffset: number}>,
  yTicks: Array<{value: number; yOffset: number}>,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  bounds?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  }
) {
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);

  const [xRangeStart, xRangeEnd] = x.range()[0] <= x.range()[1]
    ? [x.range()[0], x.range()[1]]
    : [x.range()[1], x.range()[0]];
  const [yRangeStart, yRangeEnd] = y.range()[0] <= y.range()[1]
    ? [y.range()[0], y.range()[1]]
    : [y.range()[1], y.range()[0]];

  const boundedXStart = Math.max(
    xRangeStart,
    bounds ? Math.min(x(bounds.xMin), x(bounds.xMax)) : xRangeStart
  );
  const boundedXEnd = Math.min(
    xRangeEnd,
    bounds ? Math.max(x(bounds.xMin), x(bounds.xMax)) : xRangeEnd
  );
  const boundedYStart = Math.max(
    yRangeStart,
    bounds ? Math.min(y(bounds.yMin), y(bounds.yMax)) : yRangeStart
  );
  const boundedYEnd = Math.min(
    yRangeEnd,
    bounds ? Math.max(y(bounds.yMin), y(bounds.yMax)) : yRangeEnd
  );

  // No valid drawable area after clamping.
  if (boundedXStart > boundedXEnd || boundedYStart > boundedYEnd) {
    ctx.setLineDash([]);
    return;
  }
  
  // Vertical grid lines
  xTicks.forEach(tick => {
    if (tick.value < 0 || tick.xOffset < xRangeStart || tick.xOffset > xRangeEnd) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(tick.xOffset, boundedYStart);
    ctx.lineTo(tick.xOffset, boundedYEnd);
    ctx.stroke();
  });
  
  // Horizontal grid lines
  yTicks.forEach(tick => {
    if (tick.value < 0 || tick.yOffset < yRangeStart || tick.yOffset > yRangeEnd) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(boundedXStart, tick.yOffset);
    ctx.lineTo(boundedXEnd, tick.yOffset);
    ctx.stroke();
  });

  ctx.setLineDash([]);
}