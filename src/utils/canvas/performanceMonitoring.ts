// Performance monitoring utilities
import { useRef, useEffect, useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  lastRenderTimestamp: number;
  frameCount: number;
}

/**
 * Hook for monitoring rendering performance
 * @returns Object containing FPS and render time metrics along with a trackRender function
 */
export function usePerformanceMonitor(): {
  metrics: PerformanceMetrics;
  trackRender: () => void;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    lastRenderTimestamp: 0,
    frameCount: 0
  });
  
  const metricsRef = useRef<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    lastRenderTimestamp: performance.now(),
    frameCount: 0
  });
  
  const lastUpdateRef = useRef<number>(performance.now());
  
  // Update the metrics state once per second
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastUpdateRef.current;
      
      if (elapsed >= 1000) {
        const fps = (metricsRef.current.frameCount * 1000) / elapsed;
        
        setMetrics({
          ...metricsRef.current,
          fps: Math.round(fps * 10) / 10
        });
        
        // Reset frame counter
        metricsRef.current.frameCount = 0;
        lastUpdateRef.current = now;
      }
    }, 1000);
    
    return () => clearInterval(updateInterval);
  }, []);
  
  // Function to track each render
  const trackRender = () => {
    const now = performance.now();
    const renderTime = now - metricsRef.current.lastRenderTimestamp;
    
    metricsRef.current.renderTime = renderTime;
    metricsRef.current.lastRenderTimestamp = now;
    metricsRef.current.frameCount++;
  };
  
  return { metrics, trackRender };
}

/**
 * Component that displays performance metrics on the canvas
 */
export function renderPerformanceMetrics(
  ctx: CanvasRenderingContext2D, 
  metrics: PerformanceMetrics,
  x: number = 10,
  y: number = 20
) {
  ctx.save();
  
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x - 5, y - 15, 110, 40);
  
  ctx.fillStyle = metrics.fps < 30 ? 'red' : metrics.fps < 50 ? 'yellow' : 'green';
  ctx.fillText(`FPS: ${metrics.fps}`, x, y);
  
  ctx.fillStyle = metrics.renderTime > 16 ? 'red' : 'white';
  ctx.fillText(`Render: ${metrics.renderTime.toFixed(1)}ms`, x, y + 15);
  
  ctx.restore();
}
