import React from 'react';
import '../shared/Panel.css';
import './VisualizationSettingsPanel.css';

export interface VisualizationSettings {
  showAxes: boolean;
  showAxisLabels: boolean;
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
      showAxisLabels: true,
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
    <div className="panel">
      <div className="panel-header panel-header--large">
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
                  <div>Show Axis Descriptors</div>
                  <div className="panel-description">Display sequence names/IDs as axis titles for clarity</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="showAxisLabels"
                checked={settings.showAxisLabels}
                onChange={() => handleToggle('showAxisLabels')}
                className="panel-checkbox-input"
              />
              <label htmlFor="showAxisLabels" className="panel-checkbox-label">
                <div>
                  <div>Show Axis Labels</div>
                  <div className="panel-description">Display sequence characters and position indices</div>
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
                  <div>Show Grid</div>
                  <div className="panel-description">Display background grid lines for easier reading</div>
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
                  <div>Show Safety Windows</div>
                  <div className="panel-description">Display green bracket indicators for confident alignment regions</div>
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
                  <div>Show Alignment Edges</div>
                  <div className="panel-description">Display probability-weighted connection lines</div>
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
                  <div>Show Alignment Dots</div>
                  <div className="panel-description">Display start and end point markers</div>
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
                  <div>Show Optimal Path</div>
                  <div className="panel-description">Display the blue optimal alignment path</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-section-title">Interactive Highlighting</h4>
          <div className="panel-checkbox-group">
            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="enableSafetyWindowHighlighting"
                checked={settings.enableSafetyWindowHighlighting}
                onChange={() => handleToggle('enableSafetyWindowHighlighting')}
                className="panel-checkbox-input"
              />
              <label htmlFor="enableSafetyWindowHighlighting" className="panel-checkbox-label">
                <div>
                  <div>Enable Safety Window Highlighting</div>
                  <div className="panel-description">Allow safety windows to be highlighted when selected or hovered</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="enableGapHighlighting"
                checked={settings.enableGapHighlighting}
                onChange={() => handleToggle('enableGapHighlighting')}
                className="panel-checkbox-input"
              />
              <label htmlFor="enableGapHighlighting" className="panel-checkbox-label">
                <div>
                  <div>Enable Gap Highlighting</div>
                  <div className="panel-description">Allow gap regions to be highlighted during gap analysis</div>
                </div>
              </label>
            </div>

            <div className="panel-checkbox-item">
              <input
                type="checkbox"
                id="enablePathSelection"
                checked={settings.enablePathSelection}
                onChange={() => handleToggle('enablePathSelection')}
                className="panel-checkbox-input"
              />
              <label htmlFor="enablePathSelection" className="panel-checkbox-label">
                <div>
                  <div>Enable Path Selection</div>
                  <div className="panel-description">Click on edges to select custom alignment paths and generate alignments</div>
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
          Toggle individual elements to customize the visualization. Use highlighting controls to enable/disable interactive selections. Changes are applied immediately to the graph.
        </div>
      </div>
    </div>
  );
};

export default VisualizationSettingsPanel;
