// Simplified and improved graph rendering system
import type { ScaleLinear } from 'd3-scale';
import type { Alignment, Edge } from '../../types/PointGrid';
import type { SelectedPath } from './pathSelection';

export interface RenderingContext {
  ctx: CanvasRenderingContext2D;
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
}

export interface GraphRenderingOptions {
  showAlignmentEdges: boolean;
  showAlignmentDots: boolean;
  showOptimalPath: boolean;
  showSelectedPath: boolean;
  selectedPath?: SelectedPath;
  hoveredEdge?: Edge;
  selectedIndividualEdges?: Edge[];
}

/**
 * Main graph rendering function - simplified and more maintainable
 * @param context Rendering context with canvas and scales
 * @param alignments All alignments to render
 * @param options Rendering options
 */
export function renderGraph(
  context: RenderingContext,
  alignments: Alignment[],
  options: GraphRenderingOptions
): void {
  const { ctx } = context;

  // Save context state
  ctx.save();

  // Clear any previous path/line state
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  // Render in order of visual importance (background to foreground)
  
  // 1. Regular alignment edges (background layer)
  if (options.showAlignmentEdges) {
    renderAlignmentEdges(context, alignments);
  }

  // 2. Optimal path (middle layer, more prominent)
  if (options.showOptimalPath) {
    renderOptimalPath(context, alignments);
  }

  // 3. Selected path (foreground layer, most prominent)
  if (options.showSelectedPath && options.selectedPath) {
    renderSelectedPath(context, options.selectedPath);
  }

  // 4. Individual selected edges (red highlighting)
  if (options.selectedIndividualEdges && options.selectedIndividualEdges.length > 0) {
    renderSelectedIndividualEdges(context, options.selectedIndividualEdges);
  }

  // 5. Hovered edge highlighting (top layer)
  if (options.hoveredEdge) {
    renderHoveredEdge(context, options.hoveredEdge);
  }

  // 6. Alignment dots (always on top)
  if (options.showAlignmentDots) {
    renderAlignmentDots(context, alignments, options);
  }

  // Restore context state
  ctx.restore();
}

/**
 * Render regular alignment edges with clean, efficient drawing
 */
function renderAlignmentEdges(
  context: RenderingContext,
  alignments: Alignment[]
): void {
  const { ctx, x, y } = context;

  // Group edges by color for efficient batch rendering
  const edgesByColor: { [color: string]: Edge[] } = {};

  alignments.forEach(alignment => {
    // Skip optimal path edges - they'll be rendered separately
    if (alignment.color === 'blue') return;
    
    if (!edgesByColor[alignment.color]) {
      edgesByColor[alignment.color] = [];
    }
    
    alignment.edges.forEach(edge => {
      edgesByColor[alignment.color].push(edge);
    });
  });

  // Render each color group in a single batch
  Object.entries(edgesByColor).forEach(([color, edges]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4; // Subtle background edges

    // Use a single path for all edges of the same color
    ctx.beginPath();
    edges.forEach(edge => {
      ctx.moveTo(x(edge.from[0]), y(edge.from[1]));
      ctx.lineTo(x(edge.to[0]), y(edge.to[1]));
    });
    ctx.stroke();
  });
}

/**
 * Render the optimal path with special highlighting
 */
function renderOptimalPath(
  context: RenderingContext,
  alignments: Alignment[]
): void {
  const { ctx, x, y } = context;

  // Find optimal path alignment (blue)
  const optimalAlignment = alignments.find(alignment => alignment.color === 'blue');
  if (!optimalAlignment || optimalAlignment.edges.length === 0) return;

  ctx.strokeStyle = 'rgba(30, 144, 255, 0.85)'; // Dodger blue
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw optimal path as a single connected path for smooth appearance
  ctx.beginPath();
  let isFirstEdge = true;

  optimalAlignment.edges.forEach(edge => {
    if (isFirstEdge) {
      ctx.moveTo(x(edge.from[0]), y(edge.from[1]));
      isFirstEdge = false;
    }
    ctx.lineTo(x(edge.to[0]), y(edge.to[1]));
  });

  ctx.stroke();
}

/**
 * Render the user-selected path with prominent highlighting
 */
