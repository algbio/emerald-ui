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
    console.warn('Path validation failed: path.isValid =', path.isValid, 'path.edges.length =', path.edges.length);
    return false;
  }

  // Check each edge in the path
  for (let i = 0; i < path.edges.length; i++) {
    const pathEdge = path.edges[i];
    
    // Verify edge exists in available edges
    const edgeExists = availableEdges.some(edge =>
      edge.from[0] === pathEdge.from[0] &&
      edge.from[1] === pathEdge.from[1] &&
      edge.to[0] === pathEdge.to[0] &&
      edge.to[1] === pathEdge.to[1]
    );

    if (!edgeExists) {
      console.warn(`Path validation failed: Edge ${i} from (${pathEdge.from[0]}, ${pathEdge.from[1]}) to (${pathEdge.to[0]}, ${pathEdge.to[1]}) does not exist in available edges`);
      return false;
    }

    // Verify direction constraint (right/down only)
    if (!isValidPathDirection(
      { x: pathEdge.from[0], y: pathEdge.from[1] },
      { x: pathEdge.to[0], y: pathEdge.to[1] }
    )) {
      console.warn(`Path validation failed: Edge ${i} from (${pathEdge.from[0]}, ${pathEdge.from[1]}) to (${pathEdge.to[0]}, ${pathEdge.to[1]}) violates direction constraint (must be right/down only)`);
      return false;
    }
  }

  // Check path continuity
  for (let i = 0; i < path.edges.length - 1; i++) {
    const currentEdge = path.edges[i];
    const nextEdge = path.edges[i + 1];

    if (currentEdge.to[0] !== nextEdge.from[0] || 
        currentEdge.to[1] !== nextEdge.from[1]) {
      console.warn(`Path validation failed: Path is not continuous between edge ${i} ending at (${currentEdge.to[0]}, ${currentEdge.to[1]}) and edge ${i + 1} starting at (${nextEdge.from[0]}, ${nextEdge.from[1]})`);
      return false; // Path is not continuous
    }
  }

  console.log('Path validation passed for path with', path.edges.length, 'edges');
  return true;
}

/**
 * Builds a complete path that goes through all selected edges
 * This creates a full path from (0,0) to the bottom-right corner that passes through selected edges
 * @param selectedEdges Array of individual edges to connect
 * @param allEdges All available edges in the graph
 * @param graphWidth Width of the graph (representative sequence length)
 * @param graphHeight Height of the graph (member sequence length)
 * @returns Selected path object that connects all selected edges in a complete path
 */
