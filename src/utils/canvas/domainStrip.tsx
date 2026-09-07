// Draws per-residue domain annotation color blocks along PointGridPlot's X and Y axes, stacked
// below/left of the pLDDT confidence strip when both are shown.
import type { ScaleLinear } from 'd3-scale';
import type { ProteinDomain } from '../../hooks/useProteinDomains';
import { getDomainColor } from '../colors/domainColorScale';
import { clampSpanToAxis } from './axisSpan';

export const DOMAIN_STRIP_THICKNESS = 10;

/** Draws the domain annotation strip along the top (X) axis. */
export function drawDomainStripX(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  stripTop: number,
  domains: ProteinDomain[]
) {
  for (const domain of domains) {
    const span = clampSpanToAxis(x, x(domain.start - 1), x(domain.end));
    if (!span) continue;
    ctx.fillStyle = getDomainColor(domain.name);
    ctx.fillRect(span.start, stripTop, span.size, DOMAIN_STRIP_THICKNESS);
  }
}

/** Draws the domain annotation strip along the left (Y) axis. */
export function drawDomainStripY(
  ctx: CanvasRenderingContext2D,
  y: ScaleLinear<number, number>,
  stripLeft: number,
  domains: ProteinDomain[]
) {
  for (const domain of domains) {
    const span = clampSpanToAxis(y, y(domain.start - 1), y(domain.end));
    if (!span) continue;
    ctx.fillStyle = getDomainColor(domain.name);
    ctx.fillRect(stripLeft, span.start, DOMAIN_STRIP_THICKNESS, span.size);
  }
}

/** Finds the domain (if any) covering a given 0-based residue index. */
export function findDomainAtResidue(domains: ProteinDomain[], residueIndex: number): ProteinDomain | null {
  const position = residueIndex + 1; // domains are stored 1-based
  return domains.find(d => position >= d.start && position <= d.end) ?? null;
}
