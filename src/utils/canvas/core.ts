// Core canvas utilities and shared fundamentals
// import type { ScaleLinear } from 'd3-scale';

// Any helper functions used across multiple files
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
}

export function setupClipping(
  ctx: CanvasRenderingContext2D,
  marginLeft: number,
  marginTop: number,
  width: number,
  height: number,
  marginRight: number,
  marginBottom: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(marginLeft, marginTop, width - marginLeft - marginRight, height - marginTop - marginBottom);
  ctx.clip();
}

export function restoreContext(ctx: CanvasRenderingContext2D) {
  ctx.restore();
}