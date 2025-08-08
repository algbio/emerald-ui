// Data simplification and sampling utilities for performance optimization
import type { Alignment } from '../../types/PointGrid';
import * as d3 from "d3";

/**
 * Samples alignment data to reduce rendering load based on zoom level and viewport size
 * @param alignments The full set of alignments
 * @param transform Current zoom transform
 * @param viewportWidth Width of the viewport in pixels
 * @param viewportHeight Height of the viewport in pixels
 * @returns Sampled alignment data
 */
export function sampleAlignmentData(
  alignments: Alignment[],
  transform: d3.ZoomTransform,
  viewportWidth: number,
  viewportHeight: number
): Alignment[] {
  // Skip sampling if we have a small dataset
  if (alignments.length < 100) {
    return alignments;
  }

  const zoomLevel = transform.k;
  
  // Calculate target number of alignments based on zoom level and viewport size
  // More alignments when zoomed in, fewer when zoomed out
  const pixelDensity = (viewportWidth * viewportHeight) / 1000000; // normalize to ~1 for a 1000x1000 viewport
  const targetCount = Math.min(
    alignments.length,
    Math.max(50, Math.floor(200 * zoomLevel * pixelDensity))
  );
  
  // If we're already under target, no sampling needed
  if (alignments.length <= targetCount) {
    return alignments;
  }
  
  // Simple sampling - take every nth alignment
  const samplingInterval = Math.floor(alignments.length / targetCount);
  
  // Always include the most important alignments (e.g., optimal path with blue color)
  const importantAlignments = alignments.filter(a => a.color === 'blue');
  
  // Sample the rest
  const otherAlignments = alignments.filter(a => a.color !== 'blue');
  const sampledOtherAlignments = [];
  
  for (let i = 0; i < otherAlignments.length; i += samplingInterval) {
    sampledOtherAlignments.push(otherAlignments[i]);
  }
  
  return [...importantAlignments, ...sampledOtherAlignments];
}

/**
 * Groups nearby alignment dots to reduce rendering load
 * @param alignments The alignments containing dots to group
 * @param pixelThreshold Threshold distance in pixels
 * @param xScale Scale function for x coordinates
 * @param yScale Scale function for y coordinates
 * @returns Grouped alignment dots
 */
export function groupAlignmentDots(
  alignments: Alignment[],
  pixelThreshold: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
): Array<{x: number, y: number, count: number, color: string}> {
  // Extract all dots from alignments
  const allDots: Array<{x: number, y: number, color: string}> = [];
  
  alignments.forEach(alignment => {
    if (alignment.startDot) {
      allDots.push({
        x: alignment.startDot.x,
        y: alignment.startDot.y,
        color: alignment.color
      });
    }
    
    if (alignment.endDot) {
      allDots.push({
        x: alignment.endDot.x,
        y: alignment.endDot.y,
        color: alignment.color
      });
    }
  });
  
  // Skip grouping if we have a small number of dots
  if (allDots.length < 100) {
    return allDots.map(dot => ({...dot, count: 1}));
  }
  
  // Group dots by color and proximity
  const groups: Array<{x: number, y: number, count: number, color: string}> = [];
  
  for (const dot of allDots) {
    let addedToGroup = false;
    
    // Convert data coordinates to screen coordinates to use pixel threshold
    const screenX = xScale(dot.x);
    const screenY = yScale(dot.y);
    
    // Check if this dot is close to an existing group of the same color
    for (const group of groups) {
      if (group.color !== dot.color) continue;
      
      const groupScreenX = xScale(group.x);
      const groupScreenY = yScale(group.y);
      
      const distance = Math.sqrt(
        Math.pow(screenX - groupScreenX, 2) +
        Math.pow(screenY - groupScreenY, 2)
      );
      
      if (distance <= pixelThreshold) {
        // Update the group position (weighted average)
        const totalWeight = group.count + 1;
        group.x = (group.x * group.count + dot.x) / totalWeight;
        group.y = (group.y * group.count + dot.y) / totalWeight;
        group.count += 1;
        addedToGroup = true;
        break;
      }
    }
    
    // If dot wasn't added to any group, create a new group
    if (!addedToGroup) {
      groups.push({
        x: dot.x,
        y: dot.y,
        count: 1,
        color: dot.color
      });
    }
  }
  
  return groups;
}
