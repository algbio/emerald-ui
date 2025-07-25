/**
 * Utility functions for exporting canvas content as SVG
 */

import * as d3 from "d3";
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';

// Interface for SVG export context - similar to canvas drawing functions
interface SVGContext {
  svg: d3.Selection<any, any, null, undefined>;
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
  fontSize: number;
}

// Interface for safety window bounds
// interface SafetyWindowBounds {
//   xStart?: number;
//   xEnd?: number;
//   yStart?: number;
//   yEnd?: number;
// }

/**
 * Draw SVG axes (equivalent to canvas drawAxes)
 */
function drawSVGAxes(ctx: SVGContext) {
  const { svg, marginTop, marginLeft, width, height } = ctx;
  
  // X axis line
  svg.append('line')
    .attr('x1', marginLeft)
    .attr('y1', marginTop)
    .attr('x2', width)
    .attr('y2', marginTop)
    .attr('stroke', 'black')
    .attr('stroke-width', 1);
    
  // Y axis line  
  svg.append('line')
    .attr('x1', marginLeft)
    .attr('y1', marginTop)
    .attr('x2', marginLeft)
    .attr('y2', height)
    .attr('stroke', 'black')
    .attr('stroke-width', 1);
}

/**
 * Draw SVG grid lines (equivalent to canvas drawGridLines)
 */
function drawSVGGrid(
  ctx: SVGContext,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>
) {
  const { svg, x, y, marginTop, marginLeft, width, height, marginRight, marginBottom } = ctx;
  
  const gridGroup = svg.append('g').attr('class', 'grid');
  
  // Vertical grid lines (X ticks)
  xTicks.forEach(tick => {
    const xPos = x(tick.value + 0.5);
    if (xPos >= marginLeft && xPos <= width - marginRight) {
      gridGroup.append('line')
        .attr('x1', xPos)
        .attr('y1', marginTop)
        .attr('x2', xPos)
        .attr('y2', height - marginBottom)
        .attr('stroke', '#f0f0f0')
        .attr('stroke-width', 0.5);
    }
  });
  
  // Horizontal grid lines (Y ticks)
  yTicks.forEach(tick => {
    const yPos = y(tick.value + 0.5);
    if (yPos >= marginTop && yPos <= height - marginBottom) {
      gridGroup.append('line')
        .attr('x1', marginLeft)
        .attr('y1', yPos)
        .attr('x2', width - marginRight)
        .attr('y2', yPos)
        .attr('stroke', '#f0f0f0')
        .attr('stroke-width', 0.5);
    }
  });
}

/**
 * Draw SVG axis labels (equivalent to canvas drawAxisLabels)
 */
