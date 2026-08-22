import { useEffect, useState } from 'react'

// ── Affordance — the self-retiring coach line. Replaces the always-on static hint paragraphs
// (.forces-hint, .rel-hint, .sheet-hint, .sandbox__hint) that sat on screen forever regardless of
// whether the reader had already figured the gesture out.
//
// The rule: an affordance describes ONE gesture, and retires the moment that gesture is performed.
// `done` is the caller's own state — "has the user hovered a body yet", "has a year been picked" —
// so retirement is tied to the real interaction, not a timer. Once retired it stays retired for the
// session (sessionStorage), so re-entering a view doesn't re-teach something already learned.
//
// It renders in ONE fixed anchored slot per view (see .afford in chrome.css), never floated
// wherever there happened to be room — that consistency is what keeps it from reading as stuck-on.

const seen = (key: string) => {
  try { return sessionStorage.getItem(`mp-afford-${key}`) === '1' } catch { return false }
}
const markSeen = (key: string) => {
  try { sessionStorage.setItem(`mp-afford-${key}`, '1') } catch { /* private mode — just don't persist */ }
}

export function Affordance({ id, text, done, delay = 2200 }: { id: string; text: string; done: boolean; delay?: number }) {
  // retired = fully unmounted (gesture satisfied, exit transition finished, or already satisfied
  // earlier this session). entered = past the entrance delay.
  const [retired, setRetired] = useState(() => seen(id))
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (retired) return
    const t = window.setTimeout(() => setEntered(true), delay)
    return () => window.clearTimeout(t)
  }, [retired, delay])

  useEffect(() => {
    if (!done || retired) return
    markSeen(id)
    // hold the node one transition-length so the fade-out can play, then unmount
    const t = window.setTimeout(() => setRetired(true), 400)
    return () => window.clearTimeout(t)
  }, [done, retired, id])

  if (retired) return null
  // `done` drives the exit directly — no second state to set from inside an effect.
  const shown = entered && !done
  return (
    <p className={`afford${shown ? ' afford--in' : ''}`} dir="rtl" aria-live="polite">{text}</p>
  )
}
