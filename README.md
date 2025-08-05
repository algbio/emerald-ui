# Emerald UI

**Interactive Protein Sequence Alignment Visualization Tool**

Emerald UI provides advanced visualization of optimal and suboptimal protein sequence alignments, enabling researchers to explore alignment-safe intervals and identify conserved regions between protein sequences. This tool implements the EMERALD algorithm for sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters.

## About EMERALD

EMERALD (Efficient Maximum-likelihood Estimation of Reliable Alignments from Local Domains) is a sophisticated algorithm that goes beyond traditional pairwise sequence alignment by identifying not just the optimal alignment, but also suboptimal alignments and regions where alignments are consistently reliable across different scoring schemes.

### Key Features

- **🔍 Interactive Alignment Visualization**: Explore dot plots showing all possible alignments between two sequences
- **🛡️ Safety Window Analysis**: Identify regions where alignments are consistently reliable  
- **📁 Multiple Input Methods**: Upload FASTA files, search UniProt database, or paste sequences directly
- **⚙️ Customizable Parameters**: Adjust α (alpha) and δ (delta) values to fine-tune alignment sensitivity
- **🧬 3D Structure Integration**: Overlay protein structure information when available
- **📊 Export & Sharing**: Generate publication-ready images and shareable URLs

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/algbio/emerald-ui.git
cd emerald-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## How to Use Emerald UI

### Step 1: Input Your Protein Sequences

Choose one of three methods to provide two protein sequences:

1. **Upload FASTA File**: Upload a file containing exactly two protein sequences in FASTA format
2. **UniProt Search**: Search the UniProt database using protein names, gene names, or accession numbers
3. **Manual Entry**: Paste sequences directly into the input fields (available in the alignment parameters section)

### Step 2: Configure Parameters

- **α (Alpha)**: Controls alignment stringency (0.5-1.0). Higher values = more stringent alignment
- **δ (Delta)**: Gap penalty for insertions and deletions (0-32). Higher values penalize gaps more

### Step 3: Run Analysis

Click "Generate Alignments" to compute all possible alignments and identify alignment-safe regions.

### Step 4: Explore Results

- **Dot Plot Visualization**: Each point represents a possible alignment between sequences
- **Safety Windows**: Colored regions indicate high-confidence alignment areas
- **Interactive Features**: Zoom, pan, and explore different regions of the alignment
- **Sequence Information**: View details about both input sequences

### Step 5: Export and Share

- Generate shareable URLs to save your analysis
- Export high-quality images for publications and presentations

## Use Cases

- **Homology Analysis**: Compare related proteins to identify conserved domains
- **Evolutionary Studies**: Trace sequence evolution across species  
- **Structure-Function Analysis**: Correlate sequence conservation with structural elements
- **Domain Mapping**: Identify functional domains and motifs
- **Quality Assessment**: Evaluate alignment reliability for downstream analyses

## Technical Implementation

This application is built with:

- **Frontend**: React 18 + TypeScript + Vite
- **Algorithm**: WebAssembly (WASM) implementation of EMERALD
- **Visualization**: Custom Canvas-based interactive plotting
- **Styling**: CSS with CSS custom properties for theming
- **Data Sources**: UniProt REST API integration

## Citation

Please cite the following reference when using EMERALD for your research:

Grigorjew, A., Gynter, A., Dias, F.H. et al. Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD. *Genome Biol* **24**, 168 (2023). https://doi.org/10.1186/s13059-023-03008-6

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── alignment/      # Alignment visualization components
│   ├── sequence/       # Sequence input components  
│   ├── structure/      # 3D structure components
│   ├── share/          # Export and sharing components
│   └── ui/             # UI feedback components
├── context/            # React context for state management
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   ├── api/           # API integration utilities
│   ├── canvas/        # Canvas drawing utilities
│   └── export/        # Export utilities
└── emerald-wasm/      # WebAssembly EMERALD implementation
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
    ...reactDom.configs.recommended.rules,
  },
})
```
### Breaking example:
ROS1_ARATH and ROS1A_ORYSJ




## Quick notes

* Leave the charactesr out when too zoomed out
* Load as A instead of Load A
* Actions -> Other actions
* Visualization -> Settings
* Gap analysis -> Unsafe windows
* Unsafe window highlihgting lag is too much
* Add explanation of the blue line
* Crash report should tell the user to refresh the page
* Examples should give better sequences to test
* Try example should have a link
* Folding getting started
* no result found when search hasnt been pressed
* Ready to generate suboptimal alignment graph message when both sequences loaded
* Change example sequences
* Remove "Step 3"