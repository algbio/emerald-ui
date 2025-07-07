// Utility functions for fetching UniProt sequences

export const fetchUniProtSequence = async (accession: string): Promise<{
  sequence: string;
  descriptor: string;
}> => {
  if (!accession.trim()) {
    throw new Error('Accession code cannot be empty');
  }

  // Clean the accession (remove whitespace, convert to uppercase)
  const cleanAccession = accession.trim().toUpperCase();

  try {
    const response = await fetch(
      `https://rest.uniprot.org/uniprotkb/${cleanAccession}?fields=accession,id,protein_name,organism_name,sequence&format=json`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`UniProt entry not found for accession: ${cleanAccession}`);
      }
      throw new Error(`UniProt API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.sequence?.value) {
      throw new Error(`No sequence found for accession: ${cleanAccession}`);
    }

    // Build descriptor with available information
    const proteinName = data.proteinDescription?.recommendedName?.fullName?.value || 'Unknown protein';
    const organismName = data.organism?.scientificName || 'Unknown organism';
    const uniprotId = data.uniProtkbId || cleanAccession;
    
    const descriptor = `sp|${cleanAccession}|${uniprotId} ${proteinName} OS=${organismName}`;

    return {
      sequence: data.sequence.value,
      descriptor: descriptor
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch sequence from UniProt: ${String(error)}`);
  }
};

// Validate UniProt accession format
export const isValidUniProtAccession = (accession: string): boolean => {
  if (!accession) return false;
  
  const cleanAccession = accession.trim().toUpperCase();
  
  // UniProt accession format: 
  // Swiss-Prot: [OPQ][0-9][A-Z0-9]{3}[0-9] (e.g., P12345)
  // TrEMBL: [A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2} (e.g., A0A023GPI8)
  const uniprotPattern = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;
  
  return uniprotPattern.test(cleanAccession);
};
