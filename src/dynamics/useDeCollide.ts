import { useLayoutEffect, type RefObject } from 'react'

// Hides overlapping labels by priority (higher data-power wins; the hovered node is always kept).
// Used by /forces and /relations where bodies are DOM-positioned and labels can collide.
export function useDeCollide(
  rootRef: RefObject<HTMLElement | null>,
  nodeSel: string,
  nameSel: string,
  keepId: string | null,
  deps: unknown[],
) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>(nodeSel)]
      .map((n) => ({ id: n.dataset.id || '', p: Number(n.dataset.power || 0), name: n.querySelector<HTMLElement>(nameSel) }))
      .filter((x): x is { id: string; p: number; name: HTMLElement } => !!x.name)
    items.forEach((x) => { x.name.style.visibility = '' })
    const order = [...items].sort((a, b) => (b.id === keepId ? 1 : 0) - (a.id === keepId ? 1 : 0) || b.p - a.p)
    const placed: DOMRect[] = []
    for (const x of order) {
      const r = x.name.getBoundingClientRect()
      const hit = placed.some((p) => !(r.right < p.left - 2 || r.left > p.right + 2 || r.bottom < p.top - 1 || r.top > p.bottom + 1))
      if (hit && x.id !== keepId) x.name.style.visibility = 'hidden'
      else placed.push(r)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
