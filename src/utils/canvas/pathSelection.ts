// Path selection utilities for alignment graph
import type { ScaleLinear } from 'd3-scale';
import type { Alignment, Edge } from '../../types/PointGrid';

export interface PathPoint {
  x: number;
  y: number;
}

export interface SelectedPath {
  points: PathPoint[];
  edges: Edge[];
  isValid: boolean;
}

export interface EdgeWithMetadata extends Edge {
  alignmentIndex: number;
  edgeIndex: number;
  screenCoords: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
}

/**
 * Checks if movement from one point to another is valid (right/down only)
 * @param from Starting point
 * @param to Ending point
 * @returns True if movement is valid (only right and/or down)
 */
export function isValidPathDirection(from: PathPoint, to: PathPoint): boolean {
  return to.x >= from.x && to.y >= from.y;
}

/**
 * Finds all edges near a mouse click position
 * @param mouseX Mouse X coordinate in screen space
 * @param mouseY Mouse Y coordinate in screen space
 * @param alignments All alignments containing edges
 * @param x X scale function
 * @param y Y scale function
 * @param threshold Maximum distance in pixels to consider a hit
 * @returns Array of edges near the click position
 */
export function findEdgesNearClick(
  mouseX: number,
  mouseY: number,
  alignments: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  threshold: number = 10
): EdgeWithMetadata[] {
  const nearbyEdges: EdgeWithMetadata[] = [];

  alignments.forEach((alignment, alignmentIndex) => {
    alignment.edges.forEach((edge, edgeIndex) => {
      const fromScreen = {
        x: x(edge.from[0]),
        y: y(edge.from[1])
      };
      const toScreen = {
        x: x(edge.to[0]),
        y: y(edge.to[1])
      };

      // Calculate distance from point to line segment
      const distance = pointToLineSegmentDistance(
        mouseX, mouseY,
        fromScreen.x, fromScreen.y,
        toScreen.x, toScreen.y
      );

      if (distance <= threshold) {
        nearbyEdges.push({
          ...edge,
          alignmentIndex,
          edgeIndex,
          screenCoords: {
            from: fromScreen,
            to: toScreen
          }
        });
      }
    });
  });

  return nearbyEdges;
}

/**
 * Calculates the shortest distance from a point to a line segment
 * @param px Point X
 * @param py Point Y
 * @param x1 Line start X
 * @param y1 Line start Y
 * @param x2 Line end X
 * @param y2 Line end Y
 * @returns Distance in pixels
 */
function pointToLineSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    // Line segment is actually a point
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  // Calculate the parameter t that represents the closest point on the line
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));

  // Find the closest point on the line segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  // Return distance to closest point
  return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
}

/**
 * Builds a path from a starting edge, automatically following connected edges
 * @param startingEdge The edge to start the path from
 * @param allEdges All available edges to connect
 * @param maxLength Maximum path length to prevent infinite loops
 * @returns Selected path object
 */
export function buildPathFromEdge(
  startingEdge: Edge,
  allEdges: Edge[],
  maxLength: number = 1000
): SelectedPath {
  const pathPoints: PathPoint[] = [
    { x: startingEdge.from[0], y: startingEdge.from[1] },
    { x: startingEdge.to[0], y: startingEdge.to[1] }
  ];
  const pathEdges: Edge[] = [startingEdge];
  
  let currentPoint = { x: startingEdge.to[0], y: startingEdge.to[1] };
  let pathLength = 1;

  // Keep extending the path by finding connected edges
  while (pathLength < maxLength) {
    // Find edges that start from the current point and move right/down
    const nextEdges = allEdges.filter(edge => 
      edge.from[0] === currentPoint.x && 
      edge.from[1] === currentPoint.y &&
      isValidPathDirection(currentPoint, { x: edge.to[0], y: edge.to[1] }) &&
      !pathEdges.some(existingEdge => 
        existingEdge.from[0] === edge.from[0] && 
        existingEdge.from[1] === edge.from[1] &&
        existingEdge.to[0] === edge.to[0] && 
        existingEdge.to[1] === edge.to[1]
      )
    );

    if (nextEdges.length === 0) {
      // No more valid edges to extend the path
      break;
    }

    // Choose the edge with highest probability, or first one if tied
    const nextEdge = nextEdges.reduce((best, current) => 
      current.probability > best.probability ? current : best
    );

    pathEdges.push(nextEdge);
    pathPoints.push({ x: nextEdge.to[0], y: nextEdge.to[1] });
    currentPoint = { x: nextEdge.to[0], y: nextEdge.to[1] };
    pathLength++;
  }

  return {
    points: pathPoints,
    edges: pathEdges,
    isValid: pathEdges.length > 0
  };
}