export function buildPathThroughSelectedEdges(
  selectedEdges: Edge[],
  allEdges: Edge[],
  graphWidth?: number,
  graphHeight?: number
): SelectedPath {
  console.log('buildPathThroughSelectedEdges called with:');
  console.log('- selectedEdges count:', selectedEdges.length);
  console.log('- selectedEdges:', selectedEdges);
  console.log('- graphWidth:', graphWidth, 'graphHeight:', graphHeight);

  // CRITICAL FIX: Filter out self-loop edges before processing
  const validAllEdges = allEdges.filter(edge => 
    !(edge.from[0] === edge.to[0] && edge.from[1] === edge.to[1])
  );
  
  console.log(`Filtered out ${allEdges.length - validAllEdges.length} self-loop edges from available edges`);

  if (selectedEdges.length === 0) {
    console.log('No selected edges, returning invalid path');
    return { points: [], edges: [], isValid: false };
  }

  // If only one edge selected, build a complete path that goes through it
  if (selectedEdges.length === 1) {
    console.log('Single edge selected, building complete path through it');
    const result = buildCompletePathThroughEdge(selectedEdges[0], validAllEdges, graphWidth, graphHeight);
    console.log('Single edge path result:', result);
    return result;
  }

  // Sort selected edges to find a logical order (from top-left to bottom-right)
  const sortedEdges = [...selectedEdges].sort((a, b) => {
    // Primary sort: by start position (top-left first)
    const aStart = a.from[0] + a.from[1];
    const bStart = b.from[0] + b.from[1];
    return aStart - bStart;
  });

  console.log('Sorted edges for path building:', sortedEdges);

  // Build complete path from (0,0) to end that goes through all selected edges
  const pathPoints: PathPoint[] = [];
  const pathEdges: Edge[] = [];
  let pathIsValid = true;

  // Start from (0,0)
  let currentPoint = { x: 0, y: 0 };
  pathPoints.push(currentPoint);
  console.log('Starting path construction from (0,0)');
  
  // Connect to each selected edge in order
  for (let i = 0; i < sortedEdges.length; i++) {
    const targetEdge = sortedEdges[i];
    const targetStart = { x: targetEdge.from[0], y: targetEdge.from[1] };
    
    console.log(`Processing edge ${i}: from (${targetEdge.from[0]}, ${targetEdge.from[1]}) to (${targetEdge.to[0]}, ${targetEdge.to[1]})`);
    console.log(`Current point: (${currentPoint.x}, ${currentPoint.y}), Target start: (${targetStart.x}, ${targetStart.y})`);
    
    // If we're not already at the target edge start, find path to it
    if (currentPoint.x !== targetStart.x || currentPoint.y !== targetStart.y) {
      console.log('Need to find intermediate path from current point to target edge start');
      const intermediatePath = findPathBetweenPoints(currentPoint, targetStart, validAllEdges);
      console.log('Intermediate path found:', intermediatePath.length, 'edges');
      
      if (intermediatePath.length > 0) {
        // Validate each intermediate edge before adding
        for (const edge of intermediatePath) {
          if (!isValidPathDirection({ x: edge.from[0], y: edge.from[1] }, { x: edge.to[0], y: edge.to[1] })) {
            console.error(`Invalid intermediate edge direction: from (${edge.from[0]}, ${edge.from[1]}) to (${edge.to[0]}, ${edge.to[1]})`);
            pathIsValid = false;
            break;
          }
        }
        
        if (pathIsValid) {
          pathEdges.push(...intermediatePath);
          pathPoints.push(...intermediatePath.map(edge => ({ x: edge.to[0], y: edge.to[1] })));
          currentPoint = { x: intermediatePath[intermediatePath.length - 1].to[0], y: intermediatePath[intermediatePath.length - 1].to[1] };
          console.log('After intermediate path, current point:', currentPoint);
        } else {
          break;
        }
      } else {
        console.error('Could not find intermediate path from', currentPoint, 'to', targetStart);
        pathIsValid = false;
        break;
      }
    } else {
      console.log('Already at target edge start, no intermediate path needed');
    }
    
    // Validate the target edge direction
    if (!isValidPathDirection({ x: targetEdge.from[0], y: targetEdge.from[1] }, { x: targetEdge.to[0], y: targetEdge.to[1] })) {
      console.error(`Invalid target edge direction: from (${targetEdge.from[0]}, ${targetEdge.from[1]}) to (${targetEdge.to[0]}, ${targetEdge.to[1]})`);
      pathIsValid = false;
      break;
    }
    
    // Add the selected edge itself
    pathEdges.push(targetEdge);
    currentPoint = { x: targetEdge.to[0], y: targetEdge.to[1] };
    pathPoints.push(currentPoint);
    console.log('Added target edge, current point now:', currentPoint);
  }  
  // Complete the path to the bottom-right corner if we know the dimensions
  if (pathIsValid && graphWidth && graphHeight) {
    const finalTarget = { x: graphWidth - 1, y: graphHeight - 1 };
    console.log(`Completing path to final target: (${finalTarget.x}, ${finalTarget.y})`);
    
    if (currentPoint.x !== finalTarget.x || currentPoint.y !== finalTarget.y) {
      const finalPath = findPathBetweenPoints(currentPoint, finalTarget, validAllEdges);
      console.log('Final path found:', finalPath.length, 'edges');
      
      if (finalPath.length > 0) {
        // Validate final path edges
        for (const edge of finalPath) {
          if (!isValidPathDirection({ x: edge.from[0], y: edge.from[1] }, { x: edge.to[0], y: edge.to[1] })) {
            console.error(`Invalid final path edge direction: from (${edge.from[0]}, ${edge.from[1]}) to (${edge.to[0]}, ${edge.to[1]})`);
            pathIsValid = false;
            break;
          }
        }
        
        if (pathIsValid) {
          pathEdges.push(...finalPath);
          pathPoints.push(...finalPath.map(edge => ({ x: edge.to[0], y: edge.to[1] })));
        }
      } else {
        console.warn('Could not find final path to complete the alignment');
        // Don't mark as invalid if we can't complete to the end - partial paths are ok
      }
    }
  }

  // Validate path continuity if we have a valid path so far
  if (pathIsValid && pathEdges.length > 1) {
    console.log('Validating path continuity...');
    for (let i = 0; i < pathEdges.length - 1; i++) {
      const currentEdge = pathEdges[i];
      const nextEdge = pathEdges[i + 1];
      
      if (currentEdge.to[0] !== nextEdge.from[0] || currentEdge.to[1] !== nextEdge.from[1]) {
        console.error(`Path discontinuity at edge ${i}: current edge ends at (${currentEdge.to[0]}, ${currentEdge.to[1]}) but next edge starts at (${nextEdge.from[0]}, ${nextEdge.from[1]})`);
        pathIsValid = false;
        break;
      }
    }
  }

  const result = {
    points: pathPoints,
    edges: pathEdges,
    isValid: pathIsValid && pathEdges.length > 0
  };
  
  console.log('buildPathThroughSelectedEdges final result:');
  console.log('- Total edges:', pathEdges.length);
  console.log('- Points count:', pathPoints.length);
  console.log('- isValid:', result.isValid);
  console.log('- Full result:', result);
  
  return result;
}

