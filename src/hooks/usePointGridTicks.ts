import * as d3 from 'd3';
import { useMemo } from 'react';

interface UsePointGridTicksProps {
  xDomain: [number, number]; // Keep as tuple
  yDomain: [number, number]; // Keep as tuple
  representative: string;
  member: string;
  x: d3.ScaleLinear<number, number>; // Proper D3 scale type
  y: d3.ScaleLinear<number, number>; // Proper D3 scale type
  transform?: d3.ZoomTransform;  // Keep this to avoid breaking the existing code
}

export function usePointGridTicks({
  xDomain,
  yDomain,
  representative,
  member,
  x,
  y,
  transform // Keep this parameter but we won't use it
}: UsePointGridTicksProps) {
  return useMemo(() => {
    const newXTicks = [];
    for (let i = Math.ceil(xDomain[0]); i <= Math.floor(xDomain[1]); i++) {
      if (i >= 0 && i < representative.length) {
        newXTicks.push({ value: i, xOffset: x(i), label: representative[i] });
      }
    }
    if (representative.length - 1 >= xDomain[0] && representative.length <= xDomain[1]) {
      newXTicks.push({ value: representative.length, xOffset: x(representative.length), label: "" });
    }

    const newYTicks = [];
    for (let i = Math.ceil(yDomain[0]); i <= Math.floor(yDomain[1]); i++) {
      if (i >= 0 && i < member.length) {
        newYTicks.push({ value: i, yOffset: y(i), label: member[i] });
      }
    }
    if (member.length - 1 >= yDomain[0] && member.length <= yDomain[1]) {
      newYTicks.push({ value: member.length, yOffset: y(member.length), label: "" });
    }
    
    return { xTicks: newXTicks, yTicks: newYTicks };
  }, [xDomain, yDomain, representative, member, x, y]);
}
