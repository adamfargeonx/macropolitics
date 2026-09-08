import { useEffect, useMemo, useRef, useState } from 'react'
import { AXIS, AXIS_LABEL, powerSize } from '../data/entities'
import { PanelDock } from './Chrome'
import { AXIS_ICON, DISPO_ICON } from './panel-icons'
import { Words } from './Words'
import { CountUp, LetterSwap, Seg } from './PanelMotion'
import { Affordance } from './Affordance'
import { Icon } from './Icon'
import { RelationsGrid } from './RelationsGrid'
import { REL_BEAT, FIELD_BEAT, GRID_PICK_MS } from './panel-beats'
import { useDeCollide } from './useDeCollide'
import { sound } from '../sound'
import { usePresenceValue } from './usePresence'
import { byId, MEMBERS, isActor, hash, relation, sharpen, dominantOf, POLE_HE, VERDICT, type Rel, type Pole } from './relations-model'

// entrance stagger (seconds) — see the comment at its use site (the .rnode map) for why there's a
// held beat before the first star at all, rather than starting immediately.
const ENTRANCE_HOLD = 0.5
const ENTRANCE_STEP = 0.045
// Ambient name-cycling (views.css: .rnode__name's nameCycle animation). One shared source for
// both numbers so the JS-computed delay and the CSS animation-duration can never drift apart —
// CSS's own `var(--cp-dur, 9s)` default exists only as a fallback if this ever failed to reach
// the DOM, not as a second definition of the period.
const NAME_CYCLE_PERIOD = 9      // seconds — one star's full fade-in/hold/fade-out/hidden loop
// Flat delay before the loop may start at all, past the WORST-CASE star: FIELD_BEAT.nameStart
// (2.80s) + a 28-star field at nameStep (0.018s) + relNameIn's own 0.5s reveal, plus a small
// margin. Same for every star regardless of render index — only the per-star hash phase below
// varies — so cycling never looks like it's still finishing the initial reveal for a straggler.
const NAME_CYCLE_SETTLE = 3.9
// grid → field handoff. The grid no longer cross-fades as a block — it plays the five-beat pick
// choreography (GRID_PICK / GRID_PICK_MS in panel-beats.ts: glow → dismiss → undress → travel →
// expand), and the field mounts at the END of it, as the picked triangle's outline finishes
// opening out to the size the field's own triangle is about to occupy.
// The old 340ms cross-fade constant is gone from here; .rel-grid--selecting keeps its own 0.34s
// in views.css purely as the fallback arm for a pick whose rect could not be measured.
// Reference switch (picking a new state from the panel while already in field mode) — distinct
// from the grid→field handoff above. Two numbers, kept here rather than
// only in CSS, because the newly-JOINING star's entrance delay (below) has to land in the same
// beat as the CSS glide's own pause+duration (views.css's .rnode transition), not the unrelated
// initial-cascade schedule (ENTRANCE_HOLD/ENTRANCE_STEP) it would otherwise inherit.
// Raised from 0.12/0.9 — read back as still too quick even with the pause+ease-panel swap. The
// pause alone needs to actually register as a held beat (0.28s, not 0.12s — closer to a deliberate
// intake of breath than a blip), and the glide needs enough runway for ease-panel's long decel
// tail to visibly decelerate over, the same lesson rnodeRise's own comment already states for its
// rise distance — 0.9s wasn't quite there for a move that can cross the whole triangle.
const REF_SWITCH_PAUSE = 0.28  // seconds — matches .rnode's transition-delay in views.css
const REF_SWITCH_GLIDE = 1.4   // seconds — matches .rnode's transition-duration in views.css
const REF_SWITCH_EXIT_MS = 300 // matches .rnode--refswitch-out's rnodeExit duration in views.css

interface NodePoint { e: (typeof MEMBERS)[number]; r: Rel; x: number; y: number; d: number }

