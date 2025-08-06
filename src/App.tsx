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
  const [isGettingStartedExpanded, setIsGettingStartedExpanded] = useState(false);
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
          enabling researchers to explore conserved / robust regions between these alignments.  
          These conserved regions are the <i>alignment-safe windows</i> introduced by the <a href="https://doi.org/10.1186/s13059-023-03008-6" target="_blank" rel="noopener noreferrer">EMERALD algorithm</a>.
        </p>
        <div className="key-features">
          <h3>Key Features:</h3>
          <ul>
            
            <li><strong>Interactive Alignment Visualization:</strong> Explore the optimal and suboptimal alignment space between two sequences</li>
            <li><strong>Safety Window Analysis:</strong> Identify regions where alignments are conserved / robust</li>
            <li><strong>Multiple Input Methods:</strong> Upload FASTA files, search UniProt database, or paste sequences directly</li>
            <li><strong>Customizable Parameters:</strong> Fine-tune the suboptimal alignment space by adjusting the suboptimality threshold (δ delta), and fine-tune the robustness measure by adjusting the safety parameter (α alpha)</li>
            <li><strong>3D Structure Integration:</strong> Overlay protein structure information when available</li>    
            <li><strong>Export & Sharing:</strong> Generate publication-ready images and shareable URLs</li>
          </ul>
        </div>

        <div className="citation-attribution">
          <h3>Citation & Credits</h3>
          <div className="citation-content">
            <p>
              <strong>Please cite the following reference when using EMERALD for your research:</strong>
            </p>
            <p className="citation-text">
              Andreas Grigorjew, Artur Gynter, Fernando H.C. Dias, Benjamin Buchfink, Hajk-Georg Drost, Alexandru I. Tomescu.
              <br />
              <em>Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD.</em>
              <br />
              <strong>Genome Biology</strong> 24, 168 (2023).
              <br />
              <a href="https://doi.org/10.1186/s13059-023-03008-6" target="_blank" rel="noopener noreferrer">
                https://doi.org/10.1186/s13059-023-03008-6
              </a>
            </p>
          </div>
          
          <div className="project-credits">
            <p>
                  <strong>Emerald UI Development:</strong><br />
                  • Emerald UI Web Interface: Developed by Andrei Preoteasa<br />
                  • EMERALD UI repository: <a href="https://github.com/algbio/emerald-ui" target="_blank" rel="noopener noreferrer">GitHub Repository</a><br />
                  • Original EMERALD Algorithm: <a href="https://github.com/algbio/emerald" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            </p>
          </div>
        </div>
      </div>
      
      <div className="getting-started-section">
        <div className="getting-started-header" onClick={() => setIsGettingStartedExpanded(!isGettingStartedExpanded)}>
          <h2>Getting Started with Emerald UI</h2>
          <span className={`expand-icon ${isGettingStartedExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
        
        {isGettingStartedExpanded && (
          <div className="no-data-message">
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
                  <p>Adjust the safety parameter α (alpha: 0.5-1.0) to increase or decrease how robust the safety windows are and δ (delta: 0-32) for the suboptimality threshold.</p>

                </div>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Run Analysis</h3>
                  <p>Click "Generate Alignments" to compute and visualize all optimal and suboptimal alignments and identify alignment-safe windows in these alignments.</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Explore Results</h3>
                  <p>Analyze the interactive visualization, examine safety windows, and export your findings.</p>

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
        )}
      </div>
      
      <div className="input-methods">
        <div className="input-method-tabs">
          <h1 className="input-title">Input Options</h1>
          <div className="tabs-container">
            <SequenceInputPanel />
          </div>
        </div>
        
        <EmeraldInput onSubmit={handleAlignmentsGenerated} />
      </div>
      
      
      {representative && member && localAlignments.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2>Explore Your Alignment Results</h2>
            <p className="results-description">
              The visualization below shows the classical representation of all optimal and suboptimal alignments. The green intervals indicate alignment-safe windows, and the blue line shows one optimal alignment.
            </p>
            <p className="interpretation-guide">
              <strong>How to interpret the plot:</strong> 
              <ul>
                <li>Diagonal black lines represent regions of similarity, while vertical or horizontal black lines indicate insertions or deletions. This is a classical representation of sequence alignments via dynamic programming. Complex regions with black lines diverging diagonally, horizontally or vertically suggest areas of high variability.</li>
                <li>Green intervals indicate alignment-safe windows. These are defined as those partial alignments that are common to a proportion of at least α alpha of all alignments in the plot 
                  (i.e. of all optimal and δ delta-suboptimal alignments). 
                  If you increase α alpha, then safety windows are common to more alignments. For example:
                    <ul>
                      <li>α=0.75 means the safety windows are common to at least 75% of all such alignments.</li>
                      <li>α=1 means the safety windows are common to all such alignments.</li>
                    </ul>
                  If you increase α alpha too much, then the safety windows may become too short and not useful for your analysis. If you decrease it too much, then the safety windows may become too lenient and include uninformative regions. The default value of α is 0.75, which was shown to be effective in several scenarios.
                </li>
                <li>The blue line represents one of the optimal alignments between the two sequences. This is shown for reference only, as there are many optimal alignments.</li>
              </ul>
            </p>
          </div>
          
          <div className="sequence-info">
            <h3>Sequence Information</h3>
            <p><strong>X-axis (Horizontal): </strong> {representativeDescriptor}</p>
            <p><strong>Y-axis (Vertical): </strong> {memberDescriptor}</p>
            
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
        <h3>3D Structure Analysis</h3>
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
