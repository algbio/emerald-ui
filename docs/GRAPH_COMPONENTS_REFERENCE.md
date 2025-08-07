# Emerald UI Graph Components Reference Guide

> **Last Updated**: August 6, 2025  
> **Status**: Current - reflects latest codebase including gap highlighting features

## Table of Contents
1. [Core Components Overview](#1-core-components-overview)
2. [Safety Windows System](#2-safety-windows-system)
3. [Unsafe Windows/Gaps System](#3-unsafe-windowsgaps-system)
4. [Interactive Features](#4-interactive-features)
5. [Visualization Settings](#5-visualization-settings)
6. [Technical Implementation](#6-technical-implementation)
7. [Key Functions Reference](#7-key-functions-reference)
8. [Integrations](#8-integrations)

## 1. Core Components Overview

### PointGridPlot Component
The main visualization component that renders sequence alignments as a 2D grid. It displays:
- Two sequences (representative and member) on X and Y axes
- Safety windows (confident alignment regions)
- Unsafe/gap regions (uncertain alignment areas)
- Interactive elements for navigation and selection

### Component Architecture
The visualization system is composed of several modular components:
- `PointGridPlot`: Canvas-based visualization
- `SafetyWindowsInfoPanel`: Detailed information and controls
- `VisualizationSettingsPanel`: Display customization options
- `SequenceAlignmentViewer`: Text representation of alignments

## 2. Safety Windows System

### What are Safety Windows?
Safety windows are rectangular regions in the alignment grid representing areas of confident alignment between sequences. They are the "safe" parts of the alignment where the algorithm has high confidence.

### Safety Window Data Structure
```typescript
interface Alignment {
  color: string;               // Visual color for the window
  edges: Edge[];               // Connection lines between points
  startDot?: { x: number; y: number }; // Start coordinates
  endDot?: { x: number; y: number };   // End coordinates
}

// Derived interface used in the info panel
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

### Safety Window Visualization
Safety windows are visualized in several ways:

1. **Bracket System**: Green L-shaped brackets on both X and Y axes
   ```
   ┌─────────┐
   │         │
   │ Safety  │
   │ Window  │
   └─────────┘
   ```

2. **Highlighting Layers**:
   - Light green fill in the entire safety window area
   - Green axis brackets to indicate window boundaries
   - Dashed border when selected or hovered

3. **Interactive Selection**:
   - Clicking a safety window selects it
   - Selection adds stronger highlighting and displays details in the info panel
   - Hovering creates a semi-transparent preview highlight

### Safety Window Rendering (Canvas)
The system uses multiple canvas drawing functions:

```typescript
// Main drawing function for safety window brackets
drawSafetyWindows(ctx, safetyWindows, x, y, fontSize, marginTop, marginLeft);

// Enhanced highlighting for selected/hovered windows
drawSafetyWindowHighlight(ctx, x, y, marginTop, marginLeft, window);
```

## 3. Unsafe Windows/Gaps System

### What are Unsafe Windows/Gaps?
Unsafe windows are regions between safety windows where alignment confidence is low. These represent potential alignment gaps or uncertain regions.

### Gap Data Structure
```typescript
interface GapInfo {
  type: 'representative' | 'member'; // Which sequence has the gap
  start: number;                    // Start position (0-indexed)
  end: number;                      // End position (0-indexed)
}
```

### Gap Visualization
Gaps are visualized with a combined axis and grid-area highlighting approach using a contrasting orange-red color scheme:

1. **Multi-Layer Highlighting**:
   - **Axis Indicators**: Prominent orange-red highlighting on the relevant axis
     - For representative gaps: Highlighted region on the x-axis
     - For member gaps: Highlighted region on the y-axis
   - **Grid Area**: Light orange-red strip extending across the grid area
     - Creates a visual "stripe" through the entire visualization
     - Helps visually trace the gap through the entire alignment

2. **Visual Structure**:
   - Strong axis highlighting for primary indication of which sequence has gaps
   - Light grid area fill to maintain context within the visualization
   - Semi-transparent orange-red fill with varying opacity levels
   - Distinct borders around axis indicators to define gap boundaries
   - Proportional sizing relative to axis margins

### Gap Rendering (Canvas)
Two primary functions handle gap visualization with a multi-layered approach:

```typescript
// Standard gap highlighting with axis indicators and grid area highlighting
drawGapHighlight(ctx, x, y, marginTop, marginLeft, gapInfo);

// Performance-optimized rendering for larger datasets with efficient borders
// and grid area highlighting for better visibility
drawGapHighlightOptimized(ctx, x, y, marginTop, marginLeft, gapAlignment, gapType);
```

The rendering process for gaps follows a layered approach:
1. Draw the axis indicator with moderate opacity (0.4)
2. Add borders to the axis indicator with higher opacity (0.6)
3. Draw the grid area highlight with low opacity (0.1) to maintain context

## 4. Interactive Features

### Mouse Interactions
- **Hover**: Shows yellow highlight on grid cells with info tooltip
- **Click**: Selects/deselects safety windows
- **Drag**: Pans the view (grab cursor)
- **Scroll/Wheel**: Zooms in/out

### Minimap Navigation
- Shows a small overview of the entire alignment in the top-right corner
- Current viewport displayed as a red rectangle
- Click to navigate to specific regions
- Safety windows visible as green rectangles

### Coordinated Selection
When a safety window is selected:
1. The window is highlighted in the graph
2. Details appear in the SafetyWindowsInfoPanel
3. Axis indices display positions (1-indexed)

```typescript
// Function for finding safety windows containing a specific cell
findSafetyWindowsForCell(cell, safetyWindows)
```

### Keyboard Navigation
- **Arrow Keys**: Navigate between safety windows when appropriate panel is active
- **Circular Navigation**: Wraps around from last to first window
- **Coordinated Updates**: Selection changes update both graph and panel

## 5. Visualization Settings

The visualization can be customized through settings:

```typescript
interface VisualizationSettings {
  showAxes: boolean;           // X/Y axis lines
  showAxisLabels: boolean;     // Sequence characters and positions
  showGrid: boolean;           // Background grid lines
  showMinimap: boolean;        // Overview navigation
  showSafetyWindows: boolean;  // Green bracket indicators
  showAlignmentEdges: boolean; // Connection lines
  showAlignmentDots: boolean;  // Start/end markers
  showOptimalPath: boolean;    // Blue optimal alignment path
  enableSafetyWindowHighlighting: boolean; // Toggle safety window highlights
  enableGapHighlighting: boolean;         // Toggle gap region highlights
}
```

### Default Settings
All visualization elements are enabled by default:
- **Axes**: Visible (X and Y axis lines)
- **Axis Labels**: Visible (sequence characters and indices)
- **Grid**: Visible (background grid for easier reading)
- **Minimap**: Visible (overview navigation)
- **Safety Windows**: Visible (green bracket indicators)
- **Alignment Edges**: Visible (probability connections)
- **Alignment Dots**: Visible (start/end markers)
- **Optimal Path**: Visible (blue optimal alignment path)

## 6. Technical Implementation

### Canvas Rendering System
The visualization uses HTML5 Canvas for efficient rendering:

1. **Layer-based Drawing**:
   - Background grid and axes
   - Safety windows and gap highlights
   - Alignment edges and dots
   - Interactive elements (hover, selection)

2. **Optimized Rendering**:
   - Conditional drawing based on visibility
   - Clipping to visible areas
   - Batched drawing operations

### Coordinate Systems
- **Domain Coordinates**: Sequence positions (0-indexed internally)
- **Range Coordinates**: Canvas pixel positions
- **D3 Scales**: Transform between domain and range (`x` and `y` scale functions)

### Scaling and Zooming
- Uses D3's zoom behavior for smooth scaling and panning
- Scale extent: [0.1, 100]
- Proper clipping and boundary handling
- Optimal tick density calculation based on zoom level

### Performance Considerations
- Safety window highlights use simplified rendering for large datasets
- Gap highlighting uses optimized rectangle fills instead of expensive strokes
- Minimap provides efficient navigation for large alignments
- Conditional rendering skips unnecessary drawing operations
- Batched rendering for similar elements
- Timeout-based redrawing to prevent performance issues

## 7. Key Functions Reference

### Safety Window Functions
- `drawSafetyWindows`: Renders green L-shaped brackets on axes
  - Parameters: `ctx`, `safetyWindows`, `x`, `y`, `fontSize`, `marginTop`, `marginLeft`
  - Location: `src/utils/canvas/safetyWindows.tsx`

- `drawSafetyWindowHighlight`: Creates multi-layer highlighting for selected windows
  - Parameters: `ctx`, `x`, `y`, `marginTop`, `marginLeft`, `window`
  - Location: `src/utils/canvas/safetyWindows.tsx`

- `findSafetyWindowsForCell`: Determines which safety windows contain a specific cell
  - Parameters: `cell`, `safetyWindows`
  - Location: `src/utils/canvas/interactions.tsx`

### Gap/Unsafe Window Functions
- `drawGapHighlight`: Renders orange-red highlighting for gap regions
  - Parameters: `ctx`, `x`, `y`, `marginTop`, `marginLeft`, `gapInfo`
  - Location: `src/utils/canvas/safetyWindows.tsx`

- `drawGapHighlightOptimized`: Performance-optimized version for large alignments
  - Parameters: `ctx`, `x`, `y`, `marginTop`, `marginLeft`, `gapAlignment`, `gapType`
  - Location: `src/utils/canvas/safetyWindows.tsx`

### Interactive Functions
- `drawHoverHighlight`: Creates cross-hair highlighting on hover with tooltip
  - Parameters: `ctx`, `hoveredCell`, `x`, `y`, `marginTop`, `marginLeft`, `representative`, `member`, `alignments`
  - Location: `src/utils/canvas/interactions.tsx`

- `handleSafetyWindowClick`: Processes clicks for safety window selection
  - Parameters: `clickX`, `clickY` (implemented in `PointGridPlot`)
  - Location: `src/components/alignment/PointGridPlot.tsx`

- `handleMinimapInteraction`: Manages minimap navigation
  - Parameters: `event`, `options`, `setTransform`
  - Location: `src/utils/canvas/minimap.tsx`

### Drawing Utility Functions
- `drawAxes`: Renders X and Y axis lines
  - Location: `src/utils/canvas/axes.tsx`

- `drawAxisLabels`: Renders sequence characters and position indices
  - Location: `src/utils/canvas/axes.tsx`

- `drawGridLines`: Renders background grid lines
  - Location: `src/utils/canvas/grid.tsx`

- `drawAlignmentEdges`: Renders probability-weighted connection lines
  - Location: `src/utils/canvas/alignments.tsx`

- `drawAlignmentDots`: Renders start/end point markers
  - Location: `src/utils/canvas/alignments.tsx`

- `drawMinimap`: Renders overview minimap in top-right corner
  - Location: `src/utils/canvas/minimap.tsx`

## 8. Integrations

### Component Integration
The PointGridPlot coordinates with other components:
- `SafetyWindowsInfoPanel`: Shows detailed information about selected windows
- `VisualizationSettingsPanel`: Controls display settings
- `SequenceAlignmentViewer`: Shows text-based sequence alignments

### Data Flow
1. **Input Data**:
   - Sequences: `representative` and `member`
   - Alignments array with safety windows
   - Visualization settings

2. **Events**:
   - Safety window selection/hover events propagate to parent components
   - Transform (zoom/pan) changes notify parent components
   - Gap highlighting requests update the visualization

3. **External Controls**:
   - External components can control selected/hovered windows
   - Visualization settings can be updated by parent components
   - Gap highlighting can be triggered externally

### Export Functionality
The component provides export functionality through the ref interface:
```typescript
export interface PointGridPlotRef {
  canvas: HTMLCanvasElement | null;
  getExportData: () => {
    alignments: Alignment[];
    representative: string;
    member: string;
    xTicks: Array<{value: number; label: string}>;
    yTicks: Array<{value: number; label: string}>;
    transform: any;
    visualizationSettings: {
      showAxes: boolean;
      showAxisLabels: boolean;
      showGrid: boolean;
      showMinimap: boolean;
      showSafetyWindows: boolean;
      showAlignmentEdges: boolean;
      showAlignmentDots: boolean;
      showOptimalPath: boolean;
    };
  };
}
```

This system provides a comprehensive visualization of sequence alignments, clearly distinguishing between confident alignment regions (safety windows) and uncertain alignment regions (unsafe windows/gaps).
