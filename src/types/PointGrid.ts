export interface Edge {
  from: [number, number];
  to: [number, number];
  probability: number;
}

export interface TextAlignment {
  representative: {
    sequence: string;
    descriptor: string;
  };
  member: {
    sequence: string;
    descriptor: string;
  };
}

export interface Alignment {
  color: string;
  edges: Edge[];
  startDot?: { x: number; y: number };
  endDot?: { x: number; y: number };
  textAlignment?: TextAlignment;
}

export interface PathSelectionResult {
  alignedRepresentative: string;
  alignedMember: string;
  score: number;
  pathLength: number;
  distanceFromOptimal: number; // Distance percentage from optimal path
}

/** A rectangular region of the alignment graph, in raw (ungapped) sequence coordinates. */
export interface RectangleSelection {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}

export interface SelectedEdgeState {
  edges: Edge[];
  isValid: boolean;
}

export interface MultipleSelectedEdgesState {
  selectedEdges: Edge[];
  isValid: boolean;
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
  // New path selection props
  enablePathSelection?: boolean;
  onPathSelected?: (result: PathSelectionResult) => void;
}