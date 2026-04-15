import { useState } from 'react';

export default function SafetyWindowExplanation() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="safety-window-explanation-section">
      <div className="safety-window-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Safety Window Explanation</h2>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>
      
      {isExpanded && (
        <div className="safety-window-content">
          <p>
            It has also been shown that suboptimal alignments are often more accurate than strictly optimal ones and that they contain a high number of correct amino acid residue pairs [7], indicating their use in protein structure prediction. Vingron M and Argos P. [12] showed that so-called reliable regions, defined in terms of a robustness measure of individual aligned amino acids can identify conserved and functionally relevant regions among two protein sequences. They demonstrate this functional relevance by validating that these conserved regions also correspond to aligned regions of their respective tertiary structures. In detail, Chao KM et al. [13] introduce a robustness measure for a single pair of aligned symbols between two sequences to assess the difference between the optimal alignment score of the compared sequences without restrictions and the optimal alignment score not containing that aligned pair. A related approach suggested by Naor D and Brutlag DL [6] notes that the space of suboptimal alignments (whose score is within a difference to the optimal solution) can reveal conserved regions when manually inspecting the "graphic representation" of these possible alignments.
          </p>
        </div>
      )}
    </div>
  );
}
