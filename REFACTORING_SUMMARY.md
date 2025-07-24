# Emerald UI - Refactored Project Structure

## New Directory Structure

The project has been refactored to improve organization and maintainability:

```
src/
├── components/
│   ├── alignment/           # Alignment visualization components
│   │   ├── AlignmentGraphWithInfoPanel.tsx/css
│   │   ├── PointGridPlot.tsx
│   │   ├── SafetyWindowsInfoPanel.tsx/css
│   │   ├── SequenceAlignmentViewer.tsx/css
│   │   └── index.ts         # Re-exports for easy importing
│   ├── sequence/            # Sequence input and processing
│   │   ├── EmeraldInput.tsx/css
│   │   ├── FastaFileUploader.tsx
│   │   ├── FileUploader.tsx
│   │   ├── SequenceInputPanel.tsx
│   │   ├── SequenceList.tsx/css
│   │   ├── UniProtSearch.tsx/css
│   │   └── index.ts
│   ├── structure/           # 3D structure visualization
│   │   ├── AlignmentStructuresViewer.tsx/css
│   │   ├── StructureFileUploader.tsx/css
│   │   ├── StructureViewer.tsx/css
│   │   └── index.ts
│   ├── share/              # Sharing and export functionality
│   │   ├── ExportImagePanel.tsx/css
│   │   ├── ShareAndExportPanel.tsx/css
│   │   ├── ShareUrlPanel.tsx/css
│   │   └── index.ts
│   ├── ui/                 # General UI components
│   │   ├── SharedUrlNotification.tsx/css
│   │   └── index.ts
│   └── index.ts            # Main component exports
├── utils/
│   ├── api/                # API and service utilities
│   │   ├── EmeraldService.tsx
│   │   ├── uniprotFetcher.ts
│   │   ├── uniprotUtils.ts
│   │   └── index.ts
│   ├── canvas/             # Canvas drawing utilities (unchanged)
│   │   ├── alignments.tsx
│   │   ├── axes.tsx
│   │   ├── core.ts
│   │   ├── grid.tsx
│   │   ├── index.tsx
│   │   ├── interactions.tsx
│   │   ├── minimap.tsx
│   │   └── safetyWindows.tsx
│   ├── export/             # Export and URL sharing
│   │   ├── exportUtils.ts
│   │   ├── urlSharing.ts
│   │   ├── urlSharingTests.ts
│   │   └── index.ts
│   ├── sequence/           # Sequence processing utilities
│   │   ├── alignmentParser.ts
│   │   ├── safetyWindowUtils.ts
│   │   └── index.ts
│   ├── structure/          # Structure file utilities
│   │   ├── pdbParser.ts
│   │   └── index.ts
│   └── index.ts            # Main utils exports
├── context/                # React contexts (unchanged)
├── hooks/                  # Custom hooks (unchanged)
├── types/                  # TypeScript types (unchanged)
└── emerald-wasm/          # WebAssembly module (unchanged)
```

## Key Benefits

1. **Logical Grouping**: Components and utilities are grouped by functionality
2. **Clear Separation**: Sequence, alignment, structure, and sharing concerns are separated
3. **Easy Imports**: Index files provide clean import paths
4. **Maintainability**: Related files are co-located
5. **Scalability**: Easy to add new features within existing categories

## Import Examples

### Before:
```typescript
import EmeraldInput from './components/EmeraldInput';
import { parseStructureFile } from '../utils/pdbParser';
import { exportCanvasAsPNG } from '../utils/exportUtils';
```

### After:
```typescript
import { EmeraldInput } from './components/sequence';
import { parseStructureFile } from './utils/structure';  
import { exportCanvasAsPNG } from './utils/export';

// Or use the main exports:
import { EmeraldInput, StructureViewer, ShareAndExportPanel } from './components';
import { parseStructureFile, exportCanvasAsPNG } from './utils';
```

## Migration Status

✅ **Completed:**
- All components moved to appropriate subdirectories
- Utilities reorganized by functionality  
- Index files created for clean exports
- Import paths updated in moved files
- Fixed SequenceContext.tsx imports (critical dependency)
- Fixed EmeraldService.tsx imports 
- Updated App.tsx imports for refactored structure
- Fixed cross-component references (sequence ↔ structure)

⚠️ **Recently Fixed:**
- Context imports now correctly reference new utility paths
- API service imports updated for new structure
- Component cross-references verified and working

## Next Steps

1. ✅ Updated all critical import paths
2. 🔄 Testing development server for remaining issues
3. 🔄 Verify build process works with new structure  
4. 📝 Update any remaining references in documentation
