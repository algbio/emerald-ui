// Superposes two structures on known residue pairs, as opposed to TM-align, which searches for
// its own pairing. Used for safety windows, where the alignment already gives the pairing.
import { MinimizeRmsd } from 'molstar/lib/mol-math/linear-algebra/3d/minimize-rmsd';
import { getProteinOneLetterCode } from 'molstar/lib/mol-model/sequence/constants';
import { StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import type { ResiduePair } from '../sequence/safetyWindowUtils';

export interface CaResidue {
  x: number;
  y: number;
  z: number;
  letter: string;
}

/** C-alpha atoms of one chain, keyed by residue number (label_seq_id). */
export type CaResidueMap = Map<number, CaResidue>;

export const MIN_SUPERPOSITION_PAIRS = 3;

/**
 * Reads C-alpha coordinates by residue number. Superposing by position in a selection would let
 * one missing atom silently shift every later pair, so pairs are looked up here instead. Only the
 * first chain is read, because a residue number repeats across chains.
 */
export function readCaResidues(caLoci: StructureElement.Loci): CaResidueMap {
  const residues: CaResidueMap = new Map();
  let chain: string | null = null;

  StructureElement.Loci.forEachLocation(caLoci, location => {
    const asymId = StructureProperties.chain.label_asym_id(location);
    if (chain === null) chain = asymId;
    if (asymId !== chain) return;

    const residueNumber = StructureProperties.residue.label_seq_id(location);
    if (residues.has(residueNumber)) return;
    residues.set(residueNumber, {
      x: StructureProperties.atom.x(location),
      y: StructureProperties.atom.y(location),
      z: StructureProperties.atom.z(location),
      letter: getProteinOneLetterCode(StructureProperties.atom.label_comp_id(location)),
    });
  });

  return residues;
}

/** Fits B onto A over the given pairs, all of which must exist in both maps. */
export function superposeOnPairs(
  pairs: ResiduePair[],
  residuesA: CaResidueMap,
  residuesB: CaResidueMap
): MinimizeRmsd.Result {
  const a = MinimizeRmsd.Positions.empty(pairs.length);
  const b = MinimizeRmsd.Positions.empty(pairs.length);

  pairs.forEach((pair, i) => {
    const residueA = residuesA.get(pair.a)!;
    const residueB = residuesB.get(pair.b)!;
    a.x[i] = residueA.x;
    a.y[i] = residueA.y;
    a.z[i] = residueA.z;
    b.x[i] = residueB.x;
    b.y[i] = residueB.y;
    b.z[i] = residueB.z;
  });

  return MinimizeRmsd.compute({ a, b });
}
