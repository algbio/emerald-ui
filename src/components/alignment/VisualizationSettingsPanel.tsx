import React from 'react';
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
      enableGapHighlighting: true
    });
  };

  return (
    <div className="visualization-settings-panel">
      <div className="panel-header">
        <h3>Visualization Settings</h3>
        <div className="panel-subtitle">
          Customize what elements are displayed on the alignment graph
        </div>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h4>Graph Elements</h4>
          <div className="setting-group">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showAxes}
                  onChange={() => handleToggle('showAxes')}
                />
                <span className="checkmark"></span>
                Show Axes
              </label>
              <p className="setting-description">Display X and Y axis lines</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showAxisLabels}
                  onChange={() => handleToggle('showAxisLabels')}
                />
                <span className="checkmark"></span>
                Show Axis Labels
              </label>
              <p className="setting-description">Display sequence characters and position indices</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={() => handleToggle('showGrid')}
                />
                <span className="checkmark"></span>
                Show Grid
              </label>
              <p className="setting-description">Display background grid lines for easier reading</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>Navigation</h4>
          <div className="setting-group">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showMinimap}
                  onChange={() => handleToggle('showMinimap')}
                />
                <span className="checkmark"></span>
                Show Minimap
              </label>
              <p className="setting-description">Display overview minimap in top-right corner</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>Alignment Data</h4>
          <div className="setting-group">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showSafetyWindows}
                  onChange={() => handleToggle('showSafetyWindows')}
                />
                <span className="checkmark"></span>
                Show Safety Windows
              </label>
              <p className="setting-description">Display green bracket indicators for confident alignment regions</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showAlignmentEdges}
                  onChange={() => handleToggle('showAlignmentEdges')}
                />
                <span className="checkmark"></span>
                Show Alignment Edges
              </label>
              <p className="setting-description">Display probability-weighted connection lines</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showAlignmentDots}
                  onChange={() => handleToggle('showAlignmentDots')}
                />
                <span className="checkmark"></span>
                Show Alignment Dots
              </label>
              <p className="setting-description">Display start and end point markers</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showOptimalPath}
                  onChange={() => handleToggle('showOptimalPath')}
                />
                <span className="checkmark"></span>
                Show Optimal Path
              </label>
              <p className="setting-description">Display the blue optimal alignment path</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>Interactive Highlighting</h4>
          <div className="setting-group">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.enableSafetyWindowHighlighting}
                  onChange={() => handleToggle('enableSafetyWindowHighlighting')}
                />
                <span className="checkmark"></span>
                Enable Safety Window Highlighting
              </label>
              <p className="setting-description">Allow safety windows to be highlighted when selected or hovered</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.enableGapHighlighting}
                  onChange={() => handleToggle('enableGapHighlighting')}
                />
                <span className="checkmark"></span>
                Enable Gap Highlighting
              </label>
              <p className="setting-description">Allow gap regions to be highlighted during gap analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="reset-button"
          onClick={resetToDefaults}
          title="Reset all settings to default values"
        >
          🔄 Reset to Defaults
        </button>
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
