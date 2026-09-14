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
//
// Gesture-only retirement has a gap: a reader who isn't doing the ONE thing it's watching for
// (scrolling, say — but reading the legend, or just looking) sees it sit there indefinitely,
// which reads as "stuck" even though it's working exactly as designed. So the line itself now
// pulses instead of holding solid: visible for `visibleFor`, then hidden, then back again after
// `recurAfter` — repeating until `done` (or the session's own `retired` flag) stops it for good.
// Still gesture-driven, not a substitute for it — the timer is only ever a reminder that the
// gesture is still there to be found, not a replacement retirement path.

const seen = (key: string) => {
  try { return sessionStorage.getItem(`mp-afford-${key}`) === '1' } catch { return false }
}
const markSeen = (key: string) => {
  try { sessionStorage.setItem(`mp-afford-${key}`, '1') } catch { /* private mode — just don't persist */ }
}

export function Affordance({
  id, text, done, delay = 2200, visibleFor = 4500, recurAfter = 30000,
}: { id: string; text: string; done: boolean; delay?: number; visibleFor?: number; recurAfter?: number }) {
  // retired = fully unmounted (gesture satisfied, exit transition finished, or already satisfied
  // earlier this session). visible = currently in the "on" half of the show/hide pulse below.
  const [retired, setRetired] = useState(() => seen(id))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (retired || done) return
    // A recursive setTimeout, not setInterval — each leg's own length (delay the first time,
    // visibleFor/recurAfter after) differs, and setInterval can't express that without a second
    // "is this the first firing" branch anyway.
    let timer: number
    const hide = () => { setVisible(false); timer = window.setTimeout(show, recurAfter) }
    function show() { setVisible(true); timer = window.setTimeout(hide, visibleFor) }
    timer = window.setTimeout(show, delay)
    return () => window.clearTimeout(timer)
  }, [retired, done, delay, visibleFor, recurAfter])

  useEffect(() => {
    if (!done || retired) return
    markSeen(id)
    // hold the node one transition-length so the fade-out can play, then unmount
    const t = window.setTimeout(() => setRetired(true), 400)
    return () => window.clearTimeout(t)
  }, [done, retired, id])

  if (retired) return null
  // `done` drives the exit directly — no second state to set from inside an effect.
  const shown = visible && !done
  return (
    <p className={`afford${shown ? ' afford--in' : ''}`} dir="rtl" aria-live="polite">{text}</p>
  )
}
