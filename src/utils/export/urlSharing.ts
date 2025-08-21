// Utility functions for URL-based sharing of alignments with UniProt sequences

import { extractUniProtId } from '../api/uniprotUtils';

/**
 * Basic UniProt ID format validation
 */
const isValidUniProtFormat = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  
  const trimmedId = id.trim().toUpperCase();
  
  // UniProt accession format patterns:
  // Swiss-Prot: [OPQ][0-9][A-Z0-9]{3}[0-9] (e.g., P12345)
  // TrEMBL: [A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2} (e.g., A0A023GPI8)
  const uniprotPattern = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;
  
  return uniprotPattern.test(trimmedId);
};

export interface ShareableAlignmentData {
  seqA?: string;
  seqB?: string;
  alpha?: number;
  delta?: number;
  gapCost?: number;
  startGap?: number;
  costMatrixType?: number;
}

/**
 * Extract shareable data from current URL parameters
 */
export const getShareableDataFromUrl = (): ShareableAlignmentData | null => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    const seqA = urlParams.get('seqA');
    const seqB = urlParams.get('seqB');
    const alpha = urlParams.get('alpha');
    const delta = urlParams.get('delta');
    const gapCost = urlParams.get('gapCost');
    const startGap = urlParams.get('startGap');
    const costMatrixType = urlParams.get('costMatrixType');
    
    // Validate that we have both sequences
    if (!seqA?.trim() || !seqB?.trim()) {
      return null;
    }
    
    // Validate UniProt ID format (basic validation)
    if (!isValidUniProtFormat(seqA) || !isValidUniProtFormat(seqB)) {
      console.warn('Invalid UniProt ID format in URL parameters:', { seqA, seqB });
      return null;
    }
    
    // Validate and parse numeric parameters
    let parsedAlpha: number | undefined;
    let parsedDelta: number | undefined;
    let parsedGapCost: number | undefined;
    let parsedStartGap: number | undefined;
    let parsedCostMatrixType: number | undefined;
    
    if (alpha) {
      parsedAlpha = parseFloat(alpha);
      if (isNaN(parsedAlpha) || parsedAlpha < 0 || parsedAlpha > 1) {
        console.warn('Invalid alpha value in URL:', alpha);
        parsedAlpha = undefined;
      }
    }
    
    if (delta) {
      parsedDelta = parseInt(delta, 10);
      if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
        console.warn('Invalid delta value in URL:', delta);
        parsedDelta = undefined;
      }
    }
    
    if (gapCost) {
      parsedGapCost = parseFloat(gapCost);
      if (isNaN(parsedGapCost)) {
        console.warn('Invalid gap cost value in URL:', gapCost);
        parsedGapCost = undefined;
      }
    }
    
    if (startGap) {
      parsedStartGap = parseFloat(startGap);
      if (isNaN(parsedStartGap)) {
        console.warn('Invalid start gap value in URL:', startGap);
        parsedStartGap = undefined;
      }
    }
    
    if (costMatrixType) {
      parsedCostMatrixType = parseInt(costMatrixType, 10);
      if (isNaN(parsedCostMatrixType) || parsedCostMatrixType < 0 || parsedCostMatrixType > 8) {
        console.warn('Invalid cost matrix type value in URL:', costMatrixType);
        parsedCostMatrixType = undefined;
      }
    }
    
    return {
      seqA: seqA.trim().toUpperCase(),
      seqB: seqB.trim().toUpperCase(),
      alpha: parsedAlpha,
      delta: parsedDelta,
      gapCost: parsedGapCost,
      startGap: parsedStartGap,
      costMatrixType: parsedCostMatrixType
    };
  } catch (error) {
    console.error('Error parsing URL parameters:', error);
    return null;
  }
};

/**
 * Generate a shareable URL for the current alignment
 */
