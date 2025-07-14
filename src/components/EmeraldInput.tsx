import React, { useState, useEffect } from 'react';
import { useSequence } from '../context/SequenceContext';
import StructureFileUploader from './StructureFileUploader';
// import type { StructureData } from '../utils/pdbParser';
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
  
  // Get validation warnings
  const validationWarnings = getValidationWarnings();
  
  // Local validation state
  const [isValid, setIsValid] = useState(false);

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

  const handleSubmit = async () => {
    if (isValid) {
      // Check if sequences are very large and might cause memory issues
      const seqProduct = sequences.sequenceA.length * sequences.sequenceB.length;
      if (seqProduct > 1500000) { // Threshold based on observed failures
        const warnMsg = `Warning: The sequences you're trying to align are very large ` +
                       `(${sequences.sequenceA.length}×${sequences.sequenceB.length} characters). ` +
                       `This might cause memory issues in your browser. Do you want to continue anyway?`;
        
        if (!window.confirm(warnMsg)) {
          return; // User chose to cancel
        }
      }
      
      // First run the internal alignment using EmeraldService
      await runAlignment();
      
      // Then call the onSubmit prop for backward compatibility
      onSubmit(
        sequences,
        params
      );
    }
  };

  const handleFetchSequenceA = async () => {
    await fetchSequenceA(sequences.accessionA);
  };

  const handleFetchSequenceB = async () => {
    await fetchSequenceB(sequences.accessionB);
  };

  return (
    <div className="emerald-input-card">
      <h2 className="emerald-title">Protein Sequence Input</h2>
      
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
            <StructureFileUploader
              onStructureSelect={loadStructureFileA}
              label="PDB/CIF File"
              disabled={fetchStatusA === 'loading'}
            />
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
            <StructureFileUploader
              onStructureSelect={loadStructureFileB}
              label="PDB/CIF File"
              disabled={fetchStatusB === 'loading'}
            />
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
        
        {/* Submit Button */}
        <div className="emerald-full-width">
          <button 
            onClick={handleSubmit} 
            disabled={!isValid || alignmentStatus === 'loading'}
            className="emerald-button"
          >
            {alignmentStatus === 'loading' ? 'Generating...' : 'Generate Graph'}
          </button>
          
          {state.alignmentError && (
            <div className="error-message">
              {state.alignmentError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmeraldInput;