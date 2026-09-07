import { useLayoutEffect, useRef } from 'react'

// ── useFlipReorder ────────────────────────────────────────────────────────────────────────────
// FLIP (First, Last, Invert, Play) for a set of items that get REORDERED by a state change.
//
// Keyed on a data attribute rather than on the DOM nodes themselves: switching between the flat
// sort and the banded ones doesn't just reorder cells, it re-parents them — the flat layout
// renders one grid of cells, the grouped layouts render a <section> per band — and React
// unmounts/remounts across that boundary. Node identity is therefore NOT stable across a sort
// change, so holding element references would lose every cell that moved between containers,
// which is most of them. Matching on the entity id means a cell that was destroyed and rebuilt
// in a different parent still animates from wherever the old one was standing.
//
// Runs in useLayoutEffect, not useEffect: the measurement has to happen in the same frame the
// browser computes the new layout, before it paints. In useEffect the browser paints the new
// positions first, so you see the jump the animation exists to hide.
//
// Plays through the Web Animations API rather than an inline transform cleared on a later frame.
// The rAF version of this had a real failure mode: rAF is frozen while the tab is hidden, so
// switching away mid-sort left every moved cell stranded at its INVERTED position — visibly
// wrong, and permanently, since the callback that was meant to clear it never ran. WAAPI owns
// the whole lifecycle instead: nothing is written to element.style, so there is no state that
// can be left behind, and the animation resolves on its own whenever the tab comes back.
const GLIDE_MS = 620
const GLIDE_EASE = 'cubic-bezier(0.3, 0, 0.08, 1)' // --ease-panel

export function useFlipReorder(
  ref: React.RefObject<HTMLElement | null>,
  selector: string,
  key: string,
  enabled = true,
) {
  const prev = useRef(new Map<string, DOMRect>())
  const lastKey = useRef(key)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector))
    const changed = lastKey.current !== key
    lastKey.current = key

    // Measure the FINAL layout first and keep it — this is what the NEXT change measures against.
    const now = new Map<string, DOMRect>()
    for (const el of nodes) {
      const id = el.dataset.id
      if (id) now.set(id, el.getBoundingClientRect())
    }

    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (changed && enabled && !reduced) {
      for (const el of nodes) {
        const id = el.dataset.id
        if (!id) continue
        const before = prev.current.get(id)
        const after = now.get(id)
        if (!before || !after) continue
        const dx = before.left - after.left
        const dy = before.top - after.top
        // sub-pixel shifts aren't worth a composite layer, and animating them reads as jitter
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration: GLIDE_MS, easing: GLIDE_EASE },
        )
      }
    }

    prev.current = now
  })
}
