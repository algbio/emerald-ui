import { useRef } from 'react'

export const useEmeraldWasm = () => {
  const emeraldModuleRef = useRef<any>(null)

  const loadEmeraldModule = async () => {
    if (emeraldModuleRef.current) return emeraldModuleRef.current

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/emerald-wasm/emerald.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load emerald.js'))
      document.body.appendChild(script)
    })

    // @ts-ignore
    const mod = (window as any).Module
    if (!mod) throw new Error('emerald.js did not expose a Module global')

    if (!mod.calledRun) {
      await new Promise<void>((resolve) => {
        mod.onRuntimeInitialized = () => resolve()
      })
    }

    emeraldModuleRef.current = mod
    return mod
  }

  return { loadEmeraldModule }
}