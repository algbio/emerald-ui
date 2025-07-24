// Utility function to extract UniProt ID from descriptor
export const extractUniProtId = (descriptor: string): string | null => {
  if (!descriptor) return null;
  
  console.log('Extracting UniProt ID from descriptor:', descriptor);
  
  // Common patterns for UniProt IDs in descriptors
  const patterns = [
    // SwissProt format: sp|P02769|ALBU_HUMAN
    { regex: /sp\|([A-Z][0-9][A-Z0-9]{3}[0-9])\|/i, name: 'SwissProt' },
    // TrEMBL format: tr|Q5VWK5|Q5VWK5_HUMAN  
    { regex: /tr\|([A-Z][0-9][A-Z0-9]{3}[0-9])\|/i, name: 'TrEMBL' },
    // FASTA header with UniProt ID: >Q5XJ36 protein name or >P02769 Human serum albumin
    { regex: />([A-Z][0-9][A-Z0-9]{3}[0-9])(?:\s|\|)/i, name: 'FASTA header' },
    // Direct UniProt ID at start: Q5XJ36 protein name
    { regex: /^([A-Z][0-9][A-Z0-9]{3}[0-9])(?:\s|\|)/i, name: 'Direct at start' },
    // UniProt ID with underscore: Q5XJ36_HUMAN
    { regex: /([A-Z][0-9][A-Z0-9]{3}[0-9])_[A-Z]+/i, name: 'With underscore' },
    // Anywhere in the string: Q5XJ36
    { regex: /([A-Z][0-9][A-Z0-9]{3}[0-9])/i, name: 'Anywhere' },
  ];
  
  for (const pattern of patterns) {
    const match = descriptor.match(pattern.regex);
    if (match && match[1]) {
      const uniprotId = match[1].toUpperCase();
      console.log(`Found UniProt ID "${uniprotId}" using ${pattern.name} pattern`);
      return uniprotId;
    }
  }
  
  console.log('No UniProt ID found in descriptor');
  return null;
};

// Get the effective UniProt ID for a sequence, preferring explicit accession over extracted ID
export const getEffectiveUniProtId = (sequence: { accession?: string; description?: string; id?: string }): string | null => {
  // First, try the explicit accession (from UniProt search results)
  if (sequence.accession) {
    return sequence.accession;
  }
  
  // Then try to extract from description (for FASTA files)
  if (sequence.description) {
    return extractUniProtId(sequence.description);
  }
  
  // Finally try to extract from id (fallback)
  if (sequence.id) {
    return extractUniProtId(sequence.id);
  }
  
  return null;
};
