# Emerald UI Alignment Graph and Safety Windows Side Panel - System Documentation

## Overview
The Emerald UI alignment visualization system consists of two main coordinated components: a **PointGridPlot** (the main canvas-based alignment graph) and a **SafetyWindowsInfoPanel** (the interactive side panel). Together they provide an interactive visualization system for exploring sequence alignments and "safety windows" - regions of confident alignment identified by the EMERALD algorithm.

## Core Architecture

### 1. Main Container: AlignmentGraphWithInfoPanel
- **Location**: `AlignmentGraphWithInfoPanel.tsx`
- **Purpose**: Orchestrates the interaction between the graph and side panel
- **Key Responsibilities**:
  - Manages shared state for selected/hovered safety windows
  - Handles navigation between safety windows (previous/next)
  - Coordinates hover/selection events between components
  - Auto-selects first safety window when alignment loads

### 2. Canvas-Based Graph: PointGridPlot
- **Location**: `PointGridPlot.tsx`
- **Purpose**: Interactive canvas visualization of sequence alignment as a 2D grid
- **Key Features**:
  - **Zoomable/Pannable**: Uses D3 zoom for navigation
  - **Minimap**: Small overview in top-right corner showing full alignment
  - **Safety Window Visualization**: Green bracket-style indicators on axes
  - **Interactive Selection**: Click/hover detection for safety windows
  - **Real-time Highlighting**: Shows selected/hovered regions

### 3. Information Panel: SafetyWindowsInfoPanel  
- **Location**: `SafetyWindowsInfoPanel.tsx`
- **Purpose**: Detailed view and navigation for safety windows
- **Key Features**:
  - **Window Navigation**: Previous/Next buttons and keyboard shortcuts
  - **Coordinate Display**: Shows X/Y axis ranges for each window
  - **Sequence Extraction**: Displays actual sequence segments within windows
  - **Copy Functionality**: One-click copying of sequence segments
  - **Window Counter**: Shows current window number and total count

### 4. Sequence Alignment Viewer: SequenceAlignmentViewer
- **Location**: `SequenceAlignmentViewer.tsx`
- **Purpose**: Text-based sequence alignment visualization with biological highlighting
- **Key Features**:
  - **Amino Acid Coloring**: Property-based highlighting (hydrophobic, polar, acidic, basic, special)
  - **Conservation Analysis**: Similarity scoring and visual indicators
  - **Position Markers**: Every 10th position marked for reference
  - **Scrollable Display**: Handles long alignments efficiently

## Data Model

### Alignment Structure
```typescript
interface Alignment {
  color: string;
  edges: Edge[];                    // Probability-weighted connections
  startDot?: { x: number; y: number }; // Safety window start
  endDot?: { x: number; y: number };   // Safety window end
  textAlignment?: TextAlignment;     // Optional sequence alignment data
}

interface Edge {
  from: [number, number];
  to: [number, number];
  probability: number;
}

interface TextAlignment {
  representative: {
    sequence: string;
    descriptor: string;
  };
  member: {
    sequence: string;
    descriptor: string;
  };
}
```

### Safety Windows
- **Definition**: Rectangular regions in the alignment grid representing areas of confident alignment
- **Identification**: Have both `startDot` and `endDot` defined
- **Coordinate System**: 
  - X-axis represents the "representative" (reference) sequence
  - Y-axis represents the "member" sequence
  - 0-indexed internally, 1-indexed in display

### Safety Window Information Object
```typescript
interface SafetyWindowInfo {
  id: string;           // Format: "safety-window-{index}"
  xStart: number;       // Start position on X-axis (0-indexed)
  xEnd: number;         // End position on X-axis (0-indexed)
  yStart: number;       // Start position on Y-axis (0-indexed)
  yEnd: number;         // End position on Y-axis (0-indexed)
  xLength: number;      // Width of safety window
  yLength: number;      // Height of safety window
  color: string;        // Color for visualization
  alignment: Alignment; // Reference to original alignment data
}
```

## Visual Components & Rendering

### Canvas Drawing System (`../../utils/canvas/`)
The visualization uses modular canvas drawing functions:

1. **Safety Window Rendering** (`safetyWindows.tsx`):
   - `drawSafetyWindows()`: Green L-shaped brackets on axes
   - `drawSafetyWindowHighlight()`: Multi-layer highlighting for selection
   - **Bracket System**: Square-ended brackets with proper clipping
   - **Directional Arrows**: Optional arrows showing alignment direction

