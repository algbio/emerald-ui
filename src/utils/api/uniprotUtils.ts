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

// Map UniProt ID to KEGG ID using UniProt ID mapping API
export const mapUniProtToKegg = async (uniprotId: string): Promise<string | null> => {
  try {
    console.log(`Mapping UniProt ID ${uniprotId} to KEGG ID`);
    
    // Step 1: Submit the mapping job
    const submitResponse = await fetch('https://rest.uniprot.org/idmapping/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: 'UniProtKB_AC-ID',
        to: 'KEGG',
        ids: uniprotId
      }).toString()
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`Submit request failed: ${submitResponse.status} - ${errorText}`);
      throw new Error(`Submit request failed: ${submitResponse.status}`);
    }

    const submitResult = await submitResponse.json();
    console.log('Submit result:', submitResult);
    const jobId = submitResult.jobId;

    if (!jobId) {
      console.warn(`No job ID returned for UniProt ID ${uniprotId}`);
      return null;
    }

    // Step 2: Poll for results (with timeout)
    let attempts = 0;
    const maxAttempts = 20; // Increased timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait time to 1 second
      
      const statusResponse = await fetch(`https://rest.uniprot.org/idmapping/status/${jobId}`);
      
      if (!statusResponse.ok) {
        const statusError = await statusResponse.text();
        console.error(`Status request failed: ${statusResponse.status} - ${statusError}`);
        throw new Error(`Status request failed: ${statusResponse.status}`);
      }

      const statusResult = await statusResponse.json();
      console.log(`Status check ${attempts + 1}: ${JSON.stringify(statusResult)}`);
      
      // Check if we have results directly in the status response
      if (statusResult.results && statusResult.results.length > 0) {
        // Results are available directly in the status response
        const keggId = statusResult.results[0].to;
        console.log(`Successfully mapped ${uniprotId} to KEGG ID: ${keggId}`);
        return keggId;
      } else if (statusResult.jobStatus === 'FINISHED') {
        // Step 3: Get the results
        const resultsResponse = await fetch(`https://rest.uniprot.org/idmapping/results/${jobId}`);
        
        if (!resultsResponse.ok) {
          const resultsError = await resultsResponse.text();
          console.error(`Results request failed: ${resultsResponse.status} - ${resultsError}`);
          throw new Error(`Results request failed: ${resultsResponse.status}`);
        }

        const resultsData = await resultsResponse.json();
        console.log('Results data:', JSON.stringify(resultsData, null, 2));
        
        if (resultsData.results && resultsData.results.length > 0) {
          // Since we're specifically requesting KEGG, take the first result
          const keggId = resultsData.results[0].to;
          console.log(`Successfully mapped ${uniprotId} to KEGG ID: ${keggId}`);
          return keggId;
        } else {
          console.warn(`No KEGG mapping found for UniProt ID ${uniprotId}`);
          return null;
        }
      } else if (statusResult.jobStatus === 'ERROR') {
        throw new Error(`Mapping job failed for ${uniprotId}`);
      }
      
      attempts++;
    }
    
    console.warn(`Mapping job timed out for UniProt ID ${uniprotId}`);
    return null;
    
  } catch (error) {
    console.error(`Error mapping UniProt ID ${uniprotId} to KEGG:`, error);
    return null;
  }
};
