import { create } from 'zustand'
import type { ScanResult } from '../services/api'

interface PlayGuardState {
  lastResult: ScanResult | null
  setLastResult: (r: ScanResult) => void
  clearResult: () => void
}

export const usePlayGuardStore = create<PlayGuardState>((set) => ({
  lastResult: null,
  setLastResult: (r) => set({ lastResult: r }),
  clearResult: () => set({ lastResult: null }),
}))
