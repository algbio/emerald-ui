import type { ScaleLinear } from 'd3-scale';

/**
 * Clamps a pixel span to an axis's own range, returning null when it falls entirely outside.
 *
 * Both per-residue strips need this. Clamping the *residue* range is not enough on its own: the
 * first and last visible residues are usually only partly visible, so their blocks start before
 * / end after the axis and paint into the margin - which at high zoom means a whole cell's worth
 * of colour sitting outside the plot area, past the last numbered position on the axis. Domain
 * blocks are worse again, since one block covers a whole annotation rather than a single residue
 * and can overhang by hundreds of pixels.
 */
export function clampSpanToAxis(
  scale: ScaleLinear<number, number>,
  from: number,
  to: number
): { start: number; size: number } | null {
  const [rangeStart, rangeEnd] = scale.range();
  const axisMin = Math.min(rangeStart, rangeEnd);
  const axisMax = Math.max(rangeStart, rangeEnd);
  const start = Math.max(axisMin, Math.min(from, to));
  const end = Math.min(axisMax, Math.max(from, to));
  if (end <= start) return null;
  // Keep sub-pixel spans visible, but never let a block spill past the axis end.
  return { start, size: Math.min(Math.max(1, end - start), axisMax - start) };
}
