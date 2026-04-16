import React, { useState, useEffect } from 'react';
import { exportCanvasAsPNG, exportCanvasAsJPEG, exportCanvasAsPNGHighRes, exportCanvasAsJPEGHighRes, generateExportFilename } from '../../utils/export/exportUtils';
import { exportCanvasAsPDF, exportCanvasAsSVG, generateSVGFilename } from '../../utils/export/svgUtils';
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
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg' | 'svg' | 'pdf'>('png');
  const [quality, setQuality] = useState(0.9);
  const [resolutionScale, setResolutionScale] = useState(1);
  const [canvasIsFullyReady, setCanvasIsFullyReady] = useState(false);
  
  // Feedback notifications
  const { notifySuccess, notifyError, notifyInfo, notifyDownloadStarted } = useFeedbackNotifications();

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
      
      if (selectedFormat === 'svg' || selectedFormat === 'pdf') {
        // Get export data on-demand from PointGridPlot ref
        if (!pointGridRef?.current) {
          const errorMsg = `${selectedFormat.toUpperCase()} export not available: Point grid reference is missing.`;
          showTemporaryMessage(errorMsg, true);
          notifyError(`${selectedFormat.toUpperCase()} Export Failed`, errorMsg);
          return;
        }

        const exportData = pointGridRef.current.getExportData();
        
        if (selectedFormat === 'svg') {
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
            exportData.exportState,
            exportData.layout,
            filename,
            exportData.representativeDescriptor || descriptorA,
            exportData.memberDescriptor || descriptorB
          );
          
          const successMsg = `Graph exported as ${filename}`;
          showTemporaryMessage(successMsg);
          notifyDownloadStarted(filename);
          notifySuccess('SVG Export Complete', 'Vector graphic saved successfully');
        } else if (selectedFormat === 'pdf') {
          const filename = generateExportFilename(descriptorA, descriptorB, 'pdf');
          await exportCanvasAsPDF(
            canvas,
            exportData.alignments,
            exportData.representative,
            exportData.member,
            exportData.xTicks,
            exportData.yTicks,
            exportData.transform,
            exportData.visualizationSettings,
            exportData.exportState,
            exportData.layout,
            filename,
            exportData.representativeDescriptor || descriptorA,
            exportData.memberDescriptor || descriptorB
          );

          const successMsg = `Graph exported as ${filename}`;
          showTemporaryMessage(successMsg);
          notifyDownloadStarted(filename);
          notifySuccess('PDF Export Complete', 'Vector PDF saved successfully');
        }
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
              onChange={(e) => setSelectedFormat(e.target.value as 'png' | 'jpeg' | 'svg' | 'pdf')}
              className="panel-select"
            >
              <option value="png">PNG (Lossless)</option>
              <option value="jpeg">JPEG (Smaller file)</option>
              <option value="svg">SVG (Image: Vector - Scalable)</option>
              <option value="pdf">PDF (Document: Vector - Scalable)</option>
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
        </div>
      )}
    </div>
  );
};

export default ExportImagePanel;
