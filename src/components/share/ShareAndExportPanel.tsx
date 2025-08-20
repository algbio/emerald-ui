import React from 'react';
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
  return (
    <div className="share-and-export-panel">
      <ExportImagePanel
        canvasRef={canvasRef}
        pointGridRef={pointGridRef}
        descriptorA={descriptorA}
        descriptorB={descriptorB}
      />
      <ShareUrlPanel
        descriptorA={descriptorA}
        descriptorB={descriptorB}
        alpha={alpha}
        delta={delta}
        accessionA={accessionA}
        accessionB={accessionB}
      />
    </div>
  );
};

export default ShareAndExportPanel;
