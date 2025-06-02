import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PointGridPlot, { type Alignment } from './components/PointGridPlot'

function App() {
  const [count, setCount] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emeraldModuleRef = useRef<any>(null)
  const [alignments, setAlignments] = useState<Alignment[]>([])
  const [representative, setRepresentative] = useState("MSFDLKSKFLG-")
  const [member, setMember] = useState("MSKLKDFLFKS-")

  // Function to parse JSON and create alignments
  const parseJsonToAlignments = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText)
      
      // Set the sequences
      setRepresentative(data.representative_string)
      setMember(data.member_string)

      // Create main alignment from alignment_graph edges
      const mainEdges: Edge[] = []
      
      // Parse the alignment graph and create edges
      data.alignment_graph.forEach((node: any) => {
        const [fromX, fromY] = node.from
        
        // Add all edges from this node
        node.edges.forEach((edge: any) => {
          const [toX, toY, probability] = edge
          
          mainEdges.push({
            from: [fromX, fromY],
            to: [toX, toY],
            probability: probability
          })
        })
      })

      // Create main alignment with all edges
      const mainAlignment: Alignment = {
        color: "blue",
        edges: mainEdges
      }

      // Create separate alignments for different probability thresholds
      const highProbabilityAlignment: Alignment = {
        color: "red",
        edges: mainEdges.filter(edge => edge.probability > 0.7)
      }

      const mediumProbabilityAlignment: Alignment = {
        color: "orange", 
        edges: mainEdges.filter(edge => edge.probability > 0.3 && edge.probability <= 0.7)
      }

      const lowProbabilityAlignment: Alignment = {
        color: "black",
        edges: mainEdges.filter(edge => edge.probability <= 0.3)
      }

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

      // Return all alignments - you can choose which ones to display
      return [
        {
          color: "black",
          edges: mainEdges  // Show ALL edges in blue
        },
        ...windowAlignments
      ]
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return []
    }
  }

  // Dynamically load the Emscripten script
  const loadEmeraldModule = async () => {
    if (emeraldModuleRef.current) return emeraldModuleRef.current

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/emerald-wasm/emerald.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load emerald.js'))
      document.body.appendChild(script)
    })

    // Use the global directly, do NOT call it as a function
    // @ts-ignore
    const mod = (window as any).Module
    if (!mod) throw new Error('emerald.js did not expose a Module global')

    // Wait for the WASM runtime to be initialized
    if (!mod.calledRun) {
      await new Promise<void>((resolve) => {
        mod.onRuntimeInitialized = () => resolve()
      })
    }

    emeraldModuleRef.current = mod
    return mod
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setOutputUrl(null)

    const inputName = 'ex1.fasta'
    const outputName = 'result.json'
    const inputBuffer = await file.arrayBuffer()

    // Load emerald WASM module
    const mod: any = await loadEmeraldModule()

    // Use the global FS object
    const FS = (window as any).FS
    if (!FS) {
      alert('FS API not found on window!')
      setLoading(false)
      return
    }

    // Write input file to Emscripten FS
    FS.writeFile(inputName, new Uint8Array(inputBuffer))

    // Debug: list files in the FS root
    console.log('FS root files:', FS.readdir('/'))

    // Run the main function with arguments
    try {
      console.log('Running emerald.wasm with input:', inputName)
      mod.callMain(['-f', inputName, '-o', 'output.out', '-j', outputName, '-a', '0.75', '-d', '8'])
    } catch (err) {
      alert('Error running emerald.wasm: ' + err)
      setLoading(false)
      return
    }

    // Read JSON output file from FS
    let outputData
    try {
      // List all files in the root directory
      console.log('All files in FS root:', FS.readdir('/'))
      
      outputData = FS.readFile("testresult.json")
    } catch {
      alert('JSON output file not found')
      setLoading(false)
      return
    }

    // Parse JSON and create alignments
    const jsonText = new TextDecoder().decode(outputData)
    console.log('JSON output:', jsonText)
    
    const parsedAlignments = parseJsonToAlignments(jsonText)
    setAlignments(parsedAlignments)

    // Create download link
    const blob = new Blob([outputData])
    setOutputUrl(URL.createObjectURL(blob))
    setLoading(false)
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Emerald Alignment Viewer</h1>
      <div className="card">
        <input
          type="file"
          accept=".fasta,.fast"
          onChange={handleFileChange}
          disabled={loading}
        />
        {loading && <p>Processing...</p>}
        {outputUrl && (
          <a href={outputUrl} download="result.json">
            Download JSON Result
          </a>
        )}
      </div>
      
      {alignments.length > 0 ? (
        <PointGridPlot 
          representative={representative}
          member={member}
          alignments={alignments}
          width={900}
          height={900}
        />
      ) : (
        <PointGridPlot 
          representative="MSFDLKSKFLG-"
          member="MSKLKDFLFKS-"
          alignments={[]}
          width={900}
          height={900}
        />
      )}
    </>
  )
}

export default App
