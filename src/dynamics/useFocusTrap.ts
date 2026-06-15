import { useEffect, useRef } from 'react'

// Focus management for modal overlays. When `active` turns true it moves focus into the
// container, traps Tab/Shift+Tab within it, and on deactivation restores focus to whatever
// held it before (the triggering control). WCAG 2.4.3 — keyboard users don't fall out the back.
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const prevFocused = document.activeElement as HTMLElement | null

    // move focus inside: first focusable, else the container itself
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusables()[0]
    ;(first ?? node).focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      prevFocused?.focus?.() // restore focus to the trigger
    }
  }, [active])

  return ref
}