/**
 * Builds a complete path from (0,0) to bottom-right that goes through a single edge
 */
function buildCompletePathThroughEdge(
  selectedEdge: Edge,
  allEdges: Edge[],
  graphWidth?: number,
  graphHeight?: number
): SelectedPath {
  // Filter out self-loop edges
  const validEdges = allEdges.filter(edge => 
    !(edge.from[0] === edge.to[0] && edge.from[1] === edge.to[1])
  );
  
  const pathPoints: PathPoint[] = [];
  const pathEdges: Edge[] = [];
  
  // Start from (0,0)
  let currentPoint = { x: 0, y: 0 };
  pathPoints.push(currentPoint);
  
  // Find path to the selected edge
  const edgeStart = { x: selectedEdge.from[0], y: selectedEdge.from[1] };
  if (currentPoint.x !== edgeStart.x || currentPoint.y !== edgeStart.y) {
    const pathToEdge = findPathBetweenPoints(currentPoint, edgeStart, validEdges);
    if (pathToEdge.length > 0) {
      pathEdges.push(...pathToEdge);
      pathPoints.push(...pathToEdge.map(edge => ({ x: edge.to[0], y: edge.to[1] })));
      currentPoint = { x: pathToEdge[pathToEdge.length - 1].to[0], y: pathToEdge[pathToEdge.length - 1].to[1] };
    }
  }
  
  // Add the selected edge
  pathEdges.push(selectedEdge);
  currentPoint = { x: selectedEdge.to[0], y: selectedEdge.to[1] };
  pathPoints.push(currentPoint);
  
  // Complete path to bottom-right if dimensions are known
  if (graphWidth && graphHeight) {
    const finalTarget = { x: graphWidth - 1, y: graphHeight - 1 };
    if (currentPoint.x !== finalTarget.x || currentPoint.y !== finalTarget.y) {
      const finalPath = findPathBetweenPoints(currentPoint, finalTarget, validEdges);
      if (finalPath.length > 0) {
        pathEdges.push(...finalPath);
        pathPoints.push(...finalPath.map(edge => ({ x: edge.to[0], y: edge.to[1] })));
      }
    }
  }
  
  const result = {
    points: pathPoints,
    edges: pathEdges,
    isValid: pathEdges.length > 0
  };
  
  // Validate the generated single-edge path
  if (result.isValid && pathEdges.length > 0) {
    for (let i = 0; i < pathEdges.length - 1; i++) {
      const currentEdge = pathEdges[i];
      const nextEdge = pathEdges[i + 1];
      
      // Check continuity
      if (currentEdge.to[0] !== nextEdge.from[0] || currentEdge.to[1] !== nextEdge.from[1]) {
        console.warn('Single-edge path has discontinuity at edge', i);
        result.isValid = false;
        break;
      }
      
      // Check direction constraints
      if (currentEdge.to[0] < currentEdge.from[0] || currentEdge.to[1] < currentEdge.from[1]) {
        console.warn('Single-edge path has invalid direction at edge', i);
        result.isValid = false;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Quick pathfinding algorithm that follows the "right and/or down" rule
 * Uses BFS approach for optimal path finding
 */
function findQuickPath(
  start: PathPoint,
  target: PathPoint,
  validEdges: Edge[]
): Edge[] {
  console.log(`findQuickPath: from (${start.x}, ${start.y}) to (${target.x}, ${target.y})`);
  
  // If we're already at the target, no path needed
  if (start.x === target.x && start.y === target.y) {
    console.log('  Already at target, no path needed');
    return [];
  }
  
  // Validate that the target is reachable (must be to the right and/or down)
  if (target.x < start.x || target.y < start.y) {
    console.error(`  Invalid target: cannot move backwards from (${start.x}, ${start.y}) to (${target.x}, ${target.y})`);
    return [];
  }
  
  // Create a map of available edges for quick lookup
  const edgeMap = new Map<string, Edge[]>();
  for (const edge of validEdges) {
    const key = `${edge.from[0]},${edge.from[1]}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(edge);
  }
  
  // Use BFS to find the shortest path that only moves right/down
  const queue: Array<{point: PathPoint, path: Edge[]}> = [
    {point: start, path: []}
  ];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const {point, path} = queue.shift()!;
    const pointKey = `${point.x},${point.y}`;
    
    // Skip if we've already visited this point
    if (visited.has(pointKey)) {
      continue;
    }
    visited.add(pointKey);
    
    // Check if we've reached the target
    if (point.x === target.x && point.y === target.y) {
      console.log(`  Found path with ${path.length} edges`);
      return path;
    }
    
    // Get all valid edges from current point
    const availableEdges = edgeMap.get(pointKey) || [];
    
    for (const edge of availableEdges) {
      const nextPoint = {x: edge.to[0], y: edge.to[1]};
      const nextKey = `${nextPoint.x},${nextPoint.y}`;
      
      // Only consider moves that go right and/or down
      if (nextPoint.x >= point.x && nextPoint.y >= point.y && 
          !visited.has(nextKey) &&
          // Must not overshoot the target
          nextPoint.x <= target.x && nextPoint.y <= target.y) {
        
        queue.push({
          point: nextPoint,
          path: [...path, edge]
        });
      }
    }
  }
  
  console.log(`  No path found from (${start.x}, ${start.y}) to (${target.x}, ${target.y})`);
  return [];
}

/**
 * Finds a path between two points using available edges
 * Uses a simple greedy approach to find edges that move from start toward target
 */
function findPathBetweenPoints(
  start: PathPoint,
  target: PathPoint,
  allEdges: Edge[]
): Edge[] {
  console.log(`findPathBetweenPoints: from (${start.x}, ${start.y}) to (${target.x}, ${target.y})`);
  
  // CRITICAL FIX: Filter out self-loop edges that don't actually move anywhere
  const validEdges = allEdges.filter(edge => 
    !(edge.from[0] === edge.to[0] && edge.from[1] === edge.to[1])
  );
  
  console.log(`Filtered out ${allEdges.length - validEdges.length} self-loop edges`);
  
  // Use the new quick pathfinding algorithm
  return findQuickPath(start, target, validEdges);
}

/**
 * Calculates the distance between a custom path and the optimal alignment path
 * @param customPath The user-selected custom path
 * @param alignments All alignments (to find the optimal one)
 * @returns Distance metric indicating how far the custom path deviates from optimal
 */
export function calculateDistanceFromOptimalPath(
  customPath: SelectedPath,
  alignments: Alignment[]
): number {
  if (!customPath.isValid || customPath.edges.length === 0) {
    return Infinity;
  }

  // Find the optimal alignment (typically colored blue)
  const optimalAlignment = alignments.find(alignment => alignment.color === 'blue');
  if (!optimalAlignment || optimalAlignment.edges.length === 0) {
    return 0; // No optimal path to compare against
  }

  // Create sets of edge coordinates for faster lookup
  const optimalEdgeSet = new Set(
    optimalAlignment.edges.map(edge => 
      `${edge.from[0]},${edge.from[1]}->${edge.to[0]},${edge.to[1]}`
    )
  );

  const customEdgeSet = new Set(
    customPath.edges.map(edge => 
      `${edge.from[0]},${edge.from[1]}->${edge.to[0]},${edge.to[1]}`
    )
  );

  // Calculate overlap (edges that are in both paths)
  let sharedEdges = 0;
  for (const edge of customEdgeSet) {
    if (optimalEdgeSet.has(edge)) {
      sharedEdges++;
    }
  }

  // Calculate different distance metrics
  const totalOptimalEdges = optimalAlignment.edges.length;
  const totalCustomEdges = customPath.edges.length;
  
  // Jaccard distance: 1 - (intersection / union)
  const union = totalOptimalEdges + totalCustomEdges - sharedEdges;
  const jaccardSimilarity = union > 0 ? sharedEdges / union : 0;
  const jaccardDistance = 1 - jaccardSimilarity;

  // Convert to percentage and round
  return Math.round(jaccardDistance * 100);
}

/**
 * Calculates a more detailed distance analysis between custom and optimal paths
 * @param customPath The user-selected custom path
 * @param alignments All alignments (to find the optimal one)
 * @returns Detailed distance information
 */
export function calculateDetailedPathComparison(
  customPath: SelectedPath,
  alignments: Alignment[]
): {
  distancePercentage: number;
  sharedEdges: number;
  totalOptimalEdges: number;
  totalCustomEdges: number;
  uniqueToOptimal: number;
  uniqueToCustom: number;
} {
  if (!customPath.isValid || customPath.edges.length === 0) {
    return {
      distancePercentage: 100,
      sharedEdges: 0,
      totalOptimalEdges: 0,
      totalCustomEdges: 0,
      uniqueToOptimal: 0,
      uniqueToCustom: 0
    };
  }

  // Find the optimal alignment (typically colored blue)
  const optimalAlignment = alignments.find(alignment => alignment.color === 'blue');
  if (!optimalAlignment || optimalAlignment.edges.length === 0) {
    return {
      distancePercentage: 0,
      sharedEdges: 0,
      totalOptimalEdges: 0,
      totalCustomEdges: customPath.edges.length,
      uniqueToOptimal: 0,
      uniqueToCustom: customPath.edges.length
    };
  }

  // Create sets of edge coordinates for comparison
  const optimalEdgeSet = new Set(
    optimalAlignment.edges.map(edge => 
      `${edge.from[0]},${edge.from[1]}->${edge.to[0]},${edge.to[1]}`
    )
  );

  const customEdgeSet = new Set(
    customPath.edges.map(edge => 
      `${edge.from[0]},${edge.from[1]}->${edge.to[0]},${edge.to[1]}`
    )
  );

  // Calculate shared edges
  let sharedEdges = 0;
  for (const edge of customEdgeSet) {
    if (optimalEdgeSet.has(edge)) {
      sharedEdges++;
    }
  }

  const totalOptimalEdges = optimalAlignment.edges.length;
  const totalCustomEdges = customPath.edges.length;
  const uniqueToOptimal = totalOptimalEdges - sharedEdges;
  const uniqueToCustom = totalCustomEdges - sharedEdges;

  // Jaccard distance as percentage
  const union = totalOptimalEdges + totalCustomEdges - sharedEdges;
  const jaccardSimilarity = union > 0 ? sharedEdges / union : 0;
  const distancePercentage = Math.round((1 - jaccardSimilarity) * 100);

  return {
    distancePercentage,
    sharedEdges,
    totalOptimalEdges,
    totalCustomEdges,
    uniqueToOptimal,
    uniqueToCustom
  };
}
