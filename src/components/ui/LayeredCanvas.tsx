// Canvas layering system for performance optimization
import React, { useRef, useEffect, useState } from 'react';

interface CanvasLayer {
  id: string;
  zIndex: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  dependencies: any[];
  static?: boolean;
}

interface LayeredCanvasProps {
  width: number;
  height: number;
  layers: CanvasLayer[];
  style?: React.CSSProperties;
  onMouseMove?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
}

/**
 * A component that manages multiple canvas layers for optimized rendering
 * Only redraws layers when their dependencies change
 */
const LayeredCanvas: React.FC<LayeredCanvasProps> = ({
  width,
  height,
  layers,
  style,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onMouseLeave
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [renderedLayers, setRenderedLayers] = useState<string[]>([]);
  
  // Setup canvas elements
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    const newLayerRefs = new Map<string, HTMLCanvasElement>();
    
    // Create and append canvas elements in z-index order
    layers
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach(layer => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = layer.zIndex.toString();
        
        container.appendChild(canvas);
        newLayerRefs.set(layer.id, canvas);
      });
    
    layerRefs.current = newLayerRefs;
    setRenderedLayers([]);
  }, [layers.length, width, height]);
  
  // Render each layer
  layers.forEach(layer => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const canvas = layerRefs.current.get(layer.id);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas if it's not static or hasn't been rendered yet
      if (!layer.static || !renderedLayers.includes(layer.id)) {
        ctx.clearRect(0, 0, width, height);
        layer.draw(ctx);
        
        // Mark as rendered if static
        if (layer.static && !renderedLayers.includes(layer.id)) {
          setRenderedLayers(prev => [...prev, layer.id]);
        }
      }
    }, [layer.id, ...layer.dependencies, width, height]);
  });
  
  // Event delegation to the top layer
  const handleEvent = (eventHandler: ((event: React.MouseEvent) => void) | undefined) => {
    return (event: React.MouseEvent) => {
      if (eventHandler) {
        eventHandler(event);
      }
    };
  };
  
  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        ...style
      }}
      onMouseMove={handleEvent(onMouseMove)}
      onMouseDown={handleEvent(onMouseDown)}
      onMouseUp={handleEvent(onMouseUp)}
      onMouseLeave={handleEvent(onMouseLeave)}
    />
  );
};

export default LayeredCanvas;
