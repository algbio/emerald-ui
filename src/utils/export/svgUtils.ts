/**
 * Utility functions for exporting canvas content as true vector SVG.
 */

import * as d3 from 'd3';
import C2S from 'canvas2svg';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { Alignment, Edge } from '../../types/PointGrid';
import type { SelectedPath } from '../canvas/pathSelection';
import type { SafetyWindowBounds } from '../canvas';
import {
  drawSafetyWindows,
  drawAxes,
  drawAxisLabels,
  drawGridLines,
  drawHoverHighlight,
  drawSafetyWindowHighlight,
  drawGapHighlightOptimized,
  findSafetyWindowsForCell,
  drawMinimap
} from '../canvas';
import { renderGraph } from '../canvas/graphRenderer';

type TickX = { value: number; label: string; xOffset?: number };
type TickY = { value: number; label: string; yOffset?: number };

interface VisualizationSettings {
  showAxes: boolean;
  showSequenceCharacters: boolean;
  showSequenceIndices: boolean;
  showGrid: boolean;
  showMinimap: boolean;
  showSafetyWindows: boolean;
  showAlignmentEdges: boolean;
  showAlignmentDots: boolean;
  showOptimalPath: boolean;
}

interface ExportState {
  selectedSafetyWindow: Alignment | null;
  hoveredSafetyWindow: Alignment | null;
  highlightedGap: { type: 'representative' | 'member'; start: number; end: number } | null;
  selectedPath: SelectedPath | null;
  hoveredCell: { x: number; y: number } | null;
  hoveredEdge: Edge | null;
  selectedIndividualEdges: Edge[];
  enablePathSelection: boolean;
}

interface ExportLayout {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  minimapSize: number;
  minimapPadding: number;
}

type SVGCanvasContext = CanvasRenderingContext2D & {
  getSerializedSvg: (fixNamedEntities?: boolean) => string;
  getSvg?: () => SVGElement;
  canvas: any;
};

const defaultVisualizationSettings: VisualizationSettings = {
  showAxes: true,
  showSequenceCharacters: true,
  showSequenceIndices: true,
  showGrid: true,
  showMinimap: true,
  showSafetyWindows: true,
  showAlignmentEdges: true,
  showAlignmentDots: true,
  showOptimalPath: true
};

const defaultExportState: ExportState = {
  selectedSafetyWindow: null,
  hoveredSafetyWindow: null,
  highlightedGap: null,
  selectedPath: null,
  hoveredCell: null,
  hoveredEdge: null,
  selectedIndividualEdges: [],
  enablePathSelection: false
};

const EXPORT_TOP_PADDING = 24;

