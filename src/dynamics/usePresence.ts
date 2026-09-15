import { useEffect, useRef, useState } from 'react'

// Keeps a conditionally-rendered component mounted through an EXIT animation. Returns whether to
// render (`mounted`) and whether it's currently animating out (`exiting`) so the component can apply
// an exit class. Callers render `{mounted && <X exiting={exiting} />}`. `exitMs` must match the CSS.
export function usePresence(active: boolean, exitMs = 240) {
  const [mounted, setMounted] = useState(active)
  const [exiting, setExiting] = useState(false)
  const timer = useRef(0)

  /* eslint-disable react-hooks/set-state-in-effect -- presence escape hatch: mount synchronously on
     activate (no enter-frame delay), and after the exit window unmount. Syncing render-presence to a
     boolean prop over time inherently needs setState in an effect; this is the intended pattern. */
  useEffect(() => {
    if (active) {
      clearTimeout(timer.current)
      setMounted(true); setExiting(false)
      return
    }
    setExiting(true)
    timer.current = window.setTimeout(() => { setMounted(false); setExiting(false) }, exitMs)
    return () => clearTimeout(timer.current)
  }, [active, exitMs])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { mounted, exiting }
}

// Same mechanism as usePresence, but for callers that need to keep rendering the LAST truthy
// value through the exit — not just a mounted/exiting boolean (a hover readout or card whose
// content itself, not just its presence, must survive past the moment the source goes null).
// `value` is null/undefined while inactive; passing a non-null value re-arms it. Direct handoff
// from one non-null value to another (never through null) updates immediately with no exit step —
// only actually going null triggers the shrink-out window.
//
// CALLERS: `value` must be referentially STABLE while it means the same thing — memoise it if you
// build it inline. The effect below keys on its identity, so a fresh object per render re-runs the
// effect per render, and its own setLast() then causes the next render: a self-feeding loop that
// surfaces as React's "Maximum update depth exceeded" rather than as anything visibly broken.
// HoverReadout shipped exactly that bug (see the memo at its call site).
export function usePresenceValue<T>(value: T | null | undefined, exitMs = 240) {
  const [last, setLast] = useState<T | null>(value ?? null)
  const [exiting, setExiting] = useState(false)
  const timer = useRef(0)

  /* eslint-disable react-hooks/set-state-in-effect -- see usePresence above; same pattern. */
  useEffect(() => {
    clearTimeout(timer.current)
    if (value != null) {
      setLast(value); setExiting(false)
      return
    }
    setExiting(true)
    timer.current = window.setTimeout(() => { setLast(null); setExiting(false) }, exitMs)
    return () => clearTimeout(timer.current)
  }, [value, exitMs])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { value: last, exiting }
}
