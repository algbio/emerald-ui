// Maps between raw (ungapped) sequence positions and positions in a gapped/aligned sequence
// string, so a raw index range can be extracted from an alignment while still including any
// '-' gap characters the alignment places within that range.

const GAP_CHAR = '-';

/**
 * For each index in a gapped sequence, returns the corresponding 0-indexed raw (ungapped)
 * position, or -1 if that index is a gap character.
 */
export function buildGappedPositionMap(gappedSeq: string): number[] {
  const map: number[] = new Array(gappedSeq.length);
  let rawPos = 0;
  for (let i = 0; i < gappedSeq.length; i++) {
    if (gappedSeq[i] === GAP_CHAR) {
      map[i] = -1;
    } else {
      map[i] = rawPos;
      rawPos++;
    }
  }
  return map;
}

/**
 * Maps a raw (ungapped) half-open position range [rawStart, rawEnd) to the corresponding
 * half-open range of indices in the gapped sequence, inclusive of any gap characters
 * interleaved between the first and last matching raw positions.
 */
export function mapRawRangeToGappedRange(
  gappedSeq: string,
  rawStart: number,
  rawEnd: number
): { gappedStart: number; gappedEnd: number } {
  const map = buildGappedPositionMap(gappedSeq);
  let gappedStart = -1;
  let gappedEnd = -1;

  for (let i = 0; i < map.length; i++) {
    const rawPos = map[i];
    if (rawPos !== -1 && rawPos >= rawStart && rawPos < rawEnd) {
      if (gappedStart === -1) gappedStart = i;
      gappedEnd = i + 1;
    }
  }

  if (gappedStart === -1) return { gappedStart: 0, gappedEnd: 0 };
  return { gappedStart, gappedEnd };
}

/**
 * Extracts the substring of a gapped/aligned sequence corresponding to a raw (ungapped)
 * position range, including any gaps the alignment calls for within that range.
 */
export function extractGappedSegment(gappedSeq: string, rawStart: number, rawEnd: number): string {
  const { gappedStart, gappedEnd } = mapRawRangeToGappedRange(gappedSeq, rawStart, rawEnd);
  return gappedSeq.slice(gappedStart, gappedEnd);
}
