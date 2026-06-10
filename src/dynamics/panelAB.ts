import { useSyncExternalStore } from 'react'

// Tiny external store for the side-panel A/B comparison. 'a' = original, 'b' = new design.
export type PanelVariant = 'a' | 'b'
let variant: PanelVariant = 'a'
const subs = new Set<() => void>()

export const panelAB = {
  get: (): PanelVariant => variant,
  toggle: () => { variant = variant === 'a' ? 'b' : 'a'; subs.forEach((f) => f()) },
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
}

export function usePanelVariant(): PanelVariant {
  return useSyncExternalStore(panelAB.subscribe, panelAB.get, panelAB.get)
}
