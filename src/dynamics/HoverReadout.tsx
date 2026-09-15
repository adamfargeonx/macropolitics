import { useMemo } from 'react'
import { NODES, AXIS, AXIS_LABEL, forceScore } from '../data/entities'
import { usePresenceValue } from './usePresence'

const byId = new Map(NODES.map((n) => [n.id, n]))
// keep in sync with .readout--closing's animation-duration in chrome.css — the delayed unmount
// below must outlive the exit animation, or the box vanishes a frame before it finishes shrinking.
const EXIT_MS = 320

// Data readout shown on node hover — name, gravity score, tier/bloc, orbit parent.
// Positioned near the hovered node (screen coords from the engine).
export function HoverReadout({ id, screen }: { id: string | null; screen: { x: number; y: number } | null }) {
  // React unmounts the instant `id`/`screen` go null, which is what made a real exit animation
  // impossible before — a `transition`/`animation` has nothing left to play against once the node
  // is gone. usePresenceValue holds the most recent shown state past that point so the box can
  // shrink-out in place instead of vanishing, gates the exit keyframe via `exiting`, and drops the
  // value once the animation has had time to finish. Switching directly from one hovered body to
  // another (id A → id B, never through null) updates immediately with no closing step at all —
  // only genuinely hovering nothing triggers the exit.
  // MEMOISED, and it has to be: usePresenceValue keys its effect on this value's IDENTITY, so the
  // bare `id && screen ? { id, screen } : null` this used to pass built a new object on every
  // render — the effect re-ran every render, its setLast() forced another render, and that fed
  // itself until React bailed out with "Maximum update depth exceeded", repeatedly, for as long as
  // a body stayed hovered or selected. Nothing looked broken before a hover because the falsy arm
  // is a stable `null`; the loop only started once there was an object to rebuild. `id`/`screen`
  // themselves are stable between real hover changes (the engine's setHovered is change-guarded),
  // so keying on them is enough.
  const shown = useMemo(() => (id && screen ? { id, screen } : null), [id, screen])
  const { value: last, exiting: closing } = usePresenceValue(shown, EXIT_MS)

  if (!last) return null
  const e = byId.get(last.id)
  if (!e) return null
  const parent = e.parent !== 'C' ? byId.get(e.parent) : null
  // flip below the body when there isn't room above — was a fixed up-and-right offset regardless
  // of screen position, which read as "beside" the body rather than above/below it for anything
  // not near the vertical centre. ~150px clears the box's own height plus the header chrome.
  const below = last.screen.y < 150
  return (
    <div
      className={`readout${below ? ' readout--below' : ''}${closing ? ' readout--closing' : ''}`}
      dir="rtl"
      // `translate` (the CSS property), not `transform` — positioning has to live on a DIFFERENT
      // property than the expand animation below, or the keyframe's `transform: scale(...)` and
      // this inline offset would fight over the same `transform` slot every frame.
      style={{ translate: `${last.screen.x}px ${last.screen.y}px` }}
    >
      <span className="readout__name">
        {e.he}
        <b className="readout__g">{forceScore(e.power).toFixed(1)}</b>
      </span>
      <span className="readout__row">{e.tier} · {AXIS_LABEL[AXIS[last.id] ?? 'none']}</span>
      <span className="readout__row readout__dispo">
        {e.dispo}{parent ? ` · במסלול סביב ${parent.he}` : ''}
      </span>
    </div>
  )
}
