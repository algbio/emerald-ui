import { useMemo } from 'react';

export function usePointGridTicks({
  xDomain,
  yDomain,
  representative,
  member,
  x,
  y
}: {
  xDomain: [number, number];
  yDomain: [number, number];
  representative: string;
  member: string;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
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