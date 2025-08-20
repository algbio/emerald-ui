import React from 'react';
import { useSequence } from '../../context/SequenceContext';
import type { CostMatrixTypeValue } from '../../utils/api/EmeraldService';
import '../shared/Panel.css';
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
    <div className="panel">
      <div className="panel-header panel-header--large">
        <h3>Alignment Parameters</h3>
        <div className="panel-subtitle">
          Configure parameters used for sequence alignment
        </div>
      </div>
      
      <div className="panel-content">
        <div className="panel-section">
          <h4 className="panel-section-title">Substitution Matrix</h4>
          <div className="panel-form-group">
            <div className="panel-form-item">
              <label className="panel-label">Cost Matrix Type</label>
              <select
                value={state.params.costMatrixType ?? 2}
                onChange={handleMatrixTypeChange}
                className="panel-select"
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
              <p className="panel-description">
                Substitution matrix used for sequence alignment scoring
              </p>
            </div>
          </div>
        </div>
        
        <div className="panel-section">
          <h4 className="panel-section-title">Gap Parameters</h4>
          <div className="panel-form-group">
            <div className="panel-form-item">
              <label className="panel-label">Gap Cost</label>
              <input
                type="number"
                value={state.params.gapCost ?? -1}
                onChange={handleGapCostChange}
                className="panel-input"
                step="0.1"
              />
              <p className="panel-description">
                Cost for extending a gap in the alignment (default: -1)
              </p>
            </div>
            
            <div className="panel-form-item">
              <label className="panel-label">Start Gap Cost</label>
              <input
                type="number"
                value={state.params.startGap ?? -11}
                onChange={handleStartGapChange}
                className="panel-input"
                step="0.1"
              />
              <p className="panel-description">
                Cost for opening a new gap (default: -11)
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="panel-footer">
        <div className="panel-info">
          Changes to alignment parameters will apply to new alignments.
          Click the "Run Alignment" button to apply these settings.
        </div>
      </div>
    </div>
  );
};

export default AlignmentParamsPanel;
