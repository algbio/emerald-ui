import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import EmeraldInput from './components/sequence/EmeraldInput'
import { SequenceProvider, useSequence } from './context/SequenceContext'
import { FeedbackProvider } from './context/FeedbackContext'
import SequenceInputPanel from './components/sequence/SequenceInputPanel'
import AlignmentGraphWithInfoPanel from './components/alignment/AlignmentGraphWithInfoPanel'
import SharedUrlNotification from './components/ui/SharedUrlNotification'
import AlignmentCounter from './components/ui/AlignmentCounter'
import type { Alignment, PointGridPlotRef } from './components/alignment/PointGridPlot'
import { SafetyWindowExplanation } from './components/information'
import { FaGithub, FaStar } from 'react-icons/fa'
import { generateShareableUrl } from './utils/export/urlSharing'
import { useStructureData } from './hooks/useStructureData'
import { extractResidueBFactors } from './utils/structure/plddtParser'
import { PLDDT_BINS } from './utils/colors/confidenceColorScale'
import { useProteinDomains } from './hooks/useProteinDomains'
import { extractUniProtId } from './utils/api/uniprotUtils'

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 900;

// Create a separate component for the app content to use the context hook
function AppContent() {
  const { state, dispatch } = useSequence();
  const { sequences, alignments } = state;
  
  const [representative, setRepresentative] = useState("");
  const [member, setMember] = useState("");
  const [representativeDescriptor, setRepresentativeDescriptor] = useState("");
  const [memberDescriptor, setMemberDescriptor] = useState("");
  const [localAlignments, setLocalAlignments] = useState<Alignment[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isGettingStartedExpanded, setIsGettingStartedExpanded] = useState(false);
  const [isInterpretationExpanded, setIsInterpretationExpanded] = useState(false);
  const [isSequenceLinkCopied, setIsSequenceLinkCopied] = useState(false);
  const [confidenceMode, setConfidenceMode] = useState<'plddt' | 'iupred' | 'off'>('plddt');
  const [domainMode, setDomainMode] = useState<'on' | 'off'>('off');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointGridRef = useRef<PointGridPlotRef | null>(null);

  // Shared AlphaFold structure fetch, reused by both the 3D structure viewer and the pLDDT
  // confidence strip on the alignment graph, so the file is only downloaded once.
  const structureDataA = useStructureData(state.structureA?.uniprotId);
  const structureDataB = useStructureData(state.structureB?.uniprotId);

  // UniProt domain/feature annotations for the "Domain" strip on the alignment graph axes,
  // keyed by the same UniProt accession used for the pLDDT structure fetch (independent of
  // whether an AlphaFold structure is actually available for it).
  const proteinDomainsA = useProteinDomains(state.structureA?.uniprotId);
  const proteinDomainsB = useProteinDomains(state.structureB?.uniprotId);

  // Both the pLDDT strip and the domain strip are fetched by UniProt accession, resolved from
  // the sequence descriptor. With a plain pasted sequence there is no accession and therefore
  // nothing to fetch, so those toggles are disabled rather than silently doing nothing when
  // clicked. One accession is enough - that axis gets annotated, the other simply doesn't.
  //
  // Derived from the descriptors rather than structureA/B.uniprotId: the context only clears a
  // stored accession when the sequence is cleared too (SequenceContext), so after editing a
  // descriptor in place the stored id can still hold the previous entry's accession. The
  // descriptor is what actually decides whether there is anything to look up.
  const hasUniProtAccession = Boolean(
    extractUniProtId(state.sequences.descriptorA) || extractUniProtId(state.sequences.descriptorB)
  );
  // The strips themselves are gated on the same flag, so a stale accession can never keep
  // drawing UniProt-derived annotation after the descriptor stopped naming one.
  const domainsRepresentative = hasUniProtAccession && domainMode === 'on' && proteinDomainsA.status === 'success' ? proteinDomainsA.domains : null;
  const domainsMember = hasUniProtAccession && domainMode === 'on' && proteinDomainsB.status === 'success' ? proteinDomainsB.domains : null;

  const plddtRepresentative = useMemo(() => {
    if (!hasUniProtAccession || confidenceMode !== 'plddt' || structureDataA.status !== 'success' || !structureDataA.rawContent || !structureDataA.format) {
      return null;
    }
    return extractResidueBFactors(structureDataA.rawContent, structureDataA.format);
  }, [hasUniProtAccession, confidenceMode, structureDataA]);

  const plddtMember = useMemo(() => {
    if (!hasUniProtAccession || confidenceMode !== 'plddt' || structureDataB.status !== 'success' || !structureDataB.rawContent || !structureDataB.format) {
      return null;
    }
    return extractResidueBFactors(structureDataB.rawContent, structureDataB.format);
  }, [hasUniProtAccession, confidenceMode, structureDataB]);

  // Update local state when context state changes
  useEffect(() => {
    if (state.alignmentStatus === 'success') {
      setRepresentative(sequences.sequenceA);
      setMember(sequences.sequenceB);
      setRepresentativeDescriptor(sequences.descriptorA);
      setMemberDescriptor(sequences.descriptorB);
      setLocalAlignments(alignments);
    } else if (alignments.length === 0) {
      // Clear all plot-driving local state when analysis results are invalidated
      // (e.g. after parameter changes) so plots are fully hidden until re-run.
      setRepresentative('');
      setMember('');
      setRepresentativeDescriptor('');
      setMemberDescriptor('');
      setLocalAlignments([]);
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

  const sequenceInfoShareUrl = generateShareableUrl(
    representativeDescriptor,
    memberDescriptor,
    state.params.alpha,
    state.params.delta,
    state.sequences.accessionA,
    state.sequences.accessionB,
    state.params.gapCost,
    state.params.startGap,
    state.params.costMatrixType
  );

  const handleCopySequenceInfoLink = async () => {
    if (!sequenceInfoShareUrl) return;

    try {
      await navigator.clipboard.writeText(sequenceInfoShareUrl);
      setIsSequenceLinkCopied(true);
      setTimeout(() => setIsSequenceLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy share URL:', error);
    }
  };

  const loadLongExampleSequences = () => {
    /*
    const exampleSequenceA = "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSDGLAPPQHLIRVEGNLRAKYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELPPGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPGGSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD";
    const exampleDescriptorA = "sp|P04637|P53_HUMAN Cellular tumor antigen p53 OS=Homo sapiens";
    const exampleSequenceB = "MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAALGL";
    const exampleDescriptorB = "sp|P02769|ALBU_HUMAN Serum albumin OS=Homo sapiens";
    */

    const exampleSequenceA = "MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLRTPLNYILLNLAVADLFMVLGGFTSTLYTSLHGYFVFGPTGCNLEGFFATLGGEIALWSLVVLAIERYVVVCKPMSNFRFGENHAIMGVAFTWVMALACAAPPLAGWSRYIPEGLQCSCGIDYYTLKPEVNNESFVIYMFVVHFTIPMIIIFFCYGQLVFTVKEAAAQQQESATTQKAEKEVTRMVIIMVIAFLICWVPYASVAFYIFTHQGSNFGPIFMTIPAFFAKSAAIYNPVIYIMMNKQFRNCMLTTICCGKNPLGDDEASATVSKTETSQVAPA";
    const exampleDescriptorA = "P08100 | Rhodopsin | Rhodopsin | Homo sapiens";

    const exampleSequenceB = "MGQPGNGSAFLLAPNGSHAPDHDVTQERDEVWVVGMGIVMSLIVLAIVFGNVLVITAIAKFERLQTVTNYFITSLACADLVMGLAVVPFGAAHILMKMWTFGNFWCEFWTSIDVLCVTASIETLCVIAVDRYFAITSPFKYQSLLTKNKARVIILMVWIVSGLTSFLPIQMHWYRATHQEAINCYANETCCDFFTNQAYAIASSIVSFYVPLVIMVFVYSRVFQEAKRQLQKIDKSEGRFHVQNLSQVEQDGRTGHGLRRSSKFCLKEHKALKTLGIIMGTFTLCWLPFFIVNIVHVIQDNLIRKEVYILLNWIGYVNSGFNPLIYCRSPDFRIAFQELLCLRRSSLKAYGNGYSSNGNTGEQSGYHVEQEKENKLLCEDLPGTEDFVGHQGTVPSDNIDSQGRNCSTNDSLL";
    const exampleDescriptorB = "P07550 | Beta-2 adrenergic receptor | Beta-2 adrenergic receptor | Homo sapiens";

    dispatch({
      type: 'LOAD_SEQUENCES',
      payload: {
        sequenceA: exampleSequenceA,
        descriptorA: exampleDescriptorA,
        sequenceB: exampleSequenceB,
        descriptorB: exampleDescriptorB
      }
    });
  };

  const loadShortExampleSequences = () => {
    const exampleSequenceA = "MLQFLLGFTLGNVVGMYLAQNYDIPNLAKKLEEIKKDLDAKKKPPSA";
    const exampleDescriptorA = "E0CX11 | Short transmembrane mitochondrial protein 1 | Short transmembrane mitochondrial protein 1 | Homo sapiens";

    const exampleSequenceB = "MAAATLTSKLYSLLFRRTSTFALTIIVGVMFFERAFDQGADAIYDHINEGKLWKHIKHKYENK";
    const exampleDescriptorB = "Q9UDW1 | Cytochrome b-c1 complex subunit 9 | Cytochrome b-c1 complex subunit 9 | Homo sapiens";

    dispatch({
      type: 'LOAD_SEQUENCES',
      payload: {
        sequenceA: exampleSequenceA,
        descriptorA: exampleDescriptorA,
        sequenceB: exampleSequenceB,
        descriptorB: exampleDescriptorB
      }
    });
  };

  const loadMediumExampleSequences = () => {
    const exampleSequenceA = "MSAPGTLSNYYVDSFLVPEGDELAAPRYAPAPLGPPPRPAALAEHPELAPCSFQPKAPVFGPPWSPAHPAGASGVPAVYHPYAHHQAPVAPPDGRYMRSWLEPVPGSLSFPGLPTSRHYGIKPEPLAARRADCTTFDTHTLSLSDYACGSPPVDRDKQSHEGAFSESNGESEANGEKPQIDPNNPAANWLHARSTRKKRCPYTKHQTLELEKEFLFNMYLTRDRRYEVARLLNLTERQVKIWFQNRRMKMKKINKDRAKDE";
    const exampleDescriptorA = "H0YXI1 | Homeobox protein | Homeobox protein | Taeniopygia guttata";

    const exampleSequenceB = "MSLTNYYSMMGLQTDEPYGAHFIPGGLQGSSVGCAKPVRGSEEEDGTTGSHIPDFSHLSNKQTSLNGFSAWTNTANPTSSSSPQLHSTPSHFQTHHFLSHHHPYYGPQTQTHTEHVASSAASESRFVRSWEGAPAPEVNLSHVSEEFQACVPPQTGLPSPRQTFDDVKPENSPAPHDSPADSSFDRPTEVVLERLGAAEEPKKKPERKKDGEERKTQTNAENPSVSWIHAKSTRKKRCPYTKHQTLELEKEFLYNMYLTRDRRLEVAGLLNLTERQVKIWFQNRRMKMKKLMMRDRRSVNQ";
    const exampleDescriptorB = "Q1KKR7 | Homeobox protein Hox-D9b | Homeobox protein Hox-D9b | Takifugu rubripes";

    dispatch({
      type: 'LOAD_SEQUENCES',
      payload: {
        sequenceA: exampleSequenceA,
        descriptorA: exampleDescriptorA,
        sequenceB: exampleSequenceB,
        descriptorB: exampleDescriptorB
      }
    });
  };

  return (
    <div className="app-container">
      {/* Shared URL Notification */}
      <SharedUrlNotification />
      
      {/* Alignment Counter */}
      
      <h1 className="app-title">
        <a href={import.meta.env.BASE_URL} className="app-title-link">
          <img
            src={`${import.meta.env.BASE_URL}emerald-icon-medium.png`}
            alt="EMERALD icon"
            className="app-title-icon"
          />
          EMERALD-UI
        </a>
      </h1>
      <div className="getting-started-section">
        <div className="getting-started-header" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
          <h2>Interactive Protein Sequence Alignment Visualization Tool</h2>
          <span className={`expand-icon ${isDescriptionExpanded ? 'expanded' : ''}`}>▼</span>
        </div>

        {isDescriptionExpanded && (
          <div className="app-description no-data-message">
            <p>
              EMERALD-UI provides advanced visualization of optimal and suboptimal protein sequence alignments,
              enabling researchers to explore conserved / robust regions between these alignments.
              These conserved regions are the <strong><i>safety windows</i></strong> introduced by the <a href="https://doi.org/10.1186/s13059-023-03008-6" target="_blank" rel="noopener noreferrer">EMERALD algorithm</a>.
            </p>
            <div className="key-features">
              <h3>Key Features:</h3>
              <ul>
                <li><strong>Interactive Alignment Visualization:</strong> Explore the optimal and suboptimal alignment space between two sequences</li>
                <li><strong>Safety Window Analysis:</strong> Identify regions where alignments are conserved / robust</li>
                <li><strong>Multiple Input Methods:</strong> Load FASTA files, search UniProt database, or paste sequences directly</li>
                <li><strong>Customizable Parameters:</strong> Fine-tune the suboptimal alignment space by adjusting the suboptimality threshold (Δ delta), and fine-tune the robustness measure by adjusting the safety parameter (α alpha)</li>
                <li><strong>3D Structure Integration:</strong> Overlay protein structure information when available</li>
                <li><strong>Export & Sharing:</strong> Generate publication-ready images and shareable URLs</li>
                <li><strong>Local & API Integration:</strong> All analyses are performed locally in your browser. Additionally, EMERALD-UI uses the UniProt APIs and AlphaFold/RCSB fetches to retrieve sequence and structure information.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
  
      <div className="getting-started-section">
        <div className="getting-started-header" onClick={() => setIsGettingStartedExpanded(!isGettingStartedExpanded)}>
          <h2>Getting Started with EMERALD-UI</h2>
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
                  <p>Load a FASTA file containing two sequences, search for proteins in UniProt, or paste sequences directly into the input fields below.</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Set Parameters</h3>
                  <p>Adjust the safety parameter α (alpha: 0.5-1.0) to increase or decrease how robust the safety windows are and Δ (delta: 0-32) for the suboptimality threshold.</p>

                </div>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Run Analysis</h3>
                  <p>Click <strong>"Run EMERALD-UI"</strong> to compute and visualize all optimal and suboptimal alignments and identify alignment-safe windows in these alignments.</p>
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
              <h3>Try an Example:</h3>
              <div className="load-example-section">
                <button
                  onClick={loadShortExampleSequences}
                  className="load-example-button-small"
                  title="Load short example protein sequences (Human p53 and Serum albumin)"
                >
                  <strong>Load Short Example</strong>
                </button>
                <button
                  onClick={loadMediumExampleSequences}
                  className="load-example-button-small"
                  title="Load medium example protein sequences (Homeobox proteins)"
                >
                  <strong>Load Medium Example</strong>
                </button>
                <button
                  onClick={loadLongExampleSequences}
                  className="load-example-button-small"
                  title="Load long example protein sequences (Rhodopsin and Beta-2 adrenergic receptor)"
                >
                  <strong>Load Long Example</strong>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  
      <SafetyWindowExplanation />
          
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
            <div className="interpretation-section">
              <div className="interpretation-header" onClick={() => setIsInterpretationExpanded(!isInterpretationExpanded)}>
                <strong>How to interpret the plot</strong>
                <span className={`expand-icon ${isInterpretationExpanded ? 'expanded' : ''}`}>▼</span>
              </div>
              
              {isInterpretationExpanded && (
                <div className="interpretation-content">
                  <ul>
                    <li>Diagonal black lines represent regions of similarity, while vertical or horizontal black lines indicate insertions or deletions. This is a classical representation of sequence alignments via dynamic programming. Complex regions with black lines diverging diagonally, horizontally or vertically suggest areas of high variability.</li>
                    <li>Green intervals indicate alignment-safe windows. These are defined as those partial alignments that are common to a proportion of at least α alpha of all alignments in the plot 
                      (i.e. of all optimal and Δ delta-suboptimal alignments). 
                      If you increase α alpha, then safety windows are common to more alignments. For example:
                        <ul>
                          <li>α=0.75 means the safety windows are common to at least 75% of all such alignments.</li>
                          <li>α=1 means the safety windows are common to all such alignments.</li>
                        </ul>
                      If you increase α alpha too much, then the safety windows may become too short and not useful for your analysis. If you decrease it too much, then the safety windows may become too lenient and include uninformative regions. The default value of α is 0.75, which was shown to be effective in several scenarios.
                    </li>
                    <li>The blue line represents one of the optimal alignments between the two sequences. This is shown for reference only, as there are many optimal alignments.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="sequence-info">
            <h3>Sequence Information</h3>
            <p><strong>X-axis (Horizontal): </strong> {representativeDescriptor}</p>
            <p><strong>Y-axis (Vertical): </strong> {memberDescriptor}</p>
            {sequenceInfoShareUrl && (
              <div className="sequence-share-link-row">
                <strong className="sequence-share-link-label">Shareable Link:</strong>
                <a
                  href={sequenceInfoShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sequence-share-link"
                  title="Open this shareable link"
                >
                  {sequenceInfoShareUrl}
                </a>
                <button
                  type="button"
                  onClick={handleCopySequenceInfoLink}
                  className="sequence-share-copy-button"
                  title="Copy shareable URL"
                >
                  {isSequenceLinkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            <div className="confidence-mode-row">
              <strong className="confidence-mode-label">Features:</strong>
              <div className="confidence-mode-toggle">
                <button
                  type="button"
                  className={`confidence-mode-button ${!hasUniProtAccession ? 'disabled' : (confidenceMode === 'plddt' ? 'active' : '')}`}
                  onClick={() => setConfidenceMode(confidenceMode === 'plddt' ? 'off' : 'plddt')}
                  disabled={!hasUniProtAccession}
                  title={!hasUniProtAccession
                    ? 'Available only when UniProt ID is provided'
                    : (confidenceMode === 'plddt' ? 'Hide pLDDT confidence coloring on the axes' : 'Show pLDDT confidence coloring on the axes')}
                >
                  AlphaFold 2 pLDDT: {hasUniProtAccession && confidenceMode === 'plddt' ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  className={`confidence-mode-button ${!hasUniProtAccession ? 'disabled' : (domainMode === 'on' ? 'active' : '')}`}
                  onClick={() => setDomainMode(domainMode === 'on' ? 'off' : 'on')}
                  disabled={!hasUniProtAccession}
                  title={!hasUniProtAccession
                    ? 'Available only when UniProt ID is provided'
                    : (domainMode === 'on' ? 'Hide UniProt domain annotations on the axes' : 'Show UniProt domain annotations on the axes')}
                >
                  Domain: {hasUniProtAccession && domainMode === 'on' ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  className="confidence-mode-button disabled"
                  disabled
                  title="IUPRED disorder prediction is coming soon"
                >
                  IUPRED (coming soon)
                </button>
              </div>
              {!hasUniProtAccession && (
                <span className="confidence-mode-note">Available only when UniProt ID is provided</span>
              )}
              {hasUniProtAccession && confidenceMode === 'plddt' && (
                <div className="confidence-legend">
                  {PLDDT_BINS.map(bin => (
                    <span key={bin.label} className="confidence-legend-item">
                      <span className="confidence-legend-swatch" style={{ backgroundColor: bin.color }}></span>
                      {bin.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
            alpha={state.params.alpha}
            delta={state.params.delta}
            accessionA={state.sequences.accessionA}
            accessionB={state.sequences.accessionB}
            gapCost={state.params.gapCost}
            startGap={state.params.startGap}
            costMatrixType={state.params.costMatrixType}
            confidenceMode={confidenceMode}
            plddtRepresentative={plddtRepresentative}
            plddtMember={plddtMember}
            domainMode={domainMode}
            domainsRepresentative={domainsRepresentative}
            domainsMember={domainsMember}
            structureDataA={structureDataA}
            structureDataB={structureDataB}
            proteinDomainsA={hasUniProtAccession ? proteinDomainsA.domains : undefined}
            proteinDomainsB={hasUniProtAccession ? proteinDomainsB.domains : undefined}
          />
        </div>
      )}

      {/* Footer with Citation & Credits */}
      <footer className="app-footer">
        <div className="citation-attribution">
          <h3>Citation & Credits</h3>
          <div className="citation-content">
            <p>
              <strong>Please cite the following references and star the GitHub repositories when using EMERALD-UI for your research. </strong>Your support helps us continue improving the tool and adding new features.
            </p>
            
            <p className="citation-text">
              Andrei Preoteasa, Andreas Grigorjew, Alexandru I. Tomescu, Hajk-Georg Drost.
              <br />
              <a href="https://doi.org/10.1093/bioinformatics/btag305" target="_blank" rel="noopener noreferrer">
                EMERALD-UI: an interactive web application to unveil novel protein biology hidden in the alternative alignment space
              </a>
              <br />
              <strong>Bioinformatics</strong> 42, Issue 5, btag305 (2026)
              <br />
              <a href="https://github.com/algbio/emerald-ui" target="_blank" rel="noopener noreferrer" className="github-link">
                <FaGithub className="github-icon" />
                GitHub Repository
                <FaStar className="star-icon-small" />
              </a>
            </p>
            
            <p className="citation-text">
              Andreas Grigorjew, Artur Gynter, Fernando H.C. Dias, Benjamin Buchfink, Hajk-Georg Drost, Alexandru I. Tomescu.
              <br />
              <a href="https://doi.org/10.1186/s13059-023-03008-6" target="_blank" rel="noopener noreferrer">
                Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD.
              </a>
              <br />
              <strong>Genome Biology</strong> 24, 168, article number 168 (2023).
              <br />
              <a href="https://github.com/algbio/emerald" target="_blank" rel="noopener noreferrer" className="github-link">
                <FaGithub className="github-icon" />
                GitHub Repository
                <FaStar className="star-icon-small" />
              </a>
            </p>
          </div>
          <AlignmentCounter />
        </div>
      </footer>
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
