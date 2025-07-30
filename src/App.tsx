import { useState, useEffect, useRef } from 'react'
import './App.css'
import EmeraldInput from './components/sequence/EmeraldInput'
import { SequenceProvider, useSequence } from './context/SequenceContext'
import { FeedbackProvider } from './context/FeedbackContext'
import SequenceInputPanel from './components/sequence/SequenceInputPanel'
import { AlignmentStructuresViewer } from './components/structure/AlignmentStructuresViewer'
import AlignmentGraphWithInfoPanel from './components/alignment/AlignmentGraphWithInfoPanel'
import ShareAndExportPanel from './components/share/ShareAndExportPanel'
import SharedUrlNotification from './components/ui/SharedUrlNotification'
import type { Alignment, PointGridPlotRef } from './components/alignment/PointGridPlot'

const GRAPH_WIDTH = 800;
const GRAPH_HEIGHT = 800;

// Create a separate component for the app content to use the context hook
function AppContent() {
  const { state } = useSequence();
  const { sequences, alignments } = state;
  
  const [representative, setRepresentative] = useState("");
  const [member, setMember] = useState("");
  const [representativeDescriptor, setRepresentativeDescriptor] = useState("");
  const [memberDescriptor, setMemberDescriptor] = useState("");
  const [localAlignments, setLocalAlignments] = useState<Alignment[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointGridRef = useRef<PointGridPlotRef | null>(null);

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

  // Callback to receive canvas ref from AlignmentGraphWithInfoPanel
  const handleCanvasRef = (ref: React.RefObject<HTMLCanvasElement | null>) => {
    canvasRef.current = ref.current;
  };

  // Callback to receive PointGridPlot ref from AlignmentGraphWithInfoPanel
  const handlePointGridRef = (ref: React.RefObject<PointGridPlotRef>) => {
    pointGridRef.current = ref.current;
  };

  // Check if we have data to display
  const hasData = representative && member && localAlignments.length > 0;

  return (
    <div className="app-container">
      {/* Shared URL Notification */}
      <SharedUrlNotification />
      
      <h1 className="app-title">
        Emerald UI
      </h1>
      <div className="app-description">
        <p className="app-subtitle">
          <strong>Interactive Protein Sequence Alignment Visualization Tool</strong>
        </p>
        <p>
          Emerald UI provides advanced visualization of optimal and suboptimal protein sequence alignments, 
          enabling researchers to explore alignment-safe intervals and identify conserved regions between protein sequences. 
          This tool implements the EMERALD algorithm for sensitive inference of alignment-safe intervals from 
          biodiverse protein sequence clusters.
        </p>
        <div className="key-features">
          <h3>Key Features:</h3>
          <ul>
            <li><strong>Interactive Alignment Visualization:</strong> Explore dot plots showing all possible alignments between two sequences</li>
            <li><strong>Safety Window Analysis:</strong> Identify regions where alignments are consistently reliable</li>
            <li><strong>Multiple Input Methods:</strong> Upload FASTA files, search UniProt database, or paste sequences directly</li>
            <li><strong>Customizable Parameters:</strong> Adjust α (alpha) and δ (delta) values to fine-tune alignment sensitivity</li>
            <li><strong>3D Structure Integration:</strong> Overlay protein structure information when available</li>
            <li><strong>Export & Sharing:</strong> Generate publication-ready images and shareable URLs</li>
          </ul>
        </div>
      </div>

      <div className="citation-section">
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
      
      {!hasData && (
        <div className="getting-started-section">
          <div className="no-data-message">
            <h2>Getting Started with Emerald UI</h2>
            <p>Welcome! Follow these simple steps to analyze your protein sequences:</p>
            
            <div className="getting-started-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Provide Sequences</h3>
                  <p>Upload a FASTA file containing two sequences, search for proteins in UniProt, or paste sequences directly into the input fields below.</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Set Parameters</h3>
                  <p>Adjust α (alpha: 0.5-1.0) for alignment stringency and δ (delta: 0-32) for gap penalties. Default values work well for most analyses.</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Run Analysis</h3>
                  <p>Click "Generate Alignments" to compute all possible alignments and identify alignment-safe regions.</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Explore Results</h3>
                  <p>Analyze the interactive dot plot, examine safety windows, and export your findings.</p>
                </div>
              </div>
            </div>
            
            <div className="example-section">
              <h3>Example Use Cases</h3>
              <ul>
                <li><strong>Homology Analysis:</strong> Compare related proteins to identify conserved domains</li>
                <li><strong>Evolutionary Studies:</strong> Trace sequence evolution across species</li>
                <li><strong>Structure-Function:</strong> Correlate sequence conservation with structural elements</li>
                <li><strong>Domain Mapping:</strong> Identify functional domains and motifs</li>
              </ul>
            </div>
            
            <div className="try-example-section">
              <h3>Try an Example</h3>
              <p>
                To see Emerald UI in action, try searching for these protein pairs in UniProt:
              </p>
              <div className="example-proteins">
                <div className="protein-pair">
                  <strong>ROS1_ARATH</strong> and <strong>ROS1A_ORYSJ</strong>
                  <span className="example-description">DNA demethylases from different plant species</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="input-methods">
        <div className="input-method-tabs">
          <h1 className="input-title">Input Options</h1>
          <div className="tabs-container">
            <SequenceInputPanel />
          </div>
        </div>
        
        <EmeraldInput onSubmit={handleAlignmentsGenerated} />
      </div>
      
      
      {hasData && (
        <div className="results-section">
          <div className="results-header">
            <h2>Step 3: Explore Your Alignment Results</h2>
            <p className="results-description">
              The visualization below shows a dot plot where each point represents a possible alignment between 
              the two sequences. The colored regions indicate alignment-safe windows where the algorithm has 
              high confidence in the alignment quality.
            </p>
          </div>
          
          <div className="sequence-info">
            <h3>Sequence Information</h3>
            <p><strong>X-axis (Horizontal): </strong> {representativeDescriptor}</p>
            <p><strong>Y-axis (Vertical): </strong> {memberDescriptor}</p>
            <p className="interpretation-guide">
              <strong>How to interpret the plot:</strong> Diagonal patterns indicate regions of similarity. 
              Dense clusters of points suggest highly conserved regions, while sparse areas indicate variable regions.
            </p>
          </div>
          
         
          
                    <AlignmentGraphWithInfoPanel
            key={`${representative}-${member}`}
            representative={representative}
            member={member}
            representativeDescriptor={representativeDescriptor}
            memberDescriptor={memberDescriptor}
            alignments={localAlignments}
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            onCanvasRef={handleCanvasRef}
            onPointGridRef={handlePointGridRef}
          />

           {/* Share URL and Export Image Panel */}
          <div className="export-section">
            <h3>Step 4: Share and Export Your Results</h3>
            <p className="export-description">
              Generate a shareable URL to save your analysis or export high-quality images for publications and presentations.
            </p>
            <ShareAndExportPanel
              descriptorA={representativeDescriptor}
              descriptorB={memberDescriptor}
              alpha={state.params.alpha}
              delta={state.params.delta}
              accessionA={state.sequences.accessionA}
              accessionB={state.sequences.accessionB}
              canvasRef={canvasRef}
              pointGridRef={pointGridRef}
            />
          </div>
        </div>
      )}

      {/* Add the AlignmentStructuresViewer component */}
      <div className="structure-section">
        <h3>Optional: 3D Structure Analysis</h3>
        <p className="structure-description">
          Upload PDB structure files to overlay 3D structural information on your sequence alignments. 
          This helps correlate sequence conservation with structural features like secondary structures, 
          active sites, and binding domains.
        </p>
        <AlignmentStructuresViewer />
      </div>
    </div>
  );
}

// Main App component that provides the context
function App() {
  return (
    <FeedbackProvider>
      <SequenceProvider>
        <AppContent />
      </SequenceProvider>
    </FeedbackProvider>
  );
}

export default App;