// Iterative collision relaxation — separate overlapping bodies (label-aware gap) while keeping
// them near their target positions. Mutates the points in place.
function relaxCollisions(points: NodePoint[], w: number, h: number, iters = 24, pad = 21) {
  for (let iter = 0; iter < iters; iter++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j]
        const min = (a.d + b.d) / 2 + pad
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 0.001
        if (dist < min) {
          const push = (min - dist) / 2
          const ux = dx / dist, uy = dy / dist
          a.x -= ux * push; a.y -= uy * push
          b.x += ux * push; b.y += uy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  for (const p of points) { p.x = Math.min(Math.max(p.x, 46), w - 46); p.y = Math.min(Math.max(p.y, 34), h - 40) }
}

interface Geo { cx: number; cy: number; Vt: { x: number; y: number }; Vf: { x: number; y: number }; Vh: { x: number; y: number }; aside: { x: number; y: number }; points: NodePoint[] }

// ONE geometry for the whole view: barycentric position (T/F/H relative to the reference) is
// what places every star. This used to be two separate "modes" (triangle vs. constellation)
// because the network view repurposed position for something else (bloc lane × power) — but
// position by axis/bloc was declared irrelevant, so there's no longer a second thing for position
// to mean. Change the reference and the whole placement shifts — the figure is a genuinely
// different shape per country, for free, because it's the same math redrawn from a different
// vertex weighting. No lines are drawn between states at all (dropped per the operator's own
// call — even the hover-only ties read as clutter); the hover card's own tension/friction/harmony
// split is what explains a star's position now.
//
// The triangle itself is NEVER drawn (no polygon outline, no filled corners) — it only ever
// existed to place points. Because nothing renders its shape, it can be wildly anisotropic
// (stretched independently in x/y to the viewport's own aspect ratio) instead of capped at
// `min(w,h)`, which is how this reaches "spans nearly the entire screen" without ever looking
// like a triangle chart.
//
// The reference country is NOT one of the plotted points — direct feedback: sitting at the
// centroid, it was a real barycentric coordinate ("a third of each pole") that the eye read as
// "closeness to the reference = closeness to a real position," which isn't what's encoded at all
// (closeness to the הרמוניה vertex is). Rather than relocate it onto a vertex, it's omitted from
// the triangle's coordinate system entirely — `aside` is a fixed point outside the field's own
// bounding shape, unrelated to any body's data, so it reads as the vantage point the whole
// constellation is drawn FROM rather than a candidate position within it (see .rel-ref--aside in
// views.css for the deliberately non-glowing treatment that keeps it from being mistaken for a
// star). Pole labels are persistent (not hover-only) for the same reason — the encoding should be
// legible before anyone starts interrogating stars, not discovered only in passing.
function unifiedGeo(refId: string, w: number, h: number): Geo {
  const small = Math.min(w, h) < 460
  const cx = w / 2, cy = h / 2 + h * 0.02
  const sx = w * (small ? 0.4 : 0.46)
  const sy = h * (small ? 0.4 : 0.5)
  // floored so the מתח label always clears the mode bar/wordmark with real headroom, rather than
  // riding right up against the top edge on tall/narrow viewports where sy*0.95 alone isn't enough.
  const Vt = { x: cx, y: Math.max(cy - sy * 0.95, small ? 90 : 110) } // friction field → מתח — top
  const Vf = { x: cx - sx * 0.92, y: cy + sy * 0.72 } // tension field → חיכוך label — bottom-left
  const Vh = { x: cx + sx * 0.92, y: cy + sy * 0.72 } // הרמוניה — bottom-right
  const aside = { x: small ? 56 : 78, y: cy }        // fixed field-edge point, outside the triangle
  const jit = small ? 12 : 18
  // MEMBERS, not STATES: a constellation holds every actor on the board, not only the ones with a
  // seat at the UN. See relations-model.ts for why the two rosters are separate.
  const points: NodePoint[] = MEMBERS.filter((e) => e.id !== refId).map((e) => {
    const raw = relation(refId, e.id)
    const r = sharpen(raw)
    const jx = ((hash(e.id) % 1000) / 1000 - 0.5) * jit
    const jy = ((hash(e.id + '~') % 1000) / 1000 - 0.5) * jit
    return {
      e, r: raw,
      x: r.friction * Vt.x + r.tension * Vf.x + r.harmony * Vh.x + jx,
      y: r.friction * Vt.y + r.tension * Vf.y + r.harmony * Vh.y + jy,
      d: Math.max(8, Math.min(small ? 20 : 30, powerSize(e.power) * (small ? 0.34 : 0.42))),
    }
  })
  relaxCollisions(points, w, h, 24, small ? 14 : 21)
  return { cx, cy, Vt, Vf, Vh, aside, points }
}

export default function RelationsView() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [refId, setRefId] = useState('israel')
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  // grid: the aggregate overview (every state as a thumbnail constellation) — the entry point.
  // field: today's single-reference view, entered by picking a state off the grid.
  const [mode, setMode] = useState<'grid' | 'field'>('grid')
  // page-exit cascade (leaving to home): on `mp-exit` each .rnode shrinks+fades out individually,
  // staggered by its per-node --exit-d delay, mirroring the canvas views' body-by-body exit.
  const [leaving, setLeaving] = useState(false)
  const [gridSelecting, setGridSelecting] = useState(false)
  useEffect(() => {
    const onExit = () => setLeaving(true)
    window.addEventListener('mp-exit', onExit)
    return () => window.removeEventListener('mp-exit', onExit)
  }, [])

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    // clientWidth/Height are layout metrics — immune to the .stage entrance transform (scale),
    // so the layout solves at true size (getBoundingClientRect would be transform-shrunk).
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
    // re-runs on mode: .rel-field only exists in the DOM in 'field' mode (grid mode returns before
    // rendering it at all), so fieldRef.current is null until the mode switch mounts it — a
    // mount-once effect would observe nothing and leave size (and therefore geo) stuck at zero.
  }, [mode])

  const geo = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return null
    return unifiedGeo(refId, w, h)
  }, [size, refId])
  // Keeps a snapshot of the LAST SETTLED constellation, refreshed via effect after every commit
  // (a resize, not only a switch) — so it's always one step behind geo, which is exactly the
  // "before this switch" view the ghost lookup below needs.
  const [lastPoints, setLastPoints] = useState<NodePoint[]>([])
  // Sync-to-prop (geo.points isn't state itself), and provably not a cascade: only fires when
  // geo changed, and writing lastPoints can't in turn change geo — no loop. Same annotated class
  // of case as Chrome.tsx.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (geo) setLastPoints(geo.points) }, [geo])

  // Tracks which star, if any, just BECAME the reference (and so needs a fast join-in instead of
  // the slow initial-cascade schedule below) — `track.outgoingId`, not a derived comparison.
  // A derived `prevId !== refId` boolean looks right but is WRONG here: calling setState during
  // render (below) makes React immediately re-render again before ever committing — the same
  // "adjust state when a prop changes" mechanic PanelMotion's LetterSwap relies on — so any value
  // computed by comparing THIS render's state to THIS render's prop is stale by the time the
  // re-render that actually commits runs (the comparison has already resolved to equal). What
  // DOES survive into that committed render is a value written directly into the SAME state
  // object, exactly the way LetterSwap's `pair.prev` survives — which is why `outgoingId` is
  // captured as data, not recomputed as a boolean.
  const [track, setTrack] = useState<{ id: string; outgoingId: string | null }>({ id: refId, outgoingId: null })
  const [ghost, setGhost] = useState<NodePoint | null>(null)
  if (track.id !== refId) {
    // The star that gets un-plotted by a switch (it just BECAME the reference) has no exit of
    // its own — geo.points simply no longer contains it, and a plain React unmount is instant.
    // Held a beat longer at its last known position so it can fade out instead of vanishing (see
    // .rnode--refswitch-out in views.css). lastPoints is the LAST SETTLED constellation, refreshed
    // by the effect above — exactly the "before this switch" snapshot needed here.
    const outgoing = lastPoints.find((p) => p.e.id === refId) ?? null
    if (outgoing) setGhost(outgoing)
    setTrack({ id: refId, outgoingId: track.id })
  }
  useEffect(() => {
    if (!ghost) return
    // Reduced motion: .rnode--refswitch-out already resolves to opacity:0 with no animation (see
    // views.css), so there's nothing to wait ON — remove it on the next tick instead of holding
    // it, static and pointless, for the full exit duration.
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setGhost(null), reduced ? 0 : REF_SWITCH_EXIT_MS)
    return () => window.clearTimeout(t)
  }, [ghost])

  const refNode = byId.get(refId)!
  // emphasisId drives purely VISUAL canvas feedback (glow, dim, tether/guide lines, ego-web) —
  // hover OR pin.
  const emphasisId = pinned ?? hovered
  // Label de-collision. This hook already existed in the project for exactly this case and was
  // never actually wired to anything; adding the nine non-state actors is what finally made it
  // necessary. The actors cluster hard against the חיכוך vertex — nearly every one of them is
  // hostile to any given reference — and their names are long ("מיליציות עיראקיות", "הכוחות
  // הדמוקרטיים"), so the corner became an unreadable stack of overlapping text.
  //
  // It hides the LOWER-power label of any overlapping pair, which resolves in the actors' favour
  // exactly never — correct, since a state is the more important label — and always keeps the
  // hovered/pinned one visible. So an actor's ring stays on the field and its name appears when
  // you reach for it. Depends on geo (positions moved) and emphasisId (the kept label changed).
  useDeCollide(fieldRef, '.rnode', '.rnode__name', emphasisId, [geo, emphasisId])
  const emphasisPoint = geo?.points.find((p) => p.e.id === emphasisId)
  // the side panel (full stats) opens on CLICK only — hover gets the lightweight card instead,
  // so mousing across the web doesn't hijack the whole panel.
  const panelPoint = pinned ? geo?.points.find((p) => p.e.id === pinned) : undefined
  const panelDom = panelPoint ? dominantOf(panelPoint.r) : null
  // "the entire sidepanel glows when changing countries" — ties the Relations panel to the exact
  // same shell-persistence principle Forces' own ForcesPanelFrame already uses: the panel does
  // NOT unmount and remount between one pinned star and the next (it used to, keyed by
  // panelPoint.e.id below — an abrupt vanish-then-replay-the-whole-entrance-cascade on every
  // switch), it stays the same DOM node and only the content inside it changes. One flash on the
  // SHELL, keyed to a pulse counter bumped only on a REAL star→star switch — not on first pinning
  // one (that already has its own reveal) and not on unpinning back to the default panel.
  // Adjusted during render, same pattern ForcesPanelFrame itself uses.
  const [lastPanelId, setLastPanelId] = useState<string | null>(null)
  const [glowPulse, setGlowPulse] = useState(0)
  const curPanelId = panelPoint?.e.id ?? null
  if (curPanelId !== lastPanelId) {
    if (lastPanelId && curPanelId) setGlowPulse((p) => p + 1)
    setLastPanelId(curPanelId)
  }
  // the compact hover preview — only while genuinely just hovering (not the pinned node itself,
  // which already has its full stats open in the panel; no point doubling the same info).
  const hoverCardPoint = hovered && hovered !== pinned ? geo?.points.find((p) => p.e.id === hovered) : undefined
  // holds the last shown card past the moment hoverCardPoint goes undefined, so the exit keyframe
  // (rel-hovercard--closing) has something to shrink-out against instead of the card just
  // vanishing — React unmounts on the very next render otherwise, same problem HoverReadout.tsx
  // solves the same way (shared usePresenceValue hook). A direct hover handoff (star A → star B,
  // never through undefined) updates this immediately with no closing step.
  const { value: hoverCardLast, exiting: hoverCardClosing } = usePresenceValue(hoverCardPoint, 320)
  // called from the field's own panel ("set as reference") — mode is already 'field', so there's
  // no grid to cross-fade out of; only refId actually changes.
  const setReference = (id: string) => { sound.play('select'); setRefId(id); setPinned(null); setHovered(null); setMode('field') }
  // called from a grid cell — plays the grid's own exit before the field ever mounts (see
  // GRID_PICK_MS above), rather than swapping instantly.
  // Tracked + cleared on unmount. It was a bare setTimeout scheduling five setters 340ms out,
  // safe only because every app-level exit path happens to be longer than the handoff — an
  // invariant held by comment discipline across two files. App.tsx already established this
  // pattern for its own view-transition timers; this call site had just missed it.
  const handoffRef = useRef<number | null>(null)
  useEffect(() => () => { if (handoffRef.current) window.clearTimeout(handoffRef.current) }, [])
  const enterField = (id: string) => {
    sound.play('select')
    setGridSelecting(true)
    handoffRef.current = window.setTimeout(() => {
      setRefId(id); setPinned(null); setHovered(null); setMode('field'); setGridSelecting(false)
    }, GRID_PICK_MS)
  }
  const backToGrid = () => { sound.play('select'); setPinned(null); setHovered(null); setMode('grid') }

  if (mode === 'grid') {
    return (
      <div className="stage relations" dir="rtl">
        <RelationsGrid onSelect={enterField} leaving={leaving} selecting={gridSelecting} />
      </div>
    )
  }

  return (
    <div className="stage relations" dir="rtl">
      <div className={`rel-field${leaving ? ' rel-field--leaving' : ''}`} ref={fieldRef} onClick={() => { setPinned(null); setHovered(null) }}>
        <button className="rel-back" onClick={(ev) => { ev.stopPropagation(); backToGrid() }}>
          כל המדינות <Icon name="arrow-back" className="rel-back__arrow" />
        </button>
        {geo && (
          <>
            {/* pole labels — persistent (not hover-only): the encoding needs to be legible at rest,
                not discovered only once a star is already being interrogated. Brighten further on
                hover/pin so the active read still gets emphasis. */}
            {/* The pole labels are TITLES, so they take the sitewide per-character reveal
                (LetterSwap) rather than the block mask they used to carry — which also retires the
                relVtxRise hack that existed only because a block transform fought this element's
                own translate(-50%,-50%) centering. --vd carries the vertex's beat to the sub-label
                in CSS; the title itself takes it as a prop. */}
            {([
              { k: 't', he: POLE_HE.friction, sub: 'אינטרסים מתנגשים', left: geo.Vt.x, top: geo.Vt.y - 26 },
              { k: 'f', he: POLE_HE.tension, sub: 'עימות ישיר וכוח', left: geo.Vf.x - 8, top: geo.Vf.y + 16 },
              { k: 'h', he: 'הרמוניה', sub: 'שיתוף פעולה', left: geo.Vh.x + 8, top: geo.Vh.y + 16 },
            ] as const).map((v, vi) => {
              const d = FIELD_BEAT.vtxStart + vi * FIELD_BEAT.vtxStep
              return (
                <span
                  key={v.k}
                  className={`rel-vtx rel-vtx--${v.k}`}
                  // Rest opacity raised 0.6 -> 0.85 — at 0.6 a correctly-bold, correctly-sized
                  // title still read as faded/secondary chrome rather than a title, on top of the
                  // size fix above. Emphasized state gets the same bump (0.95 -> 1.0) so some
                  // separation between the two states still survives.
                  style={{ left: v.left, top: v.top, opacity: emphasisPoint ? 1 : 0.85, '--vd': `${d}s` } as React.CSSProperties}
                >
                  <LetterSwap text={v.he} delay={d} />
                  <i>{v.sub}</i>
                </span>
              )
            })}

            {/* reference — NOT plotted among the states (see unifiedGeo's comment): a fixed point
                outside the triangle's own shape, styled to read as the vantage point the whole
                constellation is drawn from, not a candidate position within it. */}
            <div className="rel-ref rel-ref--aside" style={{ left: geo.aside.x, top: geo.aside.y }}>
              <span className="rel-ref__dot" />
              <span className="rel-ref__name">{refNode.he}</span>
              <span className="rel-ref__tag">הקונסטלציה של {refNode.he}</span>
            </div>

            {/* plotted states */}
            {geo.points.map(({ e, x, y, d }, i) => {
              const isFocus = e.id === emphasisId
              const isPinned = e.id === pinned
              const dim = emphasisId && !isFocus
              // per-node exit delay — spread over ~360ms in index order, count-independent so the
              // cascade window matches the canvas views' EXIT_SPREAD regardless of node count.
              const exitDelay = (geo.points.length <= 1 ? 0 : i / (geo.points.length - 1)) * 360
              // per-star twinkle phase, seeded so it desyncs across the field instead of pulsing
              // in unison — same idiom as the canvas engines' `pulse` phase offsets.
              const tw = ((hash(e.id + '#tw') % 3400) / 1000).toFixed(2)
              // per-star name-cycle phase — same hashing idiom, different salt so it doesn't
              // correlate with the twinkle's own offset (two loops derived from the same number
              // would drift in and out of sync with each other in a way a viewer can half-notice).
              const cp = (NAME_CYCLE_SETTLE + (hash(e.id + '#cp') % (NAME_CYCLE_PERIOD * 1000)) / 1000).toFixed(2)
              // This ONE star (id-stable, but a genuinely fresh DOM node — it wasn't in
              // geo.points a moment ago) is what a reference switch newly plots: the state that
              // WAS the reference. Without this branch it would inherit ENTRANCE_HOLD/
              // ENTRANCE_STEP below — a schedule tuned for a 28-star INITIAL reveal, so on a
              // switch it would pop in up to ~1.3s after the pause everyone else is already
              // moving on, looking like a late, unrelated straggler rather than part of the same
              // event. It plays the exact same rnodeRise rise, just synced to the switch's own
              // pause instead of the initial cascade's.
              const isJoining = e.id === track.outgoingId
              // entrance: a genuine held beat (ENTRANCE_HOLD) before the FIRST star moves at all —
              // matching the same "let the screen be seen before it starts moving" pause the
              // canvas engines' own INTRO_DELAY_MS added — then each star follows the last by
              // ENTRANCE_STEP, so the field reads as one continuous sequential reveal rather than
              // starting immediately.
              const entranceDelay = isJoining ? REF_SWITCH_PAUSE : ENTRANCE_HOLD + i * ENTRANCE_STEP
              // The NAME waits for every star to have landed, not just its own — see FIELD_BEAT.
              // It used to be a plain child of .rnode with no delay of its own, so each label flew
              // in attached to a moving star and was unreadable until the star stopped.
              const nameDelay = isJoining
                ? REF_SWITCH_PAUSE + REF_SWITCH_GLIDE * 0.6
                : FIELD_BEAT.nameStart + i * FIELD_BEAT.nameStep
              return (
                <div
                  key={e.id}
                  data-id={e.id}
                  data-power={e.power}
                  role="button"
                  tabIndex={0}
                  aria-label={`${e.he} — ${VERDICT[dominantOf(relation(refId, e.id))]} מול ${refNode.he}`}
                  aria-pressed={e.id === pinned}
                  className={`rnode${isActor(e.id) ? ' rnode--actor' : ''}${isFocus ? ' rnode--hover' : ''}${isPinned ? ' rnode--pin' : ''}${dim ? ' rnode--dim' : ''}`}
                  style={{ left: x, top: y, animationDelay: leaving ? `${exitDelay}ms` : `${entranceDelay}s`, '--tw': `${tw}s`, '--nd': `${nameDelay}s`, '--cp-delay': `${cp}s`, '--cp-dur': `${NAME_CYCLE_PERIOD}s` } as React.CSSProperties}
                  onMouseEnter={() => setHovered(e.id)}
                  onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                  onFocus={() => setHovered(e.id)}
                  onBlur={() => setHovered((h) => (h === e.id ? null : h))}
                  onClick={(ev) => { ev.stopPropagation(); sound.play('click'); setPinned((p) => (p === e.id ? null : e.id)) }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); sound.play('click'); setPinned((p) => (p === e.id ? null : e.id)) } }}
                  title="לחיצה מקבעת את היחס; ׳קבעו כייחוס׳ בלוח מחליפה את מדינת הייחוס"
                >
                  <span className="rnode__disk" style={{ width: d, height: d }} />
                  <span className="rnode__name">{e.he}</span>
                </div>
              )
            })}

            {/* the star a switch just un-plotted (see the ghost/isRefSwitch hooks above) — no
                name, no interaction, aria-hidden: it's a decorative echo of the last frame, not a
                real member of the field for the ~300ms it takes to fade. */}
            {ghost && (
              <div
                className="rnode rnode--refswitch-out"
                aria-hidden="true"
                style={{ left: ghost.x, top: ghost.y } as React.CSSProperties}
              >
                <span className="rnode__disk" style={{ width: ghost.d, height: ghost.d }} />
              </div>
            )}
          </>
        )}
        {/* hover preview — a compact YELLOW card near the star, 3-5 lines: verdict + why + the raw
            split. Deliberately NOT the full stats panel (that's reserved for a click, see
            panelPoint below) — mousing across the web to get a quick read shouldn't hijack the
            whole side panel every time the cursor crosses a star. */}
        {hoverCardLast && (
          <div
            className={`rel-hovercard${hoverCardLast.y < 130 ? ' rel-hovercard--below' : ''}${hoverCardClosing ? ' rel-hovercard--closing' : ''}`}
            style={{ left: hoverCardLast.x, top: hoverCardLast.y - hoverCardLast.d / 2 }}
          >
            <span className="rel-hovercard__name">{hoverCardLast.e.he}</span>
            <span className="rel-hovercard__verdict">{VERDICT[dominantOf(hoverCardLast.r)]} מול {refNode.he}</span>
            {/* No t/f/h split here anymore — it's redundant with the side panel's own .fbar
                breakdown, which opens on click right after this same hover. The card's job is the
                quick read (name + verdict + why); the panel's job is the numbers. */}
            <p className="rel-hovercard__why">
              {hoverCardLast.r.why
                ?? `הקשר נשען בעיקר על ${POLE_HE[dominantOf(hoverCardLast.r)]}, לצד תמהיל של שיוך גושי, בריתות ועמדתה של ${hoverCardLast.e.he}.`}
            </p>
          </div>
        )}
      </div>

      {/* Relations is DOM-rendered, not canvas: its node cascade is done by ~1.4s (see the
          per-node animationDelay below), so it doesn't need the canvas views' 4s entrance window
          before the panel may enter — just that same settle + one beat. */}
      <PanelDock enterAfter={2400} reopenOn={pinned} autoOpen={false}>
      {panelPoint && panelDom ? (() => {
        // Everything below `why` in reading order is timed OFF of it, not off t=0 — a static
        // delay couldn't be right for both a 13-word description and a 30-word one (this data
        // runs 13–30 words per pair). See REL_BEAT's own comment in panel-beats.ts.
        const whyWords = panelPoint.r.why ? panelPoint.r.why.trim().split(/\s+/).length : 0
        const compDelay = Math.max(REL_BEAT.compFloor, REL_BEAT.why + whyWords * REL_BEAT.wordStep + REL_BEAT.compSettle)
        const metaDelay = compDelay + REL_BEAT.metaAfterComp
        const actionDelay = compDelay + REL_BEAT.actionAfterComp
        // pole -> the shared chip/comp-segment class suffix (t/f/h), matching .panelb__chip--*
        // and .rel-detail__comp-* — one letter-code, reused for every pole-coloured thing in the
        // panel instead of each site inventing its own colour switch.
        const POLE_CODE: Record<Pole, 't' | 'f' | 'h'> = { tension: 't', friction: 'f', harmony: 'h' }
        const dominantPct = Math.round(panelPoint.r[panelDom] * 100)
        // UNKEYED — deliberately. This is the shell Forces' own ForcesPanelFrame never remounts
        // either; see the glowPulse comment above for why.
        return (
        <aside className="panel panel--detail rel-detail" dir="rtl">
          <i className="panel-glow" key={glowPulse} aria-hidden />
          <button className="panel__close" onClick={() => setPinned(null)} aria-label="ביטול קיבוע">✕</button>
          {/* Beat-sequenced per REL_BEAT (panel-beats.ts), matching Forces' own BEAT convention:
              a shared textRise-carrying class + an inline animationDelay override, one slot per
              element, nothing simultaneous. */}
          <span className="rel-detail__kicker" style={{ animationDelay: `${REL_BEAT.kicker}s` }}>היחס מול {refNode.he}</span>
          {/* --entity: this h1 names a specific country/entity, unlike every other .panel__title
              (מדינת הייחוס, קונסטלציה, מדד כוח משיכה...) — country/entity names are never bold
              anywhere on the site (house rule), so this one instance overrides the shared weight. */}
          <h1 className="panel__title panel__title--entity"><LetterSwap text={panelPoint.e.he} delay={REL_BEAT.title} /></h1>
          {/* Headline row: the dominant pole's share as a real numeral, not just coloured text —
              same anatomy as Forces' own .fscore__headline (a static row; only the numeral counts
              and the chip cross-fades). The verdict moves from a plain <p> into a real object, a
              pole-coloured chip reusing .panelb__chip — already documented in overlays.css as
              shared by "any relation pole indicator", which this is. */}
          <div className="fscore__headline rel-detail__headline" style={{ animationDelay: `${REL_BEAT.headline}s` }}>
            <span className="fscore__num"><b><CountUp value={dominantPct} decimals={0} delay={REL_BEAT.headline} /></b><span className="fscore__unit">/ 100</span></span>
            <span className="fscore__meta"><span className="fscore__lbl">{POLE_HE[panelDom]}</span></span>
            {/* keyed by the verdict text itself — cross-fades in place via tierFade, the same
                mechanism Forces' own .fscore__tier-txt uses for its tier chip on a switch. */}
            <span className={`panelb__chip panelb__chip--${POLE_CODE[panelDom]} rel-detail__chip`}>
              <span className="rel-detail__chip-txt" key={VERDICT[panelDom]}>{VERDICT[panelDom]}</span>
            </span>
          </div>
          {/* Un-boxed — was a yellow-tinted card, the only container treatment in the panel other
              than the data itself. With the headline row and the composition bar below both now
              real objects, the prose reads as the LEDE under the number, not as a competing card.
              No animation of its own: Words already reveals per word, and a block-level textRise
              underneath it would double-animate the same text. */}
          {/* keyed by country id, matching Forces' own <Words key={`${detail.id}-short`}> — the
              shell no longer remounts to force this paragraph's per-word reveal to replay on a
              switch, so the key has to live here instead. */}
          {panelPoint.r.why && <p className="panel__why"><Words key={`${panelPoint.e.id}-why`} text={panelPoint.r.why} delay={REL_BEAT.why} /></p>}
          {/* One composition bar, not three separate gauges — the three poles sum to 100%, so a
              flex-segmented bar is the honest chart for that shape (three thin independent bars
              read as "three weak values", not "a composition"). Reuses Seg, the same tweening
              flex-basis primitive ForcesAxisPanel's own comp bar already uses, extended from its
              two-segment "base + adjustment" case to three. */}
          <div className="panel__forces rel-detail__comp">
            <span className="panel__rels-h">מאפייני היחס</span>
            <span className="rel-detail__comp-track">
              {(['tension', 'friction', 'harmony'] as Pole[]).map((pole, bi) => (
                <Seg key={pole} className={`rel-detail__comp-seg rel-detail__comp-seg--${POLE_CODE[pole]}`} pct={panelPoint.r[pole] * 100} delay={compDelay + bi * 0.06} />
              ))}
            </span>
            <div className="rel-detail__comp-legend">
              {(['tension', 'friction', 'harmony'] as Pole[]).map((pole) => (
                <span key={pole} className={`rel-detail__comp-legend-item rel-detail__comp-legend-item--${POLE_CODE[pole]}`}>
                  {POLE_HE[pole]} <b>{Math.round(panelPoint.r[pole] * 100)}</b>
                </span>
              ))}
            </div>
          </div>
          {/* Was inheriting an unrelated shared 0.04s rule and landing BEFORE the headline it's
              meant to follow (see panel-beats.ts) — now derived from the content actually above
              it, same as the composition bar. DISPO_ICON/AXIS_ICON already exist (Chrome.tsx, for
              the Forces header chips) — a per-value glyph in front of each meta value, not just
              coloured text. */}
          <div className="panel__meta" style={{ animationDelay: `${metaDelay}s` }}>
            <div className="panel__row"><span className="panel__row-k">אופי</span><span className="panel__row-v"><Icon name={DISPO_ICON[panelPoint.e.dispo] ?? 'dispo'} className="panel__row-icon" /><bdi>{panelPoint.e.dispo}</bdi></span></div>
            <div className="panel__row"><span className="panel__row-k">שיוך</span><span className="panel__row-v"><Icon name={AXIS_ICON[AXIS_LABEL[AXIS[panelPoint.e.id] ?? 'none']] ?? 'axis'} className="panel__row-icon" /><bdi>{AXIS_LABEL[AXIS[panelPoint.e.id] ?? 'none']}</bdi></span></div>
          </div>
          {/* Only a STATE can become the reference — a constellation is drawn from a state's
              vantage (see relations-model.ts). Offering it for a non-state actor would promise a
              view that doesn't exist, so the CTA is withheld and replaced by the one fact the
              panel would otherwise never state: that this member isn't a country.
              Copy: the relation index is symmetric (relations.ts), so flipping reference does NOT
              change the numbers — it redraws the whole constellation from the other vantage. "Set
              as reference" undersold that; "the constellation of X" is both truer and already the
              field's own phrasing (.rel-ref__tag). Also given its own entrance now — it used to be
              present at t=0 with the shell, before anything above it had even landed. */}
          {isActor(panelPoint.e.id) ? (
            <p className="panel__actor-note" style={{ animationDelay: `${actionDelay}s` }}>{panelPoint.e.tier} · מופיע בכל הקונסטלציות, ואינו משמש כמדינת ייחוס.</p>
          ) : (
            <button className="panel__setref" style={{ animationDelay: `${actionDelay}s` }} onClick={() => setReference(panelPoint.e.id)}>
              הקונסטלציה של {panelPoint.e.he} ←
            </button>
          )}
        </aside>
        )
      })() : (
        <aside className="panel" dir="rtl">
          {/* --entity, same as the detail panel's title below: this h1 names a country, and
              country/entity names are never bold anywhere on the site (house rule). */}
          <h1 className="panel__title panel__title--entity"><LetterSwap text={refNode.he} /></h1>
          <p className="panel__body">
            <Words text="כל מדינה ממוקמת לפי היחס שלה מול מדינת הייחוס — מתח, חיכוך או הרמוניה." />
          </p>
          <Affordance id="rel-hover" text="רחפו על כוכב כדי לחשוף את הקשרים והמיקום שלו" done={!!hovered || !!pinned} />
          <p className="panel__note">רחפו לבחינת יחס · לחיצה מקבעת אותו וגם פותחת פרטים · ״כל המדינות״ חוזר לרשת המלאה.</p>
        </aside>
      )}
      </PanelDock>
    </div>
  )
}
