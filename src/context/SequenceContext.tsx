import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Alignment } from '../components/alignment/PointGridPlot';
import type { StructureData } from '../utils/structure/pdbParser';
import { emeraldService } from '../utils/api/EmeraldService';
import { extractUniProtId } from '../utils/api/uniprotUtils';
import { fetchUniProtSequence } from '../utils/api/uniprotFetcher';
import { getShareableDataFromUrl } from '../utils/export/urlSharing';

// Helper function to validate sequence for asterisks
const validateSequenceAsterisks = (sequence: string) => {
  const asteriskPositions = [];
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === '*') {
      asteriskPositions.push(i);
    }
  }
  
  const hasEndAsterisk = asteriskPositions.length > 0 && asteriskPositions.includes(sequence.length - 1);
  const hasMiddleAsterisk = asteriskPositions.some(pos => pos !== sequence.length - 1);
  
  return { hasMiddleAsterisk, hasEndAsterisk };
};

// Define the types for sequence data
export interface SequenceData {
  sequenceA: string;
  sequenceB: string;
  descriptorA: string;
  descriptorB: string;
  accessionA: string;
  accessionB: string;
}

// Parameters for Emerald algorithm
export interface EmeraldParams {
  alpha: number;
  delta: number;
  gapCost?: number;
  startGap?: number;
}

// Complete state shape
interface SequenceState {
  sequences: SequenceData;
  params: EmeraldParams;
  alignments: Alignment[];
  alignmentStatus: 'idle' | 'loading' | 'success' | 'error';
  alignmentError: string | null;
  fetchStatusA: 'idle' | 'loading' | 'success' | 'error';
  fetchErrorA: string | null;
  fetchStatusB: 'idle' | 'loading' | 'success' | 'error';
  fetchErrorB: string | null;
  validation: {
    sequenceA: {
      hasMiddleAsterisk: boolean;
      hasEndAsterisk: boolean;
    };
    sequenceB: {
      hasMiddleAsterisk: boolean;
      hasEndAsterisk: boolean;
    };
  };
  structureA: {
    uniprotId: string | null;
    pdbId: string | null;
    chainId?: string | null;
    fileContent?: string | null;
    fileType?: 'pdb' | 'cif' | null;
  } | null;
  structureB: {
    uniprotId: string | null;
    pdbId: string | null;
    chainId?: string | null;
    fileContent?: string | null;
    fileType?: 'pdb' | 'cif' | null;
  } | null;
}

// Initial state
const initialState: SequenceState = {
  sequences: {
    sequenceA: '',
    sequenceB: '',
    descriptorA: '',
    descriptorB: '',
    accessionA: '',
    accessionB: ''
  },
  params: {
    alpha: 0.75,
    delta: 8,
    gapCost: -1,
    startGap: -11
  },
  alignments: [],
  alignmentStatus: 'idle',
  alignmentError: null,
  fetchStatusA: 'idle',
  fetchErrorA: null,
  fetchStatusB: 'idle',
  fetchErrorB: null,
  validation: {
    sequenceA: {
      hasMiddleAsterisk: false,
      hasEndAsterisk: false
    },
    sequenceB: {
      hasMiddleAsterisk: false,
      hasEndAsterisk: false
    }
  },
  structureA: null,
  structureB: null,
};

