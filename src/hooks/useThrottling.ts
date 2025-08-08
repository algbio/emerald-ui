// Performance optimization utilities for react components
import { useEffect, useRef, useState } from 'react';

/**
 * A hook that throttles a value update to prevent too frequent rerenders
 * @param value The value to throttle
 * @param delay The delay in ms
 * @returns The throttled value
 */
export function useThrottledValue<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;
    
    if (timeSinceLastUpdate >= delay) {
      // Update immediately if we've exceeded the delay
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      // Schedule an update after the remaining delay
      const remainingDelay = delay - timeSinceLastUpdate;
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, remainingDelay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, delay]);
  
  return throttledValue;
}

/**
 * A hook that debounces a callback function
 * @param callback The function to debounce
 * @param delay The delay in ms
 * @returns The debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<number | undefined>(undefined);
  
  const debouncedCallback = (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

/**
 * A hook that throttles a rendering function using requestAnimationFrame
 * @param callback The function to throttle
 * @returns The throttled function
 */
export function useRafThrottle<T extends (...args: any[]) => any>(callback: T): (...args: Parameters<T>) => void {
  const requestRef = useRef<number | null>(null);
  const savedCallback = useRef<T>(callback);
  const argsRef = useRef<Parameters<T> | null>(null);
  
  // Update the callback ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  const throttledCallback = (...args: Parameters<T>) => {
    argsRef.current = args;
    
    if (requestRef.current === null) {
      requestRef.current = requestAnimationFrame(() => {
        if (argsRef.current) {
          savedCallback.current(...argsRef.current);
        }
        requestRef.current = null;
      });
    }
  };
  
  useEffect(() => {
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
  
  return throttledCallback;
}
