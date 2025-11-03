import React from 'react';
import './SafetyHeatmap.css';

interface SafetyWindow {
  start: number;
  end: number;
}

interface ClusterAlignment {
  memberName: string;
  safetyWindows: SafetyWindow[];
}

interface SafetyHeatmapProps {
  representativeSequence: string;
  representativeName: string;
  alignmentResults: ClusterAlignment[];
}

const SafetyHeatmap: React.FC<SafetyHeatmapProps> = ({
  representativeSequence,
  representativeName,
  alignmentResults
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<number | null>(null);
  const sequenceLength = representativeSequence.length;
  const totalAlignments = alignmentResults.length;

  // Calculate coverage for each position in the sequence
  const calculateCoverage = (): number[] => {
    const coverage = new Array(sequenceLength).fill(0);
    
    alignmentResults.forEach(result => {
      result.safetyWindows.forEach(window => {
        for (let i = window.start; i <= window.end && i < sequenceLength; i++) {
          coverage[i]++;
        }
      });
    });
    
    return coverage;
  };

  const coverage = calculateCoverage();
  const maxCoverage = Math.max(...coverage, 1); // Avoid division by zero

  // Get color based on coverage intensity
  const getColor = (count: number): string => {
    if (count === 0) return '#f0f0f0'; // Light gray for no coverage
    const intensity = count / maxCoverage;
    // Green gradient from light to dark
    const lightness = 90 - (intensity * 50); // 90% to 40%
    return `hsl(140, 70%, ${lightness}%)`;
  };

  // Get tooltip text
  const getTooltip = (position: number, aminoAcid: string, count: number): string => {
    if (count === 0) {
      return `Position ${position}: ${aminoAcid}\nNot covered by any safety window`;
    }
    const percentage = ((count / totalAlignments) * 100).toFixed(1);
    return `Position ${position}: ${aminoAcid}\nCovered in ${count}/${totalAlignments} alignments (${percentage}%)`;
  };

  // Handle cell click for selection
  const handleCellClick = (position: number) => {
    if (selectionStart === null) {
      // First click - set start
      setSelectionStart(position);
      setSelectionEnd(null);
    } else if (selectionEnd === null) {
      // Second click - set end
      if (position >= selectionStart) {
        setSelectionEnd(position);
      } else {
        // If clicked before start, swap them
        setSelectionEnd(selectionStart);
        setSelectionStart(position);
      }
    } else {
      // Third click - reset and start new selection
      setSelectionStart(position);
      setSelectionEnd(null);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Check if position is in selected range
  const isInSelection = (position: number): boolean => {
    if (selectionStart === null) return false;
    if (selectionEnd === null) return position === selectionStart;
    return position >= selectionStart && position <= selectionEnd;
  };

  // Get proteins with safety windows in selected region
  const getProteinsInSelection = (): ClusterAlignment[] => {
    if (selectionStart === null || selectionEnd === null) return [];
    
    return alignmentResults.filter(result => {
      return result.safetyWindows.some(window => {
        // Check if window overlaps with selection
        return !(window.end < selectionStart || window.start > selectionEnd);
      });
    });
  };

  // Copy selected sequence to clipboard
  const copySelectedSequence = () => {
    if (selectionStart === null || selectionEnd === null) return;
    
    const selectedSequence = representativeSequence.substring(selectionStart, selectionEnd + 1);
    navigator.clipboard.writeText(selectedSequence).then(() => {
      alert(`Copied: ${selectedSequence}\nPositions: ${selectionStart}-${selectionEnd}`);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const proteinsInSelection = getProteinsInSelection();

  return (
    <div className="safety-heatmap">
      <div className="heatmap-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Safety Coverage Heatmap</h3>
            <p className="heatmap-description">
              Visual representation of safety window coverage across the representative sequence.
              Darker green indicates positions covered by more alignments.
              {!isExpanded && ' Scroll horizontally to view the entire sequence.'}
              {' '}<strong>Tip:</strong> Click positions to select a range and see which proteins have safety windows there.
            </p>
          </div>
          <button 
            className="expand-toggle-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Switch to scroll view' : 'Expand to see full sequence'}
          >
            {isExpanded ? (
              <>
                <span className="toggle-icon">⇄</span>
                <span className="toggle-text">Scroll View</span>
              </>
            ) : (
              <>
                <span className="toggle-icon">⇅</span>
                <span className="toggle-text">Expand All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selection Info Panel */}
      {(selectionStart !== null || selectionEnd !== null) && (
        <div className="selection-panel">
          <div className="selection-header">
            <h4>
              {selectionEnd === null ? 'Select End Position' : 'Selected Region'}
            </h4>
            <button className="clear-selection-btn" onClick={clearSelection}>
              ✕ Clear
            </button>
          </div>
          
          {selectionEnd !== null && (
            <>
              <div className="selection-info">
                <div className="selection-detail">
                  <strong>Range:</strong> {selectionStart} - {selectionEnd}
                </div>
                <div className="selection-detail">
                  <strong>Length:</strong> {selectionEnd - selectionStart! + 1} amino acids
                </div>
                <div className="selection-detail">
                  <strong>Sequence:</strong>{' '}
                  <code className="selected-sequence">
                    {representativeSequence.substring(selectionStart!, selectionEnd + 1)}
                  </code>
                </div>
                <button className="copy-btn" onClick={copySelectedSequence}>
                  📋 Copy Sequence
                </button>
              </div>

              <div className="proteins-in-selection">
                <h5>Proteins with Safety Windows in This Region:</h5>
                {proteinsInSelection.length > 0 ? (
                  <ul className="protein-list">
                    {proteinsInSelection.map((result, idx) => {
                      const overlappingWindows = result.safetyWindows.filter(window => 
                        !(window.end < selectionStart! || window.start > selectionEnd!)
                      );
                      return (
                        <li key={idx} className="protein-item">
                          <strong>{result.memberName}</strong>
                          <span className="window-count">
                            ({overlappingWindows.length} window{overlappingWindows.length !== 1 ? 's' : ''})
                          </span>
                          <div className="window-details">
                            {overlappingWindows.map((window, wIdx) => (
                              <span key={wIdx} className="window-range">
                                [{window.start}-{window.end}]
                              </span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="no-proteins">No proteins have safety windows in this region.</p>
                )}
              </div>
            </>
          )}
          
          {selectionEnd === null && (
            <p className="selection-instruction">
              Click another position to complete your selection.
            </p>
          )}
        </div>
      )}

      <div className="heatmap-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f0f0f0' }}></div>
          <span>No coverage</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 75%)' }}></div>
          <span>Low</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 55%)' }}></div>
          <span>Medium</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'hsl(140, 70%, 40%)' }}></div>
          <span>High</span>
        </div>
      </div>

      <div className="sequence-visualization">
        <div className="sequence-header">
          <span className="cluster-sequence-name">{representativeName}</span>
          <span className="sequence-length">{sequenceLength} amino acids</span>
        </div>

        <div className={`heatmap-scroll-container ${isExpanded ? 'expanded' : ''}`}>
          {!isExpanded && (
            <div className="position-labels">
              {Array.from({ length: Math.ceil(sequenceLength / 10) }).map((_, i) => (
                <div key={i} className="position-marker" style={{ left: `${i * 10 * 63}px` }}>
                  {i * 10}
                </div>
              ))}
            </div>
          )}
          
          <div className="heatmap-grid">
            <div className={`amino-acid-row ${isExpanded ? 'wrapped' : ''}`}>
              {Array.from({ length: sequenceLength }).map((_, position) => {
                const aminoAcid = representativeSequence[position];
                const count = coverage[position];
                const inSelection = isInSelection(position);
                const isStartPoint = position === selectionStart;
                const isEndPoint = position === selectionEnd;
                
                return (
                  <div
                    key={position}
                    className={`amino-acid-cell ${inSelection ? 'selected' : ''} ${isStartPoint ? 'selection-start' : ''} ${isEndPoint ? 'selection-end' : ''}`}
                    style={{ backgroundColor: inSelection ? '#ffc107' : getColor(count) }}
                    title={getTooltip(position, aminoAcid, count)}
                    onClick={() => handleCellClick(position)}
                  >
                    <span className="amino-acid">{aminoAcid}</span>
                    <span className="position-number">{position}</span>
                    {isExpanded && position % 10 === 0 && (
                      <span className="inline-position-marker">{position}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="coverage-stats">
        <div className="stat-item">
          <strong>Total Positions:</strong> {sequenceLength}
        </div>
        <div className="stat-item">
          <strong>Covered Positions:</strong> {coverage.filter(c => c > 0).length} ({((coverage.filter(c => c > 0).length / sequenceLength) * 100).toFixed(1)}%)
        </div>
        <div className="stat-item">
          <strong>Uncovered Positions:</strong> {coverage.filter(c => c === 0).length}
        </div>
        <div className="stat-item">
          <strong>Max Coverage:</strong> {maxCoverage} alignment{maxCoverage !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default SafetyHeatmap;
