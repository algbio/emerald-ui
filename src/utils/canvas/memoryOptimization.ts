// Memory optimization utilities
import { useRef } from 'react';

/**
 * Object pool for reusing objects to reduce garbage collection pressure
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 10, maxSize: number = 1000) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    
    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Get an object from the pool or create a new one if the pool is empty
   */
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    return this.factory();
  }

  /**
   * Return an object to the pool after resetting it
   */
  release(obj: T): void {
    // Reset the object to clean state
    this.reset(obj);
    
    // Only add to pool if we're under max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  /**
   * Get multiple objects from the pool
   */
  getMultiple(count: number): T[] {
    const objects: T[] = [];
    for (let i = 0; i < count; i++) {
      objects.push(this.get());
    }
    return objects;
  }
  
  /**
   * Release multiple objects back to the pool
   */
  releaseMultiple(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }
}

/**
 * Hook for using an object pool in components
 */
export function useObjectPool<T>(
  factory: () => T,
  reset: (obj: T) => void,
  initialSize: number = 10,
  maxSize: number = 1000
): ObjectPool<T> {
  const poolRef = useRef<ObjectPool<T> | null>(null);
  
  if (!poolRef.current) {
    poolRef.current = new ObjectPool<T>(factory, reset, initialSize, maxSize);
  }
  
  return poolRef.current;
}

/**
 * Creates a reusable array that doesn't get reallocated on each render
 * This helps reduce garbage collection pressure
 */
export function useReusableArray<T>(initialCapacity: number = 100): {
  array: T[];
  reset: () => void;
} {
  const arrayRef = useRef<T[]>([]);
  
  const reset = () => {
    // Clear array without allocating a new one
    arrayRef.current.length = 0;
  };
  
  // Ensure we have the right capacity
  if (arrayRef.current.length < initialCapacity) {
    arrayRef.current.length = initialCapacity;
    reset();
  }
  
  return {
    array: arrayRef.current,
    reset
  };
}
