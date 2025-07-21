import React from 'react';
import ShareUrlPanel from './ShareUrlPanel';
import ExportImagePanel from './ExportImagePanel';
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
}

const ShareAndExportPanel: React.FC<ShareAndExportPanelProps> = ({
  descriptorA,
  descriptorB,
  alpha,
  delta,
  accessionA,
  accessionB,
  canvasRef
}) => {
  return (
    <div className="share-and-export-panel">
      <div className="panel-section export-section">
        <ExportImagePanel
          canvasRef={canvasRef}
          descriptorA={descriptorA}
          descriptorB={descriptorB}
        />
      </div>
      <div className="panel-section share-section">
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
  );
};

export default ShareAndExportPanel;
