import { type Alignment } from '../components/PointGridPlot'

interface Edge {
  from: [number, number];
  to: [number, number];
  probability: number;
}

export const parseJsonToAlignments = (jsonText: string) => {
  try {
    const data = JSON.parse(jsonText)
    
    // Create main alignment from alignment_graph edges
    const mainEdges: Edge[] = []
    
    data.alignment_graph.forEach((node: any) => {
      const [fromX, fromY] = node.from
      
      node.edges.forEach((edge: any) => {
        const [toX, toY, probability] = edge
        
        mainEdges.push({
          from: [fromX, fromY],
          to: [toX, toY],
          probability: probability
        })
      })
    })

    // Create window alignments (safety intervals)
    const windowAlignments: Alignment[] = []
    
    if (data.windows_representative && data.windows_member) {
      data.windows_representative.forEach((repWindow: number[], index: number) => {
        const memberWindow = data.windows_member[index]
        
        if (memberWindow) {
          const [repStart, repEnd] = repWindow
          const [memStart, memEnd] = memberWindow
          
          windowAlignments.push({
            color: "green",
            edges: [],
            startDot: { x: repStart, y: memStart },
            endDot: { x: repEnd, y: memEnd }
          })
        }
      })
    }

    return {
      representative: data.representative_string,
      member: data.member_string,
      alignments: [
        {
          color: "black",
          edges: mainEdges
        },
        ...windowAlignments
      ]
    }
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return null
  }
}