import { useState } from 'react'
import './App.css'
import PointGridPlot, { type Alignment } from './components/PointGridPlot'
import { FileUploader } from './components/FileUploader'

function App() {
  const [alignments, setAlignments] = useState<Alignment[]>([])
  const [representative, setRepresentative] = useState("")
  const [member, setMember] = useState("")

  const handleAlignmentsGenerated = (data: {
    representative: string;
    member: string;
    alignments: Alignment[];
  }) => {
    setRepresentative(data.representative)
    setMember(data.member)
    setAlignments(data.alignments)
  }

  // Check if we have data to display
  const hasData = representative && member && alignments.length > 0

  return (
    <>
      <h1>Emerald Alignment Viewer</h1>
      
      <FileUploader onAlignmentsGenerated={handleAlignmentsGenerated} />
      
      {hasData && (
        <PointGridPlot 
          representative={representative}
          member={member}
          alignments={alignments}
          width={900}
          height={900}
        />
      )}
      
      {!hasData && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
          Upload a FASTA file to view alignment visualization
        </p>
      )}
    </>
  )
}

export default App
