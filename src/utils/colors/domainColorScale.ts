// Deterministic per-domain color assignment for the "Domain" annotation strip. Two domains with
// the same name (on either sequence) always resolve to the same color, and different names
// resolve to different colors, by hashing the name into a fixed qualitative palette - no shared
// mutable state is needed between the X and Y sequence strips.
const DOMAIN_PALETTE: string[] = [
  '#4C72B0', '#DD8452', '#55A868', '#C44E52', '#8172B2',
  '#937860', '#DA8BC3', '#8C8C8C', '#CCB974', '#64B5CD',
  '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Maps a domain name/description to a stable color, consistent across sequences and renders. */
export function getDomainColor(name: string): string {
  return DOMAIN_PALETTE[hashString(name) % DOMAIN_PALETTE.length];
}
