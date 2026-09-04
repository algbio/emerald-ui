// Draws thin per-residue confidence color strips along PointGridPlot's X and Y axes.
import type { ScaleLinear } from 'd3-scale';
import { getPlddtColor } from '../colors/confidenceColorScale';

export const CONFIDENCE_STRIP_THICKNESS = 10;

function getVisibleResidueRange(
  scale: ScaleLinear<number, number>,
  pixelStart: number,
  pixelEnd: number,
  sequenceLength: number
): { start: number; end: number } | null {
  if (sequenceLength <= 0) return null;
  const start = Math.max(0, Math.floor(scale.invert(pixelStart)));
  const end = Math.min(sequenceLength - 1, Math.ceil(scale.invert(pixelEnd)) - 1);
  if (start > end) return null;
  return { start, end };
}

/** Draws the pLDDT color strip along the top (X) axis, just above the axis line. */
export function drawConfidenceStripX(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  marginTop: number,
  plddt: number[],
  sequenceLength: number
) {
  const [pixelStart, pixelEnd] = x.range();
  const visible = getVisibleResidueRange(x, pixelStart, pixelEnd, Math.min(sequenceLength, plddt.length));
  if (!visible) return;

  const stripTop = marginTop - CONFIDENCE_STRIP_THICKNESS;
  for (let i = visible.start; i <= visible.end; i++) {
    const score = plddt[i];
    if (score === undefined || isNaN(score)) continue;
    const px0 = x(i);
    const px1 = x(i + 1);
    ctx.fillStyle = getPlddtColor(score);
    ctx.fillRect(px0, stripTop, Math.max(1, px1 - px0), CONFIDENCE_STRIP_THICKNESS);
  }
}

/** Draws the pLDDT color strip along the left (Y) axis, just left of the axis line. */
export function drawConfidenceStripY(
  ctx: CanvasRenderingContext2D,
  y: ScaleLinear<number, number>,
  marginLeft: number,
  plddt: number[],
  sequenceLength: number
) {
  const [pixelStart, pixelEnd] = y.range();
  const visible = getVisibleResidueRange(y, pixelStart, pixelEnd, Math.min(sequenceLength, plddt.length));
  if (!visible) return;

  const stripLeft = marginLeft - CONFIDENCE_STRIP_THICKNESS;
  for (let i = visible.start; i <= visible.end; i++) {
    const score = plddt[i];
    if (score === undefined || isNaN(score)) continue;
    const py0 = y(i);
    const py1 = y(i + 1);
    ctx.fillStyle = getPlddtColor(score);
    ctx.fillRect(stripLeft, Math.min(py0, py1), CONFIDENCE_STRIP_THICKNESS, Math.max(1, Math.abs(py1 - py0)));
  }
}
