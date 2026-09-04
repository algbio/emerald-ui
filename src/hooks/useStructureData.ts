import { useEffect, useState } from 'react';

export type StructureDataStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export interface StructureDataResult {
  status: StructureDataStatus;
  rawContent: string | null;
  format: 'pdb' | 'cif' | null;
  error: string | null;
}

const cache = new Map<string, StructureDataResult>();
const inFlight = new Map<string, Promise<StructureDataResult>>();

async function fetchStructureData(uniprotId: string): Promise<StructureDataResult> {
  try {
    const response = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`);
    if (!response.ok) {
      throw new Error(`AlphaFold API returned ${response.status}`);
    }
    const predictions = await response.json();
    if (!predictions || predictions.length === 0) {
      throw new Error(`No AlphaFold predictions found for UniProt ID: ${uniprotId}`);
    }
    const prediction = predictions[0];

    let url: string;
    let format: 'pdb' | 'cif';
    if (prediction.cifUrl) {
      url = prediction.cifUrl;
      format = 'cif';
    } else if (prediction.pdbUrl) {
      url = prediction.pdbUrl;
      format = 'pdb';
    } else {
      throw new Error(`No structure files available for UniProt ID: ${uniprotId}`);
    }

    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download structure file: ${fileResponse.status}`);
    }
    const rawContent = await fileResponse.text();

    return { status: 'success', rawContent, format, error: null };
  } catch (err) {
    return {
      status: 'error',
      rawContent: null,
      format: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetches raw AlphaFold structure file text (once, cached by UniProt ID) so it can be shared
 * between the 3D structure viewer and the pLDDT confidence strip, avoiding a duplicate fetch.
 * Returns status 'unavailable' immediately when no UniProt ID is given (local upload / PDB-ID
 * only inputs have no AlphaFold-derived confidence data).
 */
export function useStructureData(uniprotId: string | null | undefined): StructureDataResult {
  const key = uniprotId || null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!key || cache.has(key)) return;

    let cancelled = false;
    let promise = inFlight.get(key);
    if (!promise) {
      promise = fetchStructureData(key);
      inFlight.set(key, promise);
    }

    promise.then(result => {
      cache.set(key, result);
      inFlight.delete(key);
      if (!cancelled) setTick(v => v + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) {
    return { status: 'unavailable', rawContent: null, format: null, error: null };
  }

  return cache.get(key) ?? { status: 'loading', rawContent: null, format: null, error: null };
}
