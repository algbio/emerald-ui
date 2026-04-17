# <img src="public/emerald-icon-medium.png" alt="EMERALD-UI logo" height="40" /> EMERALD-UI

## Live Application

### https://algbio.github.io/emerald-ui/

**Interactive Protein Sequence Alignment Visualization Tool**, available at [algbio.github.io/emerald-ui](https://algbio.github.io/emerald-ui/)

EMERALD-UI provides advanced visualization of optimal and suboptimal protein sequence alignments, enabling researchers to explore conserved / robust regions between these alignments. These conserved regions are the alignment-safe windows introduced by the [EMERALD algorithm](https://doi.org/10.1186/s13059-023-03008-6).

## About EMERALD

EMERALD goes beyond traditional pairwise sequence alignment by identifying not just the optimal alignment, but also suboptimal alignments and regions (_safety windows_) where alignments are consistently reliable across different scoring schemes. This has been described in Andreas Grigorjew, Artur Gynter, Fernando H.C. Dias, Benjamin Buchfink, Hajk-Georg Drost, Alexandru I. Tomescu, Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD, Genome Biology 24, 168 (2023), [https://doi.org/10.1186/s13059-023-03008-6](https://doi.org/10.1186/s13059-023-03008-6).

### Key Features

- **Interactive Alignment Visualization:** Explore the optimal and suboptimal alignment space between two sequences
- **Safety Window Analysis:** Identify regions where alignments are conserved / robust
- **Multiple Input Methods:** Load FASTA files, search UniProt database, or paste sequences directly
- **Customizable Parameters:** Fine-tune the suboptimal alignment space by adjusting the suboptimality threshold (Δ delta), and fine-tune the robustness measure by adjusting the safety parameter (α alpha)
- **3D Structure Integration:** Overlay protein structure information when available    
- **Export & Sharing:** Generate publication-ready images and shareable URLs
- **Local-First with API Integrations:** Alignment computation runs locally in your browser (WASM). External APIs are used for optional sequence/structure retrieval (UniProt, AlphaFold/RCSB), and an optional aggregate run counter is updated when analyses are run.

## Technical Implementation

This application is built with:

- **Frontend**: React 19 + TypeScript + Vite
- **Algorithm**: WebAssembly (WASM) implementation of EMERALD
- **Visualization**: Custom Canvas-based interactive plotting
- **Styling**: CSS with CSS custom properties for theming
- **Data Sources**: UniProt REST API, AlphaFold API, and RCSB PDB

### Dependencies (current)

#### Runtime dependencies

- `@emotion/styled` `^11.14.0`
- `@mui/material` `^7.1.2`
- `canvas2svg` `^1.0.16`
- `d3` `^7.9.0`
- `jspdf` `^4.2.1`
- `molstar` `^5.8.0`
- `react` `^19.1.0`
- `react-dom` `^19.1.0`
- `react-icons` `^5.5.0`
- `svg2pdf.js` `^2.7.0`

#### Development dependencies

- `@eslint/js` `^9.25.0`
- `@types/d3` `^7.4.3`
- `@types/react` `^19.1.2`
- `@types/react-dom` `^19.1.2`
- `@vitejs/plugin-react` `^4.4.1`
- `eslint` `^9.25.0`
- `eslint-plugin-react-hooks` `^5.2.0`
- `eslint-plugin-react-refresh` `^0.4.19`
- `gh-pages` `^6.3.0`
- `globals` `^16.0.0`
- `sass` `^1.89.2`
- `typescript` `~5.8.3`
- `typescript-eslint` `^8.30.1`
- `vite` `^6.3.5`

## Citation

Please cite the following reference when using EMERALD-UI for your research:

- Andrei Preoteasa, Andreas Grigorjew, Alexandru I. Tomescu, Hajk-Georg Drost, [EMERALD-UI: An interactive web application to unveil novel protein biology hidden in the suboptimal-alignment space](https://doi.org/10.48550/arXiv.2602.12730) *arXiv* (2026) https://doi.org/10.48550/arXiv.2602.12730 
- Andreas Grigorjew, Artur Gynter, Fernando H.C. Dias, Benjamin Buchfink, Hajk-Georg Drost, Alexandru I. Tomescu, [Sensitive inference of alignment-safe intervals from biodiverse protein sequence clusters using EMERALD](https://doi.org/10.1186/s13059-023-03008-6) *Genome Biology* 24, 168 (2023). https://doi.org/10.1186/s13059-023-03008-6

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
.
├── docs/                         # Documentation and design assets
├── public/                       # Static assets served by Vite
├── src/
│   ├── assets/                   # App bundled assets
│   ├── components/
│   │   ├── alignment/            # Alignment graphs and parameter panels
│   │   ├── information/          # Informational content components
│   │   ├── sequence/             # Sequence input and listing UI
│   │   ├── share/                # URL sharing and export UI
│   │   ├── shared/               # Reusable shared components
│   │   ├── structure/            # 3D structure visualization/superposition
│   │   └── ui/                   # Generic UI primitives and feedback
│   ├── context/                  # React context providers
│   ├── emerald-wasm/             # WASM wrapper and type declarations
│   ├── hooks/                    # Custom hooks
│   ├── temp/                     # Temporary/debug data
│   ├── types/                    # Project-level type declarations
│   ├── utils/
│   │   ├── api/                  # External API helpers
│   │   ├── canvas/               # Canvas rendering and plotting logic
│   │   ├── export/               # Export helpers (PNG/SVG/PDF)
│   │   ├── sequence/             # Sequence processing helpers
│   │   └── structure/            # Structure parsing/processing helpers
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to [Report a Problem](https://github.com/algbio/emerald-ui/issues) or a submit a [Pull Request](https://github.com/algbio/emerald-ui/pulls).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
