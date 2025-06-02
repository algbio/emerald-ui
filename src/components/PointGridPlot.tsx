import { useRef, useEffect, useState } from 'react'
import * as d3 from "d3";

interface Edge {
  from: [number, number];
  to: [number, number];
  probability: number;
}

interface Alignment {
  color: string;
  edges: Edge[];
  startDot?: { x: number; y: number };
  endDot?: { x: number; y: number };
}

interface PointGridPlotProps {
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

function PointGridPlot({
  width = 800,
  height = 800,
  marginTop = 80,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 80,
  representative = "MSFDLKSKFLG-",
  member = "MSKLKDFLFKS-",
  alignments = []
}: PointGridPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // Extract safety windows from alignments
  const safetyWindows = alignments.filter(alignment => 
    alignment.startDot && alignment.endDot
  );

  // Helper function to check if a position is within any safety window
  const isInSafetyWindow = (position: number, axis: 'x' | 'y') => {
    return safetyWindows.some(window => {
      if (!window.startDot || !window.endDot) return false;
      
      const start = axis === 'x' ? window.startDot.x : window.startDot.y;
      const end = axis === 'x' ? window.endDot.x : window.endDot.y;
      
      return position >= start && position <= end;
    });
  };

  // Scales: domain includes padding so (0,0) has space and all characters are visible
  const padding = 0.5; // Half a character width/height of padding
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

  // Only show ticks for visible indices
  const xDomain = x.domain();
  const yDomain = y.domain();

  const xTicks = [];
  for (let i = Math.ceil(xDomain[0]); i <= Math.floor(xDomain[1]); i++) {
    if (i >= 0 && i < representative.length) {
      xTicks.push({ value: i, xOffset: x(i), label: representative[i] });
    }
  }
  // Add final grid line after last character
  if (representative.length - 1 >= xDomain[0] && representative.length <= xDomain[1]) {
    xTicks.push({ value: representative.length, xOffset: x(representative.length), label: "" });
  }

  const yTicks = [];
  for (let i = Math.ceil(yDomain[0]); i <= Math.floor(yDomain[1]); i++) {
    if (i >= 0 && i < member.length) {
      yTicks.push({ value: i, yOffset: y(i), label: member[i] });
    }
  }
  // Add final grid line after last character
  if (member.length - 1 >= yDomain[0] && member.length <= yDomain[1]) {
    yTicks.push({ value: member.length, yOffset: y(member.length), label: "" });
  }

  // Responsive font size based on grid cell
  const cellWidth = Math.abs(x(1) - x(0));
  const cellHeight = Math.abs(y(1) - y(0));
  const fontSize = Math.max(8, Math.min(cellWidth, cellHeight) * 0.6);

  // Attach zoom behavior
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.call(
      d3.zoom()
        .scaleExtent([0, 100])
        .translateExtent([[-5000, -5000], [5000, 5000]])
        .on("zoom", (event) => setTransform(event.transform))
    );
  }, [width, height, marginLeft, marginRight, marginTop, marginBottom]);

  return (
    <svg ref={svgRef} width={width} height={height} style={{ cursor: "grab", background: "white" }}>
      {/* Define clipping path for the plot area */}
      <defs>
        <clipPath id="plot-area">
          <rect
            x={marginLeft}
            y={marginTop}
            width={width - marginLeft - marginRight}
            height={height - marginTop - marginBottom}
          />
        </clipPath>
        <clipPath id="x-axis-area">
          <rect
            x={marginLeft}
            y={marginTop - 50}
            width={width - marginLeft - marginRight}
            height={50}
          />
        </clipPath>
        <clipPath id="y-axis-area">
          <rect
            x={marginLeft - 50}
            y={marginTop}
            width={50}
            height={height - marginTop - marginBottom}
          />
        </clipPath>
      </defs>

      {/* Safety windows on X axis - clipped to visible area */}
      <g clipPath="url(#x-axis-area)">
        {safetyWindows.map((window, idx) => {
          if (!window.startDot || !window.endDot) return null;
          
          const startX = x(window.startDot.x);
          const endX = x(window.endDot.x);
          
          // Scale rectangle height based on font size
          const rectHeight = Math.max(8, fontSize * 0.8);
          
          return (
            <rect
              key={`x-safety-${idx}`}
              x={startX}
              y={marginTop - rectHeight - 5}
              width={endX - startX}
              height={rectHeight}
              fill="lightgreen"
              fillOpacity={0.6}
              stroke="green"
              strokeWidth={Math.max(1, fontSize * 0.1)}
            />
          );
        })}
      </g>

      {/* Safety windows on Y axis - clipped to visible area */}
      <g clipPath="url(#y-axis-area)">
        {safetyWindows.map((window, idx) => {
          if (!window.startDot || !window.endDot) return null;
          
          const startY = y(window.startDot.y);
          const endY = y(window.endDot.y);
          
          // Scale rectangle width based on font size
          const rectWidth = Math.max(8, fontSize * 0.8);
          
          return (
            <rect
              key={`y-safety-${idx}`}
              x={marginLeft - rectWidth - 10}
              y={Math.min(startY, endY)}
              width={rectWidth+10}
              height={Math.abs(endY - startY)}
              fill="lightgreen"
              fillOpacity={0.6}
              stroke="green"
              strokeWidth={Math.max(1, fontSize * 0.1)}
            />
          );
        })}
      </g>

      {/* X Axis (top) */}
      <line
        x1={x.range()[0]}
        x2={x.range()[1]}
        y1={marginTop}
        y2={marginTop}
        stroke="black"
      />
      
      {/* X Axis labels (centered between ticks) - clipped */}
      <g clipPath="url(#x-axis-area)">
        {xTicks.map(tick => (
          tick.label && ( // Only render labels for actual characters
            <g key={tick.value} transform={`translate(${x(tick.value + 0.5)},${marginTop})`}>
              <text 
                y="-10" 
                textAnchor="middle" 
                fontSize={fontSize} 
                fontFamily="monospace"
                fill={isInSafetyWindow(tick.value, 'x') ? "green" : "black"}
                fontWeight={isInSafetyWindow(tick.value, 'x') ? "bold" : "normal"}
              >
                {tick.label}
              </text>
            </g>
          )
        ))}
      </g>

      {/* Y Axis (left) */}
      <line
        x1={marginLeft}
        x2={marginLeft}
        y1={y.range()[1]}
        y2={y.range()[0]}
        stroke="black"
      />
      
      {/* Y Axis labels (centered between ticks) - clipped */}
      <g clipPath="url(#y-axis-area)">
        {yTicks.map(tick => (
          tick.label && ( // Only render labels for actual characters
            <g key={tick.value} transform={`translate(${marginLeft},${y(tick.value + 0.5)})`}>
              <text
                x="-9"
                dy="0.32em"
                textAnchor="end"
                fontSize={fontSize}
                fontFamily="monospace"
                fill={isInSafetyWindow(tick.value, 'y') ? "green" : "black"}
                fontWeight={isInSafetyWindow(tick.value, 'y') ? "bold" : "normal"}
              >
                {tick.label}
              </text>
            </g>
          )
        ))}
      </g>

      {/* Clipped content (grid and alignments) */}
      <g clipPath="url(#plot-area)">
        {/* Vertical grid lines */}
        <g>
          {xTicks.map((tick) =>
            <line
              key={`vgrid-${tick.value}`}
              x1={tick.xOffset}
              x2={tick.xOffset}
              y1={y.range()[1]}
              y2={y.range()[0]}
              stroke="#999"
              strokeDasharray="1,1"
            />
          )}
        </g>

        {/* Horizontal grid lines */}
        <g>
          {yTicks.map((tick) =>
            <line
              key={`hgrid-${tick.value}`}
              x1={x.range()[0]}
              x2={x.range()[1]}
              y1={tick.yOffset}
              y2={tick.yOffset}
              stroke="#999"
              strokeDasharray="1,1"
            />
          )}
        </g>

        {/* Alignment edges and dots */}
        {alignments.map((alignment, aIdx) => (
          <g key={aIdx}>
            {/* Render edges */}
            {alignment.edges.map((edge, edgeIdx) => {
              const [fromX, fromY] = edge.from;
              const [toX, toY] = edge.to;
              
              // Calculate opacity and stroke width based on probability
              const opacity = Math.max(0.5, edge.probability);
              const strokeWidth = Math.max(2, edge.probability * 4);
              
              return (
                <line
                  key={edgeIdx}
                  x1={x(fromX)}
                  y1={y(fromY)}
                  x2={x(toX)}
                  y2={y(toY)}
                  stroke={alignment.color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                >
                  <title>
                    {`Edge: (${fromX},${fromY}) -> (${toX},${toY}), Probability: ${edge.probability.toFixed(3)}`}
                  </title>
                </line>
              );
            })}
            
            {/* Render start dot */}
            {alignment.startDot && (
              <circle
                cx={x(alignment.startDot.x)}
                cy={y(alignment.startDot.y)}
                r="5"
                fill={alignment.color || "orange"}
              >
                <title>
                  {`Start: (${alignment.startDot.x}, ${alignment.startDot.y})`}
                </title>
              </circle>
            )}
            
            {/* Render end dot */}
            {alignment.endDot && (
              <circle
                cx={x(alignment.endDot.x)}
                cy={y(alignment.endDot.y)}
                r="5"
                fill={alignment.color || "orange"}
              >
                <title>
                  {`End: (${alignment.endDot.x}, ${alignment.endDot.y})`}
                </title>
              </circle>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

export default PointGridPlot;
export type { Alignment, PointGridPlotProps, Edge };