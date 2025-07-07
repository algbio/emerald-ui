// Utility functions for parsing PDB and CIF files

export interface StructureData {
  sequence: string;
  descriptor: string;
  pdbId?: string;
  chainId: string;
  fileName: string;
  fileContent: string;
  fileType: 'pdb' | 'cif';
}

// Amino acid codes mapping
const threeToOneLetter: { [key: string]: string } = {
  'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
  'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
  'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
  'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V',
  'SEC': 'U', 'PYL': 'O'
};

// Parse PDB file format
export const parsePDBFile = (content: string, fileName: string): StructureData[] => {
  const lines = content.split('\n');
  const chains: { [chainId: string]: { residues: Array<{ resNum: number; resName: string }>, pdbId?: string } } = {};
  let pdbId: string | undefined;

  // Extract PDB ID from HEADER line or filename
  for (const line of lines) {
    if (line.startsWith('HEADER')) {
      const headerMatch = line.substring(62, 66).trim();
      if (headerMatch) {
        pdbId = headerMatch.toLowerCase();
      }
      break;
    }
  }

  // If no PDB ID found in header, try to extract from filename
  if (!pdbId) {
    const fileMatch = fileName.match(/([0-9][a-z0-9]{3})/i);
    if (fileMatch) {
      pdbId = fileMatch[1].toLowerCase();
    }
  }

  // Parse ATOM records
  for (const line of lines) {
    if (line.startsWith('ATOM') && line.substring(12, 16).trim() === 'CA') {
      const chainId = line.substring(21, 22).trim();
      const resName = line.substring(17, 20).trim();
      const resNum = parseInt(line.substring(22, 26).trim());

      if (!chains[chainId]) {
        chains[chainId] = { residues: [], pdbId };
      }

      // Avoid duplicate residues
      const existing = chains[chainId].residues.find(r => r.resNum === resNum);
      if (!existing && threeToOneLetter[resName]) {
        chains[chainId].residues.push({ resNum, resName });
      }
    }
  }

  // Convert to StructureData array
  const results: StructureData[] = [];
  for (const [chainId, chainData] of Object.entries(chains)) {
    if (chainData.residues.length > 0) {
      // Sort by residue number
      chainData.residues.sort((a, b) => a.resNum - b.resNum);
      
      // Build sequence
      const sequence = chainData.residues
        .map(r => threeToOneLetter[r.resName])
        .join('');

      // Build descriptor
      const descriptor = `pdb|${pdbId || 'UNKNOWN'}|${chainId} Chain ${chainId} from ${fileName}`;

      results.push({
        sequence,
        descriptor,
        pdbId: pdbId,
        chainId,
        fileName,
        fileContent: content,
        fileType: 'pdb'
      });
    }
  }

  return results;
};

// Parse CIF file format (basic implementation)
export const parseCIFFile = (content: string, fileName: string): StructureData[] => {
  const lines = content.split('\n');
  const chains: { [chainId: string]: { residues: Array<{ resNum: number; resName: string }>, pdbId?: string } } = {};
  let pdbId: string | undefined;
  let inAtomSite = false;
  let columnIndices: { [key: string]: number } = {};

  // Find structure ID
  for (const line of lines) {
    if (line.startsWith('data_')) {
      pdbId = line.substring(5).trim().toLowerCase();
      break;
    }
  }

  // If no PDB ID found, try to extract from filename
  if (!pdbId) {
    const fileMatch = fileName.match(/([0-9][a-z0-9]{3})/i);
    if (fileMatch) {
      pdbId = fileMatch[1].toLowerCase();
    }
  }

  // Parse atom_site records
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('_atom_site.')) {
      if (!inAtomSite) {
        inAtomSite = true;
        columnIndices = {};
      }
      
      // Map column names to indices
      const columnName = line.split('.')[1];
      columnIndices[columnName] = Object.keys(columnIndices).length;
      continue;
    }

    if (inAtomSite && line.startsWith('ATOM')) {
      const fields = line.split(/\s+/);
      
      const labelAtomId = fields[columnIndices['label_atom_id']] || '';
      const authAsymId = fields[columnIndices['auth_asym_id']] || fields[columnIndices['label_asym_id']] || '';
      const labelCompId = fields[columnIndices['label_comp_id']] || '';
      const authSeqId = fields[columnIndices['auth_seq_id']] || fields[columnIndices['label_seq_id']] || '';

      if (labelAtomId === 'CA' && authAsymId && labelCompId && authSeqId) {
        const chainId = authAsymId;
        const resName = labelCompId;
        const resNum = parseInt(authSeqId);

        if (!isNaN(resNum)) {
          if (!chains[chainId]) {
            chains[chainId] = { residues: [], pdbId };
          }

          // Avoid duplicate residues
          const existing = chains[chainId].residues.find(r => r.resNum === resNum);
          if (!existing && threeToOneLetter[resName]) {
            chains[chainId].residues.push({ resNum, resName });
          }
        }
      }
    }

    if (inAtomSite && line.startsWith('#')) {
      inAtomSite = false;
    }
  }

  // Convert to StructureData array
  const results: StructureData[] = [];
  for (const [chainId, chainData] of Object.entries(chains)) {
    if (chainData.residues.length > 0) {
      // Sort by residue number
      chainData.residues.sort((a, b) => a.resNum - b.resNum);
      
      // Build sequence
      const sequence = chainData.residues
        .map(r => threeToOneLetter[r.resName])
        .join('');

      // Build descriptor
      const descriptor = `pdb|${pdbId || 'UNKNOWN'}|${chainId} Chain ${chainId} from ${fileName}`;

      results.push({
        sequence,
        descriptor,
        pdbId: pdbId,
        chainId,
        fileName,
        fileContent: content,
        fileType: 'cif'
      });
    }
  }

  return results;
};

// Main parser function
export const parseStructureFile = (file: File): Promise<StructureData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const fileName = file.name;
        const extension = fileName.split('.').pop()?.toLowerCase();

        let results: StructureData[] = [];

        if (extension === 'pdb') {
          results = parsePDBFile(content, fileName);
        } else if (extension === 'cif') {
          results = parseCIFFile(content, fileName);
        } else {
          throw new Error('Unsupported file format. Please use .pdb or .cif files.');
        }

        if (results.length === 0) {
          throw new Error('No protein chains found in the structure file.');
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };

    reader.readAsText(file);
  });
};