export const generateShareableUrl = (
  descriptorA: string,
  descriptorB: string,
  alpha: number,
  delta: number,
  accessionA?: string,
  accessionB?: string,
  gapCost?: number,
  startGap?: number,
  costMatrixType?: number
): string | null => {
  try {
    // Validate input parameters
    if (typeof alpha !== 'number' || isNaN(alpha) || alpha < 0 || alpha > 1) {
      console.warn('Invalid alpha parameter for URL generation:', alpha);
      return null;
    }
    
    if (typeof delta !== 'number' || isNaN(delta) || delta < 0 || delta > 100) {
      console.warn('Invalid delta parameter for URL generation:', delta);
      return null;
    }
    
    // First try to use direct accession codes (from UniProt search)
    let uniprotA = accessionA?.trim();
    let uniprotB = accessionB?.trim();
    
    // If no direct accessions, extract from descriptors
    if (!uniprotA && descriptorA) {
      uniprotA = extractUniProtId(descriptorA) || undefined;
    }
    if (!uniprotB && descriptorB) {
      uniprotB = extractUniProtId(descriptorB) || undefined;
    }
    
    // Only generate shareable URL if both sequences have UniProt IDs
    if (!uniprotA || !uniprotB) {
      return null;
    }
    
    // Validate UniProt ID formats
    if (!isValidUniProtFormat(uniprotA) || !isValidUniProtFormat(uniprotB)) {
      console.warn('Invalid UniProt ID format for URL generation:', { uniprotA, uniprotB });
      return null;
    }
    
    const params = new URLSearchParams();
    params.set('seqA', uniprotA.toUpperCase());
    params.set('seqB', uniprotB.toUpperCase());
    params.set('alpha', alpha.toString());
    params.set('delta', delta.toString());
    
    // Add optional parameters if provided and not default values
    if (gapCost !== undefined && gapCost !== -1) {
      params.set('gapCost', gapCost.toString());
    }
    if (startGap !== undefined && startGap !== -11) {
      params.set('startGap', startGap.toString());
    }
    if (costMatrixType !== undefined && costMatrixType !== 2) { // 2 is BLOSUM62 (default)
      params.set('costMatrixType', costMatrixType.toString());
    }
    
    // Get the base URL without any existing parameters
    const baseUrl = window.location.origin + window.location.pathname;
    
    return `${baseUrl}?${params.toString()}`;
  } catch (error) {
    console.error('Error generating shareable URL:', error);
    return null;
  }
};

/**
 * Update the current URL with shareable parameters (optional - for direct URL sharing)
 */
export const updateUrlWithShareableData = (
  descriptorA: string,
  descriptorB: string,
  alpha: number,
  delta: number,
  accessionA?: string,
  accessionB?: string,
  gapCost?: number,
  startGap?: number,
  costMatrixType?: number
): void => {
  const shareableUrl = generateShareableUrl(descriptorA, descriptorB, alpha, delta, accessionA, accessionB, gapCost, startGap, costMatrixType);
  
  if (shareableUrl) {
    // Update the URL without reloading the page
    window.history.replaceState({}, '', shareableUrl);
  }
};

/**
 * Clear shareable parameters from URL
 */
export const clearShareableUrl = (): void => {
  const baseUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', baseUrl);
};

/**
 * Check if current alignment is shareable (both sequences have UniProt IDs)
 */
export const isAlignmentShareable = (descriptorA: string, descriptorB: string, accessionA?: string, accessionB?: string): boolean => {
  try {
    // First check if we have direct accession codes (from UniProt search)
    if (accessionA && accessionB) {
      return isValidUniProtFormat(accessionA) && isValidUniProtFormat(accessionB);
    }
    
    // Fallback to extracting from descriptors
    const uniprotA = extractUniProtId(descriptorA);
    const uniprotB = extractUniProtId(descriptorB);
    return !!(uniprotA && uniprotB && isValidUniProtFormat(uniprotA) && isValidUniProtFormat(uniprotB));
  } catch (error) {
    console.error('Error checking if alignment is shareable:', error);
    return false;
  }
};

/**
 * Validate shareable alignment data structure
 */
export const validateShareableData = (data: ShareableAlignmentData): boolean => {
  try {
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields
    if (!data.seqA || !data.seqB) return false;
    if (!isValidUniProtFormat(data.seqA) || !isValidUniProtFormat(data.seqB)) return false;
    
    // Check optional numeric fields
    if (data.alpha !== undefined) {
      if (typeof data.alpha !== 'number' || isNaN(data.alpha) || data.alpha < 0 || data.alpha > 1) {
        return false;
      }
    }
    
    if (data.delta !== undefined) {
      if (typeof data.delta !== 'number' || isNaN(data.delta) || data.delta < 0 || data.delta > 100) {
        return false;
      }
    }
    
    if (data.gapCost !== undefined) {
      if (typeof data.gapCost !== 'number' || isNaN(data.gapCost)) {
        return false;
      }
    }
    
    if (data.startGap !== undefined) {
      if (typeof data.startGap !== 'number' || isNaN(data.startGap)) {
        return false;
      }
    }
    
    if (data.costMatrixType !== undefined) {
      if (typeof data.costMatrixType !== 'number' || isNaN(data.costMatrixType) || data.costMatrixType < 0 || data.costMatrixType > 8) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating shareable data:', error);
    return false;
  }
};

/**
 * Check browser compatibility for required features
 */
export const checkBrowserCompatibility = (): { supported: boolean; missingFeatures: string[] } => {
  const missingFeatures: string[] = [];
  
  // Check URLSearchParams support
  if (typeof URLSearchParams === 'undefined') {
    missingFeatures.push('URLSearchParams');
  }
  
  // Check History API support
  if (!window.history || typeof window.history.replaceState !== 'function') {
    missingFeatures.push('History API');
  }
  
  // Check Clipboard API support (optional, has fallback)
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    console.info('Clipboard API not supported, will use fallback method');
  }
  
  return {
    supported: missingFeatures.length === 0,
    missingFeatures
  };
};
