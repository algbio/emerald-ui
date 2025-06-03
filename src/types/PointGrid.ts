export interface Edge {
  from: [number, number];
  to: [number, number];
  probability: number;
}

export interface Alignment {
  color: string;
  edges: Edge[];
  startDot?: { x: number; y: number };
  endDot?: { x: number; y: number };
}

export interface PointGridPlotProps {
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  representative?: string;
  member?: string;
  alignments?: Alignment[];
}