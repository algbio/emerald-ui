import React, { useState, useEffect } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import StructureFileUploader from '../structure/StructureFileUploader';
import type { CostMatrixTypeValue } from '../../utils/api/EmeraldService';
// import type { StructureData } from '../../utils/structure/pdbParser';
import './EmeraldInput.css';

interface EmeraldInputProps {
  onSubmit: (sequences: {
    sequenceA: string;
    sequenceB: string;
    descriptorA: string;
    descriptorB: string;
  }, params: { alpha: number; delta: number }) => void;
}

const EmeraldInput: React.FC<EmeraldInputProps> = ({ onSubmit }) => {
  // Get state and dispatch from context
  const { state, dispatch, runAlignment, fetchSequenceA, fetchSequenceB, loadStructureFileA, loadStructureFileB, canRunAlignment, getValidationWarnings } = useSequence();
  const { sequences, params, alignmentStatus, fetchStatusA, fetchErrorA, fetchStatusB, fetchErrorB } = state;
  
  // Feedback notifications
  const { notifySuccess, notifyError, notifyInfo, showError } = useFeedbackNotifications();
  
  // Get validation warnings
  const validationWarnings = getValidationWarnings();
  
  // Local validation state
  const [isValid, setIsValid] = useState(false);
  const [hasShownReadyMessage, setHasShownReadyMessage] = useState(false);

  // Validate inputs when they change
  useEffect(() => {
    const basicValidation = sequences.sequenceA.trim().length > 0 && 
      sequences.sequenceB.trim().length > 0 &&
      params.alpha > 0.5 && params.alpha <= 1 &&
      params.delta >= 0 && params.delta <= 32;
    
    // Use the context's canRunAlignment for asterisk validation
    const alignmentValidation = canRunAlignment();
    
    setIsValid(basicValidation && alignmentValidation);
  }, [sequences, params, canRunAlignment]);

  // Show feedback when both sequences are ready for alignment
  useEffect(() => {
    const bothSequencesFilled = sequences.sequenceA.trim().length > 0 && sequences.sequenceB.trim().length > 0;
    const alignmentReady = canRunAlignment();
    
    // Only show the message once when both sequences become available and valid
    if (bothSequencesFilled && alignmentReady && !hasShownReadyMessage && alignmentStatus === 'idle') {
      notifySuccess('Sequences Ready', 'Both sequences are loaded and ready for alignment generation!');
      setHasShownReadyMessage(true);
    }
    
    // Reset the flag when sequences are cleared or invalid
    if (!bothSequencesFilled || !alignmentReady) {
      setHasShownReadyMessage(false);
    }
  }, [sequences.sequenceA, sequences.sequenceB, canRunAlignment, hasShownReadyMessage, alignmentStatus, notifySuccess]);

  const handleSubmit = async () => {
    if (isValid) {
      // Check if sequences are very large and might cause memory issues
      const seqProduct = sequences.sequenceA.length * sequences.sequenceB.length;
      if (seqProduct > 1500000) { // Threshold based on observed failures
        const warnMsg = `Warning: The sequences you're trying to align are very large ` +
                       `(${sequences.sequenceA.length}×${sequences.sequenceB.length} characters). ` +
                       `This might cause memory issues in your browser. Do you want to continue anyway?`;
        
        if (!window.confirm(warnMsg)) {
          notifyInfo('Alignment Cancelled', 'Large sequence alignment was cancelled by user');
          return; // User chose to cancel
        }
      }
      
      notifyInfo('Starting Alignment', 'Generating suboptimal alignment graph...');
      
      try {
        // First run the internal alignment using EmeraldService
        await runAlignment();
        
        // Then call the onSubmit prop for backward compatibility
        onSubmit(
          sequences,
          params
        );
        
        notifySuccess('Alignment Complete', 'Suboptimal alignment graph has been generated successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if this is a memory-related error
        if (errorMessage.includes('Memory limit exceeded') || 
            errorMessage.includes('Cannot enlarge memory') ||
            errorMessage.includes('out of memory') ||
            errorMessage.includes('OutOfMemory') ||
            errorMessage.includes('stack overflow') ||
            errorMessage.includes('Maximum call stack') ||
            errorMessage.includes('Aborted') ||
            errorMessage.includes('RuntimeError') ||
            errorMessage.includes('memory access out of bounds')) {
          showError(
            'Memory Limit Exceeded', 
            'Your browser has run out of memory processing these sequences. Please refresh the page and try again with shorter sequences.',
            { duration: 0 } // Don't auto-dismiss memory errors
          );
        } else {
          notifyError('Alignment Failed', `Failed to generate alignment: ${errorMessage}`);
        }
      }
    } else {
      notifyError('Invalid Input', 'Please check your sequences and parameters before submitting');
    }
  };

  const handleFetchSequenceA = async () => {
    if (!sequences.accessionA.trim()) {
      notifyError('Invalid Accession', 'Please enter a valid UniProt accession number for Sequence A');
      return;
    }
    
    notifyInfo('Fetching Sequence A', `Retrieving sequence for accession ${sequences.accessionA}`);
    
    try {
      await fetchSequenceA(sequences.accessionA);
      
      // Check if fetch was successful by looking at the state after fetch
      // We'll need to wait a bit for the state to update
      setTimeout(() => {
        if (state.fetchErrorA) {
          notifyError('Fetch Failed', `Failed to fetch Sequence A: ${state.fetchErrorA}`);
        } else if (state.sequences.sequenceA) {
          notifySuccess('Sequence A Loaded', `Successfully loaded ${sequences.accessionA} from UniProt`);
        }
      }, 100);
    } catch (error) {
      notifyError('Fetch Failed', `Error fetching Sequence A: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFetchSequenceB = async () => {
    if (!sequences.accessionB.trim()) {
      notifyError('Invalid Accession', 'Please enter a valid UniProt accession number for Sequence B');
      return;
    }
    
    notifyInfo('Fetching Sequence B', `Retrieving sequence for accession ${sequences.accessionB}`);
    
    try {
      await fetchSequenceB(sequences.accessionB);
      
      // Check if fetch was successful by looking at the state after fetch
      // We'll need to wait a bit for the state to update
      setTimeout(() => {
        if (state.fetchErrorB) {
          notifyError('Fetch Failed', `Failed to fetch Sequence B: ${state.fetchErrorB}`);
        } else if (state.sequences.sequenceB) {
          notifySuccess('Sequence B Loaded', `Successfully loaded ${sequences.accessionB} from UniProt`);
        }
      }, 100);
    } catch (error) {
      notifyError('Fetch Failed', `Error fetching Sequence B: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load example protein sequences
  const loadExampleSequences = () => {
    const exampleSequenceA = "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELPPGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPGGSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD";
    const exampleDescriptorA = "sp|P04637|P53_HUMAN Cellular tumor antigen p53 OS=Homo sapiens";
    
    const exampleSequenceB = "MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAALGL";
    const exampleDescriptorB = "sp|P02769|ALBU_HUMAN Serum albumin OS=Homo sapiens";
    
    dispatch({ 
      type: 'LOAD_SEQUENCES', 
      payload: {
        sequenceA: exampleSequenceA,
        descriptorA: exampleDescriptorA,
        sequenceB: exampleSequenceB,
        descriptorB: exampleDescriptorB
      } 
    });
    
    notifySuccess('Example Data Loaded', 'Loaded Human p53 and Serum albumin protein sequences');
  };
  const loadShortExampleSequences = () => {
    const exampleSequenceA = "MLQFLLGFTLGNVVGMYLAQNYDIPNLAKKLEEIKKDLDAKKKPPSA";
    const exampleDescriptorA = "E0CX11 | Short transmembrane mitochondrial protein 1 | Short transmembrane mitochondrial protein 1 | Homo sapiens";
    
    const exampleSequenceB = "MAAATLTSKLYSLLFRRTSTFALTIIVGVMFFERAFDQGADAIYDHINEGKLWKHIKHKYENK";
    const exampleDescriptorB = "Q9UDW1 | Cytochrome b-c1 complex subunit 9 | Cytochrome b-c1 complex subunit 9 | Homo sapiens";
    
    dispatch({ 
      type: 'LOAD_SEQUENCES', 
      payload: {
        sequenceA: exampleSequenceA,
        descriptorA: exampleDescriptorA,
        sequenceB: exampleSequenceB,
        descriptorB: exampleDescriptorB
      } 
    });
    
    notifySuccess('Example Data Loaded', 'Loaded Human p53 and Serum albumin protein sequences');
  };

  return (
    <div className="emerald-input-card">
      <h2 className="emerald-title">Protein Sequence Input</h2>
      {/* Load Example button */}          
        <div className="load-example-section">
          <button 
            onClick={loadShortExampleSequences}
            className="load-example-button-small"
            title="Load short example protein sequences (Human p53 and Serum albumin)"
          >
            Load Short Example
          </button>
          <button 
            onClick={loadExampleSequences}
            className="load-example-button-small"
            title="Load example protein sequences (Human p53 and Serum albumin)"
          >
            Load Long Example
          </button>
        </div>
      
      
      <div className="emerald-grid">
        {/* Sequence A */}
        <div className="emerald-column">
          <h2>Sequence A</h2>
          <div className="input-group">
            <label htmlFor="descriptorA">Descriptor</label>
            <input
              id="descriptorA"
              type="text"
              value={sequences.descriptorA}
              onChange={(e) => dispatch({ 
                type: 'UPDATE_DESCRIPTOR_A', 
                payload: e.target.value 
              })}
              placeholder="Enter sequence A descriptor"
              className="emerald-input"
            />
          </div>
          <div className="input-group">
            <label htmlFor="sequenceA">Sequence</label>
            <textarea
              id="sequenceA"
              rows={4}
              value={sequences.sequenceA}
              onChange={(e) => dispatch({
                type: 'UPDATE_SEQUENCE_A',
                payload: e.target.value
              })}
              placeholder="Enter protein sequence A"
              className={`emerald-textarea ${!sequences.sequenceA.trim() ? 'error' : ''}`}
            />
            {!sequences.sequenceA.trim() && <div className="error-text">Sequence cannot be empty</div>}
            {validationWarnings.sequenceA.map((warning, index) => (
              <div key={index} className={`warning-text ${state.validation.sequenceA.hasMiddleAsterisk ? 'error-text' : 'warning-text'}`}>
                {warning}
              </div>
            ))}
          </div>
          <div className="fetch-upload-row">
            <div className="input-group">
              <label htmlFor="accessionA">UniProt Accession</label>
              <div className="accession-input-group">
                <input
                  id="accessionA"
                  type="text"
                  value={sequences.accessionA}
                  onChange={(e) => dispatch({ 
                    type: 'UPDATE_ACCESSION_A', 
                    payload: e.target.value 
                  })}
                  placeholder="e.g., P04637"
                  className="emerald-input"
                />
                <button
                  type="button"
                  onClick={handleFetchSequenceA}
                  disabled={!sequences.accessionA.trim() || fetchStatusA === 'loading'}
                  className="fetch-button"
                >
                  {fetchStatusA === 'loading' ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              {fetchErrorA && <div className="error-text">{fetchErrorA}</div>}
            </div>
            <div className="input-group">
              <label htmlFor="accessionA">File upload</label>

              <StructureFileUploader
                onStructureSelect={loadStructureFileA}
                label="PDB/CIF File"
                disabled={fetchStatusA === 'loading'}
              />
            </div>
          </div>
        </div>
        
        {/* Sequence B */}
        <div className="emerald-column">
          <h2>Sequence B</h2>
          <div className="input-group">
            <label htmlFor="descriptorB">Descriptor</label>
            <input
              id="descriptorB"
              type="text"
              value={sequences.descriptorB}
              onChange={(e) => dispatch({
                type: 'UPDATE_DESCRIPTOR_B',
                payload: e.target.value
              })}
              placeholder="Enter sequence B descriptor"
              className="emerald-input"
            />
          </div>
          <div className="input-group">
            <label htmlFor="sequenceB">Sequence</label>
            <textarea
              id="sequenceB"
              rows={4}
              value={sequences.sequenceB}
              onChange={(e) => dispatch({
                type: 'UPDATE_SEQUENCE_B',
                payload: e.target.value
              })}
              placeholder="Enter protein sequence B"
              className={`emerald-textarea ${!sequences.sequenceB.trim() ? 'error' : ''}`}
            />
            {!sequences.sequenceB.trim() && <div className="error-text">Sequence cannot be empty</div>}
          </div>
          <div className="fetch-upload-row">
            <div className="input-group">
              <label htmlFor="accessionB">UniProt Accession</label>
              <div className="accession-input-group">
                <input
                  id="accessionB"
                  type="text"
                  value={sequences.accessionB}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_ACCESSION_B',
                    payload: e.target.value
                  })}
                  placeholder="e.g., P02769"
                  className="emerald-input"
                />
                <button
                  type="button"
                  onClick={handleFetchSequenceB}
                  disabled={!sequences.accessionB.trim() || fetchStatusB === 'loading'}
                  className="fetch-button"
                >
                  {fetchStatusB === 'loading' ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              {fetchErrorB && <div className="error-text">{fetchErrorB}</div>}
            </div>
            <div className="input-group">
              <label htmlFor="accessionA">File upload</label>
              <StructureFileUploader
                onStructureSelect={loadStructureFileB}
                label="PDB/CIF File"
                disabled={fetchStatusB === 'loading'}
              />
            </div>
          </div>
        </div>
        
        {/* Parameters */}
        <div className="emerald-column">
          <div className="slider-container">
            <label htmlFor="alpha-slider">Alpha: {params.alpha.toFixed(2)}</label>
            <input
              id="alpha-slider"
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={params.alpha}
              onChange={(e) => dispatch({
                type: 'UPDATE_PARAMS',
                payload: { ...params, alpha: parseFloat(e.target.value) }
              })}
              className="emerald-slider"
            />
            <div className="slider-marks">
              <span>0.5</span>
              <span>0.75</span>
              <span>1</span>
            </div>
          </div>
        </div>
        
        <div className="emerald-column">
          <div className="slider-container">
            <label htmlFor="delta-slider">Delta: {params.delta.toFixed(0)}</label>
            <input
              id="delta-slider"
              type="range"
              min="0"
              max="32"
              step="1"
              value={params.delta}
              onChange={(e) => dispatch({
                type: 'UPDATE_PARAMS',
                payload: { ...params, delta: parseInt(e.target.value) }
              })}
              className="emerald-slider"
            />
            <div className="slider-marks">
              <span>0</span>
              <span>16</span>
              <span>32</span>
            </div>
          </div>
        </div>
        
        {/* Advanced Options Section */}
        <div className="emerald-full-width">
          <details className="advanced-options-details">
            <summary className="advanced-options-summary">Advanced Options</summary>
            
            {/* Cost Matrix Selector */}
            <div className="param-container">
              <label htmlFor="matrix-select">Cost Matrix Type:</label>
              <select
                id="matrix-select"
                className="emerald-select"
                value={params.costMatrixType ?? 2}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  dispatch({
                    type: 'UPDATE_PARAMS',
                    payload: { ...params, costMatrixType: value as CostMatrixTypeValue }
                  });
                }}
              >
                <option value={0}>BLOSUM45</option>
                <option value={1}>BLOSUM50</option>
                <option value={2}>BLOSUM62 (Default)</option>
                <option value={3}>BLOSUM80</option>
                <option value={4}>BLOSUM90</option>
                <option value={5}>PAM30</option>
                <option value={6}>PAM70</option>
                <option value={7}>PAM250</option>
                <option value={8}>IDENTITY</option>
              </select>
              <div className="param-description">
                Substitution matrix used for sequence alignment scoring
              </div>
            </div>
            
            {/* Gap Cost Parameters */}
            <div className="emerald-row">
              <div className="emerald-column">
                <div className="param-container">
                  <label htmlFor="gap-cost">Gap Cost:</label>
                  <input
                    id="gap-cost"
                    type="number"
                    className="emerald-input"
                    value={params.gapCost ?? -1}
                    step="1"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        dispatch({
                          type: 'UPDATE_PARAMS',
                          payload: { gapCost: value }
                        });
                      }
                    }}
                  />
                  <div className="param-description">
                    Cost for extending a gap (default: -1)
                  </div>
                </div>
              </div>
              
              <div className="emerald-column">
                <div className="param-container">
                  <label htmlFor="start-gap">Start Gap Cost:</label>
                  <input
                    id="start-gap"
                    type="number"
                    className="emerald-input"
                    value={params.startGap ?? -11}
                    step="1"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        dispatch({
                          type: 'UPDATE_PARAMS',
                          payload: { startGap: value }
                        });
                      }
                    }}
                  />
                  <div className="param-description">
                    Cost for opening a new gap (default: -11)
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
        
        {/* Submit Button */}
        <div className="emerald-full-width">
          <button 
            onClick={handleSubmit} 
            disabled={!isValid || alignmentStatus === 'loading'}
            className="emerald-button"
          >
            {alignmentStatus === 'loading' ? 'Generating...' : 'Generate Suboptimal Alignment Graph'}
          </button>
          
          
          
          {state.alignmentError && (
            <div className="error-message">
              {/* Check if this is a memory-related error from context */}
              {(state.alignmentError.includes('Memory limit exceeded') || 
                state.alignmentError.includes('Cannot enlarge memory') ||
                state.alignmentError.includes('out of memory') ||
                state.alignmentError.includes('OutOfMemory') ||
                state.alignmentError.includes('stack overflow') ||
                state.alignmentError.includes('Maximum call stack') ||
                state.alignmentError.includes('Aborted') ||
                state.alignmentError.includes('RuntimeError') ||
                state.alignmentError.includes('memory access out of bounds')) ? (
                <div>
                  <strong>Memory Limit Exceeded</strong><br />
                  Your browser has run out of memory processing these sequences. Please refresh the page and try again with shorter sequences.
                </div>
              ) : (
                state.alignmentError
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmeraldInput;