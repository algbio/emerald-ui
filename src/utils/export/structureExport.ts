// Structure file download helpers, following the same Blob -> object URL -> <a download> ->
// revoke pattern already used for FASTA exports (see fastaUtils.ts).
import { to_mmCIF } from 'molstar/lib/mol-model/structure/export/mmcif';
import type { Structure } from 'molstar/lib/mol-model/structure';

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = filename;
  link.href = url;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** Downloads already-fetched/uploaded raw structure file text as-is (no format conversion). */
export function downloadRawStructureFile(content: string, format: 'pdb' | 'cif', filename: string): void {
  downloadTextFile(content, filename, format === 'pdb' ? 'chemical/x-pdb' : 'chemical/x-cif');
}

/**
 * Downloads a live Mol* Structure object (its current in-memory coordinates - post-transform if
 * one has been applied, e.g. a TM-align superposition) as mmCIF text. Mol* has no built-in PDB
 * writer, only mmCIF/BinaryCIF, so this is the only re-serialization path for transformed
 * coordinates.
 */
export function downloadStructureAsMmcif(structure: Structure, name: string, filename: string): void {
  const content = to_mmCIF(name, structure, false, { copyAllCategories: true });
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
  downloadTextFile(text, filename, 'chemical/x-cif');
}
