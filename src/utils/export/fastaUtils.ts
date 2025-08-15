/**
 * Utility functions for exporting sequence alignments in FASTA format
 */

/**
 * Generate FASTA content from aligned sequences
 * @param representativeSeq - The aligned representative sequence
 * @param memberSeq - The aligned member sequence  
 * @param representativeDesc - Descriptor for the representative sequence
 * @param memberDesc - Descriptor for the member sequence
 * @param alignmentType - Type of alignment (optimal or custom)
 * @returns FASTA formatted string
 */
export const generateFastaFromAlignment = (
  representativeSeq: string,
  memberSeq: string,
  representativeDesc: string,
  memberDesc: string,
  alignmentType: 'optimal' | 'custom' = 'optimal'
): string => {
  // Clean up descriptors to create proper FASTA headers
  const cleanRepDesc = cleanDescriptorForFasta(representativeDesc, alignmentType, 'representative');
  const cleanMemDesc = cleanDescriptorForFasta(memberDesc, alignmentType, 'member');

  // Generate FASTA content
  const fastaContent = `>${cleanRepDesc}
${representativeSeq}
>${cleanMemDesc}
${memberSeq}`;

  return fastaContent;
};

/**
 * Clean and format sequence descriptor for FASTA header
 * @param descriptor - Original descriptor
 * @param alignmentType - Type of alignment
 * @param role - Role of the sequence (representative/member)
 * @returns Cleaned descriptor
 */
const cleanDescriptorForFasta = (
  descriptor: string,
  alignmentType: 'optimal' | 'custom',
  role: 'representative' | 'member'
): string => {
  // Remove the leading '>' if present
  let cleaned = descriptor.startsWith('>') ? descriptor.substring(1) : descriptor;
  
  // Add alignment type and role information
  const alignmentLabel = alignmentType === 'optimal' ? 'Optimal_Alignment' : 'Custom_Path_Alignment';
  const roleLabel = role === 'representative' ? 'Representative' : 'Member';
  
  // If the descriptor is already comprehensive, just add our annotation
  if (cleaned.length > 0) {
    cleaned = `${cleaned} | ${alignmentLabel}_${roleLabel}`;
  } else {
    // Fallback if no descriptor
    cleaned = `${roleLabel}_Sequence | ${alignmentLabel}`;
  }
  
  return cleaned;
};

/**
 * Export alignment as FASTA file
 * @param representativeSeq - The aligned representative sequence
 * @param memberSeq - The aligned member sequence
 * @param representativeDesc - Descriptor for the representative sequence
 * @param memberDesc - Descriptor for the member sequence
 * @param alignmentType - Type of alignment (optimal or custom)
 * @param filename - Optional custom filename
 */
export const exportAlignmentAsFasta = (
  representativeSeq: string,
  memberSeq: string,
  representativeDesc: string,
  memberDesc: string,
  alignmentType: 'optimal' | 'custom' = 'optimal',
  filename?: string
): void => {
  try {
    const fastaContent = generateFastaFromAlignment(
      representativeSeq,
      memberSeq,
      representativeDesc,
      memberDesc,
      alignmentType
    );

    // Generate filename if not provided
    const exportFilename = filename || generateFastaFilename(
      representativeDesc,
      memberDesc,
      alignmentType
    );

    // Create blob and download
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = exportFilename;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export alignment as FASTA:', error);
    throw new Error('Failed to export FASTA file. Please try again.');
  }
};

/**
 * Generate a filename for FASTA export
 * @param representativeDesc - Representative sequence descriptor
 * @param memberDesc - Member sequence descriptor  
 * @param alignmentType - Type of alignment
 * @returns Generated filename
 */
export const generateFastaFilename = (
  representativeDesc?: string,
  memberDesc?: string,
  alignmentType: 'optimal' | 'custom' = 'optimal'
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const alignmentLabel = alignmentType === 'optimal' ? 'optimal' : 'custom';
  
  if (representativeDesc && memberDesc) {
    // Extract meaningful parts from descriptors and clean for filename
    const cleanRep = extractSequenceName(representativeDesc).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
    const cleanMem = extractSequenceName(memberDesc).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
    return `emerald_${alignmentLabel}_alignment_${cleanRep}_vs_${cleanMem}_${timestamp}.fasta`;
  }
  
  return `emerald_${alignmentLabel}_alignment_${timestamp}.fasta`;
};

/**
 * Extract a meaningful name from a sequence descriptor
 * @param descriptor - The full sequence descriptor
 * @returns Extracted sequence name
 */
const extractSequenceName = (descriptor: string): string => {
  // Remove leading '>' if present
  let cleaned = descriptor.startsWith('>') ? descriptor.substring(1) : descriptor;
  
  // Try to extract the first meaningful part (usually the ID)
  // Common patterns: "ID | description | organism" or "ID description"
  const parts = cleaned.split(/[\s|]+/);
  
  // Return the first non-empty part, or fallback to first 20 chars
  const name = parts.find(part => part.trim().length > 0) || cleaned;
  return name.trim() || 'sequence';
};

/**
 * Copy FASTA content to clipboard
 * @param representativeSeq - The aligned representative sequence
 * @param memberSeq - The aligned member sequence
 * @param representativeDesc - Descriptor for the representative sequence
 * @param memberDesc - Descriptor for the member sequence
 * @param alignmentType - Type of alignment (optimal or custom)
 */
export const copyAlignmentFastaToClipboard = async (
  representativeSeq: string,
  memberSeq: string,
  representativeDesc: string,
  memberDesc: string,
  alignmentType: 'optimal' | 'custom' = 'optimal'
): Promise<void> => {
  try {
    const fastaContent = generateFastaFromAlignment(
      representativeSeq,
      memberSeq,
      representativeDesc,
      memberDesc,
      alignmentType
    );

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fastaContent);
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = fastaContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy FASTA to clipboard:', error);
    throw new Error('Failed to copy FASTA content to clipboard.');
  }
};
