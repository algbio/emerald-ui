import React from 'react';
import type { PathSelectionResult } from '../../types/PointGrid';
import './PathSelectionResultPanel.css';

interface PathSelectionResultPanelProps {
  result: PathSelectionResult | null;
  onClear?: () => void;
}

export const PathSelectionResultPanel: React.FC<PathSelectionResultPanelProps> = ({
  result,
  onClear
}) => {
  if (!result) {
    return (
      <div className="path-selection-result-panel">
        <div className="panel-header">
          <h3>Path Selection</h3>
          <div className="panel-subtitle">
            Click on edges in the graph to select a custom alignment path
          </div>
        </div>
        <div className="no-selection">
          <p>No path selected. Click on an edge to start building a path.</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log(`${type} copied to clipboard`);
    });
  };

  return (
    <div className="path-selection-result-panel">
      <div className="panel-header">
        <h3>Path Selection Result</h3>
        <div className="panel-actions">
          {onClear && (
            <button className="clear-button" onClick={onClear}>
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="result-stats">
        <div className="stat-item">
          <label>Path Length:</label>
          <span>{result.pathLength} edges</span>
        </div>
        <div className="stat-item">
          <label>Average Score:</label>
          <span>{result.score.toFixed(3)}</span>
        </div>
      </div>

      <div className="alignment-section">
        <h4>Generated Alignment</h4>
        
        <div className="sequence-display">
          <div className="sequence-row">
            <label>Representative:</label>
            <div className="sequence-text">
              <code>{result.alignedRepresentative}</code>
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(result.alignedRepresentative, 'Representative sequence')}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>
          
          <div className="sequence-row">
            <label>Member:</label>
            <div className="sequence-text">
              <code>{result.alignedMember}</code>
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(result.alignedMember, 'Member sequence')}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div className="alignment-actions">
          <button 
            className="copy-all-button"
            onClick={() => {
              const fullAlignment = `Representative: ${result.alignedRepresentative}\nMember:        ${result.alignedMember}\nScore:         ${result.score.toFixed(3)}\nPath Length:   ${result.pathLength}`;
              copyToClipboard(fullAlignment, 'Full alignment');
            }}
          >
            Copy Full Alignment
          </button>
        </div>
      </div>

      <div className="usage-info">
        <h4>Usage</h4>
        <ul>
          <li>The path automatically extends from the clicked edge following the highest probability connections</li>
          <li>Only movements to the right and/or down are allowed</li>
          <li>Diagonal moves (1,1) represent character alignments</li>
          <li>Horizontal moves represent gaps in the member sequence</li>
          <li>Vertical moves represent gaps in the representative sequence</li>
        </ul>
      </div>
    </div>
  );
};
