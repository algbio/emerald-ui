// Off-screen rendering utilities for performance optimization
import { useRef, useEffect } from 'react';
import type { ScaleLinear } from 'd3-scale';
import type { Alignment } from '../../types/PointGrid';

/**
 * Creates an off-screen canvas for pre-rendering
 * @returns HTMLCanvasElement or OffscreenCanvas for off-screen rendering
 */
export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas | null {
  try {
    // Try to use OffscreenCanvas if available (more performant)
    return new OffscreenCanvas(width, height);
  } catch (e) {
    // Fallback to regular canvas if OffscreenCanvas is not supported
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}

/**
 * Hook for pre-rendering static content to an off-screen canvas
 * @param renderFn Function to render content to the canvas
 * @param dependencies Array of dependencies that trigger re-rendering
 * @returns Reference to the pre-rendered canvas
 */
export function useOffscreenRendering(
  width: number,
  height: number,
  renderFn: (ctx: CanvasRenderingContext2D) => void,
  dependencies: any[] = []
): HTMLCanvasElement | OffscreenCanvas | null {
  const canvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null);

  useEffect(() => {
    // Create or resize the canvas
    if (!canvasRef.current) {
      canvasRef.current = createOffscreenCanvas(width, height);
    } else {
      if (canvasRef.current instanceof HTMLCanvasElement) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      } else if (canvasRef.current instanceof OffscreenCanvas) {
        // TypeScript doesn't recognize OffscreenCanvas fully, so we need to cast
        (canvasRef.current as any).width = width;
        (canvasRef.current as any).height = height;
      }
    }

    // Get context and render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas instanceof HTMLCanvasElement 
        ? canvas.getContext('2d') 
        : (canvas as any).getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        renderFn(ctx);
      }
    }
  }, [width, height, ...dependencies]);

  return canvasRef.current;
}

/**
 * Pre-renders safety windows to improve performance
 */
export function usePrerenderedSafetyWindows(
  width: number,
  height: number,
  safetyWindows: Alignment[],
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  marginTop: number,
  marginLeft: number,
  drawSafetyWindows: (
    ctx: CanvasRenderingContext2D,
    safetyWindows: Alignment[],
    x: ScaleLinear<number, number>,
    y: ScaleLinear<number, number>,
    fontSize: number,
    marginTop: number,
    marginLeft: number,
    drawArrows?: boolean
  ) => void,
  fontSize: number,
  enabled: boolean = true
): HTMLCanvasElement | OffscreenCanvas | null {
  return useOffscreenRendering(
    width,
    height,
    (ctx) => {
      if (enabled) {
        drawSafetyWindows(
          ctx,
          safetyWindows,
          x,
          y,
          fontSize,
          marginTop,
          marginLeft,
          true
        );
      }
    },
    [safetyWindows, x, y, marginTop, marginLeft, fontSize, enabled]
  );
}

/**
 * Pre-renders grid lines to improve performance
 */
export function usePrerenderedGrid(
  width: number,
  height: number,
  xTicks: Array<{xOffset: number}>,
  yTicks: Array<{yOffset: number}>,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  drawGridLines: (
    ctx: CanvasRenderingContext2D,
    xTicks: Array<{xOffset: number}>,
    yTicks: Array<{yOffset: number}>,
    x: ScaleLinear<number, number>,
    y: ScaleLinear<number, number>
  ) => void,
  enabled: boolean = true
): HTMLCanvasElement | OffscreenCanvas | null {
  return useOffscreenRendering(
    width,
    height,
    (ctx) => {
      if (enabled) {
        drawGridLines(ctx, xTicks, yTicks, x, y);
      }
    },
    [xTicks, yTicks, x, y, enabled]
  );
}