/**
 * Generates a text alignment from a selected path
 * @param selectedPath The path through the graph
 * @param representative Representative sequence
 * @param member Member sequence
 * @returns Text alignment showing the path
 */
export function generateAlignmentFromPath(
  selectedPath: SelectedPath,
  representative: string,
  member: string
): { alignedRep: string; alignedMem: string; score: number } {
  if (!selectedPath.isValid || selectedPath.points.length === 0) {
    return { alignedRep: '', alignedMem: '', score: 0 };
  }

  let alignedRep = '';
  let alignedMem = '';
  let score = 0;

  for (let i = 0; i < selectedPath.edges.length; i++) {
    const edge = selectedPath.edges[i];
    const fromX = edge.from[0];
    const fromY = edge.from[1];
    const toX = edge.to[0];
    const toY = edge.to[1];

    // Add to score based on edge probability
    score += edge.probability;

    // Determine the type of move and add appropriate characters
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;

    if (deltaX === 1 && deltaY === 1) {
      // Diagonal move: alignment of both sequences
      alignedRep += representative[fromX] || 'X';
      alignedMem += member[fromY] || 'X';
    } else if (deltaX === 1 && deltaY === 0) {
      // Horizontal move: gap in member sequence
      alignedRep += representative[fromX] || 'X';
      alignedMem += '-';
    } else if (deltaX === 0 && deltaY === 1) {
      // Vertical move: gap in representative sequence
      alignedRep += '-';
      alignedMem += member[fromY] || 'X';
    } else {
      // Multi-step move: handle complex gaps
      // Add gaps/characters based on the difference
      for (let dx = 0; dx < deltaX; dx++) {
        alignedRep += representative[fromX + dx] || 'X';
        alignedMem += '-';
      }
      for (let dy = 0; dy < deltaY; dy++) {
        alignedRep += '-';
        alignedMem += member[fromY + dy] || 'X';
      }
    }
  }

  return {
    alignedRep,
    alignedMem,
    score: score / selectedPath.edges.length // Average probability
  };
}

/**
 * Validates that a path follows the graph constraints
 * @param path Path to validate
 * @param availableEdges All available edges in the graph
 * @returns True if the path is valid
 */
export function validatePath(path: SelectedPath, availableEdges: Edge[]): boolean {
  if (!path.isValid || path.edges.length === 0) {
    return false;
  }

  // Check each edge in the path
  for (const pathEdge of path.edges) {
    // Verify edge exists in available edges
    const edgeExists = availableEdges.some(edge =>
      edge.from[0] === pathEdge.from[0] &&
      edge.from[1] === pathEdge.from[1] &&
      edge.to[0] === pathEdge.to[0] &&
      edge.to[1] === pathEdge.to[1]
    );

    if (!edgeExists) {
      return false;
    }

    // Verify direction constraint (right/down only)
    if (!isValidPathDirection(
      { x: pathEdge.from[0], y: pathEdge.from[1] },
      { x: pathEdge.to[0], y: pathEdge.to[1] }
    )) {
      return false;
    }
  }

  // Check path continuity
  for (let i = 0; i < path.edges.length - 1; i++) {
    const currentEdge = path.edges[i];
    const nextEdge = path.edges[i + 1];

    if (currentEdge.to[0] !== nextEdge.from[0] || 
        currentEdge.to[1] !== nextEdge.from[1]) {
      return false; // Path is not continuous
    }
  }

  return true;
}
