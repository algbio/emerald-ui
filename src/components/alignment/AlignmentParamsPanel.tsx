import React from 'react';
import { useSequence } from '../../context/SequenceContext';
import type { CostMatrixTypeValue } from '../../utils/api/EmeraldService';
import './AlignmentParamsPanel.css';

const AlignmentParamsPanel: React.FC = () => {
  const { state, dispatch } = useSequence();
  
  const handleMatrixTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ 
      type: 'UPDATE_PARAMS',
      payload: { 
        costMatrixType: parseInt(e.target.value, 10) as CostMatrixTypeValue 
      }
    });
  };
  
  const handleGapCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      dispatch({
        type: 'UPDATE_PARAMS',
        payload: { gapCost: value }
      });
    }
  };
  
  const handleStartGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      dispatch({
        type: 'UPDATE_PARAMS',
        payload: { startGap: value }
      });
    }
  };
  
  return (
    <div className="alignment-params-panel">
      <div className="panel-header">
        <h3>Alignment Parameters</h3>
        <div className="panel-subtitle">
          Configure parameters used for sequence alignment
        </div>
      </div>
      
      <div className="params-sections">
        <div className="params-section">
          <h4>Substitution Matrix</h4>
          <div className="param-group">
            <div className="param-item">
              <label className="param-label">Cost Matrix Type</label>
              <select
                value={state.params.costMatrixType ?? 0}
                onChange={handleMatrixTypeChange}
                className="param-select"
              >
                <option value={0}>BLOSUM62 (Default)</option>
                <option value={1}>PAM250</option>
                <option value={2}>IDENTITY</option>
              </select>
              <p className="param-description">
                Substitution matrix used for sequence alignment scoring
              </p>
            </div>
          </div>
        </div>
        
        <div className="params-section">
          <h4>Gap Parameters</h4>
          <div className="param-group">
            <div className="param-item">
              <label className="param-label">Gap Cost</label>
              <input
                type="number"
                value={state.params.gapCost ?? -1}
                onChange={handleGapCostChange}
                className="param-input"
                step="0.1"
              />
              <p className="param-description">
                Cost for extending a gap in the alignment (default: -1)
              </p>
            </div>
            
            <div className="param-item">
              <label className="param-label">Start Gap Cost</label>
              <input
                type="number"
                value={state.params.startGap ?? -11}
                onChange={handleStartGapChange}
                className="param-input"
                step="0.1"
              />
              <p className="param-description">
                Cost for opening a new gap (default: -11)
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="panel-footer">
        <div className="help-text">
          Changes to alignment parameters will apply to new alignments.
          Click the "Run Alignment" button to apply these settings.
        </div>
      </div>
    </div>
  );
};

export default AlignmentParamsPanel;
