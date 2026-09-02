import { useEffect, useMemo, useRef, useState } from 'react'
import { AXIS, AXIS_LABEL, powerSize } from '../data/entities'
import { PanelDock } from './Chrome'
import { Words } from './Words'
import { Affordance } from './Affordance'
import { Icon } from './Icon'
import { RelationsGrid } from './RelationsGrid'
import { sound } from '../sound'
import { usePresenceValue } from './usePresence'
import { byId, STATES, hash, relation, sharpen, dominantOf, POLE_HE, VERDICT, type Rel, type Pole } from './relations-model'

// entrance stagger (seconds) — see the comment at its use site (the .rnode map) for why there's a
// held beat before the first star at all, rather than starting immediately.
const ENTRANCE_HOLD = 0.5
const ENTRANCE_STEP = 0.045

interface NodePoint { e: (typeof STATES)[number]; r: Rel; x: number; y: number; d: number }

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
  const points: NodePoint[] = STATES.filter((e) => e.id !== refId).map((e) => {
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

  const refNode = byId.get(refId)!
  // emphasisId drives purely VISUAL canvas feedback (glow, dim, tether/guide lines, ego-web) —
  // hover OR pin.
  const emphasisId = pinned ?? hovered
  const emphasisPoint = geo?.points.find((p) => p.e.id === emphasisId)
  // the side panel (full stats) opens on CLICK only — hover gets the lightweight card instead,
  // so mousing across the web doesn't hijack the whole panel.
  const panelPoint = pinned ? geo?.points.find((p) => p.e.id === pinned) : undefined
  const panelDom = panelPoint ? dominantOf(panelPoint.r) : null
  // the compact hover preview — only while genuinely just hovering (not the pinned node itself,
  // which already has its full stats open in the panel; no point doubling the same info).
  const hoverCardPoint = hovered && hovered !== pinned ? geo?.points.find((p) => p.e.id === hovered) : undefined
  // holds the last shown card past the moment hoverCardPoint goes undefined, so the exit keyframe
  // (rel-hovercard--closing) has something to shrink-out against instead of the card just
  // vanishing — React unmounts on the very next render otherwise, same problem HoverReadout.tsx
  // solves the same way (shared usePresenceValue hook). A direct hover handoff (star A → star B,
  // never through undefined) updates this immediately with no closing step.
  const { value: hoverCardLast, exiting: hoverCardClosing } = usePresenceValue(hoverCardPoint, 320)
  const setReference = (id: string) => { sound.play('select'); setRefId(id); setPinned(null); setHovered(null); setMode('field') }
  const backToGrid = () => { sound.play('select'); setPinned(null); setHovered(null); setMode('grid') }

  if (mode === 'grid') {
    return (
      <div className="stage relations" dir="rtl">
        <RelationsGrid onSelect={setReference} />
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
            <span className="rel-vtx rel-vtx--t" style={{ left: geo.Vt.x, top: geo.Vt.y - 26, opacity: emphasisPoint ? 0.95 : 0.6 }}>{POLE_HE.friction}<i>אינטרסים מתנגשים</i></span>
            <span className="rel-vtx rel-vtx--f" style={{ left: geo.Vf.x - 8, top: geo.Vf.y + 16, opacity: emphasisPoint ? 0.95 : 0.6 }}>{POLE_HE.tension}<i>עימות ישיר וכוח</i></span>
            <span className="rel-vtx rel-vtx--h" style={{ left: geo.Vh.x + 8, top: geo.Vh.y + 16, opacity: emphasisPoint ? 0.95 : 0.6 }}>הרמוניה<i>שיתוף פעולה</i></span>

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
              // entrance: a genuine held beat (ENTRANCE_HOLD) before the FIRST star moves at all —
              // matching the same "let the screen be seen before it starts moving" pause the
              // canvas engines' own INTRO_DELAY_MS added — then each star follows the last by
              // ENTRANCE_STEP, so the field reads as one continuous sequential reveal rather than
              // starting immediately.
              const entranceDelay = ENTRANCE_HOLD + i * ENTRANCE_STEP
              return (
                <div
                  key={e.id}
                  data-id={e.id}
                  data-power={e.power}
                  role="button"
                  tabIndex={0}
                  aria-label={`${e.he} — ${VERDICT[dominantOf(relation(refId, e.id))]} מול ${refNode.he}`}
                  aria-pressed={e.id === pinned}
                  className={`rnode${isFocus ? ' rnode--hover' : ''}${isPinned ? ' rnode--pin' : ''}${dim ? ' rnode--dim' : ''}`}
                  style={{ left: x, top: y, animationDelay: leaving ? `${exitDelay}ms` : `${entranceDelay}s`, '--tw': `${tw}s` } as React.CSSProperties}
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
            <p className="rel-hovercard__why">
              {hoverCardLast.r.why
                ?? `הקשר נשען בעיקר על ${POLE_HE[dominantOf(hoverCardLast.r)]}, לצד תמהיל של שיוך גושי, בריתות ועמדתה של ${hoverCardLast.e.he}.`}
            </p>
            <span className="rel-hovercard__stat">
              {POLE_HE.tension} {Math.round(hoverCardLast.r.tension * 100)}% · {POLE_HE.friction} {Math.round(hoverCardLast.r.friction * 100)}% · {POLE_HE.harmony} {Math.round(hoverCardLast.r.harmony * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Relations is DOM-rendered, not canvas: its node cascade is done by ~1.4s (see the
          per-node animationDelay below), so it doesn't need the canvas views' 4s entrance window
          before the panel may enter — just that same settle + one beat. */}
      <PanelDock enterAfter={2400} reopenOn={pinned}>
      {panelPoint && panelDom ? (
        <aside className="panel panel--detail rel-detail" dir="rtl" key={panelPoint.e.id}>
          <button className="panel__close" onClick={() => setPinned(null)} aria-label="ביטול קיבוע">✕</button>
          <span className="rel-detail__kicker">היחס מול {refNode.he}</span>
          {/* --entity: this h1 names a specific country/entity, unlike every other .panel__title
              (מדינת הייחוס, קונסטלציה, מדד כוח משיכה...) — country/entity names are never bold
              anywhere on the site (house rule), so this one instance overrides the shared weight. */}
          <h1 className="panel__title panel__title--entity">{panelPoint.e.he}</h1>
          <p className={`rel-detail__verdict rel-detail__verdict--${panelDom}`}>{VERDICT[panelDom]}</p>
          {panelPoint.r.why && <p className="panel__why"><Words text={panelPoint.r.why} /></p>}
          <div className="panel__forces">
            <span className="panel__rels-h">מאפייני היחס</span>
            {(['tension', 'friction', 'harmony'] as Pole[]).map((pole, bi) => {
              const v = Math.round(panelPoint.r[pole] * 100)
              return (
                <div className={`fbar${pole === panelDom ? ' fbar--on' : ''}`} key={pole} style={{ '--bd': `${bi * 0.08}s` } as React.CSSProperties}>
                  <span className="fbar__k">{POLE_HE[pole]}</span>
                  <span className="fbar__track"><span className="fbar__fill" style={{ width: `${v}%` }} /></span>
                  <span className="fbar__v">{v}</span>
                </div>
              )
            })}
          </div>
          <div className="panel__meta">
            <div className="panel__row"><span className="panel__row-k">אופי</span><span className="panel__row-v"><bdi>{panelPoint.e.dispo}</bdi></span></div>
            <div className="panel__row"><span className="panel__row-k">שיוך</span><span className="panel__row-v"><bdi>{AXIS_LABEL[AXIS[panelPoint.e.id] ?? 'none']}</bdi></span></div>
          </div>
          <button className="panel__setref" onClick={() => setReference(panelPoint.e.id)}>
            קבעו את {panelPoint.e.he} כמדינת הייחוס ←
          </button>
        </aside>
      ) : (
        <aside className="panel" dir="rtl">
          <h1 className="panel__title">{refNode.he}</h1>
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
