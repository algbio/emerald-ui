import { useState, useEffect } from 'react'
import './App.css'
import PointGridPlot, { type Alignment } from './components/PointGridPlot'
import EmeraldInput from './components/EmeraldInput'
import { SequenceProvider, useSequence } from './context/SequenceContext'
import SequenceInputPanel from './components/SequenceInputPanel'
import AlignmentStructuresViewer from './components/AlignmentStructuresViewer'

// Create a separate component for the app content to use the context hook
function AppContent() {
  const { state } = useSequence();
  const { sequences, alignments } = state;
  
  const [representative, setRepresentative] = useState("");
  const [member, setMember] = useState("");
  const [representativeDescriptor, setRepresentativeDescriptor] = useState("");
  const [memberDescriptor, setMemberDescriptor] = useState("");
  const [localAlignments, setLocalAlignments] = useState<Alignment[]>([]);

  // Update local state when context state changes
  useEffect(() => {
    if (state.alignmentStatus === 'success') {
      setRepresentative(sequences.sequenceA);
      setMember(sequences.sequenceB);
      setRepresentativeDescriptor(sequences.descriptorA);
      setMemberDescriptor(sequences.descriptorB);
      setLocalAlignments(alignments);
    }
  }, [state.alignmentStatus, sequences, alignments]);

  const handleAlignmentsGenerated = (data: {
    sequenceA: string;
    sequenceB: string;
    descriptorA: string;
    descriptorB: string;
  }) => {
    // This function now exists for backward compatibility
    // The actual alignment is handled by the context
    setRepresentative(data.sequenceA);
    setMember(data.sequenceB);
    setRepresentativeDescriptor(data.descriptorA);
    setMemberDescriptor(data.descriptorB);
  }

  // Check if we have data to display
  const hasData = representative && member && localAlignments.length > 0;

  return (
    <div className="app-container">
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
      </div>
      
      <div className="input-methods">
        <div className="input-method-tabs">
          <h1>Input Options</h1>
          <div className="tabs-container">
                  <SequenceInputPanel />

          </div>
        </div>
        
        <EmeraldInput onSubmit={handleAlignmentsGenerated} />
      </div>
      
      
      {hasData && (
        <div className="results-section">
          <h2>Alignment Results</h2>
          <div className="sequence-info">
            <p><strong>Representative (x-axis): </strong> {representativeDescriptor}</p>
            <p><strong>Member (y-axis):</strong> {memberDescriptor}</p>
          </div>
          <PointGridPlot 
            key={JSON.stringify(localAlignments)}
            representative={representative}
            member={member}
            alignments={localAlignments}
            width={900}
            height={900}
            xDomain={[0, representative.length]}
            yDomain={[0, member.length]}
          />
        </div>
      )}
      
      {!hasData && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
          Upload a FASTA file or enter sequences to view alignment visualization
        </p>
      )}

      {/* Add the AlignmentStructuresViewer component */}
      <AlignmentStructuresViewer />
    </div>
  );
}

// Main App component that provides the context
function App() {
  return (
    <SequenceProvider>
      <AppContent />
    </SequenceProvider>
  );
}

export default App;
