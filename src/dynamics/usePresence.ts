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