// Define the possible actions
type SequenceAction =
  | { type: 'UPDATE_SEQUENCE_A'; payload: string }
  | { type: 'UPDATE_SEQUENCE_B'; payload: string }
  | { type: 'VALIDATE_SEQUENCE_A'; payload: { hasMiddleAsterisk: boolean; hasEndAsterisk: boolean } }
  | { type: 'VALIDATE_SEQUENCE_B'; payload: { hasMiddleAsterisk: boolean; hasEndAsterisk: boolean } }
  | { type: 'UPDATE_DESCRIPTOR_A'; payload: string }
  | { type: 'UPDATE_DESCRIPTOR_B'; payload: string }
  | { type: 'UPDATE_ACCESSION_A'; payload: string }
  | { type: 'UPDATE_ACCESSION_B'; payload: string }
  | { type: 'CLEAR_FETCH_ERROR_A' }
  | { type: 'CLEAR_FETCH_ERROR_B' }
  | { type: 'LOAD_STRUCTURE_FILE_A'; payload: StructureData }
  | { type: 'LOAD_STRUCTURE_FILE_B'; payload: StructureData }
  | { type: 'FETCH_SEQUENCE_A_START' }
  | { type: 'FETCH_SEQUENCE_A_SUCCESS'; payload: { sequence: string; descriptor: string } }
  | { type: 'FETCH_SEQUENCE_A_ERROR'; payload: string }
  | { type: 'FETCH_SEQUENCE_B_START' }
  | { type: 'FETCH_SEQUENCE_B_SUCCESS'; payload: { sequence: string; descriptor: string } }
  | { type: 'FETCH_SEQUENCE_B_ERROR'; payload: string }
  | { type: 'UPDATE_PARAMS'; payload: Partial<EmeraldParams> }
  | { type: 'LOAD_SEQUENCES'; payload: Partial<SequenceData> }
  | { type: 'RESET_SEQUENCES' }
  | { type: 'ALIGNMENT_START' }
  | { type: 'ALIGNMENT_SUCCESS'; payload: Alignment[] }
  | { type: 'ALIGNMENT_ERROR'; payload: string }
  | { type: 'SET_STRUCTURE_A', payload: { uniprotId: string | null; pdbId?: string | null } }
  | { type: 'SET_STRUCTURE_B', payload: { uniprotId: string | null; pdbId?: string | null } }
  | { type: 'CLEAR_STRUCTURE_A' }
  | { type: 'CLEAR_STRUCTURE_B' }
  | { type: 'UPDATE_URL_SHAREABLE_DATA', payload: { alpha: number, delta: number, gapCost: number, startGap: number } }
  | { type: 'LOAD_URL_SHAREABLE_DATA', payload: EmeraldParams };

