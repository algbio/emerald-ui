// Draws thin per-residue confidence color strips along PointGridPlot's X and Y axes.
import type { ScaleLinear } from 'd3-scale';
import { getPlddtColor } from '../colors/confidenceColorScale';
import { clampSpanToAxis } from './axisSpan';

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

/**
 * Draws the pLDDT color strip along the top (X) axis. Takes the band's top edge rather than the
 * margin, since the caller stacks the annotation bands (residue letters, then domain, then
 * pLDDT) outward from the axis and their positions shift with the axis font size.
 */
export function drawConfidenceStripX(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  stripTop: number,
  plddt: number[],
  sequenceLength: number
) {
  const [pixelStart, pixelEnd] = x.range();
  const visible = getVisibleResidueRange(x, pixelStart, pixelEnd, Math.min(sequenceLength, plddt.length));
  if (!visible) return;

  for (let i = visible.start; i <= visible.end; i++) {
    const score = plddt[i];
    if (score === undefined || isNaN(score)) continue;
    // The first and last visible residues are usually only partly on-axis, so clamp rather
    // than letting their blocks paint into the margin beside the plot area.
    const span = clampSpanToAxis(x, x(i), x(i + 1));
    if (!span) continue;
    ctx.fillStyle = getPlddtColor(score);
    ctx.fillRect(span.start, stripTop, span.size, CONFIDENCE_STRIP_THICKNESS);
  }
}

/** Draws the pLDDT color strip along the left (Y) axis. See drawConfidenceStripX on stripLeft. */
export function drawConfidenceStripY(
  ctx: CanvasRenderingContext2D,
  y: ScaleLinear<number, number>,
  stripLeft: number,
  plddt: number[],
  sequenceLength: number
) {
  const [pixelStart, pixelEnd] = y.range();
  const visible = getVisibleResidueRange(y, pixelStart, pixelEnd, Math.min(sequenceLength, plddt.length));
  if (!visible) return;

  for (let i = visible.start; i <= visible.end; i++) {
    const score = plddt[i];
    if (score === undefined || isNaN(score)) continue;
    const span = clampSpanToAxis(y, y(i), y(i + 1));
    if (!span) continue;
    ctx.fillStyle = getPlddtColor(score);
    ctx.fillRect(stripLeft, span.start, CONFIDENCE_STRIP_THICKNESS, span.size);
  }
}
