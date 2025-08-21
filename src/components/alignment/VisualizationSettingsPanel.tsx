import React from 'react';
import '../shared/Panel.css';
import './VisualizationSettingsPanel.css';

export interface VisualizationSettings {
  showAxes: boolean;
  showSequenceCharacters: boolean;
  showSequenceIndices: boolean;
  showGrid: boolean;
  showMinimap: boolean;
  showSafetyWindows: boolean;
  showAlignmentEdges: boolean;
  showAlignmentDots: boolean;
  showOptimalPath: boolean;
  enableSafetyWindowHighlighting: boolean;
  enableGapHighlighting: boolean;
  showAxisDescriptors: boolean;
  // NEW: Path selection
  enablePathSelection: boolean;
}

interface VisualizationSettingsPanelProps {
  settings: VisualizationSettings;
  onSettingsChange: (settings: VisualizationSettings) => void;
}

export const VisualizationSettingsPanel: React.FC<VisualizationSettingsPanelProps> = ({
  settings,
  onSettingsChange
}) => {
  const handleToggle = (key: keyof VisualizationSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const resetToDefaults = () => {
    onSettingsChange({
      showAxes: true,
      showSequenceCharacters: true,
      showSequenceIndices: true,
      showGrid: true,
      showMinimap: true,
      showSafetyWindows: true,
      showAlignmentEdges: true,
      showAlignmentDots: true,
      showOptimalPath: true,
      enableSafetyWindowHighlighting: true,
      enableGapHighlighting: true,
      showAxisDescriptors: true,
      enablePathSelection: true  // Enable by default for better UX
    });
  };

  return (
    <>
      <div className="panel-header">
        <h3>Visualization Settings</h3>
        <div className="panel-subtitle">
          Customize what elements are displayed on the alignment graph
        </div>
      </div>

      <div className="panel-content">
        <div className="panel-section">
          <h4 className="panel-section-title">Graph Elements</h4>
          <div className="panel-checkbox-group">
            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showAxes"
                checked={settings.showAxes}
                onChange={() => handleToggle('showAxes')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showAxes" className="panel-checkbox-label">
                <div>
                  <div>Show Axes</div>
                  <div className="panel-description">Display X and Y axis lines</div>
                </div>
              </label>
            </div>
            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showAxisDescriptors"
                checked={settings.showAxisDescriptors}
                onChange={() => handleToggle('showAxisDescriptors')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showAxisDescriptors" className="panel-checkbox-label">
                <div>
                  <div>Show Sequence Names</div>
                  <div className="panel-description">Display sequence identifiers as titles above and beside the graph</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showSequenceCharacters"
                checked={settings.showSequenceCharacters}
                onChange={() => handleToggle('showSequenceCharacters')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showSequenceCharacters" className="panel-checkbox-label">
                <div>
                  <div>Show Sequence Characters</div>
                  <div className="panel-description">Display amino acid letters (A, C, G, T, etc.) along graph edges</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showSequenceIndices"
                checked={settings.showSequenceIndices}
                onChange={() => handleToggle('showSequenceIndices')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showSequenceIndices" className="panel-checkbox-label">
                <div>
                  <div>Show Position Numbers</div>
                  <div className="panel-description">Display numerical position markers (1, 2, 3, etc.) along graph edges</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showGrid"
                checked={settings.showGrid}
                onChange={() => handleToggle('showGrid')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showGrid" className="panel-checkbox-label">
                <div>
                  <div>Show Background Grid</div>
                  <div className="panel-description">Display light grid lines behind the graph for easier navigation</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-section-title">Navigation</h4>
          <div className="panel-checkbox-group">
            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showMinimap"
                checked={settings.showMinimap}
                onChange={() => handleToggle('showMinimap')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showMinimap" className="panel-checkbox-label">
                <div>
                  <div>Show Minimap</div>
                  <div className="panel-description">Display overview minimap in top-right corner</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-section-title">Alignment Data</h4>
          <div className="panel-checkbox-group">
            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showSafetyWindows"
                checked={settings.showSafetyWindows}
                onChange={() => handleToggle('showSafetyWindows')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showSafetyWindows" className="panel-checkbox-label">
                <div>
                  <div>Show Confidence Regions</div>
                  <div className="panel-description">Display green brackets marking high-confidence alignment areas</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showAlignmentEdges"
                checked={settings.showAlignmentEdges}
                onChange={() => handleToggle('showAlignmentEdges')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showAlignmentEdges" className="panel-checkbox-label">
                <div>
                  <div>Show Alignment Connections</div>
                  <div className="panel-description">Display colored lines connecting aligned sequence positions</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showAlignmentDots"
                checked={settings.showAlignmentDots}
                onChange={() => handleToggle('showAlignmentDots')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showAlignmentDots" className="panel-checkbox-label">
                <div>
                  <div>Show Start/End Points</div>
                  <div className="panel-description">Display circular markers at alignment connection endpoints</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showOptimalPath"
                checked={settings.showOptimalPath}
                onChange={() => handleToggle('showOptimalPath')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showOptimalPath" className="panel-checkbox-label">
                <div>
                  <div>Show Best Alignment Path</div>
                  <div className="panel-description">Display the highlighted blue line showing optimal sequence alignment</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <button 
            className="panel-button panel-button--secondary"
            onClick={resetToDefaults}
            title="Reset all settings to default values"
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      <div className="panel-footer">
        <div className="help-text">
          Toggle individual elements to customize the visualization. Changes are applied immediately to the graph.
        </div>
      </div>
    </>
  );
};

export default VisualizationSettingsPanel;