2. **Axis System** (`axes.tsx`):
   - `drawAxes()`: Basic axis lines (top and left)
   - `drawAxisLabels()`: Sequence characters and position indices
   - `drawSafetyWindowIndices()`: Special highlighting for selected window bounds
   - **Smart Label Density**: Switches to minimal mode when zoomed out
   - **Safety Window Awareness**: Highlights positions within safety windows

3. **Alignment Visualization** (`alignments.tsx`):
   - `drawAlignmentEdges()`: Probability-weighted connection lines
   - `drawAlignmentDots()`: Start/end point markers (5px radius circles)
   - **Color Coding**: Uses alignment color property

4. **Interactive Elements** (`interactions.tsx`):
   - `drawHoverHighlight()`: Cross-hair highlighting on mouse hover
   - `findSafetyWindowsForCell()`: Hit detection for safety windows
   - **Cross-Hair System**: Extends highlighting to axis margins

5. **Minimap** (`minimap.tsx`):
   - Overview visualization in top-right corner (250px default)
   - Shows entire alignment with current viewport (red rectangle)
   - Safety windows visible as green rectangles
   - Clickable for navigation with smooth transitions

6. **Grid System** (`grid.tsx`):
   - `drawGridLines()`: Subtle grid overlay for easier reading
   - Respects zoom level and tick positioning

## Interaction System

### Mouse Interactions
- **Hover**: 
  - Grid cells show cross-hair highlights extending to margins
  - Safety windows show preview highlighting with semi-transparent overlay
  - Triggers side panel updates and window ID propagation
- **Click**: 
  - Safety windows can be selected/deselected (toggle behavior)
  - Minimap allows viewport navigation (click-to-center)
  - Plot area clicks outside safety windows clear selection
- **Zoom/Pan**: D3 zoom behavior with scale extent [0.1, 100]

### Keyboard Navigation
- **Arrow Keys**: Navigate between safety windows when panel has focus
- **Circular Navigation**: Wraps around from last to first window
- **Coordinated Updates**: Selection changes update both graph and panel

### State Management
- **Selected Safety Window**: Currently active window (highlighted in graph, detailed in panel)
- **Hovered Safety Window**: Temporary preview state with reduced opacity
- **ID System**: Windows identified as `"safety-window-{index}"` where index matches array position
- **Transform State**: D3 zoom transform for pan/zoom persistence

## Side Panel Features

### Window Navigation
- Previous/Next buttons with circular navigation
- Window counter display (e.g., "2 / 5") with current window highlighted
- Keyboard arrow key support with event prevention
- Disabled state when only one window present

### Information Display
- **Coordinates**: X-axis and Y-axis ranges (1-indexed for biologists)
- **Dimensions**: Width × Height of safety window in grid units
- **Color Coding**: Visual indicator circle matching graph colors
- **Axis Labels**: Custom descriptors (e.g., "Reference" vs "Member")

### Sequence Analysis
- **Segment Extraction**: Shows actual amino acid sequences within windows
- **Copy to Clipboard**: One-click copying with success/failure feedback
- **Monospace Display**: Courier New font for proper sequence alignment
- **Scrollable Segments**: Handles long sequences with horizontal scroll
- **UniProt Integration**: Planned BLAST search functionality (currently disabled)

### Copy Status System
```typescript
interface CopyStatus {
  id: string;      // Identifies which sequence was copied
  success: boolean; // Whether copy operation succeeded
}
```

## Advanced Features

### Zoom-Aware Rendering
- **Adaptive Labels**: Switches between full and minimal axis labeling based on overlap detection
- **Performance Optimization**: Clipped drawing prevents off-screen rendering
- **Scale-Responsive**: Font sizes and element dimensions adjust to zoom level
- **Transform Integration**: All drawing functions receive current D3 transform

### Multi-Layer Highlighting System
1. **Base Layer**: Safety window brackets and axis indicators
2. **Selection Layer**: Solid highlighting for selected windows (full opacity)
3. **Hover Layer**: Semi-transparent overlay for hovered elements (50% opacity)
4. **Grid Highlights**: Cross-axis highlighting extending to margins
5. **Safety Window Indices**: Special green highlighting for selected window bounds