function renderSelectedPath(
  context: RenderingContext,
  selectedPath: SelectedPath
): void {
  const { ctx, x, y } = context;

  if (!selectedPath.isValid || selectedPath.edges.length === 0) return;

  // Draw selected path with bright, prominent styling
  ctx.strokeStyle = 'rgba(255, 69, 0, 0.9)'; // Orange-red for high visibility
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add a subtle glow effect
  ctx.shadowColor = 'rgba(255, 69, 0, 0.3)';
  ctx.shadowBlur = 8;

  // Draw as a single connected path
  ctx.beginPath();
  let isFirstEdge = true;

  selectedPath.edges.forEach(edge => {
    if (isFirstEdge) {
      ctx.moveTo(x(edge.from[0]), y(edge.from[1]));
      isFirstEdge = false;
    }
    ctx.lineTo(x(edge.to[0]), y(edge.to[1]));
  });

  ctx.stroke();

  // Clear shadow for subsequent drawing
  ctx.shadowBlur = 0;
}

/**
 * Render individual selected edges with red highlighting
 */
function renderSelectedIndividualEdges(
  context: RenderingContext,
  selectedEdges: Edge[]
): void {
  const { ctx, x, y } = context;

  // Draw each selected edge individually in red
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'; // Bright red
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add a subtle glow effect
  ctx.shadowColor = 'rgba(255, 0, 0, 0.4)';
  ctx.shadowBlur = 6;

  selectedEdges.forEach(edge => {
    ctx.beginPath();
    ctx.moveTo(x(edge.from[0]), y(edge.from[1]));
    ctx.lineTo(x(edge.to[0]), y(edge.to[1]));
    ctx.stroke();
  });

  // Clear shadow for subsequent drawing
  ctx.shadowBlur = 0;
}

/**
 * Render hovered edge with interactive feedback
 */
function renderHoveredEdge(
  context: RenderingContext,
  hoveredEdge: Edge
): void {
  const { ctx, x, y } = context;

  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Bright yellow
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';

  // Add pulsing effect with a slightly larger shadow
  ctx.shadowColor = 'rgba(255, 255, 0, 0.4)';
  ctx.shadowBlur = 6;

  ctx.beginPath();
  ctx.moveTo(x(hoveredEdge.from[0]), y(hoveredEdge.from[1]));
  ctx.lineTo(x(hoveredEdge.to[0]), y(hoveredEdge.to[1]));
  ctx.stroke();

  // Clear shadow
  ctx.shadowBlur = 0;
}

/**
 * Render alignment dots with improved visibility
 */
function renderAlignmentDots(
  context: RenderingContext,
  alignments: Alignment[],
  options: GraphRenderingOptions
): void {
  const { ctx, x, y } = context;

  // Group dots by color for efficient rendering
  const dotsByColor: { [color: string]: Array<{ x: number; y: number }> } = {};

  alignments.forEach(alignment => {
    // Skip optimal path dots if not showing optimal path
    if (!options.showOptimalPath && alignment.color === 'blue') return;

    if (!dotsByColor[alignment.color]) {
      dotsByColor[alignment.color] = [];
    }

    if (alignment.startDot) {
      dotsByColor[alignment.color].push(alignment.startDot);
    }
    if (alignment.endDot) {
      dotsByColor[alignment.color].push(alignment.endDot);
    }
  });

  // Render dots by color
  Object.entries(dotsByColor).forEach(([color, dots]) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = color === 'blue' ? 1 : 0.7;

    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(x(dot.x), y(dot.y), 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  });
}

/**
 * Enhanced edge detection for better user interaction
 * @param mouseX Mouse X coordinate
 * @param mouseY Mouse Y coordinate
 * @param alignments All alignments
 * @param x X scale function
 * @param y Y scale function
 * @param threshold Hit detection threshold in pixels
 * @returns Closest edge or null
 */
export function findClosestEdge(
  mouseX: number,
  mouseY: number,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  threshold: number = 12
): Edge | null {
  let closestEdge: Edge | null = null;
  let minDistance = threshold;

  alignments.forEach(alignment => {
    alignment.edges.forEach(edge => {
      const fromScreen = { x: x(edge.from[0]), y: y(edge.from[1]) };
      const toScreen = { x: x(edge.to[0]), y: y(edge.to[1]) };

      const distance = pointToLineDistance(
        mouseX, mouseY,
        fromScreen.x, fromScreen.y,
        toScreen.x, toScreen.y
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestEdge = edge;
      }
    });
  });

  return closestEdge;
}

/**
 * Calculate distance from point to line segment
 */
function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;

  if (length === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
}

/**
 * Get all edges from alignments for path building
 * @param alignments All alignments
 * @returns Flat array of all edges
 */
export function getAllEdges(alignments: Alignment[]): Edge[] {
  const allEdges: Edge[] = [];
  
  alignments.forEach(alignment => {
    alignment.edges.forEach(edge => {
      allEdges.push(edge);
    });
  });

  return allEdges;
}
