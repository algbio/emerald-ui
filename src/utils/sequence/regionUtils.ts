// Residue ranges for aligning part of a protein instead of the whole sequence.

import type { ProteinDomain } from '../../hooks/useProteinDomains';

/** 1-based residue numbers to match UniProt. */
export interface ResidueRange {
  start: number;
  end: number;
}

export interface RegionInputResult {
  /** Range,  null for the whole protein. */
  region: ResidueRange | null;
  error: string | null;
}

export const MIN_REGION_LENGTH = 2;

export function getRegionLength(sequence: string, region: ResidueRange | null): number {
  return region ? region.end - region.start + 1 : sequence.length;
}

export function extractRegion(sequence: string, region: ResidueRange | null): string {
  return region ? sequence.slice(region.start - 1, region.end) : sequence;
}

/** A range is only a region if it leaves something out; the whole protein is represented by null. */
export function normalizeRegion(range: ResidueRange, sequenceLength: number): ResidueRange | null {
  return range.start === 1 && range.end === sequenceLength ? null : range;
}

const parseResidueNumber = (text: string, fallback: number): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return fallback;
  return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
};

/**
 * Validates typed start/end residue numbers. A blank field means the start or end of the
 * protein, and a range covering the whole protein is returned as null so that it is treated
 * exactly like having made no selection.
 */
export function parseRegionInput(startText: string, endText: string, sequenceLength: number): RegionInputResult {
  const start = parseResidueNumber(startText, 1);
  const end = parseResidueNumber(endText, sequenceLength);

  if (start === null || end === null) {
    return { region: null, error: 'Start and end must be whole residue numbers.' };
  }
  if (start < 1 || end > sequenceLength) {
    return { region: null, error: `Residues must be between 1 and ${sequenceLength}.` };
  }
  if (start > end) {
    return { region: null, error: 'Start must not be after end.' };
  }
  if (end - start + 1 < MIN_REGION_LENGTH) {
    return { region: null, error: `Select at least ${MIN_REGION_LENGTH} residues.` };
  }
  return { region: normalizeRegion({ start, end }, sequenceLength), error: null };
}

/** Residues before the region, i.e. what turns a position in the region into a protein position. */
export function getResidueOffset(region: ResidueRange | null | undefined): number {
  return region ? region.start - 1 : 0;
}

/** Cuts per-residue scores for the whole protein down to the region. */
export function toRegionScores(scores: number[], region: ResidueRange | null): number[] {
  return region ? scores.slice(region.start - 1, region.end) : scores;
}

/**
 * Converts whole-protein domains to positions within the region, clipped to it. The original
 * numbers are kept in displayStart/displayEnd so a clipped domain still reports its true extent.
 */
export function toRegionDomains(domains: ProteinDomain[], region: ResidueRange | null): ProteinDomain[] {
  if (!region) return domains;
  const offset = getResidueOffset(region);
  return domains
    .filter(domain => domain.end >= region.start && domain.start <= region.end)
    .map(domain => ({
      ...domain,
      start: Math.max(domain.start, region.start) - offset,
      end: Math.min(domain.end, region.end) - offset,
      displayStart: domain.start,
      displayEnd: domain.end,
    }));
}

// Moves a range by a number of residues, keeping its length and staying on the protein.
export function moveRange(range: ResidueRange, delta: number, sequenceLength: number): ResidueRange {
  const length = range.end - range.start + 1;
  const start = Math.min(Math.max(1, range.start + delta), sequenceLength - length + 1);
  return { start, end: start + length - 1 };
}

// Moves one end of a range, keeping at least MIN_REGION_LENGTH residues.
export function resizeRange(
  range: ResidueRange,
  edge: 'start' | 'end',
  delta: number,
  sequenceLength: number
): ResidueRange {
  if (edge === 'start') {
    return { ...range, start: Math.min(Math.max(1, range.start + delta), range.end - MIN_REGION_LENGTH + 1) };
  }
  return { ...range, end: Math.max(Math.min(sequenceLength, range.end + delta), range.start + MIN_REGION_LENGTH - 1) };
}

export interface ArchitectureSegment {
  kind: 'domain' | 'linker';
  name: string;
  start: number;
  end: number;
}

// The feature types drawn on the architecture line. The Domain strip on the alignment graph shows
// more (see DOMAIN_LIKE_TYPES); those overlap real domains and would not leave a simple line.
const DOMAIN_LEVEL_TYPES = new Set(['Domain', 'DNA binding', 'Zinc finger', 'Repeat']);

/**
 * Splits a protein into domains and the linkers between them, plus the two terminal stretches.
 * Domains come longest first so that, drawn in order, a domain inside another stays clickable.
 */
export function buildArchitecture(domains: ProteinDomain[], sequenceLength: number): ArchitectureSegment[] {
  const domainSegments = domains
    .filter(domain => DOMAIN_LEVEL_TYPES.has(domain.type) && domain.start >= 1 && domain.end <= sequenceLength)
    .map(domain => ({ kind: 'domain' as const, name: domain.name, start: domain.start, end: domain.end }))
    .sort((a, b) => (b.end - b.start) - (a.end - a.start));

  const linkers: ArchitectureSegment[] = [];
  let residue = 1;
  for (const domain of [...domainSegments].sort((a, b) => a.start - b.start)) {
    if (domain.start > residue) {
      linkers.push({ kind: 'linker', name: 'Linker', start: residue, end: domain.start - 1 });
    }
    residue = Math.max(residue, domain.end + 1);
  }
  if (residue <= sequenceLength) {
    linkers.push({ kind: 'linker', name: 'Linker', start: residue, end: sequenceLength });
  }

  return [...linkers, ...domainSegments];
}
