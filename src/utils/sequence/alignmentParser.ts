import { type Alignment } from '../../types/PointGrid'

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
    
    // Handle both object format (test.json) and array format (WASM output)
    if (Array.isArray(data.alignment_graph)) {
      // Array format
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
    } else {
      // Object format (test.json)
      Object.entries(data.alignment_graph).forEach(([fromCoord, edges]: [string, any]) => {
        // Parse coordinate string like "(0,0)"
        const fromMatch = fromCoord.match(/\((\d+),(\d+)\)/)
        if (!fromMatch) return
        
        const fromX = parseInt(fromMatch[1])
        const fromY = parseInt(fromMatch[2])
        
        if (Array.isArray(edges)) {
          edges.forEach((edgeStr: string) => {
            // Parse edge string like "((1,1),1)"
            const edgeMatch = edgeStr.match(/\(\((\d+),(\d+)\),([0-9.]+)\)/)
            if (edgeMatch) {
              const toX = parseInt(edgeMatch[1])
              const toY = parseInt(edgeMatch[2])
              const probability = parseFloat(edgeMatch[3])
              
              mainEdges.push({
                from: [fromX, fromY],
                to: [toX, toY],
                probability: probability
              })
            }
          })
        }
      })
    }

    // Create window alignments (safety intervals)
    const windowAlignments: Alignment[] = []
    
    if (data.windows_representative && data.windows_member) {
      // Handle both array format and string format
      const repWindows = Array.isArray(data.windows_representative[0]) 
        ? data.windows_representative 
        : data.windows_representative.map((w: string) => {
            // Parse string like "(0,2)" to [0, 2]
            const match = w.match(/\((\d+),(\d+)\)/)
            return match ? [parseInt(match[1]), parseInt(match[2])] : null
          }).filter(Boolean)
      
      const memWindows = Array.isArray(data.windows_member[0])
        ? data.windows_member
        : data.windows_member.map((w: string) => {
            // Parse string like "(0,2)" to [0, 2]
            const match = w.match(/\((\d+),(\d+)\)/)
            return match ? [parseInt(match[1]), parseInt(match[2])] : null
          }).filter(Boolean)
      
      repWindows.forEach((repWindow: number[], index: number) => {
        const memberWindow = memWindows[index]
        
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