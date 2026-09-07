// Extracts per-residue pLDDT confidence scores from raw AlphaFold structure file text.
// AlphaFold DB stores per-residue pLDDT (0-100) in the B-factor / B_iso_or_equiv column,
// one value per CA atom, with residues numbered 1..N contiguously for the single predicted chain.

export type StructureFileFormat = 'pdb' | 'cif';

/**
 * Parses per-residue pLDDT values from raw PDB file text (temperature-factor column,
 * PDB spec columns 61-66, one CA atom per residue).
 */
function extractBFactorsFromPdb(content: string): number[] {
  const residues: Array<{ resNum: number; bFactor: number }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('ATOM') && line.substring(12, 16).trim() === 'CA') {
      const resNum = parseInt(line.substring(22, 26).trim(), 10);
      const bFactor = parseFloat(line.substring(60, 66).trim());
      if (!isNaN(resNum) && !isNaN(bFactor)) {
        if (!residues.some(r => r.resNum === resNum)) {
          residues.push({ resNum, bFactor });
        }
      }
    }
  }

  residues.sort((a, b) => a.resNum - b.resNum);
  return residues.map(r => r.bFactor);
}

/**
 * Parses per-residue pLDDT values from raw mmCIF file text (_atom_site.B_iso_or_equiv
 * column, one CA atom per residue), mirroring the column-index tracking already used by
 * parseCIFFile in pdbParser.ts.
 */
function extractBFactorsFromCif(content: string): number[] {
  const residues: Array<{ resNum: number; bFactor: number }> = [];
  const lines = content.split('\n');
  let inAtomSite = false;
  let columnIndices: { [key: string]: number } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('_atom_site.')) {
      if (!inAtomSite) {
        inAtomSite = true;
        columnIndices = {};
      }
      const columnName = line.split('.')[1];
      columnIndices[columnName] = Object.keys(columnIndices).length;
      continue;
    }

    if (inAtomSite && line.startsWith('ATOM')) {
      const fields = line.split(/\s+/);

      const labelAtomId = fields[columnIndices['label_atom_id']] || '';
      const authSeqId = fields[columnIndices['auth_seq_id']] || fields[columnIndices['label_seq_id']] || '';
      const bIsoField = fields[columnIndices['B_iso_or_equiv']];

      if (labelAtomId === 'CA' && authSeqId && bIsoField !== undefined) {
        const resNum = parseInt(authSeqId, 10);
        const bFactor = parseFloat(bIsoField);
        if (!isNaN(resNum) && !isNaN(bFactor) && !residues.some(r => r.resNum === resNum)) {
          residues.push({ resNum, bFactor });
        }
      }
      continue;
    }

    if (inAtomSite && line.startsWith('#')) {
      inAtomSite = false;
    }
  }

  residues.sort((a, b) => a.resNum - b.resNum);
  return residues.map(r => r.bFactor);
}

/**
 * Extracts a 0-indexed per-residue pLDDT array (residue i+1 -> array[i]) from raw AlphaFold
 * structure file text. Assumes contiguous 1..N residue numbering, true for single-chain
 * AlphaFold predictions.
 */
export function extractResidueBFactors(content: string, format: StructureFileFormat): number[] {
  return format === 'cif' ? extractBFactorsFromCif(content) : extractBFactorsFromPdb(content);
}
