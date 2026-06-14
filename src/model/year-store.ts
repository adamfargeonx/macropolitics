import { useSyncExternalStore } from 'react'
import type { Year } from '../data/empirical'

// Tiny external store for the Time Axis — the active snapshot year (2020 or 2025).
// Default = 2025 (the calibrated present). Mirrors weights-store / panelAB so the forces
// constellation, index and evidence overlay all read the same year and stay consistent.
let current: Year = 2025
const subs = new Set<() => void>()

export const yearStore = {
  get: (): Year => current,
  set: (y: Year) => { current = y; subs.forEach((f) => f()) },
  reset: () => { yearStore.set(2025) },
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
}

export function useYear(): Year {
  return useSyncExternalStore(yearStore.subscribe, yearStore.get, yearStore.get)
}
