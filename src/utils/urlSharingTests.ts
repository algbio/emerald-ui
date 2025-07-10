// Test utilities for URL sharing functionality
// This file helps validate that the URL sharing feature works correctly

import { 
  getShareableDataFromUrl, 
  generateShareableUrl, 
  isAlignmentShareable,
  validateShareableData,
  checkBrowserCompatibility 
} from './urlSharing';

/**
 * Test suite for URL sharing functionality
 */
export const runUrlSharingTests = () => {
  console.group('🧪 URL Sharing Tests');
  
  try {
    // Test 1: Browser compatibility
    console.log('1. Testing browser compatibility...');
    const compatibility = checkBrowserCompatibility();
    console.log('Browser support:', compatibility);
    
    // Test 2: Valid UniProt IDs
    console.log('2. Testing valid UniProt ID alignment sharing...');
    const testUrl1 = generateShareableUrl(
      'sp|P02769|ALBU_HUMAN Human serum albumin',
      'sp|P01308|INS_HUMAN Insulin',
      0.75,
      8
    );
    console.log('Generated URL:', testUrl1);
    console.log('Is shareable:', isAlignmentShareable(
      'sp|P02769|ALBU_HUMAN Human serum albumin',
      'sp|P01308|INS_HUMAN Insulin'
    ));
    
    // Test 3: Invalid descriptors
    console.log('3. Testing invalid descriptors...');
    const testUrl2 = generateShareableUrl(
      'Random protein sequence',
      'Another random sequence',
      0.75,
      8
    );
    console.log('Should be null:', testUrl2);
    
    // Test 4: Direct accession codes
    console.log('4. Testing direct accession codes...');
    const testUrl3 = generateShareableUrl(
      'Some descriptor',
      'Another descriptor',
      0.75,
      8,
      'P02769', // Direct accession A
      'P01308'  // Direct accession B
    );
    console.log('Generated URL with accessions:', testUrl3);
    
    // Test 5: Invalid parameters
    console.log('5. Testing invalid parameters...');
    const testUrl4 = generateShareableUrl(
      'sp|P02769|ALBU_HUMAN',
      'sp|P01308|INS_HUMAN',
      1.5, // Invalid alpha
      -5   // Invalid delta
    );
    console.log('Should be null:', testUrl4);
    
    // Test 6: Data validation
    console.log('6. Testing data validation...');
    const validData = { seqA: 'P02769', seqB: 'P01308', alpha: 0.75, delta: 8 };
    const invalidData = { seqA: 'INVALID', seqB: 'P01308', alpha: 2.0, delta: 8 };
    
    console.log('Valid data:', validateShareableData(validData));
    console.log('Invalid data:', validateShareableData(invalidData));
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.groupEnd();
};

/**
 * Mock a URL with test parameters for development
 */
export const mockSharedUrl = (seqA: string, seqB: string, alpha?: number, delta?: number) => {
  const params = new URLSearchParams();
  params.set('seqA', seqA);
  params.set('seqB', seqB);
  if (alpha !== undefined) params.set('alpha', alpha.toString());
  if (delta !== undefined) params.set('delta', delta.toString());
  
  // Update URL for testing
  const newUrl = window.location.origin + window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', newUrl);
  
  console.log('🔗 Mocked shared URL:', newUrl);
  console.log('Now reload the page to test URL loading functionality');
};

/**
 * Common test cases for development
 */
export const testCases = {
  // Valid cases
  humanAlbumin: {
    descriptor: 'sp|P02769|ALBU_HUMAN Human serum albumin OS=Homo sapiens',
    accession: 'P02769'
  },
  humanInsulin: {
    descriptor: 'sp|P01308|INS_HUMAN Insulin OS=Homo sapiens',
    accession: 'P01308'
  },
  
  // Invalid cases
  noUniProt: {
    descriptor: 'Random protein sequence without UniProt ID',
    accession: null
  },
  invalidFormat: {
    descriptor: 'Invalid|FORMAT|TEST',
    accession: 'INVALID123'
  }
};

// Auto-run tests in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to auto-run tests
  // setTimeout(runUrlSharingTests, 1000);
}
