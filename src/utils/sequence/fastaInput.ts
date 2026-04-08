export interface FastaTextareaExtraction {
  hadHeader: boolean;
  header: string;
  sequence: string;
}

const VALID_PROTEIN_SEQUENCE_REGEX = /^[A-Z*]*$/;

export const extractLeadingFastaHeader = (value: string): FastaTextareaExtraction => {
  const normalizedValue = value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const trimmedLeadingValue = normalizedValue.trimStart();

  if (!trimmedLeadingValue.startsWith('>')) {
    return {
      hadHeader: false,
      header: '',
      sequence: value
    };
  }

  const newlineIndex = trimmedLeadingValue.indexOf('\n');
  const header = (newlineIndex === -1
    ? trimmedLeadingValue.slice(1)
    : trimmedLeadingValue.slice(1, newlineIndex)
  ).trim();

  const sequenceBody = newlineIndex === -1
    ? ''
    : trimmedLeadingValue.slice(newlineIndex + 1).trim();

  return {
    hadHeader: true,
    header,
    sequence: sequenceBody
  };
};

export const normalizeProteinSequenceInput = (value: string): string => {
  return value.replace(/^\uFEFF/, '').replace(/\s+/g, '').toUpperCase();
};

export const hasInvalidProteinSequenceCharacters = (value: string): boolean => {
  return !VALID_PROTEIN_SEQUENCE_REGEX.test(value);
};