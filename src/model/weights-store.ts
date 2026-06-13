import { useSyncExternalStore } from 'react'
import { WEIGHTS, type Weights } from './gravity'

// Tiny external store for the Scenario Sandbox — live, tunable axis weights.
// Default = the model's canonical WEIGHTS. Setting them re-equilibrates everything that reads
// them (the forces constellation + index, the evidence overlay's calculation). Mirrors panelAB.
let current: Weights = { ...WEIGHTS }
const subs = new Set<() => void>()

export const weightsStore = {
  get: (): Weights => current,
  set: (w: Weights) => { current = w; subs.forEach((f) => f()) },
  reset: () => { weightsStore.set({ ...WEIGHTS }) },
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
}

export const isDefaultWeights = (w: Weights) => w.eco === WEIGHTS.eco && w.mil === WEIGHTS.mil && w.geo === WEIGHTS.geo

export function useWeights(): Weights {
  return useSyncExternalStore(weightsStore.subscribe, weightsStore.get, weightsStore.get)
}
