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

    // Debug: Log the actual API response structure
    console.log('UniProt API response for accession', cleanAccession, ':', {
      primaryAccession: data.primaryAccession,
      uniProtkbId: data.uniProtkbId,
      proteinDescription: data.proteinDescription?.recommendedName?.fullName?.value,
      organism: data.organism?.scientificName
    });

    // Build descriptor with available information
    const proteinName = data.proteinDescription?.recommendedName?.fullName?.value || 'Unknown protein';
    const organismName = data.organism?.scientificName || 'Unknown organism';
    
    // The 'id' field in the individual fetch API should contain the UniProt ID (like EDC4_HUMAN)
    // This matches what we get from 'uniProtkbId' in the search API
    const uniprotId = data.id || data.uniProtkbId || cleanAccession;
    
    console.log('Fields used for descriptor:', {
      uniprotId,
      proteinName,
      organismName,
      'data.id': data.id,
      'data.uniProtkbId': data.uniProtkbId,
      'cleanAccession': cleanAccession
    });
    
    // Format descriptor to match UniProt search results format: UniProt_ID | Protein_Name | Protein_Name | Organism_Name
    // This ensures consistency between accession fetch and search results
    const descriptor = `${cleanAccession} | ${proteinName} | ${proteinName} | ${organismName}`;

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
