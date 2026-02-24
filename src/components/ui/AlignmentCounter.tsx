import React, { useState, useEffect, useCallback } from 'react';
import { getAlignmentCount, incrementAlignmentCount } from '../../utils/api/counterService';
import './AlignmentCounter.css';

interface AlignmentCounterProps {
  className?: string;
}

// Create a simple event system for counter updates
type CounterListener = (count: number) => void;
const listeners: Set<CounterListener> = new Set();

export function subscribeToCounterUpdates(listener: CounterListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyCounterUpdated(count: number): void {
  listeners.forEach(listener => listener(count));
}

/**
 * Increment the alignment counter and notify all subscribers
 * Call this function when an alignment is successfully generated
 */
export async function triggerCounterIncrement(): Promise<number> {
  const newCount = await incrementAlignmentCount();
  if (newCount !== -1) {
    notifyCounterUpdated(newCount);
  }
  return newCount;
}

const AlignmentCounter: React.FC<AlignmentCounterProps> = ({ className = '' }) => {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  // Fetch initial count
  useEffect(() => {
    const fetchCount = async () => {
      setIsLoading(true);
      const fetchedCount = await getAlignmentCount();
      
      if (fetchedCount === -1) {
        setHasError(true);
      } else {
        setCount(fetchedCount);
        setHasError(false);
      }
      setIsLoading(false);
    };

    fetchCount();
  }, []);

  // Subscribe to counter updates
  const handleCountUpdate = useCallback((newCount: number) => {
    setCount(newCount);
    setIsUpdated(true);
    // Reset animation after it completes
    setTimeout(() => setIsUpdated(false), 300);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCounterUpdates(handleCountUpdate);
    return unsubscribe;
  }, [handleCountUpdate]);

  const getStatusClass = () => {
    if (isLoading) return 'loading';
    if (hasError) return 'error';
    return '';
  };

  const renderCount = () => {
    if (isLoading) return '...';
    if (hasError) return '?';
    return count?.toLocaleString() ?? '0';
  };

  return (
    <div className={`alignment-counter ${getStatusClass()} ${className}`}>
      <span className="counter-label">EMERALD-UI has been used</span>

      <span className={`counter-value ${isUpdated ? 'updated' : ''}`}>
        {renderCount()}
      </span>
      <span className="counter-label">times.</span>
    </div>
  );
};

export default AlignmentCounter;
