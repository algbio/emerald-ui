// Client-side re-scoring of a gapped alignment pair, matching the EMERALD WASM build's
// scoring exactly (verified against src/optimal_paths.cpp and src/cost_matrix_interface.cpp
// on the "wasm-compilable" branch of https://github.com/algbio/emerald):
//   - substitution score per aligned pair comes from the selected matrix (substitutionMatrices.ts)
//   - a gap run of length L costs startGap + L * gapCost (first position: startGap + gapCost,
//     each subsequent position: gapCost)
//   - if gapCost/startGap are passed as literal 0, the WASM substitutes its defaults (-1/-11)
import type { CostMatrixTypeValue } from '../api/EmeraldService';
import { getSubstitutionScore } from './substitutionMatrices';

export interface AlignmentScoreBreakdown {
  score: number;
  matches: number;
  mismatches: number;
  gapCount: number;
  gapOpens: number;
}

const GAP_CHAR = '-';

export function resolveGapCosts(gapCost?: number, startGap?: number): { gapCost: number; startGap: number } {
  return {
    gapCost: !gapCost ? -1 : gapCost,
    startGap: !startGap ? -11 : startGap,
  };
}

/**
 * Scores a gapped alignment pair (equal-length strings, '-' marking gaps) using the given
 * substitution matrix and affine gap costs, and returns match/mismatch/gap counts alongside
 * the total score.
 */
export function scoreGappedAlignment(
  alignedRep: string,
  alignedMem: string,
  matrixType: CostMatrixTypeValue,
  gapCost?: number,
  startGap?: number
): AlignmentScoreBreakdown {
  const { gapCost: extend, startGap: open } = resolveGapCosts(gapCost, startGap);

  let score = 0;
  let matches = 0;
  let mismatches = 0;
  let gapCount = 0;
  let gapOpens = 0;

  // Track whether we're currently inside a gap run, separately per sequence, since an
  // insertion in one sequence and a deletion in the other can't occur at the same column
  // (each aligned column has at most one gap character).
  let inRepGapRun = false;
  let inMemGapRun = false;

  const length = Math.min(alignedRep.length, alignedMem.length);
  for (let i = 0; i < length; i++) {
    const repChar = alignedRep[i];
    const memChar = alignedMem[i];
    const repIsGap = repChar === GAP_CHAR;
    const memIsGap = memChar === GAP_CHAR;

    if (repIsGap || memIsGap) {
      gapCount++;
      if (repIsGap) {
        score += inRepGapRun ? extend : (open + extend);
        if (!inRepGapRun) gapOpens++;
        inRepGapRun = true;
      } else {
        inRepGapRun = false;
      }
      if (memIsGap) {
        score += inMemGapRun ? extend : (open + extend);
        if (!inMemGapRun) gapOpens++;
        inMemGapRun = true;
      } else {
        inMemGapRun = false;
      }
    } else {
      inRepGapRun = false;
      inMemGapRun = false;
      score += getSubstitutionScore(repChar, memChar, matrixType);
      if (repChar.toUpperCase() === memChar.toUpperCase()) {
        matches++;
      } else {
        mismatches++;
      }
    }
  }

  return { score, matches, mismatches, gapCount, gapOpens };
}
