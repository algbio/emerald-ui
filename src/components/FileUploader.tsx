import { useState } from 'react'
import { useEmeraldWasm } from '../hooks/useEmeraldWasm'
import { parseJsonToAlignments } from '../utils/alignmentParser'
import { type Alignment } from './PointGridPlot'

interface FileUploaderProps {
  onAlignmentsGenerated: (data: {
    representative: string;
    member: string;
    alignments: Alignment[];
  }) => void;
  showConsoleOutput?: boolean;
}

export const FileUploader = ({ 
  onAlignmentsGenerated,
  showConsoleOutput = false 
}: FileUploaderProps) => {
  const [loading, setLoading] = useState(false)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [alpha, setAlpha] = useState<string>("0.75")
  const [delta, setDelta] = useState<string>("8")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { loadEmeraldModule } = useEmeraldWasm({ showConsoleOutput })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Clear previous results when a new file is selected
      setOutputUrl(null)
    }
  }

  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setLoading(true)
    setOutputUrl(null)

    try {
      const inputName = 'input.fasta'
      const outputName = 'result.json'
      const inputBuffer = await selectedFile.arrayBuffer()

      // Load emerald WASM module
      const mod = await loadEmeraldModule()
      const FS = (window as any).FS

      if (!FS) {
        throw new Error('FS API not found!')
      }

      // Write input file and run processing
      FS.writeFile(inputName, new Uint8Array(inputBuffer))
      
      // Run the module with user-specified alpha and delta values
      mod.callMain([
        '-f', inputName, 
        '-o', 'output.out', 
        '-j', outputName, 
        '-a', alpha, 
        '-d', delta
      ])

      // Read and parse output
      const outputData = FS.readFile("testresult.json")
      const jsonText = new TextDecoder().decode(outputData)
      
      const parsed = parseJsonToAlignments(jsonText)
      if (parsed) {
        onAlignmentsGenerated(parsed)
      }

      // Create download link
      const blob = new Blob([outputData])
      setOutputUrl(URL.createObjectURL(blob))
    } catch (err) {
      alert('Error processing file: ' + err)
    } finally {
      setLoading(false)
    }
  }

  // Validate input to ensure it's a valid number
  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user convenience while typing
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 1)) {
      setAlpha(value);
    }
  };

  // Validate input to ensure it's a positive integer
  const handleDeltaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user convenience while typing
    if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) > 0)) {
      setDelta(value);
    }
  };

  return (
    <div className="card">
      <div className="file-input-container">
        <input
          type="file"
          accept=".fasta,.fast"
          onChange={handleFileChange}
          disabled={loading}
        />
        <div className="file-status">
          {selectedFile && (
            <span className="selected-file">Selected: {selectedFile.name}</span>
          )}
        </div>
      </div>
      
      <div className="parameter-controls">
        <div className="parameter-group">
          <label htmlFor="alpha-input">Alpha (divergence, 0-1):</label>
          <input
            id="alpha-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={alpha}
            onChange={handleAlphaChange}
            disabled={loading}
          />
          <span className="parameter-hint">Controls divergence tolerance (default: 0.75)</span>
        </div>
        
        <div className="parameter-group">
          <label htmlFor="delta-input">Delta (window size):</label>
          <input
            id="delta-input"
            type="number"
            min="1"
            step="1"
            value={delta}
            onChange={handleDeltaChange}
            disabled={loading}
          />
          <span className="parameter-hint">Sets the window size (default: 8)</span>
        </div>
      </div>

      <div className="actions">
        <button 
          className="run-button" 
          onClick={handleRunAnalysis} 
          disabled={loading || !selectedFile}
        >
          {loading ? 'Processing...' : 'Run Analysis'}
        </button>
        
        {outputUrl && (
          <a href={outputUrl} download="result.json" className="download-link">
            Download JSON Result
          </a>
        )}
      </div>

      <style jsx>{`
        .card {
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .file-input-container {
          margin-bottom: 1rem;
        }
        
        .file-status {
          margin-top: 0.5rem;
          min-height: 1.5rem;
        }
        
        .selected-file {
          font-size: 0.9rem;
          color: #495057;
          font-style: italic;
        }
        
        .parameter-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .parameter-group {
          display: flex;
          flex-direction: column;
          min-width: 150px;
        }
        
        label {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        input[type="number"] {
          padding: 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          margin-bottom: 0.25rem;
        }
        
        .parameter-hint {
          font-size: 0.8rem;
          color: #6c757d;
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .run-button {
          padding: 0.5rem 1rem;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          min-width: 120px;
        }
        
        .run-button:hover:not(:disabled) {
          background-color: #0069d9;
        }
        
        .run-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .download-link {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .download-link:hover {
          background-color: #218838;
        }
      `}</style>
    </div>
  )
}