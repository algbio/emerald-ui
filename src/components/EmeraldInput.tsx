import React, { useState, useEffect } from 'react';
import { useSequence } from '../context/SequenceContext';
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
  const { state, dispatch, runAlignment } = useSequence();
  const { sequences, params, alignmentStatus } = state;
  
  // Local validation state
  const [isValid, setIsValid] = useState(false);

  // Validate inputs when they change
  useEffect(() => {
    setIsValid(
      sequences.sequenceA.trim().length > 0 && 
      sequences.sequenceB.trim().length > 0 &&
      params.alpha > 0.5 && params.alpha <= 1 &&
      params.delta >= 0 && params.delta <= 32
    );
  }, [sequences, params]);

  const handleSubmit = async () => {
    if (isValid) {
      // First run the internal alignment using EmeraldService
      await runAlignment();
      
      // Then call the onSubmit prop for backward compatibility
      onSubmit(
        sequences,
        params
      );
    }
  };

  return (
    <div className="emerald-input-card">
      <h2 className="emerald-title">Protein Sequence Input</h2>
      
      <div className="emerald-grid">
        {/* Sequence A */}
        <div className="emerald-column">
          <h3>Sequence A</h3>
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
          </div>
        </div>
        
        {/* Sequence B */}
        <div className="emerald-column">
          <h3>Sequence B</h3>
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