function drawSVGAxisLabels(
  ctx: SVGContext,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>,
  isInSafetyWindow: (position: number, axis: 'x' | 'y') => boolean
) {
  const { svg, x, y, marginTop, marginLeft, fontSize, width, height } = ctx;
  
  const labelsGroup = svg.append('g').attr('class', 'axis-labels');
  
  // X axis labels (sequence characters)
  const xLabelsGroup = labelsGroup.append('g').attr('class', 'x-labels');
  xTicks.forEach(tick => {
    if (tick.label && tick.value >= 0) {
      const xPos = x(tick.value + 0.5);
      if (xPos >= marginLeft && xPos <= width) {
        const isInSafety = isInSafetyWindow(tick.value, 'x');
        xLabelsGroup.append('text')
          .attr('x', xPos)
          .attr('y', marginTop - 10)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'bottom')
          .attr('font-family', 'monospace')
          .attr('font-size', `${Math.max(10, fontSize * 0.9)}px`)
          .attr('font-weight', isInSafety ? 'bold' : 'normal')
          .attr('fill', isInSafety ? 'green' : '#333')
          .text(tick.label);
      }
    }
  });
  
  // Y axis labels (sequence characters)
  const yLabelsGroup = labelsGroup.append('g').attr('class', 'y-labels');
  yTicks.forEach(tick => {
    if (tick.label && tick.value >= 0) {
      const yPos = y(tick.value + 0.5);
      if (yPos >= marginTop && yPos <= height) {
        const isInSafety = isInSafetyWindow(tick.value, 'y');
        yLabelsGroup.append('text')
          .attr('x', marginLeft - 10)
          .attr('y', yPos)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', `${Math.max(10, fontSize * 0.9)}px`)
          .attr('font-weight', isInSafety ? 'bold' : 'normal')
          .attr('fill', isInSafety ? 'green' : '#333')
          .text(tick.label);
      }
    }
  });
  
  // X axis index markers (position numbers)
  const xIndexGroup = labelsGroup.append('g').attr('class', 'x-indices');
  const xStart = Math.max(0, Math.floor(x.invert(marginLeft)));
  const xEnd = Math.min(xTicks.length, Math.ceil(x.invert(width)));
  const xMiddle = Math.floor((xStart + xEnd) / 2);
  
  [xStart, xMiddle, xEnd].forEach((index) => {
    if (index >= 0 && index < xTicks.length && index >= xStart && index < xEnd) {
      const xPos = x(index + 0.5);
      if (xPos >= marginLeft && xPos <= width) {
        const isInSafety = isInSafetyWindow(index, 'x');
        xIndexGroup.append('text')
          .attr('x', xPos)
          .attr('y', marginTop - 30)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'bottom')
          .attr('font-family', 'monospace')
          .attr('font-size', `${Math.max(10, fontSize * 0.8)}px`)
          .attr('font-weight', isInSafety ? 'bold' : 'normal')
          .attr('fill', isInSafety ? 'green' : '#555')
          .text((index + 1).toString());
      }
    }
  });
  
  // Y axis index markers (position numbers)
  const yIndexGroup = labelsGroup.append('g').attr('class', 'y-indices');
  const yStart = Math.max(0, Math.floor(y.invert(marginTop)));
  const yEnd = Math.min(yTicks.length, Math.ceil(y.invert(height)));
  const yMiddle = Math.floor((yStart + yEnd) / 2);
  
  [yStart, yMiddle, yEnd].forEach((index) => {
    if (index >= 0 && index < yTicks.length && index >= yStart && index < yEnd) {
      const yPos = y(index + 0.5);
      if (yPos >= marginTop && yPos <= height) {
        const isInSafety = isInSafetyWindow(index, 'y');
        yIndexGroup.append('text')
          .attr('x', marginLeft - 30)
          .attr('y', yPos)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', `${Math.max(10, fontSize * 0.8)}px`)
          .attr('font-weight', isInSafety ? 'bold' : 'normal')
          .attr('fill', isInSafety ? 'green' : '#555')
          .text((index + 1).toString());
      }
    }
  });
}

/**
 * Draw SVG safety windows (equivalent to canvas drawSafetyWindows)
 */