### Minimap System
- **Overview Mode**: Shows entire alignment regardless of main view zoom
- **Viewport Indicator**: Red rectangle showing current view area with smooth updates
- **Interactive Navigation**: Click-to-center functionality with coordinate conversion
- **Safety Window Preview**: Miniaturized safety windows (green rectangles) visible in overview
- **Drag Support**: Mouse drag for continuous viewport adjustment

### Clipping and Performance
- **Smart Clipping**: Different clipping regions for axes vs plot area
- **Visibility Checks**: Only draws elements that would be visible
- **Debounced Redraws**: 16ms timeout prevents excessive redrawing
- **Memory Management**: Proper canvas context save/restore patterns

## Integration Points

### Sequence Context
- Displays actual sequence strings from `representative` and `member` props
- Optional sequence descriptors for labeling (e.g., UniProt IDs)
- Supports variable-length sequences with proper bounds checking
- Default sequences provided for testing

### Parent Component Integration
```typescript
// Callback signatures
onSafetyWindowHover?: (windowId: string | null, alignment?: Alignment | null) => void;
onSafetyWindowSelect?: (windowId: string | null, alignment?: Alignment | null) => void;
onTransformChange?: (transform: d3.ZoomTransform) => void;
```

### Export System
- Canvas can be captured for image export via ref forwarding
- Coordinate data available for CSV/JSON export
- Copy functionality for individual sequence segments
- Transform state can be persisted and restored

### External Applications
- Structure viewer integration through safety window coordinate mapping
- URL sharing system for specific views and selections
- Planned integration with external sequence analysis tools (UniProt BLAST)

## Performance Considerations

### Rendering Optimizations
- **Clipped Drawing**: Only renders visible elements within margins
- **Debounced Updates**: 16ms throttled redraw on continuous interactions
- **Layered Rendering**: Separates static and dynamic elements
- **Canvas Reuse**: Single canvas element with efficient clearing

### Memory Management
- **Event Cleanup**: Proper listener removal on component unmount
- **Scale Management**: D3 scales recomputed only when necessary
- **Context State**: Proper save/restore patterns prevent state leaks
- **Ref Forwarding**: Efficient ref merging without memory leaks

### Scale and Domain Management
- **Domain Tuples**: Proper TypeScript typing for scale domains
- **Transform Integration**: Scales account for current zoom/pan state
- **Tick Generation**: Smart tick density based on visible range

## Styling and CSS

### SafetyWindowsInfoPanel.css Structure
- **Panel Layout**: Flexbox-based responsive design
- **Navigation Controls**: Styled buttons with hover/disabled states
- **Window Display**: Card-based layout with color indicators
- **Sequence Display**: Monospace fonts with scrollable containers
- **Responsive Design**: Breakpoints for mobile/tablet support

### Canvas Styling
- **Colors**: Consistent green theming (#90EE90, #4CAF50)
- **Typography**: Monospace fonts for sequence data
- **Interactive States**: Hover effects and selection highlighting
- **Accessibility**: Proper contrast ratios and focus indicators

## Error Handling and Edge Cases

### Safety Window Validation
- Checks for presence of both `startDot` and `endDot`
- Validates coordinate bounds against sequence lengths
- Handles empty safety window arrays gracefully

### Canvas Error Handling
- Null checks for canvas context and elements
- Graceful degradation when drawing functions fail
- Proper bounds checking for coordinate transformations

### User Interaction Edge Cases
- Mouse events outside plot boundaries
- Rapid clicking and double-click prevention
- Keyboard navigation with no windows present
- Zoom limits and boundary conditions

## Future Enhancements

### Planned Features
- **UniProt BLAST Integration**: Enable sequence searching
- **Multi-Selection**: Support for selecting multiple safety windows
- **Export Improvements**: PDF export and high-resolution image generation
- **Animation System**: Smooth transitions between safety windows

### Accessibility Improvements
- **Keyboard Navigation**: Full keyboard accessibility for canvas interactions
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast Mode**: Alternative color schemes for accessibility

### Performance Optimizations
- **WebGL Rendering**: For very large alignments
- **Virtual Scrolling**: For sequences with thousands of positions
- **Worker Threads**: Offload computation-heavy operations

This system provides a sophisticated, interactive environment for exploring sequence alignments with particular focus on safety windows - the high-confidence regions identified by the EMERALD algorithm. The tight coordination between the graph and panel creates an intuitive exploration experience for biological sequence analysis.
