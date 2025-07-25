import React, { useState } from 'react';
import ShareUrlPanel from './ShareUrlPanel';
import ExportImagePanel from './ExportImagePanel';
import type { PointGridPlotRef } from '../alignment/PointGridPlot';
import './ShareAndExportPanel.css';

interface ShareAndExportPanelProps {
  // Props for ShareUrlPanel
  descriptorA: string;
  descriptorB: string;
  alpha: number;
  delta: number;
  accessionA?: string;
  accessionB?: string;
  // Props for ExportImagePanel
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pointGridRef?: React.RefObject<PointGridPlotRef | null>;
}

const ShareAndExportPanel: React.FC<ShareAndExportPanelProps> = ({
  descriptorA,
  descriptorB,
  alpha,
  delta,
  accessionA,
  accessionB,
  canvasRef,
  pointGridRef
}) => {
  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [isShareExpanded, setIsShareExpanded] = useState(false);

  return (
    <div className="share-and-export-panel">
      <div className="panel-section export-section">
        <div className="collapsible-section">
          <button 
            className="section-header"
            onClick={() => setIsExportExpanded(!isExportExpanded)}
            aria-expanded={isExportExpanded}
          >
            <span className="section-title">📷 Export Image</span>
            <span className={`section-toggle ${isExportExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          <div className={`section-content ${isExportExpanded ? 'expanded' : 'collapsed'}`}>
            <ExportImagePanel
              canvasRef={canvasRef}
              pointGridRef={pointGridRef}
              descriptorA={descriptorA}
              descriptorB={descriptorB}
            />
          </div>
        </div>
      </div>
      <div className="panel-section share-section">
        <div className="collapsible-section">
          <button 
            className="section-header"
            onClick={() => setIsShareExpanded(!isShareExpanded)}
            aria-expanded={isShareExpanded}
          >
            <span className="section-title">🔗 Share This Alignment</span>
            <span className={`section-toggle ${isShareExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          <div className={`section-content ${isShareExpanded ? 'expanded' : 'collapsed'}`}>
            <ShareUrlPanel
              descriptorA={descriptorA}
              descriptorB={descriptorB}
              alpha={alpha}
              delta={delta}
              accessionA={accessionA}
              accessionB={accessionB}
            />
          </div>
        </div>
      </div>
      
      
    </div>
  );
};

export default ShareAndExportPanel;
