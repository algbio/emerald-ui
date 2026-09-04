import { useEffect, useState } from 'react';

export type ProteinDomainsStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export interface ProteinDomain {
  name: string;
  start: number; // 1-based, inclusive
  end: number; // 1-based, inclusive
}

export interface ProteinDomainsResult {
  status: ProteinDomainsStatus;
  domains: ProteinDomain[];
  error: string | null;
}

interface UniProtFeature {
  type: string;
  description?: string;
  location: { start: { value: number }; end: { value: number } };
}

const cache = new Map<string, ProteinDomainsResult>();
const inFlight = new Map<string, Promise<ProteinDomainsResult>>();

// UniProt spreads "one distinct named stretch of sequence" annotations across many feature
// types depending on the protein family, not just "Domain": curators file the same kind of
// region as "Domain" for one entry and "DNA binding" for another (e.g. a homeobox), and entire
// families like GPCRs/ion channels use none of those - they're annotated as "Region", "Motif",
// "Repeat", "Zinc finger" or "Coiled coil" instead. Fetching only ft_domain (or even
// ft_domain+ft_dna_bind) silently shows nothing for those. Deliberately excluded here:
// "Transmembrane" and "Topological domain" - both real UniProt feature types, but each protein
// typically has many small ones (7+ for a GPCR) describing membrane topology rather than a named
// domain, which would clutter this strip with a different kind of information than intended.
const DOMAIN_LIKE_TYPES = new Set([
  'Domain',
  'DNA binding',
  'Region',
  'Motif',
  'Repeat',
  'Zinc finger',
  'Coiled coil',
]);

async function fetchProteinDomains(uniprotId: string): Promise<ProteinDomainsResult> {
  try {
    const response = await fetch(`https://rest.uniprot.org/uniprotkb/${uniprotId}.json?fields=ft_domain,ft_dna_bind,ft_region,ft_motif,ft_repeat,ft_zn_fing,ft_coiled`);
    if (!response.ok) {
      throw new Error(`UniProt API returned ${response.status}`);
    }
    const data = await response.json();
    const features: UniProtFeature[] = data?.features ?? [];
    const domains = features
      .filter(f => DOMAIN_LIKE_TYPES.has(f.type))
      .map(f => ({
        name: f.description || f.type,
        start: f.location.start.value,
        end: f.location.end.value,
      }));
    return { status: 'success', domains, error: null };
  } catch (err) {
    return {
      status: 'error',
      domains: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetches UniProt domain/feature annotations (once, cached by UniProt ID) for the "Domain"
 * per-residue annotation strip on the alignment graph axes. Returns status 'unavailable'
 * immediately when no UniProt ID is given (local upload / PDB-ID only inputs have no
 * UniProt-derived domain data).
 */
export function useProteinDomains(uniprotId: string | null | undefined): ProteinDomainsResult {
  const key = uniprotId || null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!key || cache.has(key)) return;

    let cancelled = false;
    let promise = inFlight.get(key);
    if (!promise) {
      promise = fetchProteinDomains(key);
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
    return { status: 'unavailable', domains: [], error: null };
  }

  return cache.get(key) ?? { status: 'loading', domains: [], error: null };
}
