import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import * as d3 from "d3";
import { usePointGridScales } from '../../hooks/usePointGridScales';
import { usePointGridTicks } from '../../hooks/usePointGridTicks';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import { 
  drawSafetyWindows, 
  drawAxes, 
  drawAxisLabels, 
  drawGridLines, 
  drawHoverHighlight,
  drawSafetyWindowHighlight,
  drawGapHighlightOptimized,
  findSafetyWindowsForCell,
  drawMinimap,
  handleMinimapInteraction as handleMinimapInteractionUtil,
  isMouseInMinimap,
  drawConfidenceStripX,
  drawConfidenceStripY,
  CONFIDENCE_STRIP_THICKNESS,
  drawDomainStripX,
  drawDomainStripY,
  findDomainAtResidue,
  DOMAIN_STRIP_THICKNESS
} from '../../utils/canvas';
import { wouldCharacterLabelsOverlap, residueLabelPadX, residueLabelPadY } from '../../utils/canvas/axes';
import type { ProteinDomain } from '../../hooks/useProteinDomains';
import { renderGraph, findClosestEdge, getAllEdges } from '../../utils/canvas/graphRenderer';
import { buildPathFromEdge, generateAlignmentFromPath, validatePath, calculateDistanceFromOptimalPath, type SelectedPath } from '../../utils/canvas/pathSelection';
import type { SafetyWindowBounds } from '../../utils/canvas';
import type { PointGridPlotProps, Alignment, PathSelectionResult, RectangleSelection } from '../../types/PointGrid';

// Extended ref interface that includes export functionality
export interface PointGridPlotRef {
  canvas: HTMLCanvasElement | null;
  clearSelectedPath: () => void;
  getExportData: () => {
    alignments: Alignment[];
    representative: string;
    member: string;
    xTicks: Array<{value: number; label: string; xOffset?: number}>;
    yTicks: Array<{value: number; label: string; yOffset?: number}>;
    transform: any;
    representativeDescriptor?: string;
    memberDescriptor?: string;
    visualizationSettings: {
      showAxes: boolean;
      showSequenceCharacters: boolean;
      showSequenceIndices: boolean;
      showGrid: boolean;
      showMinimap: boolean;
      showSafetyWindows: boolean;
      showAlignmentEdges: boolean;
      showAlignmentDots: boolean;
      showOptimalPath: boolean;
    };
    exportState: {
      selectedSafetyWindow: Alignment | null;
      hoveredSafetyWindow: Alignment | null;
      highlightedGap: {type: 'representative' | 'member'; start: number; end: number} | null;
      selectedPath: SelectedPath | null;
      hoveredCell: {x: number; y: number} | null;
      hoveredEdge: import('../../types/PointGrid').Edge | null;
      selectedIndividualEdges: import('../../types/PointGrid').Edge[];
      enablePathSelection: boolean;
    };
    layout: {
      width: number;
      height: number;
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
      minimapSize: number;
      minimapPadding: number;
    };
  };
  /**
   * Render the graph to a high-resolution offscreen canvas
   * @param scale - The scale factor (e.g., 2 for 2x resolution)
   * @returns A canvas element with the graph rendered at the specified scale
   */
  renderHighResCanvas: (scale: number) => HTMLCanvasElement | null;
}

interface PointGridProps {
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  representative: string;
  member: string;
  alignments: Alignment[];
  showMinimap?: boolean;  
  minimapSize?: number;    
  minimapPadding?: number; 
  // Visualization settings
  showAxes?: boolean;
  showSequenceCharacters?: boolean;
  showSequenceIndices?: boolean;
  showGrid?: boolean;
  showSafetyWindows?: boolean;
  showAlignmentEdges?: boolean;
  showAlignmentDots?: boolean;
  showOptimalPath?: boolean;
  // Sequence descriptors for axis labeling
  representativeDescriptor?: string;
  memberDescriptor?: string;
  // Safety window interaction props
  selectedSafetyWindowId?: string | null;
  hoveredSafetyWindowId?: string | null;
  onSafetyWindowHover?: (windowId: string | null, alignment?: Alignment | null) => void;
  onSafetyWindowSelect?: (windowId: string | null, alignment?: Alignment | null) => void;
  // Gap highlighting props
  highlightedGap?: {type: 'representative' | 'member'; start: number; end: number} | null;
  // Zoom transform callback
  onTransformChange?: (transform: any) => void;
  // NEW: Path selection props
  enablePathSelection?: boolean;
  onPathSelected?: (result: PathSelectionResult) => void;
  onEdgeSelected?: (selectedEdges: import('../../types/PointGrid').MultipleSelectedEdgesState) => void;
  generatedPath?: import('../../utils/canvas/pathSelection').SelectedPath | null;
  // pLDDT/IUPRED confidence color strips along the axes
  confidenceMode?: 'plddt' | 'iupred' | 'off';
  plddtRepresentative?: number[] | null;
  plddtMember?: number[] | null;
  // UniProt domain annotation strips along the axes
  domainMode?: 'on' | 'off';
  domainsRepresentative?: ProteinDomain[] | null;
  domainsMember?: ProteinDomain[] | null;
  // Rectangle window selection ("Extracted Windows" tool)
  enableRectangleSelection?: boolean;
  onRectangleSelected?: (selection: RectangleSelection) => void;
  extractedWindow?: RectangleSelection | null;
  /** Currently-displayed alignment variant in the Window Selection tab, highlighted in green */
  highlightedVariantPath?: SelectedPath | null;
}

