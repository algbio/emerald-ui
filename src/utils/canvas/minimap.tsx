import * as d3 from "d3";
import type { Alignment } from "../../types/PointGrid";

/**
 * Draws a minimap in the top-right corner of the canvas showing the entire grid
 * with safety windows, alignments, and the current viewport
 */
export const drawMinimap = (
  ctx: CanvasRenderingContext2D,
  options: {
    // Canvas and layout dimensions
    width: number;
    height: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    
    // Data and scales
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
    representative: string;
    member: string;
    alignments: Alignment[];
    safetyWindows: Alignment[];
    
    // Minimap configuration
    minimapSize: number;
    minimapPadding: number;
    showMinimap: boolean;
  }
) => {
  const {
    width, height, marginTop, marginRight, marginBottom, marginLeft,
    x, y, representative, member, alignments, safetyWindows,
    minimapSize, minimapPadding, showMinimap
  } = options;
  
  if (!showMinimap) return null;
  
  // Calculate minimap position - top right corner
  const minimapX = width - minimapSize - minimapPadding/2;
  const minimapY = minimapPadding;
  
  // Create scales for the minimap that show the entire plot
  const minimapXScale = d3.scaleLinear()
    .domain([0, representative.length])
    .range([0, minimapSize]);
    
  const minimapYScale = d3.scaleLinear()
    .domain([0, member.length])
    .range([0, minimapSize]);
  
  // Draw minimap background
  ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
  ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
  
  // Draw safety windows in minimap
  ctx.globalAlpha = 0.6;
  safetyWindows.forEach(window => {
    if (!window.startDot || !window.endDot) return;
    
    const startX = minimapX + minimapXScale(window.startDot.x);
    const startY = minimapY + minimapYScale(window.startDot.y);
    const endX = minimapX + minimapXScale(window.endDot.x);
    const endY = minimapY + minimapYScale(window.endDot.y);
    
    ctx.fillStyle = 'rgba(0, 180, 0, 0.5)';  // Green safety windows
    ctx.fillRect(startX, startY, endX - startX, endY - startY);
  });
  
  // Draw all alignment lines in minimap
  alignments.forEach(alignment => {
    if (!alignment.startDot || !alignment.endDot) return;
    
    const startX = minimapX + minimapXScale(alignment.startDot.x);
    const startY = minimapY + minimapYScale(alignment.startDot.y);
    const endX = minimapX + minimapXScale(alignment.endDot.x);
    const endY = minimapY + minimapYScale(alignment.endDot.y);
    
    // Draw the alignment line
    ctx.strokeStyle = 'rgba(100, 100, 100, 1)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw alignment dots
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(startX, startY, 2, 0, Math.PI * 2);
    ctx.arc(endX, endY, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;
  
  // Calculate visible area in the minimap
  const xMin = x.invert(marginLeft);
  const yMin = y.invert(marginTop);
  const xMax = x.invert(width - marginRight);
  const yMax = y.invert(height - marginBottom);
  
  // Calculate viewport position and size
  let viewportX = minimapX + minimapXScale(xMin);
  let viewportY = minimapY + minimapYScale(yMin);
  let viewportWidth = minimapXScale(xMax) - minimapXScale(xMin);
  let viewportHeight = minimapYScale(yMax) - minimapYScale(yMin);
  
  // Constrain viewport rectangle to stay within minimap boundaries
  const minimapRight = minimapX + minimapSize;
  const minimapBottom = minimapY + minimapSize;
  
  // Adjust viewport position if it goes outside minimap
  viewportX = Math.max(minimapX, viewportX);
  viewportY = Math.max(minimapY, viewportY);
  
  // Adjust viewport size if it goes outside minimap
  if (viewportX + viewportWidth > minimapRight) {
    viewportWidth = minimapRight - viewportX;
  }
  
  if (viewportY + viewportHeight > minimapBottom) {
    viewportHeight = minimapBottom - viewportY;
  }
  
  // Draw viewport rectangle
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  ctx.lineWidth = 1;
  
  // Return minimap info for interaction
  return {
    x: minimapX,
    y: minimapY,
    width: minimapSize,
    height: minimapSize,
    xScale: minimapXScale,
    yScale: minimapYScale
  };
};

/**
 * Checks if a mouse event is within the minimap and handles interactions
 */
export const handleMinimapInteraction = (
  event: React.MouseEvent,
  options: {
    // Basic setup
    canvas: HTMLCanvasElement | null;
    isDragging: boolean;
    isMinimapDragging: boolean;
    
    // Dimensions
    width: number;
    height: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    minimapSize: number;
    minimapPadding: number;
    showMinimap: boolean;
    
    // Data and scales
    transform: d3.ZoomTransform;
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
    representative: string;
    member: string;
  },
  setTransformFn: (transform: d3.ZoomTransform) => void
): boolean => {
  const {
    canvas, isDragging, isMinimapDragging, 
    width, height, marginTop, marginRight, marginBottom, marginLeft,
    minimapSize, minimapPadding, showMinimap,
    transform, x, y, representative, member
  } = options;

  if (!showMinimap || (!isDragging && !isMinimapDragging) || !canvas) return false;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  // Calculate minimap position and dimensions
  const minimapX = width - minimapSize - minimapPadding/2;
  const minimapY = minimapPadding;
  
  // Check if the mouse is inside the minimap
  const isInMinimap = mouseX >= minimapX && mouseX <= minimapX + minimapSize &&
                     mouseY >= minimapY && mouseY <= minimapY + minimapSize;
  
  if (isDragging || isInMinimap) {
    // Convert minimap coordinates to plot coordinates
    const minimapXScale = d3.scaleLinear()
      .domain([0, minimapSize])
      .range([0, representative.length]);
      
    const minimapYScale = d3.scaleLinear()
      .domain([0, minimapSize])
      .range([0, member.length]);
    
    // Get target center point in data space
    const targetX = minimapXScale(mouseX - minimapX);
    const targetY = minimapYScale(mouseY - minimapY);
    
    // Current view center in data space
    const currentViewCenterX = (x.invert(marginLeft) + x.invert(width - marginRight)) / 2;
    const currentViewCenterY = (y.invert(marginTop) + y.invert(height - marginBottom)) / 2;
    
    // Calculate needed translation to center the view on the target point
    const translateX = x(currentViewCenterX) - x(targetX);
    const translateY = y(currentViewCenterY) - y(targetY);
    
    // Apply the new transform
    const newTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(transform.k);
    
    setTransformFn(newTransform);
    
    return true;
  }
  
  return false;
};

/**
 * Checks if a mouse down event occurs within the minimap
 */
export const isMouseInMinimap = (
  event: React.MouseEvent,
  options: {
    canvas: HTMLCanvasElement | null;
    width: number;
    minimapSize: number;
    minimapPadding: number;
  }
): boolean => {
  const { canvas, width, minimapSize, minimapPadding } = options;
  
  if (!canvas) return false;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  // Calculate minimap position
  const minimapX = width - minimapSize - minimapPadding/2;
  const minimapY = minimapPadding;
  
  // Check if the mouse is inside the minimap
  return mouseX >= minimapX && mouseX <= minimapX + minimapSize &&
         mouseY >= minimapY && mouseY <= minimapY + minimapSize;
};
