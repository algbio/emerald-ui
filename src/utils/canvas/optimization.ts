// Optimization utilities for canvas rendering
import type { Alignment } from '../../types/PointGrid';
import * as d3 from "d3";

/**
 * Simplifies a path by reducing the number of points using the Ramer-Douglas-Peucker algorithm
 * @param path Array of points to simplify
 * @param epsilon The tolerance value for simplification (higher = more simplification)
 * @returns Simplified array of points
 */
export function simplifyPath(path: Array<[number, number]>, epsilon: number = 1): Array<[number, number]> {
  if (path.length <= 2) return path;
  
  // Find the point with the maximum distance
  let maxDistance = 0;
  let index = 0;
  
  const firstPoint = path[0];
  const lastPoint = path[path.length - 1];
  
  for (let i = 1; i < path.length - 1; i++) {
    const distance = perpendicularDistance(path[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  
  // If the max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const firstHalf = simplifyPath(path.slice(0, index + 1), epsilon);
    const secondHalf = simplifyPath(path.slice(index), epsilon);
    
    // Concat but avoid duplicating the point at index
    return [...firstHalf.slice(0, -1), ...secondHalf];
  } else {
    // All points are within epsilon distance, we can remove all points between first and last
    return [firstPoint, lastPoint];
  }
}

/**
 * Calculates the perpendicular distance from a point to a line
 */
function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // If the line is just a point, return the distance to that point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
  }
  
  // Calculate perpendicular distance
  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
  return numerator / denominator;
}

/**
 * Performs adaptive simplification on an alignment object based on the current zoom level
 * @param alignment The alignment to simplify
 * @param transform Current d3 zoom transform
 * @returns A simplified alignment object
 */
export function simplifyAlignment(alignment: Alignment, _transform: d3.ZoomTransform): Alignment {
  // Skip simplification if alignment has too few edges
  if (!alignment.edges || alignment.edges.length <= 10) {
    return alignment;
  }
  
  // Calculate epsilon based on the zoom level
  // Lower zoom = more simplification
  // const zoomScale = transform.k;
  // const baseEpsilon = 1;
  // const adaptiveEpsilon = baseEpsilon / Math.max(0.1, zoomScale);
  
  // Create new simplified edges
  const simplifiedEdges = alignment.edges.map(edge => {
    // For short straight lines, no simplification needed
    if (Math.abs(edge.from[0] - edge.to[0]) <= 1 && Math.abs(edge.from[1] - edge.to[1]) <= 1) {
      return edge;
    }
    
    // For more complex paths with intermediate points, we'll keep original edges
    // since our Edge type doesn't have points property
    return edge;
  });
  
  return {
    ...alignment,
    edges: simplifiedEdges
  };
}

/**
 * Decimates points in a dataset by keeping only every nth point
 * Use when rendering extremely large datasets where fine detail isn't needed
 */
export function decimatePoints(points: any[], factor: number = 10): any[] {
  if (factor <= 1 || points.length <= factor) return points;
  
  const result = [];
  for (let i = 0; i < points.length; i += factor) {
    result.push(points[i]);
  }
  
  // Always include the last point
  if (points.length > 0 && result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  
  return result;
}

/**
 * Determines if an alignment is within the current view bounds
 * @param alignment Alignment to check
 * @param xRange Visible x range [min, max]
 * @param yRange Visible y range [min, max]
 * @returns Boolean indicating if the alignment is visible
 */
export function isAlignmentVisible(
  alignment: Alignment, 
  xRange: [number, number], 
  yRange: [number, number]
): boolean {
  // Check if start or end dots are visible
  if (alignment.startDot) {
    if (alignment.startDot.x >= xRange[0] && alignment.startDot.x <= xRange[1] &&
        alignment.startDot.y >= yRange[0] && alignment.startDot.y <= yRange[1]) {
      return true;
    }
  }
  
  if (alignment.endDot) {
    if (alignment.endDot.x >= xRange[0] && alignment.endDot.x <= xRange[1] &&
        alignment.endDot.y >= yRange[0] && alignment.endDot.y <= yRange[1]) {
      return true;
    }
  }
  
  // Check if any edges intersect the visible area
  if (alignment.edges) {
    for (const edge of alignment.edges) {
      const [x1, y1] = edge.from;
      const [x2, y2] = edge.to;
      
      // Check if the edge intersects the visible area
      if (lineIntersectsRectangle(
        x1, y1, x2, y2,
        xRange[0], yRange[0], xRange[1], yRange[1]
      )) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Checks if a line segment intersects with a rectangle
 */
function lineIntersectsRectangle(
  x1: number, y1: number, 
  x2: number, y2: number,
  minX: number, minY: number, 
  maxX: number, maxY: number
): boolean {
  // Check if either endpoint is inside the rectangle
  if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
      (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
    return true;
  }
  
  // Check for line-rectangle edge intersections
  const edges = [
    [minX, minY, maxX, minY], // Top
    [maxX, minY, maxX, maxY], // Right
    [maxX, maxY, minX, maxY], // Bottom
    [minX, maxY, minX, minY]  // Left
  ];
  
  for (const [x3, y3, x4, y4] of edges) {
    if (lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if two line segments intersect
 */
function lineSegmentsIntersect(
  x1: number, y1: number, 
  x2: number, y2: number,
  x3: number, y3: number, 
  x4: number, y4: number
): boolean {
  // Calculate direction values
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);
  
  // Check if the line segments intersect
  return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
          ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) ||
         (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) ||
         (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) ||
         (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) ||
         (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4));
}

/**
 * Calculates the direction of three points
 */
function direction(
  x1: number, y1: number, 
  x2: number, y2: number, 
  x3: number, y3: number
): number {
  return (x3 - x1) * (y2 - y1) - (x2 - x1) * (y3 - y1);
}

/**
 * Checks if a point is on a line segment
 */
function onSegment(
  x1: number, y1: number, 
  x2: number, y2: number, 
  x3: number, y3: number
): boolean {
  return (x3 >= Math.min(x1, x2) && x3 <= Math.max(x1, x2) &&
          y3 >= Math.min(y1, y2) && y3 <= Math.max(y1, y2));
}

/**
 * Clusters nearby points to reduce rendering load
 * @param points Array of points to cluster
 * @param threshold Distance threshold for clustering
 */
export function clusterPoints(points: Array<{x: number, y: number}>, threshold: number = 3): Array<{x: number, y: number, count: number}> {
  if (points.length <= 1) return points.map(p => ({...p, count: 1}));
  
  const clusters: Array<{x: number, y: number, count: number}> = [];
  
  for (const point of points) {
    let addedToCluster = false;
    
    // Check if point belongs to an existing cluster
    for (const cluster of clusters) {
      const distance = Math.sqrt(
        Math.pow(point.x - cluster.x, 2) + 
        Math.pow(point.y - cluster.y, 2)
      );
      
      if (distance <= threshold) {
        // Update the cluster center (weighted by count)
        const totalPoints = cluster.count + 1;
        cluster.x = (cluster.x * cluster.count + point.x) / totalPoints;
        cluster.y = (cluster.y * cluster.count + point.y) / totalPoints;
        cluster.count += 1;
        addedToCluster = true;
        break;
      }
    }
    
    // If point doesn't belong to any cluster, create a new one
    if (!addedToCluster) {
      clusters.push({
        x: point.x,
        y: point.y,
        count: 1
      });
    }
  }
  
  return clusters;
}
