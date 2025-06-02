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
}

export const FileUploader = ({ onAlignmentsGenerated }: FileUploaderProps) => {
  const [loading, setLoading] = useState(false)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const { loadEmeraldModule } = useEmeraldWasm()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setOutputUrl(null)

    try {
      const inputName = 'ex1.fasta'
      const outputName = 'result.json'
      const inputBuffer = await file.arrayBuffer()

      // Load emerald WASM module
      const mod = await loadEmeraldModule()
      const FS = (window as any).FS

      if (!FS) {
        throw new Error('FS API not found!')
      }

      // Write input file and run processing
      FS.writeFile(inputName, new Uint8Array(inputBuffer))
      console.log('FS root files:', FS.readdir('/'))

      mod.callMain(['-f', inputName, '-o', 'output.out', '-j', outputName, '-a', '0.75', '-d', '8'])

      // Read and parse output
      console.log('All files in FS root:', FS.readdir('/'))
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

  return (
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
  )
}