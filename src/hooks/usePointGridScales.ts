import { useMemo } from 'react';
import * as d3 from 'd3';

export function usePointGridScales({
  width,
  height,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  representative,
  member,
  transform
}: {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  representative: string;
  member: string;
  transform: d3.ZoomTransform;
}) {
  const padding = 0.5;
  
  const xBase = d3.scaleLinear(
    [-padding, representative.length + padding], 
    [marginLeft, width - marginRight]
  );
  
  const yBase = d3.scaleLinear(
    [-padding, member.length + padding], 
    [marginTop, height - marginBottom]
  );
  
  const x = transform.rescaleX(xBase);
  const y = transform.rescaleY(yBase);
  
  const xDomain = x.domain();
  const yDomain = y.domain();
  
  const cellWidth = Math.abs(x(1) - x(0));
  const cellHeight = Math.abs(y(1) - y(0));
  const fontSize = Math.max(8, Math.min(cellWidth, cellHeight) * 0.6);
  
  return { x, y, xDomain, yDomain, fontSize };
}