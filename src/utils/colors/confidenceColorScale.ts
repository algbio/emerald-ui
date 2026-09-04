// AlphaFold2's standard per-residue pLDDT confidence color scale.
export interface PlddtBin {
  max: number;
  color: string;
  label: string;
}

export const PLDDT_BINS: PlddtBin[] = [
  { max: 50, color: '#FF7D45', label: 'Very low (pLDDT < 50)' },
  { max: 70, color: '#FFDB13', label: 'Low (70 > pLDDT ≥ 50)' },
  { max: 90, color: '#65CBF3', label: 'Confident (90 > pLDDT ≥ 70)' },
  { max: Infinity, color: '#0053D6', label: 'Very high (pLDDT ≥ 90)' },
];

/** Maps a pLDDT score (0-100) to AlphaFold's standard confidence color. */
export function getPlddtColor(score: number): string {
  for (const bin of PLDDT_BINS) {
    if (score < bin.max) return bin.color;
  }
  return PLDDT_BINS[PLDDT_BINS.length - 1].color;
}
