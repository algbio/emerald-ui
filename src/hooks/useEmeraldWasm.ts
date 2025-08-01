import { useRef } from 'react'

// Define a type for the Emerald module
interface EmeraldModuleType {
  generateAlignmentJson: (
    refSeq: string,
    refDesc: string,
    memSeq: string, 
    memDesc: string,
    alpha?: number,
    delta?: number,
    gapCost?: number,
    startGap?: number
  ) => string;
  
  // Add other exported functions here as needed
  FS: any; // File System API
}

// Define window augmentation to make TypeScript aware of EmeraldModule
declare global {
  interface Window {
    EmeraldModule: () => Promise<EmeraldModuleType>;
  }
}

export const useEmeraldWasm = () => {
  const emeraldModuleRef = useRef<EmeraldModuleType | null>(null)
  const loadPromiseRef = useRef<Promise<EmeraldModuleType> | null>(null)

  const loadEmeraldModule = async (): Promise<EmeraldModuleType> => {
    // Return cached instance if already loaded
    if (emeraldModuleRef.current) {
      return emeraldModuleRef.current
    }

    // Return existing load promise if already loading
    if (loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    // Start loading process
    loadPromiseRef.current = (async () => {
      // Check if module already exists in window
      if (typeof window.EmeraldModule === 'undefined') {
        // Load the script dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = './emerald-wasm/emerald.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load emerald.js'))
          document.body.appendChild(script)
        })
        
        // Check if loading succeeded
        if (typeof window.EmeraldModule === 'undefined') {
          throw new Error('emerald.js did not expose EmeraldModule')
        }
      }
      
      // Initialize the module
      const module = await window.EmeraldModule()
      
      // Cache the module instance
      emeraldModuleRef.current = module
      return module
    })()
    
    return loadPromiseRef.current
  }

  return { loadEmeraldModule }
}

