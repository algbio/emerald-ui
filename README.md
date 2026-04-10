# EMERALD-UI

**Interactive Protein Sequence Alignment Visualization Tool**, available at [algbio.github.io/emerald-ui](https://algbio.github.io/emerald-ui/)

EMERALD-UI provides advanced visualization of optimal and suboptimal protein sequence alignments, enabling researchers to explore conserved / robust regions between these alignments. These conserved regions are the alignment-safe windows introduced by the [EMERALD algorithm](https://doi.org/10.1186/s13059-023-03008-6).

## About EMERALD

EMERALD goes beyond traditional pairwise sequence alignment by identifying not just the optimal alignment, but also suboptimal alignments and regions (_safety windows_) where alignments are consistently reliable across different scoring schemes. This has been described in Andreas Grigorjew, Artur Gynter, Fernando H.C. Dias, Benjamin Buchfink, Hajk-Georg Drost, Alexandru I. Tomescu, Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD, Genome Biology 24, 168 (2023), [https://doi.org/10.1186/s13059-023-03008-6](https://doi.org/10.1186/s13059-023-03008-6).

### Key Features

- **🔍 Interactive Alignment Visualization**: Explore the optimal and suboptimal alignment space between two sequences
- **🛡️ Safety Window Analysis**: Identify regions where alignments are conserved / robust
- **📁 Multiple Input Methods**: Load FASTA files, search UniProt database, or paste sequences directly
- **⚙️ Customizable Parameters**: Fine-tune the suboptimal alignment space by adjusting the suboptimality threshold (Δ delta), and fine-tune the robustness measure by adjusting the safety parameter (α alpha)
- **🧬 3D Structure Integration**: Overlay protein structure information when available
- **📊 Export & Sharing**: Generate publication-ready images and shareable URLs

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

## Development Getting Started

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

5. New changes to the `main` branch are automatically published to github pages and visible at [https://algbio.github.io/emerald-ui](https://algbio.github.io/emerald-ui) via the github workflow `deploy-pages.yml`. If you prefer to do this manually, you can also publish from the local installation by running:

```bash
npm run deploy
```

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


