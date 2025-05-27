import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emeraldModuleRef = useRef<any>(null)

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
    const outputName = 'output.out'
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
      mod.callMain(['-f', inputName, '-o', outputName])
    } catch (err) {
      alert('Error running emerald.wasm: ' + err)
      setLoading(false)
      return
    }

    // Read output file from FS
    let outputData
    try {
      outputData = FS.readFile(outputName)
    } catch {
      alert('Output file not found')
      setLoading(false)
      return
    }

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
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div style={{ marginTop: 24 }}>
        <input
          type="file"
          accept=".fasta"
          onChange={handleFileChange}
          disabled={loading}
        />
        {loading && <p>Processing...</p>}
        {outputUrl && (
          <a href={outputUrl} download="output.out">
            Download Output
          </a>
        )}
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
