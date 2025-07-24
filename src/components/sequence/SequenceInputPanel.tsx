import React from 'react';
import { FastaFileUploader } from './FastaFileUploader';
import UniProtSearch from './UniProtSearch';

const SequenceInputPanel: React.FC = () => (
  <div className="sequence-input-panel">
    <FastaFileUploader />
    <UniProtSearch />
  </div>
);

export default SequenceInputPanel;