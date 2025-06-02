import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PointGridPlot, { type Alignment } from './components/PointGridPlot'
import { FileUploader } from './components/FileUploader'

function App() {
  const [alignments, setAlignments] = useState<Alignment[]>([])
  const [representative, setRepresentative] = useState("MSFDLKSKFLG-")
  const [member, setMember] = useState("MSKLKDFLFKS-")

  const handleAlignmentsGenerated = (data: {
    representative: string;
    member: string;
    alignments: Alignment[];
  }) => {
    setRepresentative(data.representative)
    setMember(data.member)
    setAlignments(data.alignments)
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
      
      <FileUploader onAlignmentsGenerated={handleAlignmentsGenerated} />
      
      <PointGridPlot 
        representative={representative}
        member={member}
        alignments={alignments}
        width={900}
        height={900}
      />
    </>
  )
}

export default App
