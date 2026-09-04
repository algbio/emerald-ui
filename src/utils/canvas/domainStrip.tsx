// Draws per-residue domain annotation color blocks along PointGridPlot's X and Y axes, stacked
// below/left of the pLDDT confidence strip when both are shown.
import type { ScaleLinear } from 'd3-scale';
import type { ProteinDomain } from '../../hooks/useProteinDomains';
import { getDomainColor } from '../colors/domainColorScale';

export const DOMAIN_STRIP_THICKNESS = 10;

/** Draws the domain annotation strip along the top (X) axis. */
export function drawDomainStripX(
  ctx: CanvasRenderingContext2D,
  x: ScaleLinear<number, number>,
  stripTop: number,
  domains: ProteinDomain[]
) {
  for (const domain of domains) {
    const px0 = x(domain.start - 1);
    const px1 = x(domain.end);
    ctx.fillStyle = getDomainColor(domain.name);
    ctx.fillRect(Math.min(px0, px1), stripTop, Math.max(1, Math.abs(px1 - px0)), DOMAIN_STRIP_THICKNESS);
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
    const py0 = y(domain.start - 1);
    const py1 = y(domain.end);
    ctx.fillStyle = getDomainColor(domain.name);
    ctx.fillRect(stripLeft, Math.min(py0, py1), DOMAIN_STRIP_THICKNESS, Math.max(1, Math.abs(py1 - py0)));
  }
}

/** Finds the domain (if any) covering a given 0-based residue index. */
export function findDomainAtResidue(domains: ProteinDomain[], residueIndex: number): ProteinDomain | null {
  const position = residueIndex + 1; // domains are stored 1-based
  return domains.find(d => position >= d.start && position <= d.end) ?? null;
}