const PointGridPlot = forwardRef<PointGridPlotRef, PointGridProps>(({
  width = 800,
  height = 800,
  marginTop: marginTopProp = 80,
  marginRight = 20,
  marginBottom = 30,
  marginLeft: marginLeftProp = 80,
  representative = "MSFDLKSKFLG",
  member = "MSKLKDFLFKS",
  alignments = [],
  showMinimap = true,       // Default to showing minimap
  minimapSize = 250,         // Default size of minimap
  minimapPadding = 100,      // Padding around minimap
  // Visualization settings with defaults
  showAxes = true,
  showSequenceCharacters = true,
  showSequenceIndices = true,
  showGrid = true,
  showSafetyWindows = true,
  showAlignmentEdges = true,
  showAlignmentDots = true,
  showOptimalPath = true,
  selectedSafetyWindowId,
  hoveredSafetyWindowId,
  onSafetyWindowHover,
  onSafetyWindowSelect,
  highlightedGap,
  onTransformChange,
  representativeDescriptor,
  memberDescriptor,
  // NEW: Path selection props
  enablePathSelection = false,
  onPathSelected,
  onEdgeSelected,
  generatedPath,
  confidenceMode = 'off',
  plddtRepresentative,
  plddtMember,
  domainMode = 'off',
  domainsRepresentative,
  domainsMember,
  enableRectangleSelection = false,
  onRectangleSelected,
  extractedWindow,
  highlightedVariantPath
}, ref) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reserve extra margin for the pLDDT/IUPRED confidence strip only when it will actually be drawn
  const showConfidenceStripX = confidenceMode !== 'off' && !!plddtRepresentative && plddtRepresentative.length > 0;
  const showConfidenceStripY = confidenceMode !== 'off' && !!plddtMember && plddtMember.length > 0;
  // Domain strip is reserved just outside the confidence strip (further from the axis), so both
  // can be shown at once without overlapping.
  const showDomainStripX = domainMode === 'on' && !!domainsRepresentative && domainsRepresentative.length > 0;
  const showDomainStripY = domainMode === 'on' && !!domainsMember && domainsMember.length > 0;
  const marginTop = marginTopProp
    + (showConfidenceStripX ? CONFIDENCE_STRIP_THICKNESS : 0)
    + (showDomainStripX ? DOMAIN_STRIP_THICKNESS : 0);
  const marginLeft = marginLeftProp
    + (showConfidenceStripY ? CONFIDENCE_STRIP_THICKNESS : 0)
    + (showDomainStripY ? DOMAIN_STRIP_THICKNESS : 0);
  const domainStripTopX = marginTop - (showConfidenceStripX ? CONFIDENCE_STRIP_THICKNESS : 0) - DOMAIN_STRIP_THICKNESS;
  const domainStripLeftY = marginLeft - (showConfidenceStripY ? CONFIDENCE_STRIP_THICKNESS : 0) - DOMAIN_STRIP_THICKNESS;
  // Total space the strips consume beyond the base margin - other margin-relative annotations
  // (e.g. safety window brackets) need to shift out by this much so they don't overlap the strips.
  const topStripThickness = marginTop - marginTopProp;
  const leftStripThickness = marginLeft - marginLeftProp;
  // Offscreen context used only to measure the axis font, so the "are the residue letters
  // actually drawn at this zoom?" test below matches drawAxisLabels' own test exactly.
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!measureCanvasRef.current && typeof document !== 'undefined') {
    measureCanvasRef.current = document.createElement('canvas');
  }
  
  // Feedback notifications hook
  const { notifySuccess, notifyError } = useFeedbackNotifications();
  
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [highlightedWindow] = useState<Alignment | null>(null);
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  
  // NEW: Path selection state
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<import('../../types/PointGrid').Edge | null>(null);
  const [selectedIndividualEdges, setSelectedIndividualEdges] = useState<import('../../types/PointGrid').Edge[]>([]);

  // Domain annotation strip hover/click state. Hover shows a quick tooltip that follows the
  // mouse; clicking a domain block pins a popover in place until dismissed (Escape or clicking
  // elsewhere), per the interaction the "Domain" toggle is meant to support.
  interface DomainHit { domain: ProteinDomain; screenX: number; screenY: number }
  const [hoveredDomain, setHoveredDomain] = useState<DomainHit | null>(null);
  const [pinnedDomain, setPinnedDomain] = useState<DomainHit | null>(null);

  // NEW: Rectangle window selection ("Extracted Windows" tool) - drag state in grid
  // (sequence-index) coordinates, mirroring the x.invert/y.invert conversion already used
  // by handleSafetyWindowClick.
  const [rectDragStart, setRectDragStart] = useState<{ x: number; y: number } | null>(null);
  const [rectDragCurrent, setRectDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const enableRectangleSelectionRef = useRef(enableRectangleSelection);
  useEffect(() => {
    enableRectangleSelectionRef.current = enableRectangleSelection;
    // Clear any in-progress drag if the tool gets disarmed mid-drag
    if (!enableRectangleSelection) {
      setRectDragStart(null);
      setRectDragCurrent(null);
    }
  }, [enableRectangleSelection]);

  // Update selectedPath when generatedPath changes
  useEffect(() => {
    if (generatedPath) {
      setSelectedPath(generatedPath);
    }
  }, [generatedPath]);

  // Clear path function for better UX
  const clearSelectedPath = useCallback(() => {
    setSelectedPath(null);
    setSelectedIndividualEdges([]);
  }, []);

  // Keyboard event handling for path selection
  useEffect(() => {
    if (!enablePathSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedPath) {
        clearSelectedPath();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enablePathSelection, selectedPath, clearSelectedPath]);

  // Escape dismisses a pinned domain popover
  useEffect(() => {
    if (!pinnedDomain) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedDomain(null);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinnedDomain]);

  const { x, y, xDomain: currentXDomainRaw, yDomain: currentYDomainRaw, fontSize } = usePointGridScales({
    width, height, marginTop, marginRight, marginBottom, marginLeft,
    representative, member, transform
  });

  // ---- Axis annotation stack -----------------------------------------------------------------
  // Ordered outward from the axis: pLDDT strip, domain strip, then the residue letters as the
  // outermost layer, then the index numbers. The letters are only drawn when they fit, so the
  // band they occupy has to be measured with the same test drawAxisLabels uses - reserving space
  // for letters that are being suppressed is what left the annotations floating in empty space
  // at lower zoom.
  const measureCtx = measureCanvasRef.current?.getContext('2d') ?? null;
  const characterOverlap = measureCtx
    ? wouldCharacterLabelsOverlap(measureCtx, x, y, fontSize)
    : { xOverlap: true, yOverlap: true };
  const drawsXChars = showSequenceCharacters && !characterOverlap.xOverlap;
  const drawsYChars = showSequenceCharacters && !characterOverlap.yOverlap;
  // Depth of the letter band beyond the strips: the proportional gap, plus the glyph itself.
  const xLetterBand = drawsXChars ? residueLabelPadX(fontSize) + fontSize : 0;
  const yLetterBand = drawsYChars ? residueLabelPadY(fontSize) + fontSize * 0.6 : 0;

  // The safety-window bracket is an overlay rather than another band: its arms run from the axis
  // out to just past the residue letters, framing the whole stack without reserving any space of
  // its own. Its depth is therefore the stack's depth, which tracks zoom through the font size,
  // and it collapses with the letter band when the letters are suppressed instead of leaving
  // long arms hanging over empty margin.
  // Clearance between the tallest residue glyph and the bracket spine. Proportional so it holds
  // at every zoom, and generous enough to cover the stroke itself: the spine is stroked centred
  // on its path, so up to half the line width reaches back towards the letters and a couple of
  // pixels of nominal gap left the bracket touching the taller glyphs.
  // Capped at the top end: past a certain size more clearance buys nothing, and the axis font is
  // itself uncapped, so an unbounded gap pushes the spine off the canvas at extreme zoom.
  const bracketGap = Math.max(7, Math.min(14, fontSize * 0.35));
  // Clamped so the spine always stays on canvas, even when very large glyphs would otherwise
  // push the whole bracket out of the margin.
  const bracketTopSpan = Math.min(topStripThickness + xLetterBand + bracketGap, marginTop - 6);
  const bracketLeftSpan = Math.min(leftStripThickness + yLetterBand + bracketGap, marginLeft - 6);

  // Use live zoom/pan domains for ticks and clamp to valid sequence coordinates.
  // This prevents grid lines from being generated outside [0, sequence length].
  const xDomainTuple: [number, number] = [
    Math.max(0, currentXDomainRaw[0]),
    Math.min(representative.length, currentXDomainRaw[1])
  ];
  const yDomainTuple: [number, number] = [
    Math.max(0, currentYDomainRaw[0]),
    Math.min(member.length, currentYDomainRaw[1])
  ];

  const { xTicks, yTicks } = usePointGridTicks({
    xDomain: xDomainTuple,
    yDomain: yDomainTuple,
    representative, 
    member, 
    x, // Now properly typed as d3.ScaleLinear
    y, // Now properly typed as d3.ScaleLinear
    transform // Pass the current transform to control tick density
  });

  // Extract safety windows and helper function - must be defined before useImperativeHandle
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Simple safety window selection logic
  const selectedWindow = selectedSafetyWindowId ? 
    safetyWindows.find((_, index) => `safety-window-${index}` === selectedSafetyWindowId) : 
    null;

  // Expose canvas and export data through ref
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    clearSelectedPath,
    getExportData: () => ({
      alignments,
      representative,
      member,
      xTicks: xTicks.map(tick => ({ value: tick.value, label: tick.label, xOffset: tick.xOffset })),
      yTicks: yTicks.map(tick => ({ value: tick.value, label: tick.label, yOffset: tick.yOffset })),
      transform,
      representativeDescriptor,
      memberDescriptor,
      visualizationSettings: {
        showAxes,
        showSequenceCharacters,
        showSequenceIndices,
        showGrid,
        showMinimap,
        showSafetyWindows,
        showAlignmentEdges,
        showAlignmentDots,
        showOptimalPath
      },
      exportState: {
        selectedSafetyWindow: selectedWindow || null,
        hoveredSafetyWindow: hoveredSafetyWindowId
          ? safetyWindows.find((_, index) => `safety-window-${index}` === hoveredSafetyWindowId) || null
          : null,
        highlightedGap: highlightedGap || null,
        selectedPath: enablePathSelection ? (selectedPath || null) : null,
        hoveredCell: hoveredCell || null,
        hoveredEdge: hoveredEdge || null,
        selectedIndividualEdges: enablePathSelection ? selectedIndividualEdges : [],
        enablePathSelection
      },
      layout: {
        width,
        height,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        minimapSize,
        minimapPadding
      }
    }),
    renderHighResCanvas: (scale: number) => {
      if (!canvasRef.current || scale < 1) return null;
      
      // Create scaled dimensions
      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);
      const scaledMarginTop = marginTop * scale;
      const scaledMarginRight = marginRight * scale;
      const scaledMarginBottom = marginBottom * scale;
      const scaledMarginLeft = marginLeft * scale;
      
      // Create offscreen canvas
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = scaledWidth;
      offscreenCanvas.height = scaledHeight;
      
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return null;
      
      // Create scaled versions of the d3 scales
      const padding = 0.5;
      const xBaseScaled = d3.scaleLinear(
        [-padding, representative.length + padding],
        [scaledMarginLeft, scaledWidth - scaledMarginRight]
      );
      const yBaseScaled = d3.scaleLinear(
        [-padding, member.length + padding],
        [scaledMarginTop, scaledHeight - scaledMarginBottom]
      );
      
      const xScaled = transform.rescaleX(xBaseScaled);
      const yScaled = transform.rescaleY(yBaseScaled);
      
      // Calculate scaled font size
      const cellWidth = Math.abs(xScaled(1) - xScaled(0));
      const cellHeight = Math.abs(yScaled(1) - yScaled(0));
      const scaledFontSize = Math.max(8 * scale, Math.min(cellWidth, cellHeight) * 0.6);
      
      // Create scaled ticks with recalculated offsets using the scaled scales
      const scaledXTicks = xTicks.map(tick => ({ 
        ...tick, 
        xOffset: xScaled(tick.value)  // Recalculate offset using scaled scale
      }));
      const scaledYTicks = yTicks.map(tick => ({ 
        ...tick, 
        yOffset: yScaled(tick.value)  // Recalculate offset using scaled scale
      }));
      
      // Helper function for safety window detection (same logic, scaled coordinates)
      const isInSafetyWindowScaled = (position: number, axis: 'x' | 'y') => {
        return safetyWindows.some(window => {
          if (!window.startDot || !window.endDot) return false;
          const start = axis === 'x' ? window.startDot.x : window.startDot.y;
          const end = axis === 'x' ? window.endDot.x : window.endDot.y;
          return position >= start && position < end;
        });
      };
      
      // Clear canvas with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      
      // Draw safety windows if enabled
      if (showSafetyWindows) {
        drawSafetyWindows(ctx, safetyWindows, xScaled, yScaled, scaledFontSize, scaledMarginTop, scaledMarginLeft);
        
        if (selectedWindow) {
          drawSafetyWindowHighlight(ctx, xScaled, yScaled, scaledMarginTop, scaledMarginLeft, selectedWindow);
        }
      }
      
      // Draw axes if enabled
      if (showAxes) {
        drawAxes(ctx, xScaled, yScaled, scaledMarginTop, scaledMarginLeft);
      }
      
      // Create safety window bounds object for display
      const scaledSafetyWindowBounds: SafetyWindowBounds | undefined = (showSafetyWindows && selectedWindow) ? {
        xStart: selectedWindow.startDot?.x,
        xEnd: selectedWindow.endDot?.x,
        yStart: selectedWindow.startDot?.y,
        yEnd: selectedWindow.endDot?.y
      } : undefined;
      
      // Draw axis labels if any label type is enabled
      if (showSequenceCharacters || showSequenceIndices) {
        drawAxisLabels(
          ctx,
          scaledXTicks,
          scaledYTicks,
          xScaled,
          yScaled,
          scaledFontSize,
          scaledMarginTop,
          scaledMarginLeft,
          isInSafetyWindowScaled,
          scaledSafetyWindowBounds,
          representativeDescriptor,
          memberDescriptor,
          showSequenceCharacters,
          showSequenceIndices
        );
      }
      
      // Set up clipping and draw grid/data
      ctx.save();
      ctx.beginPath();
      ctx.rect(scaledMarginLeft, scaledMarginTop, scaledWidth - scaledMarginLeft - scaledMarginRight, scaledHeight - scaledMarginTop - scaledMarginBottom);
      ctx.clip();
      
      // Draw grid if enabled
      if (showGrid) {
        drawGridLines(ctx, scaledXTicks, scaledYTicks, xScaled, yScaled, {
          xMin: 0,
          xMax: representative.length,
          yMin: 0,
          yMax: member.length
        });
      }
      
      // Draw alignment elements
      renderGraph(
        {
          ctx,
          x: xScaled,
          y: yScaled,
          width: scaledWidth,
          height: scaledHeight,
          marginTop: scaledMarginTop,
          marginLeft: scaledMarginLeft
        },
        alignments,
        {
          showAlignmentEdges,
          showAlignmentDots,
          showOptimalPath,
          showSelectedPath: enablePathSelection && selectedPath !== null,
          selectedPath: selectedPath || undefined,
          hoveredEdge: undefined, // Don't show hover in export
          selectedIndividualEdges: enablePathSelection ? selectedIndividualEdges : undefined,
          highlightedVariantPath
        }
      );
      
      ctx.restore();
      
      // Note: We skip minimap in high-res export as it's for navigation only
      
      return offscreenCanvas;
    }
  }), [alignments, representative, member, xTicks, yTicks, transform, showAxes, showSequenceCharacters, showSequenceIndices, showGrid, showMinimap, showSafetyWindows, showAlignmentEdges, showAlignmentDots, showOptimalPath, clearSelectedPath, width, height, marginTop, marginRight, marginBottom, marginLeft, safetyWindows, selectedWindow, hoveredSafetyWindowId, highlightedGap, representativeDescriptor, memberDescriptor, enablePathSelection, selectedPath, selectedIndividualEdges, hoveredCell, hoveredEdge, minimapSize, minimapPadding]);
    
  const hoveredWindow = hoveredSafetyWindowId ? 
    safetyWindows.find((_, index) => `safety-window-${index}` === hoveredSafetyWindowId) : 
    null;

  const isInSafetyWindow = (position: number, axis: 'x' | 'y') => {
    return safetyWindows.some(window => {
      if (!window.startDot || !window.endDot) return false;
      const start = axis === 'x' ? window.startDot.x : window.startDot.y;
      const end = axis === 'x' ? window.endDot.x : window.endDot.y;
      return position >= start && position < end;
    });
  };

  // Handle safety window clicking
  const handleSafetyWindowClick = (clickX: number, clickY: number) => {
    // Convert click coordinates to grid coordinates
    const gridX = Math.floor(x.invert(clickX));
    const gridY = Math.floor(y.invert(clickY));
    
    // Find which safety window contains this point
    const clickedWindow = safetyWindows.find((window, index) => {
      if (!window.startDot || !window.endDot) return false;
      
      const xInWindow = gridX >= window.startDot.x && gridX < window.endDot.x;
      const yInWindow = gridY >= window.startDot.y && gridY < window.endDot.y;
      
      if (xInWindow && yInWindow) {
        // Store the index for ID generation
        (window as any)._index = index;
        return true;
      }
      return false;
    });

    if (clickedWindow) {
      const windowId = `safety-window-${(clickedWindow as any)._index}`;
      const isCurrentlySelected = selectedSafetyWindowId === windowId;
      onSafetyWindowSelect?.(isCurrentlySelected ? null : windowId, isCurrentlySelected ? null : clickedWindow);
    } else {
      onSafetyWindowSelect?.(null, null);
    }
  };

  // Draw minimap using the utility function
  const drawMinimapFn = (ctx: CanvasRenderingContext2D) => {
    return drawMinimap(ctx, {
      width, height, marginTop, marginRight, marginBottom, marginLeft,
      x, y, representative, member, alignments, safetyWindows,
      minimapSize, minimapPadding, showMinimap
    });
  };

  // Main drawing function
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw safety windows if enabled
    if (showSafetyWindows) {
      drawSafetyWindows(
        ctx, safetyWindows, x, y, fontSize, marginTop, marginLeft, false,
        0, 0, bracketTopSpan, bracketLeftSpan
      );
      
      // Draw safety window highlight if applicable
      if (highlightedWindow) {
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, highlightedWindow);
      }

      // Draw external selection highlights - using memoized values
      // We use the optimized values from our custom hook
      
      if (selectedWindow) {
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, selectedWindow);
      }
      
      if (hoveredWindow && hoveredWindow !== selectedWindow) {
        // Draw a lighter highlight for hovered windows
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, hoveredWindow);
        ctx.restore();
      }
    }
    
    // Draw gap highlighting using the same batched approach as alignment edges
    // This integrates gap highlighting into the pooled rendering system for better performance
    if (highlightedGap) {
      // Create a temporary "alignment" object that represents the gap for efficient rendering
      const gapAsAlignment: Alignment = {
        startDot: highlightedGap.type === 'representative' 
          ? { x: highlightedGap.start, y: 0 }
          : { x: 0, y: highlightedGap.start },
        endDot: highlightedGap.type === 'representative'
          ? { x: highlightedGap.end, y: member.length }
          : { x: representative.length, y: highlightedGap.end },
        edges: [],
        color: 'rgba(255, 107, 71, 0.4)', // Orange-red for gaps
        _isGapHighlight: true // Mark as gap highlight for special handling
      } as Alignment & { _isGapHighlight: boolean };

      // Render gap highlight as a filled rectangle using the same efficient system
      drawGapHighlightOptimized(ctx, x, y, marginTop, marginLeft, gapAsAlignment, highlightedGap.type);
    }
    
    // Draw axes if enabled
    if (showAxes) {
      drawAxes(ctx, x, y, marginTop, marginLeft);
    }
    
    // Create safety window bounds object for display - using memoized value
    const safetyWindowBounds: SafetyWindowBounds | undefined = (showSafetyWindows && selectedWindow) ? {
      // Match the axis orientation from the isInSafetyWindow function
      xStart: selectedWindow.startDot?.x,
      xEnd: selectedWindow.endDot?.x,
      yStart: selectedWindow.startDot?.y,
      yEnd: selectedWindow.endDot?.y
    } : undefined;

    // Draw axis labels if any label type is enabled
    if (showSequenceCharacters || showSequenceIndices) {
      drawAxisLabels(
        ctx,
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
        showSequenceCharacters,
        showSequenceIndices,
        topStripThickness,
        leftStripThickness
      );
    }

    // Draw pLDDT/IUPRED confidence strips along the axes, in the reserved margin band
    if (showConfidenceStripX && plddtRepresentative) {
      drawConfidenceStripX(ctx, x, marginTop, plddtRepresentative, representative.length);
    }
    if (showConfidenceStripY && plddtMember) {
      drawConfidenceStripY(ctx, y, marginLeft, plddtMember, member.length);
    }

    // Draw UniProt domain annotation strips, just outside the confidence strip
    if (showDomainStripX && domainsRepresentative) {
      drawDomainStripX(ctx, x, domainStripTopX, domainsRepresentative);
    }
    if (showDomainStripY && domainsMember) {
      drawDomainStripY(ctx, y, domainStripLeftY, domainsMember);
    }

    // Set up clipping and draw grid/data
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginLeft, marginTop, width - marginLeft - marginRight, height - marginTop - marginBottom);
    ctx.clip();

    // Draw grid if enabled
    if (showGrid) {
      drawGridLines(ctx, xTicks, yTicks, x, y, {
        xMin: 0,
        xMax: representative.length,
        yMin: 0,
        yMax: member.length
      });
    }
    
    // Draw alignment elements using new simplified renderer
    renderGraph(
      {
        ctx,
        x,
        y,
        width,
        height,
        marginTop,
        marginLeft
      },
      alignments,
      {
        showAlignmentEdges,
        showAlignmentDots,
        showOptimalPath,
        showSelectedPath: enablePathSelection && selectedPath !== null,
        selectedPath: selectedPath || undefined,
        hoveredEdge: hoveredEdge || undefined,
        selectedIndividualEdges: enablePathSelection ? selectedIndividualEdges : undefined,
        highlightedVariantPath
      }
    );

    // Draw hover highlight (always shown when hovering for usability)
    if (hoveredCell) {
      // Find all safety windows containing the hovered cell (only if safety windows are shown)
      if (showSafetyWindows) {
        const matchingWindows = findSafetyWindowsForCell(hoveredCell, safetyWindows);
        
        // Draw each window that contains the hovered cell
        matchingWindows.forEach(window => {
          drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, window);
        });
      }
      
      // Draw hover highlight on top
      drawHoverHighlight(
        ctx, 
        hoveredCell, 
        x, 
        y, 
        marginTop, 
        marginLeft, 
        representative, 
        member,
        alignments
      );
    }

    // Draw the finalized extracted-window selection, so it stays visible after mouse-up
    // (the live in-progress rectangle below is only shown while actively dragging)
    if (extractedWindow && !(rectDragStart && rectDragCurrent)) {
      const ex0 = x(extractedWindow.xStart);
      const ex1 = x(extractedWindow.xEnd);
      const ey0 = y(extractedWindow.yStart);
      const ey1 = y(extractedWindow.yEnd);
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(Math.min(ex0, ex1), Math.min(ey0, ey1), Math.abs(ex1 - ex0), Math.abs(ey1 - ey0));
      ctx.restore();
    }

    // Draw the in-progress rectangle selection ("Extracted Windows" tool)
    if (rectDragStart && rectDragCurrent) {
      const px0 = x(rectDragStart.x);
      const px1 = x(rectDragCurrent.x);
      const py0 = y(rectDragStart.y);
      const py1 = y(rectDragCurrent.y);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 123, 255, 0.15)';
      ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)';
      ctx.lineWidth = 1.5;
      const rx = Math.min(px0, px1);
      const ry = Math.min(py0, py1);
      const rw = Math.abs(px1 - px0);
      const rh = Math.abs(py1 - py0);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    ctx.restore();

    // Draw minimap on top of everything if enabled
    if (showMinimap) {
      drawMinimapFn(ctx);
    }
  };

  // Handle minimap interactions using utility function
  const handleMinimapInteraction = (event: React.MouseEvent, isDragging: boolean = false) => {
    return handleMinimapInteractionUtil(
      event,
      {
        canvas: canvasRef.current,
        isDragging,
        isMinimapDragging,
        width,
        height,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        minimapSize,
        minimapPadding,
        showMinimap,
        transform,
        x,
        y,
        representative,
        member
      },
      setTransform
    );
  };

  // Checks whether (mouseX, mouseY) - in canvas-local pixel coordinates - falls within either
  // domain strip band, and if so, which domain (if any) is under it. Used by both hover and
  // click handling for the "Domain" annotation strips.
  const findDomainHitAt = (mouseX: number, mouseY: number): DomainHit | null => {
    if (showDomainStripX && domainsRepresentative && mouseY >= domainStripTopX && mouseY <= domainStripTopX + DOMAIN_STRIP_THICKNESS) {
      const residueIndex = Math.floor(x.invert(mouseX));
      if (residueIndex >= 0 && residueIndex < representative.length) {
        const domain = findDomainAtResidue(domainsRepresentative, residueIndex);
        if (domain) return { domain, screenX: mouseX, screenY: mouseY };
      }
    }
    if (showDomainStripY && domainsMember && mouseX >= domainStripLeftY && mouseX <= domainStripLeftY + DOMAIN_STRIP_THICKNESS) {
      const residueIndex = Math.floor(y.invert(mouseY));
      if (residueIndex >= 0 && residueIndex < member.length) {
        const domain = findDomainAtResidue(domainsMember, residueIndex);
        if (domain) return { domain, screenX: mouseX, screenY: mouseY };
      }
    }
    return null;
  };

  // Mouse interaction
  const handleMouseMove = (event: React.MouseEvent) => {
    // First check if we're interacting with the minimap
    if (handleMinimapInteraction(event, isMinimapDragging)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (!rectDragStart) {
      const domainHit = findDomainHitAt(mouseX, mouseY);
      setHoveredDomain(domainHit);
      if (domainHit) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Rectangle-selection drag in progress: update the live selection and skip hover logic.
    // Clamp to the plot area so dragging past the edge still extends the selection sensibly.
    if (rectDragStart) {
      const clampedX = Math.max(marginLeft, Math.min(width - marginRight, mouseX));
      const clampedY = Math.max(marginTop, Math.min(height - marginBottom, mouseY));
      setRectDragCurrent({ x: x.invert(clampedX), y: y.invert(clampedY) });
      return;
    }

    // Only consider the mouse within the plot area
    if (mouseX < marginLeft || mouseX > width - marginRight ||
        mouseY < marginTop || mouseY > height - marginBottom) {
      setHoveredCell(null);
      setHoveredEdge(null);
      onSafetyWindowHover?.(null);
      if (canvas.style.cursor === 'pointer') canvas.style.cursor = 'default';
      return;
    }

    // NEW: Path selection - check for edge hover
    if (enableRectangleSelection) {
      // Rectangle-selection tool is armed: keep the crosshair cursor (set declaratively via
      // the canvas' style prop) and skip edge-hover detection entirely.
      setHoveredEdge(null);
    } else if (enablePathSelection) {
      const closestEdge = findClosestEdge(mouseX, mouseY, alignments, x, y, 12);
      setHoveredEdge(closestEdge);

      // Enhanced cursor feedback for better UX
      if (closestEdge) {
        canvas.style.cursor = 'crosshair'; // More specific cursor for path selection
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      setHoveredEdge(null);
      canvas.style.cursor = 'default';
    }

    const gridX = Math.floor(x.invert(mouseX));
    const gridY = Math.floor(y.invert(mouseY));

    // Make sure we're within the domain bounds
    if (gridX >= 0 && gridX < representative.length && 
        gridY >= 0 && gridY < member.length) {
      setHoveredCell({x: gridX, y: gridY});
      
      // Check if mouse is over a safety window
      const hoveredWindow = safetyWindows.find((window, index) => {
        if (!window.startDot || !window.endDot) return false;
        
        const xInWindow = gridX >= window.startDot.x && gridX < window.endDot.x;
        const yInWindow = gridY >= window.startDot.y && gridY < window.endDot.y;
        
        if (xInWindow && yInWindow) {
          (window as any)._index = index;
          return true;
        }
        return false;
      });

      if (hoveredWindow) {
        const windowId = `safety-window-${(hoveredWindow as any)._index}`;
        onSafetyWindowHover?.(windowId);
      } else {
        onSafetyWindowHover?.(null);
      }
    } else {
      setHoveredCell(null);
      onSafetyWindowHover?.(null);
    }
  };

  // NEW: Handle edge click for individual edge selection
  const handleEdgeClick = (clickedEdge: import('../../types/PointGrid').Edge) => {
    if (!enablePathSelection) return;

    if (onEdgeSelected) {
      // Check if edge is already selected
      const edgeIndex = selectedIndividualEdges.findIndex(edge => 
        edge.from[0] === clickedEdge.from[0] && 
        edge.from[1] === clickedEdge.from[1] &&
        edge.to[0] === clickedEdge.to[0] && 
        edge.to[1] === clickedEdge.to[1]
      );

      let newSelectedEdges: import('../../types/PointGrid').Edge[];
      
      if (edgeIndex >= 0) {
        // Edge is already selected, remove it
        newSelectedEdges = selectedIndividualEdges.filter((_, index) => index !== edgeIndex);
      } else {
        // Edge is not selected, add it
        newSelectedEdges = [...selectedIndividualEdges, clickedEdge];
      }

      setSelectedIndividualEdges(newSelectedEdges);
      
      // Visual feedback
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'wait';
        setTimeout(() => {
          canvas.style.cursor = enablePathSelection ? 'crosshair' : 'default';
        }, 100);
      }

      // Call the edge selection callback with individual edges
      onEdgeSelected({
        selectedEdges: newSelectedEdges,
        isValid: newSelectedEdges.length > 0
      });
    } 
    // Fall back to old behavior for compatibility
    else if (onPathSelected) {
      // Build path from the clicked edge
      const allEdges = getAllEdges(alignments);
      const newPath = buildPathFromEdge(clickedEdge, allEdges);
      
      // Validate the path
      if (validatePath(newPath, allEdges)) {
        setSelectedPath(newPath);
        
        // Generate alignment from path
        const alignmentResult = generateAlignmentFromPath(newPath, representative, member);
        
        // Calculate distance from optimal path
        const distanceFromOptimal = calculateDistanceFromOptimalPath(newPath, alignments);
        
        // Visual feedback - brief cursor change to indicate success
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'wait';
          setTimeout(() => {
            canvas.style.cursor = enablePathSelection ? 'crosshair' : 'default';
          }, 200);
        }
        
        // Call the callback with the result
        onPathSelected({
          alignedRepresentative: alignmentResult.alignedRep,
          alignedMember: alignmentResult.alignedMem,
          score: alignmentResult.score,
          pathLength: newPath.edges.length,
          distanceFromOptimal: distanceFromOptimal
        });
        
        // Show success feedback notification
        notifySuccess(
          'Path Generated Successfully!', 
          `Selected path with ${newPath.edges.length} edges (${distanceFromOptimal.toFixed(1)}% from optimal)`
        );
      } else {
        // Visual feedback for invalid path
        console.warn('Invalid path selected');
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'not-allowed';
          setTimeout(() => {
            canvas.style.cursor = enablePathSelection ? 'crosshair' : 'default';
          }, 300);
        }
        
        // Show error feedback notification
        notifyError(
          'Invalid Path Selected', 
          'The selected edge cannot form a valid alignment path. Please select an edge that allows movement only to the right and/or down'
        );
      }
    }
  };
  
  // Clicking a domain annotation block pins its popover (or unpins it if clicking the same one
  // again); clicking anywhere else dismisses whatever's currently pinned. Wired to onClick
  // (not onMouseDown) deliberately: d3-zoom's pan gesture calls stopImmediatePropagation() on
  // qualifying mousedown/mouseup events (see mousedowned in d3-zoom's zoom.js), which can
  // prevent React's onMouseDown from ever firing for a plain click. The browser's separate
  // 'click' event (synthesized after a down/up pair with no significant movement) isn't
  // touched by d3-zoom's listeners, so it reaches React reliably either way.
  const handleCanvasClick = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const domainHit = findDomainHitAt(mouseX, mouseY);
    if (domainHit) {
      setPinnedDomain(prev => (prev && prev.domain === domainHit.domain) ? null : domainHit);
    } else if (pinnedDomain) {
      setPinnedDomain(null);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    // Check if click is in minimap using utility
    const isInMinimap = isMouseInMinimap(event, {
      canvas: canvasRef.current,
      width,
      minimapSize,
      minimapPadding
    });
                       
    if (isInMinimap) {
      setIsMinimapDragging(true);
      handleMinimapInteraction(event, true);
    } else {
      // Handle clicks in the main plot area
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Only handle clicks within the plot area
      if (mouseX >= marginLeft && mouseX <= width - marginRight && 
          mouseY >= marginTop && mouseY <= height - marginBottom) {
        
        if (enableRectangleSelection) {
          // Start a rectangle-selection drag ("Extracted Windows" tool)
          const gridX = x.invert(mouseX);
          const gridY = y.invert(mouseY);
          setRectDragStart({ x: gridX, y: gridY });
          setRectDragCurrent({ x: gridX, y: gridY });
        } else if (enablePathSelection && hoveredEdge) {
          // NEW: Path selection - handle edge clicks
          handleEdgeClick(hoveredEdge);
        } else {
          // Default behavior: safety window clicking
          handleSafetyWindowClick(mouseX, mouseY);
        }
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsMinimapDragging(false);

    if (rectDragStart && rectDragCurrent) {
      const xStart = Math.max(0, Math.min(representative.length, Math.floor(Math.min(rectDragStart.x, rectDragCurrent.x))));
      const xEnd = Math.max(0, Math.min(representative.length, Math.ceil(Math.max(rectDragStart.x, rectDragCurrent.x))));
      const yStart = Math.max(0, Math.min(member.length, Math.floor(Math.min(rectDragStart.y, rectDragCurrent.y))));
      const yEnd = Math.max(0, Math.min(member.length, Math.ceil(Math.max(rectDragStart.y, rectDragCurrent.y))));

      if (xEnd > xStart && yEnd > yStart) {
        onRectangleSelected?.({ xStart, xEnd, yStart, yEnd });
      }
      setRectDragStart(null);
      setRectDragCurrent(null);
    }
  };

  // Consolidated redraw effect for plot visuals.
  useEffect(() => {
    requestAnimationFrame(drawCanvas);
  }, [
    transform,
    alignments,
    fontSize,
    showMinimap,
    showAxes,
    showSequenceCharacters,
    showSequenceIndices,
    showGrid,
    showSafetyWindows,
    showAlignmentEdges,
    showAlignmentDots,
    showOptimalPath,
    representativeDescriptor,
    memberDescriptor,
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    hoveredCell,
    hoveredEdge,
    highlightedGap,
    selectedWindow,
    hoveredWindow,
    selectedPath,
    selectedIndividualEdges,
    confidenceMode,
    plddtRepresentative,
    plddtMember,
    domainMode,
    domainsRepresentative,
    domainsMember,
    rectDragStart,
    rectDragCurrent,
    extractedWindow,
    highlightedVariantPath
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // The plot area in base (untransformed) pixel coordinates: at scale 1 the two sequences
    // occupy exactly this box. Using it as both the viewport extent and the translate extent
    // bounds panning to the sequences themselves, and a minimum scale of 1 makes "fully zoomed
    // out" mean "the whole alignment" rather than an unbounded field of empty space. Without
    // these the graph could be dragged arbitrarily far off in either axis, or zoomed out until
    // the alignment was a dot.
    const plotArea: [[number, number], [number, number]] = [
      [marginLeft, marginTop],
      [width - marginRight, height - marginBottom],
    ];

    const zoom = d3.zoom()
      .scaleExtent([1, 100])
      .extent(plotArea)
      .translateExtent(plotArea)
      // Disable drag-to-pan while the rectangle-selection tool is armed (scroll-to-zoom
      // stays enabled), so left-click-drag draws a selection instead of panning. Preserves
      // d3-zoom's own default filter (ignore right-click/ctrl so right-click can still be used
      // for edge selection on the Path Selection tab, and pinch-to-zoom keeps working).
      .filter((event) => (!event.ctrlKey || event.type === 'wheel') && !event.button && (!enableRectangleSelectionRef.current || event.type === 'wheel'))
      .on("zoom", (event) => {
        setTransform(event.transform);
        // Notify parent component of transform change
        if (onTransformChange) {
          onTransformChange(event.transform);
        }
      });

    // Use type assertion to fix the incompatible call
    const selection = d3.select(canvasRef.current);
    (selection as any).call(zoom);

    return () => {
      selection.on('.zoom', null);
    };
    // Re-bound when the plot area changes - the margins grow and shrink as the pLDDT and domain
    // strips are toggled, and the bounds have to follow or panning is constrained to a stale box.
  }, [width, height, marginTop, marginRight, marginBottom, marginLeft, onTransformChange]);

  const activeDomainHit = pinnedDomain || hoveredDomain;

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ cursor: enableRectangleSelection ? 'crosshair' : (isMinimapDragging ? 'move' : 'grab') }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredCell(null);
          setHoveredEdge(null);
          setHoveredDomain(null);
          onSafetyWindowHover?.(null);
          requestAnimationFrame(drawCanvas);
        }}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {activeDomainHit && (
        <div
          className={`domain-tooltip${pinnedDomain ? ' domain-tooltip-pinned' : ''}`}
          style={{
            position: 'absolute',
            left: Math.min(activeDomainHit.screenX + 10, width - 260),
            top: Math.max(activeDomainHit.screenY + 10, 0),
            pointerEvents: pinnedDomain ? 'auto' : 'none'
          }}
        >
          {pinnedDomain && (
            <button
              type="button"
              className="domain-tooltip-close"
              onClick={() => setPinnedDomain(null)}
              aria-label="Close"
            >
              ×
            </button>
          )}
          <div className="domain-tooltip-name">{activeDomainHit.domain.name}</div>
          <div className="domain-tooltip-range">Residues {activeDomainHit.domain.start}-{activeDomainHit.domain.end}</div>
        </div>
      )}
    </div>
  );
});

PointGridPlot.displayName = 'PointGridPlot';

export default PointGridPlot;
export type { Alignment, PointGridPlotProps };