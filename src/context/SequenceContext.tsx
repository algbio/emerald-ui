import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Alignment } from '../components/PointGridPlot';
import type { StructureData } from '../utils/pdbParser';

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
  structureA: null,
  structureB: null,
};

// Define the possible actions
type SequenceAction =
  | { type: 'UPDATE_SEQUENCE_A'; payload: string }
  | { type: 'UPDATE_SEQUENCE_B'; payload: string }
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
  | { type: 'UPDATE_PARAMS'; payload: EmeraldParams }
  | { type: 'LOAD_SEQUENCES'; payload: Partial<SequenceData> }
  | { type: 'RESET_SEQUENCES' }
  | { type: 'ALIGNMENT_START' }
  | { type: 'ALIGNMENT_SUCCESS'; payload: Alignment[] }
  | { type: 'ALIGNMENT_ERROR'; payload: string }
  | { type: 'SET_STRUCTURE_A', payload: { uniprotId: string | null; pdbId?: string | null } }
  | { type: 'SET_STRUCTURE_B', payload: { uniprotId: string | null; pdbId?: string | null } }
  | { type: 'CLEAR_STRUCTURE_A' }
  | { type: 'CLEAR_STRUCTURE_B' };

// Create the reducer
const sequenceReducer = (state: SequenceState, action: SequenceAction): SequenceState => {
  switch (action.type) {
    case 'UPDATE_SEQUENCE_A':
      return {
        ...state,
        sequences: { ...state.sequences, sequenceA: action.payload }
      };
    case 'UPDATE_SEQUENCE_B':
      return {
        ...state,
        sequences: { ...state.sequences, sequenceB: action.payload }
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
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceA: action.payload.sequence,
          descriptorA: action.payload.descriptor
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
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceB: action.payload.sequence,
          descriptorB: action.payload.descriptor
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
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceA: action.payload.sequence,
          descriptorA: action.payload.descriptor
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
      return {
        ...state,
        sequences: {
          ...state.sequences,
          sequenceB: action.payload.sequence,
          descriptorB: action.payload.descriptor
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
}

const SequenceContext = createContext<SequenceContextType | undefined>(undefined);

// Provider component
interface SequenceProviderProps {
  children: ReactNode;
}

import { emeraldService } from '../utils/EmeraldService';
import { extractUniProtId } from '../utils/uniprotUtils';
import { fetchUniProtSequence } from '../utils/uniprotFetcher';

export const SequenceProvider: React.FC<SequenceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(sequenceReducer, initialState);

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

    try {
      dispatch({ type: 'ALIGNMENT_START' });
      
      // Call EmeraldService to generate alignment
      const result = await emeraldService.generateAlignment(
        sequences.sequenceA,
        sequences.descriptorA || 'Sequence A',
        sequences.sequenceB,
        sequences.descriptorB || 'Sequence B',
        params.alpha,
        params.delta,
        params.gapCost,
        params.startGap
      );
      
      // Process the results using the function from FileUploader
      const processedAlignments = processAlignmentResult(result);
      
      console.log('Alignment generated successfully:', {
        alignmentsCount: processedAlignments.length,
        processedAlignments: processedAlignments.map(a => ({ 
          color: a.color, 
          edgesCount: a.edges.length,
          hasStartDot: !!a.startDot,
          hasEndDot: !!a.endDot
        }))
      });
      
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

  return (
    <SequenceContext.Provider value={{ 
      state, 
      dispatch, 
      runAlignment, 
      fetchSequenceA, 
      fetchSequenceB,
      loadStructureFileA,
      loadStructureFileB
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