// Create the reducer
const sequenceReducer = (state: SequenceState, action: SequenceAction): SequenceState => {
  switch (action.type) {
    case 'UPDATE_SEQUENCE_A':
      const validationA = validateSequenceAsterisks(action.payload);
      return {
        ...state,
        sequences: { ...state.sequences, sequenceA: action.payload },
        validation: {
          ...state.validation,
          sequenceA: validationA
        }
      };
    case 'UPDATE_SEQUENCE_B':
      const validationB = validateSequenceAsterisks(action.payload);
      return {
        ...state,
        sequences: { ...state.sequences, sequenceB: action.payload },
        validation: {
          ...state.validation,
          sequenceB: validationB
        }
      };
    case 'VALIDATE_SEQUENCE_A':
      return {
        ...state,
        validation: {
          ...state.validation,
          sequenceA: action.payload
        }
      };
    case 'VALIDATE_SEQUENCE_B':
      return {
        ...state,
        validation: {
          ...state.validation,
          sequenceB: action.payload
        }
      };
    case 'UPDATE_DESCRIPTOR_A':
      return {
        ...state,
        sequences: { ...state.sequences, descriptorA: action.payload }
      };
    case 'UPDATE_DESCRIPTOR_B':
      return {
        ...state,
        sequences: { ...state.sequences, descriptorB: action.payload }
      };
    case 'UPDATE_ACCESSION_A':
      return {
        ...state,
        sequences: { ...state.sequences, accessionA: action.payload },
        fetchErrorA: null, // Clear error when user types
        fetchStatusA: 'idle'
      };
    case 'UPDATE_ACCESSION_B':
      return {
        ...state,
        sequences: { ...state.sequences, accessionB: action.payload },
        fetchErrorB: null, // Clear error when user types
        fetchStatusB: 'idle'
      };
    case 'CLEAR_FETCH_ERROR_A':
      return {
        ...state,
        fetchErrorA: null,
        fetchStatusA: 'idle'
      };
    case 'CLEAR_FETCH_ERROR_B':
      return {
        ...state,
        fetchErrorB: null,
        fetchStatusB: 'idle'
      };
    case 'LOAD_STRUCTURE_FILE_A':
      const structureValidationA = validateSequenceAsterisks(action.payload.sequence);
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceA: action.payload.sequence,
          descriptorA: action.payload.descriptor
        },
        validation: {
          ...state.validation,
          sequenceA: structureValidationA
        },
        structureA: {
          uniprotId: null,
          pdbId: action.payload.pdbId || null,
          chainId: action.payload.chainId,
          fileContent: action.payload.fileContent,
          fileType: action.payload.fileType
        }
      };
    case 'LOAD_STRUCTURE_FILE_B':
      const structureValidationB = validateSequenceAsterisks(action.payload.sequence);
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceB: action.payload.sequence,
          descriptorB: action.payload.descriptor
        },
        validation: {
          ...state.validation,
          sequenceB: structureValidationB
        },
        structureB: {
          uniprotId: null,
          pdbId: action.payload.pdbId || null,
          chainId: action.payload.chainId,
          fileContent: action.payload.fileContent,
          fileType: action.payload.fileType
        }
      };
    case 'FETCH_SEQUENCE_A_START':
      return {
        ...state,
        fetchStatusA: 'loading',
        fetchErrorA: null
      };
    case 'FETCH_SEQUENCE_A_SUCCESS':
      const validationResultA = validateSequenceAsterisks(action.payload.sequence);
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceA: action.payload.sequence,
          descriptorA: action.payload.descriptor
        },
        validation: {
          ...state.validation,
          sequenceA: validationResultA
        },
        fetchStatusA: 'success'
      };
    case 'FETCH_SEQUENCE_A_ERROR':
      return {
        ...state,
        fetchStatusA: 'error',
        fetchErrorA: action.payload
      };
    case 'FETCH_SEQUENCE_B_START':
      return {
        ...state,
        fetchStatusB: 'loading',
        fetchErrorB: null
      };
    case 'FETCH_SEQUENCE_B_SUCCESS':
      const validationResultB = validateSequenceAsterisks(action.payload.sequence);
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceB: action.payload.sequence,
          descriptorB: action.payload.descriptor
        },
        validation: {
          ...state.validation,
          sequenceB: validationResultB
        },
        fetchStatusB: 'success'
      };
    case 'FETCH_SEQUENCE_B_ERROR':
      return {
        ...state,
        fetchStatusB: 'error',
        fetchErrorB: action.payload
      };
    case 'UPDATE_PARAMS':
      return {
        ...state,
        params: { ...state.params, ...action.payload }
      };
    case 'LOAD_SEQUENCES':
      return {
        ...state,
        sequences: { ...state.sequences, ...action.payload }
      };
    case 'RESET_SEQUENCES':
      return {
        ...state,
        sequences: initialState.sequences
      };
    case 'ALIGNMENT_START':
      return {
        ...state,
        alignmentStatus: 'loading',
        alignmentError: null
      };
    case 'ALIGNMENT_SUCCESS':
      return {
        ...state,
        alignments: action.payload,
        alignmentStatus: 'success'
      };
    case 'ALIGNMENT_ERROR':
      return {
        ...state,
        alignmentStatus: 'error',
        alignmentError: action.payload
      };
    case 'SET_STRUCTURE_A':
      return {
        ...state,
        structureA: {
          uniprotId: action.payload.uniprotId,
          pdbId: action.payload.pdbId || null
        }
      };
    case 'SET_STRUCTURE_B':
      return {
        ...state,
        structureB: {
          uniprotId: action.payload.uniprotId,
          pdbId: action.payload.pdbId || null
        }
      };
    case 'CLEAR_STRUCTURE_A':
      return { ...state, structureA: null };
    case 'CLEAR_STRUCTURE_B':
      return { ...state, structureB: null };
    case 'UPDATE_URL_SHAREABLE_DATA':
      return {
        ...state,
        params: {
          ...state.params,
          alpha: action.payload.alpha,
          delta: action.payload.delta,
          gapCost: action.payload.gapCost,
          startGap: action.payload.startGap
        }
      };
    case 'LOAD_URL_SHAREABLE_DATA':
      return {
        ...state,
        params: {
          alpha: action.payload.alpha !== undefined ? action.payload.alpha : state.params.alpha,
          delta: action.payload.delta !== undefined ? action.payload.delta : state.params.delta,
          gapCost: action.payload.gapCost !== undefined ? action.payload.gapCost : state.params.gapCost,
          startGap: action.payload.startGap !== undefined ? action.payload.startGap : state.params.startGap
        }
      };
    default:
      return state;
  }
};

// Create context with default values
interface SequenceContextType {
  state: SequenceState;
  dispatch: React.Dispatch<SequenceAction>;
  runAlignment: () => Promise<void>;
  fetchSequenceA: (accession: string) => Promise<void>;
  fetchSequenceB: (accession: string) => Promise<void>;
  loadStructureFileA: (structureData: StructureData) => void;
  loadStructureFileB: (structureData: StructureData) => void;
  canRunAlignment: () => boolean;
  getValidationWarnings: () => { sequenceA: string[]; sequenceB: string[] };
}

