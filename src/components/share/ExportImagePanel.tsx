import React, { useState, useEffect } from 'react';
import { exportCanvasAsPNG, exportCanvasAsJPEG, exportCanvasAsPNGHighRes, exportCanvasAsJPEGHighRes, copyCanvasToClipboard, generateExportFilename } from '../../utils/export/exportUtils';
import { exportCanvasAsSVG, generateSVGFilename } from '../../utils/export/svgUtils';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import type { PointGridPlotRef } from '../alignment/PointGridPlot';
import '../shared/Panel.css';
import './ExportImagePanel.css';

interface ExportImagePanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pointGridRef?: React.RefObject<PointGridPlotRef | null>;
  descriptorA?: string;
  descriptorB?: string;
}

const ExportImagePanel: React.FC<ExportImagePanelProps> = ({
  canvasRef,
  pointGridRef,
  descriptorA,
  descriptorB
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg' | 'svg'>('png');
  const [quality, setQuality] = useState(0.9);
  const [resolutionScale, setResolutionScale] = useState(1);
  const [canvasIsFullyReady, setCanvasIsFullyReady] = useState(false);
  
  // Feedback notifications
  const { notifySuccess, notifyError, notifyInfo, notifyDownloadStarted, notifyCopySuccess } = useFeedbackNotifications();

  // Check if the canvas is fully ready for export
  useEffect(() => {
    // Function to check and update canvas readiness
    const checkCanvasReadiness = () => {
      const status = checkCanvasStatus();
      setCanvasIsFullyReady(status.ready);
      
      // If not ready yet, check again after a short delay
      if (!status.ready) {
        setTimeout(checkCanvasReadiness, 500);
      }
    };
    
    checkCanvasReadiness();
    
    // Clean up on unmount
    return () => {
      // No need for cleanup in this case
    };
  }, [canvasRef]); // Re-run if canvasRef changes

  const clearMessages = () => {
    setExportSuccess(null);
    setExportError(null);
  };

  const showTemporaryMessage = (message: string, isError: boolean = false) => {
    if (isError) {
      setExportError(message);
      setTimeout(() => setExportError(null), 5000);
    } else {
      setExportSuccess(message);
      setTimeout(() => setExportSuccess(null), 3000);
    }
  };

  // Helper function to check if canvas is ready for export and get details
  const checkCanvasStatus = () => {
    if (!canvasRef.current) {
      return { ready: false, reason: 'Canvas reference is null or undefined' };
    }

    if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
      return { ready: false, reason: `Canvas has invalid dimensions: ${canvasRef.current.width}x${canvasRef.current.height}` };
    }

    const testContext = canvasRef.current.getContext('2d');
    if (!testContext) {
      return { ready: false, reason: 'Unable to get canvas rendering context' };
    }
    
    // Attempt to verify the canvas is actually ready for export
    try {
      const testDataUrl = canvasRef.current.toDataURL('image/png', 0.1);
      if (!testDataUrl || !testDataUrl.startsWith('data:image/png')) {
        return { ready: false, reason: 'Canvas is not ready for export operations' };
      }
    } catch (e) {
      return { ready: false, reason: 'Canvas export test failed: ' + (e instanceof Error ? e.message : 'Unknown error') };
    }

    return { ready: true, reason: 'Canvas is ready' };
  };

  const handleExportImage = async () => {
    // Check if canvas reference exists
    const canvasStatus = checkCanvasStatus();
    if (!canvasStatus.ready) {
      showTemporaryMessage(`Graph not ready for export. ${canvasStatus.reason}`, true);
      notifyError('Export Failed', `Graph not ready for export: ${canvasStatus.reason}`);
      return;
    }

    setIsExporting(true);
    clearMessages();
    
    // Notify user that export is starting
    notifyInfo('Starting Export', `Preparing to export graph as ${selectedFormat.toUpperCase()}`);

    try {
      // We've already checked that canvas exists and is ready in checkCanvasStatus
      const canvas = canvasRef.current!;
      
      if (selectedFormat === 'svg') {
        // Get export data on-demand from PointGridPlot ref
        if (!pointGridRef?.current) {
          const errorMsg = 'SVG export not available: Point grid reference is missing.';
          showTemporaryMessage(errorMsg, true);
          notifyError('SVG Export Failed', errorMsg);
          return;
        }

        const exportData = pointGridRef.current.getExportData();
        const filename = generateSVGFilename(descriptorA, descriptorB);
        
        exportCanvasAsSVG(
          canvas,
          exportData.alignments,
          exportData.representative,
          exportData.member,
          exportData.xTicks,
          exportData.yTicks,
          exportData.transform,
          exportData.visualizationSettings,
          filename,
          exportData.representativeDescriptor || descriptorA,
          exportData.memberDescriptor || descriptorB
        );
        
        const successMsg = `Graph exported as ${filename}`;
        showTemporaryMessage(successMsg);
        notifyDownloadStarted(filename);
        notifySuccess('SVG Export Complete', 'Vector graphic saved successfully');
      } else {
        // Handle raster export (PNG/JPEG)
        const filename = generateExportFilename(descriptorA, descriptorB, selectedFormat);
        const exportWidth = Math.floor(canvas.width * resolutionScale);
        const exportHeight = Math.floor(canvas.height * resolutionScale);
        
        // Use high-resolution re-rendering if pointGridRef is available and scale > 1
        let exportCanvas: HTMLCanvasElement = canvas;
        if (resolutionScale > 1 && pointGridRef?.current?.renderHighResCanvas) {
          const highResCanvas = pointGridRef.current.renderHighResCanvas(resolutionScale);
          if (highResCanvas) {
            exportCanvas = highResCanvas;
          } else {
            console.warn('High-res rendering not available, falling back to scaled export');
          }
        }
        
        if (selectedFormat === 'png') {
          // If we got a high-res canvas, export it directly; otherwise use the old scaling method
          if (exportCanvas !== canvas) {
            exportCanvasAsPNG(exportCanvas, filename, 1.0);
          } else {
            exportCanvasAsPNGHighRes(canvas, filename, resolutionScale);
          }
        } else {
          if (exportCanvas !== canvas) {
            exportCanvasAsJPEG(exportCanvas, filename, quality);
          } else {
            exportCanvasAsJPEGHighRes(canvas, filename, quality, resolutionScale);
          }
        }
        
        // Include resolution info in success message
        const resolutionInfo = resolutionScale > 1 ? ` at ${exportWidth}×${exportHeight}px (${resolutionScale}×)` : '';
        
        const successMsg = `Graph exported as ${filename}${resolutionInfo}`;
        showTemporaryMessage(successMsg);
        notifyDownloadStarted(filename);
        notifySuccess(`${selectedFormat.toUpperCase()} Export Complete`, `Image saved successfully${resolutionInfo}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      
      // Special handling for security error (tainted canvas)
      if (error instanceof DOMException && error.name === 'SecurityError') {
        const errorMsg = 'Cannot export image: The canvas contains content from external sources that cannot be exported securely. This is a browser security restriction.';
        showTemporaryMessage(errorMsg, true);
        notifyError('Export Security Error', 'Canvas security restriction prevents export');
      } else {
        // Provide detailed error message to help debugging
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown export error. Check browser console for details.';
          
        showTemporaryMessage(errorMessage, true);
        notifyError('Export Failed', `Export error: ${errorMessage}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    // Check if canvas reference exists
    if (!canvasRef.current) {
      const errorMsg = 'Graph not ready for copying. The canvas element is not available.';
      showTemporaryMessage(errorMsg, true);
      notifyError('Copy Failed', errorMsg);
      return;
    }

    // Check if canvas has valid dimensions
    if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
      const errorMsg = 'Cannot copy image: The graph canvas has zero dimensions.';
      showTemporaryMessage(errorMsg, true);
      notifyError('Copy Failed', errorMsg);
      return;
    }

    // Check if the canvas context is available
    const testContext = canvasRef.current.getContext('2d');
    if (!testContext) {
      const errorMsg = 'Cannot copy image: Unable to get canvas rendering context.';
      showTemporaryMessage(errorMsg, true);
      notifyError('Copy Failed', errorMsg);
      return;
    }
    
    // Check if Clipboard API is supported
    if (!navigator.clipboard) {
      const errorMsg = 'Cannot copy image: Your browser does not support the Clipboard API.';
      showTemporaryMessage(errorMsg, true);
      notifyError('Copy Failed', 'Clipboard API not supported');
      return;
    }

    setIsExporting(true);
    clearMessages();
    notifyInfo('Copying to Clipboard', 'Preparing to copy graph image...');

    try {
      // Test that the canvas can be exported by getting a small data URL
      try {
        const testDataUrl = canvasRef.current.toDataURL('image/png', 0.1);
        if (!testDataUrl || !testDataUrl.startsWith('data:image/png')) {
          throw new Error('Canvas export test failed');
        }
        
        await copyCanvasToClipboard(canvasRef.current);
        const successMsg = "Graph copied to clipboard!";
        showTemporaryMessage(successMsg);
        notifyCopySuccess('Graph image');
      } catch (exportError) {
        // Special handling for security error (tainted canvas)
        if (exportError instanceof DOMException && exportError.name === 'SecurityError') {
          throw new Error('Cannot copy image: The canvas contains content from external sources that cannot be exported securely. This is a browser security restriction.');
        } else {
          throw exportError;
        }
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      
      // More detailed error messages for specific clipboard errors
      let errorMessage: string;
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Clipboard access was denied. You may need to grant clipboard permission to this site.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Your browser doesn\'t support copying this type of content to the clipboard.';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = 'Unknown clipboard error. Check browser console for details.';
      }
      
      showTemporaryMessage(errorMessage, true);
      notifyError('Copy Failed', errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  // Basic check if canvas reference exists
  const isCanvasReady = canvasRef.current !== null;
  
  // More detailed check for diagnostic purposes
  const canvasHasValidDimensions = canvasRef.current && 
                                  canvasRef.current.width > 0 && 
                                  canvasRef.current.height > 0;
  
  // Get the reason why the canvas isn't ready (for diagnostics)
  const canvasNotReadyReason = !canvasRef.current ? 
                             "Canvas reference is null" : 
                             (!canvasHasValidDimensions ? 
                             `Canvas has invalid dimensions: ${canvasRef.current.width}×${canvasRef.current.height}` : 
                             "Canvas is ready");

  return (
    <div className="panel panel--compact panel--wide">
      <div className="panel-header panel-header--compact">
        <h3>📷 Export Image</h3>
        <p className="panel-subtitle">Download the alignment graph as an image file</p>
      </div>
      
      {!canvasIsFullyReady ? (
        <div className="panel-loading">
          <p>⏳ Preparing export controls...</p>
          <p className="panel-loading-message">The graph is being prepared for export. This will be available shortly.</p>
        </div>
      ) : (
        <div className="panel-form-group">
          <div className="panel-form-item">
            <label htmlFor="format-select" className="panel-label">Format:</label>
            <select 
              id="format-select"
              value={selectedFormat} 
              onChange={(e) => setSelectedFormat(e.target.value as 'png' | 'jpeg' | 'svg')}
              className="panel-select"
            >
              <option value="png">PNG (Lossless)</option>
              <option value="jpeg">JPEG (Smaller file)</option>
              <option value="svg">SVG (Vector - Scalable)</option>
            </select>
          </div>

          {selectedFormat === 'jpeg' && (
            <div className="panel-form-item">
              <label htmlFor="quality-range" className="panel-label">Quality: {Math.round(quality * 100)}%</label>
              <input
                id="quality-range"
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="panel-input"
              />
            </div>
          )}

          {(selectedFormat === 'png' || selectedFormat === 'jpeg') && (
            <div className="panel-form-item">
              <label htmlFor="resolution-range" className="panel-label">
                Resolution: {resolutionScale}× 
                {canvasRef.current && (
                  <span className="panel-label-hint">
                    ({Math.floor(canvasRef.current.width * resolutionScale)} × {Math.floor(canvasRef.current.height * resolutionScale)} px)
                  </span>
                )}
              </label>
              <input
                id="resolution-range"
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={resolutionScale}
                onChange={(e) => setResolutionScale(parseFloat(e.target.value))}
                className="panel-input"
              />
              <div className="panel-hint">
                Graph is re-rendered at higher resolution for sharp output. Use 2× or higher for print quality.
              </div>
            </div>
          )}

          <div className="panel-display-group">
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className={`panel-button ${isExporting ? '' : ''}`}
              title="Download image file"
            >
              {isExporting ? '⏳ Exporting...' : '💾 Download'}
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className={`panel-button panel-button--secondary ${isExporting ? '' : ''}`}
              title="Copy to clipboard"
            >
              {isExporting ? '⏳ Copying...' : '📋 Copy'}
            </button>
          </div>

          {exportSuccess && (
            <div className="panel-info">
              ✅ {exportSuccess}
            </div>
          )}

          {exportError && (
            <div className="panel-error">
              ⚠️ {exportError}
            </div>
          )}

          <div className="panel-info">
            <p>Export options:</p>
            <ul>
              <li><strong>PNG:</strong> High quality raster image, larger file size</li>
              <li><strong>JPEG:</strong> Compressed raster image, smaller file size, adjustable quality</li>
              <li><strong>SVG:</strong> Vector image that scales perfectly at any zoom level</li>
              <li><strong>Resolution:</strong> Use 2×-4× for print quality or high-DPI displays</li>
              <li><strong>Copy:</strong> Copy image directly to clipboard (PNG format)</li>
              <li><strong>Highlighted Windows:</strong> Safety window highlights are included in exports</li>
            </ul>
            
            {/* Canvas status information */}
            <details>
              <summary>Export Diagnostics</summary>
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <p><strong>Canvas Reference:</strong> {canvasRef.current ? '✅ Available' : '❌ Missing'}</p>
                <p><strong>Canvas Status:</strong> {isCanvasReady ? '✅ Ready' : '❌ Not Ready'}</p>
                <p><strong>Export Ready:</strong> {canvasIsFullyReady ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Buttons Enabled:</strong> {!isExporting && isCanvasReady ? '✅ Yes' : '❌ No'}</p>
                {canvasRef.current && (
                  <>
                    <p><strong>Dimensions:</strong> {canvasRef.current.width} × {canvasRef.current.height} px 
                      {(canvasRef.current.width <= 0 || canvasRef.current.height <= 0) ? ' ⚠️' : ''}</p>
                    <p><strong>Context Available:</strong> {canvasRef.current.getContext('2d') ? '✅ Yes' : '❌ No'}</p>
                  </>
                )}
                <p><strong>Issue:</strong> {canvasNotReadyReason}</p>
                <p><strong>Canvas Status Details:</strong> {JSON.stringify(checkCanvasStatus())}</p>
                
                {/* Emergency troubleshooting button that bypasses normal checks */}
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                  <p><strong>Troubleshooting:</strong></p>
                  <button
                    onClick={() => {
                      if (canvasRef.current) {
                        try {
                          const dataUrl = canvasRef.current.toDataURL('image/png');
                          const link = document.createElement('a');
                          link.download = 'emergency-export.png';
                          link.href = dataUrl;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showTemporaryMessage('Emergency export attempted!');
                        } catch (error) {
                          showTemporaryMessage(`Emergency export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
                        }
                      } else {
                        showTemporaryMessage('No canvas reference available for emergency export', true);
                      }
                    }}
                    className="panel-button panel-button--secondary"
                    title="Attempt emergency export bypassing normal checks"
                  >
                    Force Export (Troubleshooting)
                  </button>
                </div>
                <p><em>If you're having issues exporting, try reloading the page or using a different browser.</em></p>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportImagePanel;