function drawSVGSafetyWindows(
  ctx: SVGContext,
  safetyWindows: Alignment[]
) {
  const { svg, x, y, marginTop, marginLeft, fontSize } = ctx;
  
  const safetyGroup = svg.append('g').attr('class', 'safety-windows');
  
  safetyWindows.forEach((window, index) => {
    if (!window.startDot || !window.endDot) return;
    
    const startX = x(window.startDot.x);
    const endX = x(window.endDot.x);
    const startY = y(window.startDot.y);
    const endY = y(window.endDot.y);
    
    const bracketHeight = fontSize * 1.5;
    const bracketWidth = fontSize * 0.8;
    const bracketThickness = Math.max(1, fontSize * 0.1);
    
    const windowGroup = safetyGroup.append('g').attr('class', `safety-window-${index}`);
    
    // X axis bracket (top)
    const xBracketGroup = windowGroup.append('g').attr('class', 'x-bracket');
    
    // Horizontal line
    xBracketGroup.append('line')
      .attr('x1', startX)
      .attr('y1', marginTop - bracketHeight - 5)
      .attr('x2', endX)
      .attr('y2', marginTop - bracketHeight - 5)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Left vertical line
    xBracketGroup.append('line')
      .attr('x1', startX)
      .attr('y1', marginTop - 5)
      .attr('x2', startX)
      .attr('y2', marginTop - bracketHeight - 5)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Right vertical line
    xBracketGroup.append('line')
      .attr('x1', endX)
      .attr('y1', marginTop - 5)
      .attr('x2', endX)
      .attr('y2', marginTop - bracketHeight - 5)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Y axis bracket (left)
    const yBracketGroup = windowGroup.append('g').attr('class', 'y-bracket');
    
    // Background rectangle for better visibility
    const rectLeft = Math.max(0, marginLeft - bracketWidth - 5);
    const rectWidth = Math.min(bracketWidth, marginLeft - 5);
    
    yBracketGroup.append('rect')
      .attr('x', rectLeft)
      .attr('y', startY)
      .attr('width', rectWidth)
      .attr('height', endY - startY)
      .attr('fill', 'rgba(144, 238, 144, 0.6)')
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Vertical line
    yBracketGroup.append('line')
      .attr('x1', marginLeft - 5 - bracketThickness/2)
      .attr('y1', startY)
      .attr('x2', marginLeft - 5 - bracketThickness/2)
      .attr('y2', endY)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Top horizontal line
    yBracketGroup.append('line')
      .attr('x1', rectLeft)
      .attr('y1', startY)
      .attr('x2', marginLeft - 5)
      .attr('y2', startY)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
    
    // Bottom horizontal line
    yBracketGroup.append('line')
      .attr('x1', rectLeft)
      .attr('y1', endY)
      .attr('x2', marginLeft - 5)
      .attr('y2', endY)
      .attr('stroke', 'green')
      .attr('stroke-width', bracketThickness);
  });
}

/**
 * Draw SVG alignment edges (equivalent to canvas drawAlignmentEdges)
 */
function drawSVGAlignmentEdges(
  ctx: SVGContext,
  alignments: Alignment[]
) {
  const { svg, x, y } = ctx;
  
  const edgesGroup = svg.append('g').attr('class', 'alignment-edges');
  
  alignments.forEach((alignment, alignIndex) => {
    alignment.edges.forEach((edge, edgeIndex) => {
      const [fromX, fromY] = edge.from;
      const [toX, toY] = edge.to;
      
      const opacity = Math.max(0.5, edge.probability);
      const strokeWidth = Math.max(2, edge.probability * 4);
      
      edgesGroup.append('line')
        .attr('x1', x(fromX))
        .attr('y1', y(fromY))
        .attr('x2', x(toX))
        .attr('y2', y(toY))
        .attr('stroke', alignment.color || '#666')
        .attr('stroke-width', strokeWidth)
        .attr('opacity', opacity)
        .attr('class', `alignment-${alignIndex}-edge-${edgeIndex}`);
    });
  });
}

/**
 * Draw SVG alignment dots (equivalent to canvas drawAlignmentDots)
 */
function drawSVGAlignmentDots(
  ctx: SVGContext,
  alignments: Alignment[]
) {
  const { svg, x, y } = ctx;
  
  const dotsGroup = svg.append('g').attr('class', 'alignment-dots');
  
  alignments.forEach((alignment, index) => {
    const color = alignment.color || "orange";
    
    if (alignment.startDot) {
      dotsGroup.append('circle')
        .attr('cx', x(alignment.startDot.x))
        .attr('cy', y(alignment.startDot.y))
        .attr('r', 5)
        .attr('fill', color)
        .attr('class', `alignment-${index}-start-dot`);
    }
    
    if (alignment.endDot) {
      dotsGroup.append('circle')
        .attr('cx', x(alignment.endDot.x))
        .attr('cy', y(alignment.endDot.y))
        .attr('r', 5)
        .attr('fill', color)
        .attr('class', `alignment-${index}-end-dot`);
    }
  });
}

/**
 * Draw SVG minimap (equivalent to canvas drawMinimap)
 */
