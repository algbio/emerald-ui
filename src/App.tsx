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
    console.log("Alignments generated:", data)
    setRepresentative(data.representative)
    setMember(data.member)
    setAlignments(data.alignments)
  }

  // Check if we have data to display
  const hasData = representative && member && alignments.length > 0

  return (
    <>
      <h1>Emerald Web</h1>
      <p>Protein Sequence Alignment Visualization</p>

      <div style={{padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "1rem" }}>
        <p>
          <strong>Please cite the following reference when using EMERALD for your research:</strong>
        </p>
        Grigorjew, A., Gynter, A., Dias, F.H. <i>et al.</i> 
        <br />
        Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD.
        <br /> 
        <i>Genome Biol</i> <b>24</b>, 168 (2023).
        <br />
        <a href="https://doi.org/10.1186/s13059-023-03008-6" target="_blank" rel="noopener noreferrer">
          https://doi.org/10.1186/s13059-023-03008-6
        </a>
        <br />
        An author erratum is available&nbsp;
        <a href="https://github.com/algbio/emerald-analysis/blob/main/emerald_erratum.pdf" target="_blank" rel="noopener noreferrer">
          here
        </a>.
        <p style={{ marginBottom: 0 }}>
          Experimental data was clustered using DIAMOND DeepClust:
        </p>
        Buchfink B, Ashkenazy H, Reuter K, Kennedy JA, Drost HG, 
        <br />
        "Sensitive clustering of protein sequences at tree-of-life scale using DIAMOND DeepClust", 
        <br />
        <i>bioRxiv</i> 2023.01.24.525373;
        <br />
        <a href="https://doi.org/10.1101/2023.01.24.525373" target="_blank" rel="noopener noreferrer">
          https://doi.org/10.1101/2023.01.24.525373
        </a>
      </div>
      
      <FileUploader onAlignmentsGenerated={handleAlignmentsGenerated} />
      
      {hasData && (
        <PointGridPlot 
          key={JSON.stringify(alignments)}
          representative={representative}
          member={member}
          alignments={alignments}
          width={900}
          height={900}
          xDomain={[0, representative.length]} // Replace with appropriate domain values
          yDomain={[0, member.length]} // Replace with appropriate domain values
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