const generateSVGContent = (
  canvas: HTMLCanvasElement,
  alignments: Alignment[],
  representative: string,
  member: string,
  xTicks: TickX[],
  yTicks: TickY[],
  currentTransform: any,
  visualizationSettings: Partial<VisualizationSettings>,
  exportState: Partial<ExportState> = {},
  layout?: Partial<ExportLayout>,
  representativeDescriptor?: string,
  memberDescriptor?: string

): { svgString: string; width: number; height: number } => {
  const baseWidth = layout?.width ?? canvas.width;
  const baseHeight = layout?.height ?? canvas.height;
  const width = baseWidth;
  const height = baseHeight + EXPORT_TOP_PADDING;
  const marginTop = (layout?.marginTop ?? 80) + EXPORT_TOP_PADDING;
  const marginRight = layout?.marginRight ?? 20;
  const marginBottom = layout?.marginBottom ?? 30;
  const marginLeft = layout?.marginLeft ?? 80;
  const minimapSize = layout?.minimapSize ?? 250;
  const minimapPadding = layout?.minimapPadding ?? 100;

  if (baseWidth <= 0 || baseHeight <= 0) {
    throw new Error('Canvas has invalid dimensions and cannot be exported.');
  }

  const svgCtx = new C2S(width, height) as unknown as SVGCanvasContext;
  const svgCtxInternal = svgCtx as unknown as {
    __applyStyleToCurrentElement?: (type: string) => void;
    __currentElement?: Element;
    __lineDash?: number[];
    save: () => void;
    restore: () => void;
    setLineDash?: (segments: number[]) => void;
    getLineDash?: () => number[];
  };

  const dashStack: number[][] = [];
  const nativeApplyStyle = svgCtxInternal.__applyStyleToCurrentElement?.bind(svgCtxInternal);
  const nativeSave = svgCtxInternal.save.bind(svgCtxInternal);
  const nativeRestore = svgCtxInternal.restore.bind(svgCtxInternal);

  svgCtxInternal.__lineDash = [];
  svgCtxInternal.setLineDash = (segments: number[]) => {
    svgCtxInternal.__lineDash = [...segments];
  };
  svgCtxInternal.getLineDash = () => [...(svgCtxInternal.__lineDash ?? [])];
  svgCtxInternal.save = () => {
    dashStack.push([...(svgCtxInternal.__lineDash ?? [])]);
    nativeSave();
  };
  svgCtxInternal.restore = () => {
    nativeRestore();
    svgCtxInternal.__lineDash = dashStack.pop() ?? [];
  };
  if (nativeApplyStyle) {
    svgCtxInternal.__applyStyleToCurrentElement = (type: string) => {
      nativeApplyStyle(type);

      if (type !== 'stroke' || !svgCtxInternal.__currentElement) {
        return;
      }

      const dash = svgCtxInternal.__lineDash ?? [];
      if (dash.length > 0) {
        svgCtxInternal.__currentElement.setAttribute('stroke-dasharray', dash.join(','));
      } else {
        svgCtxInternal.__currentElement.removeAttribute('stroke-dasharray');
      }
    };
  }

  const settings: VisualizationSettings = {
    ...defaultVisualizationSettings,
    ...visualizationSettings
  };

  const state: ExportState = {
    ...defaultExportState,
    ...exportState
  };

  const zoomTransform = currentTransform && typeof currentTransform.rescaleX === 'function'
    ? currentTransform
    : d3.zoomIdentity;

  const padding = 0.5;
  const xBase = d3.scaleLinear(
    [-padding, representative.length + padding],
    [marginLeft, width - marginRight]
  );
  const yBase = d3.scaleLinear(
    [-padding, member.length + padding],
    [marginTop, height - marginBottom]
  );

  const x = zoomTransform.rescaleX(xBase);
  const y = zoomTransform.rescaleY(yBase);

  const cellWidth = Math.abs(x(1) - x(0));
  const cellHeight = Math.abs(y(1) - y(0));
  const fontSize = Math.max(8, Math.min(cellWidth, cellHeight) * 0.6);

  const safetyWindows = alignments.filter((alignment) => alignment.startDot && alignment.endDot);

  const isInSafetyWindow = (position: number, axis: 'x' | 'y') => {
    return safetyWindows.some((window) => {
      if (!window.startDot || !window.endDot) return false;
      const start = axis === 'x' ? window.startDot.x : window.startDot.y;
      const end = axis === 'x' ? window.endDot.x : window.endDot.y;
      return position >= start && position < end;
    });
  };

  const selectedWindow = state.selectedSafetyWindow;
  const hoveredWindow = state.hoveredSafetyWindow;

  const safetyWindowBounds: SafetyWindowBounds | undefined = (settings.showSafetyWindows && selectedWindow)
    ? {
        xStart: selectedWindow.startDot?.x,
        xEnd: selectedWindow.endDot?.x,
        yStart: selectedWindow.startDot?.y,
        yEnd: selectedWindow.endDot?.y
      }
    : undefined;

  const gridXTicks = xTicks.map((tick) => ({
    xOffset: x(tick.value)
  }));
  const gridYTicks = yTicks.map((tick) => ({
    yOffset: y(tick.value)
  }));

  svgCtx.fillStyle = 'white';
  svgCtx.fillRect(0, 0, width, height);

  if (settings.showSafetyWindows) {
    drawSafetyWindows(svgCtx, safetyWindows, x, y, fontSize, marginTop, marginLeft);

    if (selectedWindow) {
      drawSafetyWindowHighlight(svgCtx, x, y, marginTop, marginLeft, selectedWindow);
    }

    if (hoveredWindow && hoveredWindow !== selectedWindow) {
      svgCtx.save();
      svgCtx.globalAlpha = 0.5;
      drawSafetyWindowHighlight(svgCtx, x, y, marginTop, marginLeft, hoveredWindow);
      svgCtx.restore();
    }
  }

  if (state.highlightedGap) {
    const gapAsAlignment: Alignment = {
      startDot: state.highlightedGap.type === 'representative'
        ? { x: state.highlightedGap.start, y: 0 }
        : { x: 0, y: state.highlightedGap.start },
      endDot: state.highlightedGap.type === 'representative'
        ? { x: state.highlightedGap.end, y: member.length }
        : { x: representative.length, y: state.highlightedGap.end },
      edges: [],
      color: 'rgba(255, 107, 71, 0.4)'
    };

    drawGapHighlightOptimized(
      svgCtx,
      x,
      y,
      marginTop,
      marginLeft,
      gapAsAlignment,
      state.highlightedGap.type
    );
  }

  if (settings.showAxes) {
    drawAxes(svgCtx, x, y, marginTop, marginLeft);
  }

  if (settings.showSequenceCharacters || settings.showSequenceIndices) {
    drawAxisLabels(
      svgCtx,
      xTicks,
      yTicks,
      x,
      y,
      fontSize,
      marginTop,
      marginLeft,
      isInSafetyWindow,
      safetyWindowBounds,
      representativeDescriptor,
      memberDescriptor,
      settings.showSequenceCharacters,
      settings.showSequenceIndices
    );
  }

  svgCtx.save();
  svgCtx.beginPath();
  svgCtx.rect(marginLeft, marginTop, width - marginLeft - marginRight, height - marginTop - marginBottom);
  svgCtx.clip();

  if (settings.showGrid) {
    drawGridLines(svgCtx, gridXTicks, gridYTicks, x, y);
  }

  renderGraph(
    {
      ctx: svgCtx,
      x,
      y,
      width,
      height,
      marginTop,
      marginLeft
    },
    alignments,
    {
      showAlignmentEdges: settings.showAlignmentEdges,
      showAlignmentDots: settings.showAlignmentDots,
      showOptimalPath: settings.showOptimalPath,
      showSelectedPath: state.enablePathSelection && state.selectedPath !== null,
      selectedPath: state.selectedPath || undefined,
      hoveredEdge: state.hoveredEdge || undefined,
      selectedIndividualEdges: state.enablePathSelection ? state.selectedIndividualEdges : undefined
    }
  );

  if (state.hoveredCell) {
    if (settings.showSafetyWindows) {
      const matchingWindows = findSafetyWindowsForCell(state.hoveredCell, safetyWindows);
      matchingWindows.forEach((window) => {
        drawSafetyWindowHighlight(svgCtx, x, y, marginTop, marginLeft, window);
      });
    }

    drawHoverHighlight(
      svgCtx,
      state.hoveredCell,
      x,
      y,
      marginTop,
      marginLeft,
      representative,
      member,
      alignments
    );
  }

  svgCtx.restore();

  if (settings.showMinimap) {
    drawMinimap(svgCtx, {
      width,
      height,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      x,
      y,
      representative,
      member,
      alignments,
      safetyWindows,
      minimapSize,
      minimapPadding,
      showMinimap: settings.showMinimap
    });
  }

  const rawSvg = typeof svgCtx.getSerializedSvg === 'function'
    ? svgCtx.getSerializedSvg(true)
    : (svgCtx.getSvg ? svgCtx.getSvg().outerHTML : '');

  if (!rawSvg) {
    throw new Error('Failed to generate SVG content.');
  }

  let svgString = rawSvg;

  if (!svgString.startsWith('<?xml')) {
    svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
  }

  svgString = svgString.replace(
    /<svg([^>]*?)>/,
    () => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="overflow: visible; background: white;">`
  );

  svgString = svgString.replace(/style="[^"]*display\s*:\s*none[^"]*"/gi, '');
  svgString = svgString.replace(/style="[^"]*visibility\s*:\s*hidden[^"]*"/gi, '');
  svgString = svgString.replace(/overflow\s*:\s*hidden/gi, 'overflow: visible');

  svgString = svgString.replace(/<clipPath[^>]*><path[^>]*\/><\/clipPath>/g, '');
  svgString = svgString.replace(/\s+clip-path="[^"]*"/g, '');

  return { svgString, width, height };
};

export const exportCanvasAsSVG = (
  canvas: HTMLCanvasElement,
  alignments: Alignment[],
  representative: string,
  member: string,
  xTicks: TickX[],
  yTicks: TickY[],
  currentTransform: any,
  visualizationSettings: Partial<VisualizationSettings>,
  exportState: Partial<ExportState> = {},
  layout?: Partial<ExportLayout>,
  filename: string = 'alignment-graph.svg',
  representativeDescriptor?: string,
  memberDescriptor?: string
): void => {
  try {
    const { svgString } = generateSVGContent(
      canvas,
      alignments,
      representative,
      member,
      xTicks,
      yTicks,
      currentTransform,
      visualizationSettings,
      exportState,
      layout,
      representativeDescriptor,
      memberDescriptor
    );

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = filename;
    link.href = url;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export canvas as SVG:', error);
    throw new Error('Failed to export SVG. Please try again.');
  }
};

export const exportCanvasAsPDF = async (
  canvas: HTMLCanvasElement,
  alignments: Alignment[],
  representative: string,
  member: string,
  xTicks: TickX[],
  yTicks: TickY[],
  currentTransform: any,
  visualizationSettings: Partial<VisualizationSettings>,
  exportState: Partial<ExportState> = {},
  layout?: Partial<ExportLayout>,
  filename: string = 'alignment-graph.pdf',
  representativeDescriptor?: string,
  memberDescriptor?: string
): Promise<void> => {
  try {
    const { svgString, width, height } = generateSVGContent(
      canvas,
      alignments,
      representative,
      member,
      xTicks,
      yTicks,
      currentTransform,
      visualizationSettings,
      exportState,
      layout,
      representativeDescriptor,
      memberDescriptor
    );

    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(svgString, 'image/svg+xml');
    const parseError = svgDocument.querySelector('parsererror');

    if (parseError) {
      throw new Error('Failed to parse generated SVG for PDF export.');
    }

    const svgElement = svgDocument.documentElement;
    const pdf = new jsPDF({
      orientation: width >= height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [width, height]
    });

    await svg2pdf(svgElement as unknown as Element, pdf, {
      x: 0,
      y: 0,
      width,
      height
    });

    pdf.save(filename);
  } catch (error) {
    console.error('Failed to export canvas as PDF:', error);
    throw new Error('Failed to export vector PDF. Please try again.');
  }
};

/**
 * Generate a filename for SVG export.
 */
export const generateSVGFilename = (
  descriptorA?: string,
  descriptorB?: string
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (descriptorA && descriptorB) {
    const cleanA = descriptorA.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const cleanB = descriptorB.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    return `emerald_alignment_${cleanA}_vs_${cleanB}_${timestamp}.svg`;
  }

  return `emerald_alignment_${timestamp}.svg`;
};