function drawSVGMinimap(
  ctx: SVGContext,
  alignments: Alignment[],
  safetyWindows: Alignment[],
  representative: string,
  member: string,
  minimapSize: number,
  minimapPadding: number
) {
  const { svg, x, y, width, height, marginTop, marginRight } = ctx;
  
  const minimapGroup = svg.append('g').attr('class', 'minimap');
  
  const minimapX = width - minimapSize - minimapPadding;
  const minimapY = marginTop + 20;
  
  // Background
  minimapGroup.append('rect')
    .attr('x', minimapX)
    .attr('y', minimapY)
    .attr('width', minimapSize)
    .attr('height', minimapSize)
    .attr('fill', 'white')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1);
  
  // Minimap scales
  const minimapXScale = d3.scaleLinear()
    .domain([0, representative.length])
    .range([0, minimapSize]);
    
  const minimapYScale = d3.scaleLinear()
    .domain([0, member.length])
    .range([0, minimapSize]);
  
  // Draw safety windows in minimap
  const minimapSafetyGroup = minimapGroup.append('g').attr('class', 'minimap-safety-windows');
  safetyWindows.forEach((window, index) => {
    if (!window.startDot || !window.endDot) return;
    
    const startX = minimapX + minimapXScale(window.startDot.x);
    const startY = minimapY + minimapYScale(window.startDot.y);
    const endX = minimapX + minimapXScale(window.endDot.x);
    const endY = minimapY + minimapYScale(window.endDot.y);
    
    minimapSafetyGroup.append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', endX - startX)
      .attr('height', endY - startY)
      .attr('fill', 'rgba(0, 180, 0, 0.5)')
      .attr('class', `minimap-safety-window-${index}`);
  });
  
  // Draw alignment lines in minimap
  const minimapAlignmentGroup = minimapGroup.append('g').attr('class', 'minimap-alignments');
  alignments.forEach((alignment, index) => {
    if (!alignment.startDot || !alignment.endDot) return;
    
    const startX = minimapX + minimapXScale(alignment.startDot.x);
    const startY = minimapY + minimapYScale(alignment.startDot.y);
    const endX = minimapX + minimapXScale(alignment.endDot.x);
    const endY = minimapY + minimapYScale(alignment.endDot.y);
    
    // Line
    minimapAlignmentGroup.append('line')
      .attr('x1', startX)
      .attr('y1', startY)
      .attr('x2', endX)
      .attr('y2', endY)
      .attr('stroke', 'rgba(100, 100, 100, 1)')
      .attr('stroke-width', 1)
      .attr('class', `minimap-alignment-${index}`);
    
    // Dots
    minimapAlignmentGroup.append('circle')
      .attr('cx', startX)
      .attr('cy', startY)
      .attr('r', 2)
      .attr('fill', 'rgba(0, 0, 0, 0.7)')
      .attr('class', `minimap-alignment-${index}-start`);
      
    minimapAlignmentGroup.append('circle')
      .attr('cx', endX)
      .attr('cy', endY)
      .attr('r', 2)
      .attr('fill', 'rgba(0, 0, 0, 0.7)')
      .attr('class', `minimap-alignment-${index}-end`);
  });
  
  // Draw viewport indicator
  const xMin = x.invert(marginTop);
  const yMin = y.invert(marginTop);
  const xMax = x.invert(width - marginRight);
  const yMax = y.invert(height);
  
  const viewportX = minimapX + minimapXScale(Math.max(0, xMin));
  const viewportY = minimapY + minimapYScale(Math.max(0, yMin));
  const viewportWidth = minimapXScale(Math.min(representative.length, xMax)) - minimapXScale(Math.max(0, xMin));
  const viewportHeight = minimapYScale(Math.min(member.length, yMax)) - minimapYScale(Math.max(0, yMin));
  
  minimapGroup.append('rect')
    .attr('x', viewportX)
    .attr('y', viewportY)
    .attr('width', viewportWidth)
    .attr('height', viewportHeight)
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 2)
    .attr('class', 'minimap-viewport');
}

/**
 * Export the current canvas state as an SVG
 */