const SequenceContext = createContext<SequenceContextType | undefined>(undefined);

// Provider component
interface SequenceProviderProps {
  children: ReactNode;
}

export const SequenceProvider: React.FC<SequenceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(sequenceReducer, initialState);

  // Initialize from URL parameters on component mount
  useEffect(() => {
    try {
      const shareableData = getShareableDataFromUrl();
      
      if (shareableData) {
        console.log('Loading shared alignment data from URL:', shareableData);
        
        // Set accession codes first
        if (shareableData.seqA) {
          dispatch({ type: 'UPDATE_ACCESSION_A', payload: shareableData.seqA });
        }
        if (shareableData.seqB) {
          dispatch({ type: 'UPDATE_ACCESSION_B', payload: shareableData.seqB });
        }
        
        // Set parameters if provided
        const paramUpdates: Partial<typeof state.params> = {};
        if (shareableData.alpha !== undefined) {
          paramUpdates.alpha = shareableData.alpha;
        }
        if (shareableData.delta !== undefined) {
          paramUpdates.delta = shareableData.delta;
        }
        
        if (Object.keys(paramUpdates).length > 0) {
          dispatch({ 
            type: 'UPDATE_PARAMS', 
            payload: paramUpdates
          });
        }
        
        // Fetch sequences automatically with error handling
        if (shareableData.seqA) {
          fetchSequenceA(shareableData.seqA).catch(error => {
            console.error('Failed to fetch sequence A from shared URL:', error);
          });
        }
        if (shareableData.seqB) {
          fetchSequenceB(shareableData.seqB).catch(error => {
            console.error('Failed to fetch sequence B from shared URL:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error loading shared URL data:', error);
    }
  }, []); // Only run on mount

  // Auto-run alignment when both sequences are loaded from shared URL
  useEffect(() => {
    const shareableData = getShareableDataFromUrl();
    
    if (shareableData && 
        state.sequences.sequenceA && 
        state.sequences.sequenceB && 
        state.fetchStatusA === 'success' && 
        state.fetchStatusB === 'success' &&
        state.alignmentStatus === 'idle') {
      
      console.log('Auto-running alignment for shared URL');
      runAlignment();
    }
  }, [state.sequences.sequenceA, state.sequences.sequenceB, state.fetchStatusA, state.fetchStatusB, state.alignmentStatus]);

  // Auto-detect UniProt IDs from descriptors
  useEffect(() => {
    console.log('Checking descriptors:', { 
      descriptorA: state.sequences.descriptorA, 
      descriptorB: state.sequences.descriptorB 
    });
    
    const uniprotIdA = extractUniProtId(state.sequences.descriptorA);
    const uniprotIdB = extractUniProtId(state.sequences.descriptorB);

    console.log('Extracted UniProt IDs:', { uniprotIdA, uniprotIdB });

    // Update structure A if UniProt ID found and different from current
    if (uniprotIdA && state.structureA?.uniprotId !== uniprotIdA) {
      console.log('Setting structure A:', uniprotIdA);
      dispatch({
        type: 'SET_STRUCTURE_A',
        payload: { uniprotId: uniprotIdA }
      });
    } else if (!uniprotIdA && state.structureA?.uniprotId && !state.sequences.sequenceA) {
      // Only clear structure A if no UniProt ID found AND no sequence loaded
      // This prevents clearing explicitly set structures from UniProt search
      console.log('Clearing structure A (no sequence loaded)');
      dispatch({ type: 'CLEAR_STRUCTURE_A' });
    }

    // Update structure B if UniProt ID found and different from current
    if (uniprotIdB && state.structureB?.uniprotId !== uniprotIdB) {
      console.log('Setting structure B:', uniprotIdB);
      dispatch({
        type: 'SET_STRUCTURE_B',
        payload: { uniprotId: uniprotIdB }
      });
    } else if (!uniprotIdB && state.structureB?.uniprotId && !state.sequences.sequenceB) {
      // Only clear structure B if no UniProt ID found AND no sequence loaded
      // This prevents clearing explicitly set structures from UniProt search
      console.log('Clearing structure B (no sequence loaded)');
      dispatch({ type: 'CLEAR_STRUCTURE_B' });
    }
  }, [state.sequences.descriptorA, state.sequences.descriptorB, state.structureA?.uniprotId, state.structureB?.uniprotId, state.sequences.sequenceA, state.sequences.sequenceB]);

  // Process alignment result function from FileUploader.tsx
  const processAlignmentResult = (result: any): Alignment[] => {
    const alignments: Alignment[] = [];

    // Process alignment_graph data
    if (result.alignment_graph && Array.isArray(result.alignment_graph)) {
      for (const node of result.alignment_graph) {
        if (node && Array.isArray(node.edges)) {
          const edges = node.edges.map((edge: any) => ({
            from: [node.from[0], node.from[1]],
            to: [edge[0], edge[1]],
            probability: edge[2]
          }));
          
          alignments.push({
            color: "black",
            edges: edges,
          });
        }
      }
    }
    
    // Process sequence alignment data
    if (result.alignment_representative && result.alignment_member) {
      // Store the text-based sequence alignment for display
      alignments.push({
        color: "alignment",
        edges: [], // Empty edges array to satisfy the type
        textAlignment: {
          representative: {
            sequence: result.alignment_representative,
            descriptor: result.representative_descriptor
          },
          member: {
            sequence: result.alignment_member,
            descriptor: result.mem_descriptor
          }
        }
      });
    }
    
    // Process window data
    if (result.windows_representative && Array.isArray(result.windows_representative)) {
      for (let i = 0; i < result.windows_representative.length; i++) {
        const windowRep = result.windows_representative[i];
        const windowMem = result.windows_member ? result.windows_member[i] : null;
        
        if (windowRep && windowMem) {
          alignments.push({
            color: "green",
            edges: [],
            startDot: { x: windowRep[0], y: windowMem[0] },
            endDot: { x: windowRep[1], y: windowMem[1] }
          });
        }
      }
    }

    // Process optimal path data
    if (result.optimal_path && Array.isArray(result.optimal_path)) {
      console.log('Processing optimal path with', result.optimal_path.length, 'points');
      // Convert optimal path coordinates to edges connecting consecutive points
      const optimalPathEdges = [];
      for (let i = 0; i < result.optimal_path.length - 1; i++) {
        const currentPoint = result.optimal_path[i];
        const nextPoint = result.optimal_path[i + 1];
        
        if (currentPoint && nextPoint && 
            Array.isArray(currentPoint) && Array.isArray(nextPoint) &&
            currentPoint.length >= 2 && nextPoint.length >= 2) {
          optimalPathEdges.push({
            from: [currentPoint[0], currentPoint[1]] as [number, number],
            to: [nextPoint[0], nextPoint[1]] as [number, number],
            probability: 1.0 // Use full probability for the optimal path
          });
        }
      }
      
      if (optimalPathEdges.length > 0) {
        console.log('Adding optimal path with', optimalPathEdges.length, 'edges in blue');
        alignments.push({
          color: "blue",
          edges: optimalPathEdges,
        });
      }
    }

    return alignments;
  };

  // Function to run alignment using EmeraldService
  const runAlignment = async () => {
    const { sequences, params } = state;
    
    console.log('Starting alignment with state:', {
      sequenceA: sequences.sequenceA ? `${sequences.sequenceA.length} chars` : 'empty',
      sequenceB: sequences.sequenceB ? `${sequences.sequenceB.length} chars` : 'empty',
      descriptorA: sequences.descriptorA,
      descriptorB: sequences.descriptorB,
      structureA: state.structureA,
      structureB: state.structureB,
      params: params
    });
    
    // Validation
    if (!sequences.sequenceA || !sequences.sequenceB) {
      dispatch({ 
        type: 'ALIGNMENT_ERROR', 
        payload: 'Both sequences are required to generate alignment' 
      });
      return;
    }

    // Check for middle asterisks which should prevent alignment
    if (state.validation.sequenceA.hasMiddleAsterisk || state.validation.sequenceB.hasMiddleAsterisk) {
      dispatch({ 
        type: 'ALIGNMENT_ERROR', 
        payload: 'Sequences cannot contain asterisks (*) in the middle. Please remove them before generating alignment.' 
      });
      return;
    }

    try {
      dispatch({ type: 'ALIGNMENT_START' });
      
      // Remove trailing asterisks if present
      const cleanSequenceA = sequences.sequenceA.replace(/\*+$/, '');
      const cleanSequenceB = sequences.sequenceB.replace(/\*+$/, '');
      
      // Update sequences if asterisks were removed
      if (cleanSequenceA !== sequences.sequenceA) {
        dispatch({ type: 'UPDATE_SEQUENCE_A', payload: cleanSequenceA });
      }
      if (cleanSequenceB !== sequences.sequenceB) {
        dispatch({ type: 'UPDATE_SEQUENCE_B', payload: cleanSequenceB });
      }
      
      // Call EmeraldService to generate alignment
      const result = await emeraldService.generateAlignment(
        cleanSequenceA,
        sequences.descriptorA || 'Sequence A',
        cleanSequenceB,
        sequences.descriptorB || 'Sequence B',
        params.alpha,
        params.delta,
        params.gapCost,
        params.startGap
      );
      
      // Process the results using the function from FileUploader
      const processedAlignments = processAlignmentResult(result);
      
      console.log('Alignment generated successfully:', result);
      
      dispatch({ 
        type: 'ALIGNMENT_SUCCESS', 
        payload: processedAlignments 
      });
      
    } catch (error) {
      console.error('Error generating alignment:', error);
      dispatch({ 
        type: 'ALIGNMENT_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error generating alignment'
      });
    }
  };

  // Function to fetch sequence A from UniProt
  const fetchSequenceA = async (accession: string) => {
    try {
      dispatch({ type: 'FETCH_SEQUENCE_A_START' });
      const result = await fetchUniProtSequence(accession);
      dispatch({ 
        type: 'FETCH_SEQUENCE_A_SUCCESS', 
        payload: result 
      });
    } catch (error) {
      dispatch({ 
        type: 'FETCH_SEQUENCE_A_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch sequence' 
      });
    }
  };

  // Function to fetch sequence B from UniProt
  const fetchSequenceB = async (accession: string) => {
    try {
      dispatch({ type: 'FETCH_SEQUENCE_B_START' });
      const result = await fetchUniProtSequence(accession);
      dispatch({ 
        type: 'FETCH_SEQUENCE_B_SUCCESS', 
        payload: result 
      });
    } catch (error) {
      dispatch({ 
        type: 'FETCH_SEQUENCE_B_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch sequence' 
      });
    }
  };

  // Function to load structure file for sequence A
  const loadStructureFileA = (structureData: StructureData) => {
    dispatch({
      type: 'LOAD_STRUCTURE_FILE_A',
      payload: structureData
    });
  };

  // Function to load structure file for sequence B
  const loadStructureFileB = (structureData: StructureData) => {
    dispatch({
      type: 'LOAD_STRUCTURE_FILE_B',
      payload: structureData
    });
  };

  // Helper function to check if alignment can be run
  const canRunAlignment = () => {
    const { sequences, validation } = state;
    
    // Must have both sequences
    if (!sequences.sequenceA || !sequences.sequenceB) {
      return false;
    }
    
    // Cannot have middle asterisks
    if (validation.sequenceA.hasMiddleAsterisk || validation.sequenceB.hasMiddleAsterisk) {
      return false;
    }
    
    return true;
  };

  // Helper function to get validation warnings
  const getValidationWarnings = () => {
    const warnings = {
      sequenceA: [] as string[],
      sequenceB: [] as string[]
    };
    
    if (state.validation.sequenceA.hasMiddleAsterisk) {
      warnings.sequenceA.push('Sequence contains asterisk (*) in the middle. This will prevent alignment generation.');
    }
    if (state.validation.sequenceA.hasEndAsterisk) {
      warnings.sequenceA.push('Sequence ends with asterisk (*). It will be removed when generating alignment.');
    }
    
    if (state.validation.sequenceB.hasMiddleAsterisk) {
      warnings.sequenceB.push('Sequence contains asterisk (*) in the middle. This will prevent alignment generation.');
    }
    if (state.validation.sequenceB.hasEndAsterisk) {
      warnings.sequenceB.push('Sequence ends with asterisk (*). It will be removed when generating alignment.');
    }
    
    return warnings;
  };

  return (
    <SequenceContext.Provider value={{ 
      state, 
      dispatch, 
      runAlignment, 
      fetchSequenceA, 
      fetchSequenceB,
      loadStructureFileA,
      loadStructureFileB,
      canRunAlignment,
      getValidationWarnings
    }}>
      {children}
    </SequenceContext.Provider>
  );
};

// Custom hook to use the context
export const useSequence = () => {
  const context = useContext(SequenceContext);
  if (context === undefined) {
    throw new Error('useSequence must be used within a SequenceProvider');
  }
  return context;
};