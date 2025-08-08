// Web Worker for offloading heavy computations
// Usage: webWorker.ts
import React from 'react';
// import type { Alignment } from '../../types/PointGrid';

export function createWorker(workerFunction: Function) {
  // Convert the function to a string and create a blob
  const workerBlob = new Blob(
    [`(${workerFunction.toString()})()`],
    { type: 'application/javascript' }
  );
  
  // Create a URL for the blob
  const workerUrl = URL.createObjectURL(workerBlob);
  
  // Create a new worker from the URL
  const worker = new Worker(workerUrl);
  
  // Clean up the URL
  URL.revokeObjectURL(workerUrl);
  
  return worker;
}

// Example alignment data processor worker
export const alignmentProcessorWorker = () => {
  // Inside the worker scope
  self.onmessage = (event) => {
    const { type, data } = event.data;
    
    if (type === 'filterVisibleAlignments') {
      const { alignments, visibleXRange, visibleYRange } = data;
      
      // Filter alignments that are visible
      const visibleAlignments = alignments.filter((alignment: any) => {
        // Check if start or end dots are visible
        if (alignment.startDot) {
          if (alignment.startDot.x >= visibleXRange[0] && 
              alignment.startDot.x <= visibleXRange[1] &&
              alignment.startDot.y >= visibleYRange[0] && 
              alignment.startDot.y <= visibleYRange[1]) {
            return true;
          }
        }
        
        if (alignment.endDot) {
          if (alignment.endDot.x >= visibleXRange[0] && 
              alignment.endDot.x <= visibleXRange[1] &&
              alignment.endDot.y >= visibleYRange[0] && 
              alignment.endDot.y <= visibleYRange[1]) {
            return true;
          }
        }
        
        // Check if any edges intersect the visible area
        for (const edge of alignment.edges) {
          const [x1, y1] = edge.from;
          const [x2, y2] = edge.to;
          
          // Simple check: if either endpoint is in the viewport
          if ((x1 >= visibleXRange[0] && x1 <= visibleXRange[1] && 
               y1 >= visibleYRange[0] && y1 <= visibleYRange[1]) ||
              (x2 >= visibleXRange[0] && x2 <= visibleXRange[1] && 
               y2 >= visibleYRange[0] && y2 <= visibleYRange[1])) {
            return true;
          }
        }
        
        return false;
      });
      
      // Post the filtered alignments back to the main thread
      self.postMessage({
        type: 'filteredAlignments',
        data: visibleAlignments
      });
    }
    
    else if (type === 'sampleAlignments') {
      const { alignments, samplingRate } = data;
      
      // Skip sampling if we have a small dataset
      if (alignments.length < 100) {
        self.postMessage({
          type: 'sampledAlignments',
          data: alignments
        });
        return;
      }
      
      // Sample the alignments
      const sampledAlignments = [];
      
      for (let i = 0; i < alignments.length; i += samplingRate) {
        sampledAlignments.push(alignments[i]);
      }
      
      self.postMessage({
        type: 'sampledAlignments',
        data: sampledAlignments
      });
    }
  };
};

// Hook for using the alignment processor worker
export function useAlignmentProcessorWorker() {
  const workerRef = React.useRef<Worker | null>(null);
  
  React.useEffect(() => {
    // Create the worker
    const worker = createWorker(alignmentProcessorWorker);
    workerRef.current = worker;
    
    return () => {
      // Terminate the worker when component unmounts
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  // Function to filter alignments using the worker
  const filterVisibleAlignments = React.useCallback(
    (alignments: any[], visibleXRange: [number, number], visibleYRange: [number, number]) => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(alignments);
          return;
        }
        
        // Set up a one-time message handler for this specific request
        const handleMessage = (event: MessageEvent) => {
          const { type, data } = event.data;
          
          if (type === 'filteredAlignments') {
            workerRef.current?.removeEventListener('message', handleMessage);
            resolve(data);
          }
        };
        
        workerRef.current.addEventListener('message', handleMessage);
        
        // Send the request to the worker
        workerRef.current.postMessage({
          type: 'filterVisibleAlignments',
          data: { alignments, visibleXRange, visibleYRange }
        });
      });
    },
    []
  );
  
  // Function to sample alignments using the worker
  const sampleAlignments = React.useCallback(
    (alignments: any[], samplingRate: number) => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(alignments);
          return;
        }
        
        // Set up a one-time message handler for this specific request
        const handleMessage = (event: MessageEvent) => {
          const { type, data } = event.data;
          
          if (type === 'sampledAlignments') {
            workerRef.current?.removeEventListener('message', handleMessage);
            resolve(data);
          }
        };
        
        workerRef.current.addEventListener('message', handleMessage);
        
        // Send the request to the worker
        workerRef.current.postMessage({
          type: 'sampleAlignments',
          data: { alignments, samplingRate }
        });
      });
    },
    []
  );
  
  return { filterVisibleAlignments, sampleAlignments };
}