export const exportCanvasAsSVG = (
  canvas: HTMLCanvasElement,
  alignments: Alignment[],
  representative: string,
  member: string,
  xTicks: Array<{value: number; label: string}>,
  yTicks: Array<{value: number; label: string}>,
  currentTransform: any,
  visualizationSettings: any,
  filename: string = 'alignment-graph.svg'
): void => {
  try {
    const width = canvas.width;
    const height = canvas.height;
    // Use the same margins as the canvas component
    const marginTop = 80;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 80;
    const minimapSize = 250;
    const minimapPadding = 100;

    // Create SVG element
    const svg = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    // Set up scales exactly like the canvas - this is critical for matching the view
    let x = d3.scaleLinear()
      .domain([0, representative.length])
      .range([marginLeft, width - marginRight]);
    
    let y = d3.scaleLinear()
      .domain([0, member.length])
      .range([marginTop, height - marginBottom]);

    // Apply current transform exactly as in canvas to match the current view
    if (currentTransform) {
      // Apply transform to get the same zoom/pan as canvas
      x = currentTransform.rescaleX(x);
      y = currentTransform.rescaleY(y);
    }

    // Calculate fontSize based on transform scale (same logic as usePointGridScales)
    const baseSize = 12;
    const scale = currentTransform ? currentTransform.k : 1;
    const fontSize = Math.max(8, Math.min(24, baseSize * Math.sqrt(scale)));

    const ctx: SVGContext = {
      svg,
      width,
      height,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      x,
      y,
      fontSize
    };

    // Set background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'white');

    // Apply clipping for the main plot area
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-area')
      .append('rect')
      .attr('x', marginLeft)
      .attr('y', marginTop)
      .attr('width', width - marginLeft - marginRight)
      .attr('height', height - marginTop - marginBottom);

    // Filter safety windows
    const safetyWindows = alignments.filter(alignment => 
      alignment.startDot && alignment.endDot
    );

    // Helper function to check if position is in safety window
    const isInSafetyWindow = (position: number, axis: 'x' | 'y'): boolean => {
      return safetyWindows.some(window => {
        if (!window.startDot || !window.endDot) return false;
        if (axis === 'x') {
          return position >= window.startDot.x && position <= window.endDot.x;
        } else {
          return position >= window.startDot.y && position <= window.endDot.y;
        }
      });
    };

    // Draw elements based on visualization settings
    if (visualizationSettings.showSafetyWindows) {
      drawSVGSafetyWindows(ctx, safetyWindows);
    }

    if (visualizationSettings.showAxes) {
      drawSVGAxes(ctx);
    }

    if (visualizationSettings.showAxisLabels) {
      drawSVGAxisLabels(ctx, xTicks, yTicks, isInSafetyWindow);
    }

    // Create a group with clipping for main plot elements
    const plotGroup = svg.append('g').attr('clip-path', 'url(#plot-area)');

    if (visualizationSettings.showGrid) {
      drawSVGGrid({...ctx, svg: plotGroup}, xTicks, yTicks);
    }

    if (visualizationSettings.showAlignmentEdges) {
      drawSVGAlignmentEdges({...ctx, svg: plotGroup}, alignments);
    }

    if (visualizationSettings.showAlignmentDots) {
      drawSVGAlignmentDots({...ctx, svg: plotGroup}, alignments);
    }

    if (visualizationSettings.showMinimap) {
      drawSVGMinimap(ctx, alignments, safetyWindows, representative, member, minimapSize, minimapPadding);
    }

    // Create download link
    const svgString = svg.node()?.outerHTML;
    if (!svgString) {
      throw new Error('Failed to generate SVG content');
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export canvas as SVG:', error);
    throw new Error('Failed to export SVG. Please try again.');
  }
};

/**
 * Generate a filename for SVG export
 */
export const generateSVGFilename = (
  descriptorA?: string, 
  descriptorB?: string
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  if (descriptorA && descriptorB) {
    // Clean descriptors for filename (remove special characters)
    const cleanA = descriptorA.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const cleanB = descriptorB.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    return `emerald_alignment_${cleanA}_vs_${cleanB}_${timestamp}.svg`;
  }
  
  return `emerald_alignment_${timestamp}.svg`;
};
