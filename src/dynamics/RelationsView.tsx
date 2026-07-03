import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, LINKS, AXIS, AXIS_LABEL, DISPO, powerSize } from '../data/entities'
import { authoredRelation, AUTHORED_RELATIONS } from '../data/relations'
import { PanelDock } from './Chrome'
import { useDeCollide } from './useDeCollide'
import { AXIS_RIM } from './forces-model'
import { sound } from '../sound'

const byId = new Map(NODES.map((n) => [n.id, n]))
const STATES = NODES.filter((n) => n.kind !== 'nonstate')
const STATE_IDS = new Set(STATES.map((s) => s.id))
// reference picker — the states whose constellations matter most
const REF_CHOICES = ['israel', 'usa', 'iran', 'saudi', 'turkey', 'egypt', 'russia', 'qatar']

type Mode = 'triangle' | 'constellation'
// constellation axis lane: west pulls to one side, east to the other, neutral to the middle.
const AXIS_LANE: Record<string, number> = { west: -1, east: 1, neutral: 0, none: 0 }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Rel { harmony: number; tension: number; friction: number; why?: string }
type Pole = 'tension' | 'friction' | 'harmony'
const POLE_HE: Record<Pole, string> = { tension: 'מתח', friction: 'חיכוך', harmony: 'הרמוניה' }
const VERDICT: Record<Pole, string> = { tension: 'יחס מתוח', friction: 'יחס מורכב', harmony: 'יחס הרמוני' }
const dominantOf = (r: Rel): Pole =>
  r.tension >= r.friction && r.tension >= r.harmony ? 'tension' : r.harmony >= r.friction ? 'harmony' : 'friction'

// Relationship of target toward reference. Authored pairs first (the editorial layer);
// otherwise derived from bloc alignment + alliances + the target's disposition.
function relation(refId: string, tId: string): Rel {
  const authored = authoredRelation(refId, tId)
  if (authored) {
    const s = authored.t + authored.f + authored.h
    return { tension: authored.t / s, friction: authored.f / s, harmony: authored.h / s, why: authored.why }
  }
  const ax = AXIS[refId], at = AXIS[tId]
  const same = ax !== 'none' && ax === at
  const opp = (ax === 'west' && at === 'east') || (ax === 'east' && at === 'west')
  const allied = LINKS.some(([a, b]) => (a === refId && b === tId) || (a === tId && b === refId))
  const t = byId.get(tId)!
  let harmony = 0.28 + (same ? 0.5 : 0) + (allied ? 0.4 : 0)
  let tension = 0.28 + (opp ? 0.5 : 0) + (t.dispo === DISPO.agg ? 0.22 : 0)
  let friction = 0.32 + (!same && !opp ? 0.28 : 0.05) + (t.dispo === DISPO.assert ? 0.18 : 0)
  const j = hash(`${refId}|${tId}`)
  harmony += ((j % 9) - 4) * 0.018
  tension += (((j >> 3) % 9) - 4) * 0.018
  friction += (((j >> 6) % 9) - 4) * 0.018
  harmony = Math.max(0.06, harmony); tension = Math.max(0.06, tension); friction = Math.max(0.06, friction)
  const s = harmony + tension + friction
  return { harmony: harmony / s, tension: tension / s, friction: friction / s }
}

// Sharpen barycentric coords toward the dominant vertex so points use the whole
// triangle instead of clustering at its centre (display only — panel shows raw values).
function sharpen(r: Rel, k = 1.45): Rel {
  const t = Math.pow(r.tension, k), f = Math.pow(r.friction, k), h = Math.pow(r.harmony, k)
  const s = t + f + h
  return { tension: t / s, friction: f / s, harmony: h / s, why: r.why }
}

interface NodePoint { e: (typeof STATES)[number]; r: Rel; x: number; y: number; d: number }

// Iterative collision relaxation — separate overlapping bodies (label-aware gap) while keeping
// them near their target positions. Shared by both layouts; mutates the points in place.
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

// TRIANGLE layout — barycentric placement of every state relative to the reference.
// On a narrow field (phone) the triangle shrinks and nodes get smaller so the corners
// inset (vertex labels stop overhanging) and de-collision can actually find room.
function triangleGeo(refId: string, w: number, h: number) {
  const small = Math.min(w, h) < 460
  const cx = w / 2, cy = h / 2 + h * 0.02, s = Math.min(w, h) * (small ? 0.42 : 0.47)
  const Vt = { x: cx, y: cy - s * 0.95 }            // מתח — top
  const Vf = { x: cx - s * 0.92, y: cy + s * 0.72 } // חיכוך — bottom-left
  const Vh = { x: cx + s * 0.92, y: cy + s * 0.72 } // הרמוניה — bottom-right
  const jit = small ? 12 : 18
  const points: NodePoint[] = STATES.filter((e) => e.id !== refId).map((e) => {
    const raw = relation(refId, e.id)
    const r = sharpen(raw)
    const jx = ((hash(e.id) % 1000) / 1000 - 0.5) * jit
    const jy = ((hash(e.id + '~') % 1000) / 1000 - 0.5) * jit
    return {
      e, r: raw,
      x: r.tension * Vt.x + r.friction * Vf.x + r.harmony * Vh.x + jx,
      y: r.tension * Vt.y + r.friction * Vf.y + r.harmony * Vh.y + jy,
      d: Math.max(8, Math.min(small ? 20 : 30, powerSize(e.power) * (small ? 0.34 : 0.42))),
    }
  })
  relaxCollisions(points, w, h, 24, small ? 14 : 21)
  return { mode: 'triangle' as const, cx, cy, Vt, Vf, Vh, points }
}

export interface Edge { a: string; b: string; ax: number; ay: number; bx: number; by: number; pole: Pole; strength: number }

// CONSTELLATION layout — the whole web at once. X = bloc/axis lane (west↔east, neutral centre,
// jittered so same-axis states don't stack); Y = power (strong at top). Edges = authored pairs.
function networkGeo(refId: string, w: number, h: number) {
  const small = Math.min(w, h) < 460
  const padX = small ? 30 : 64, padY = small ? 40 : 56
  const fieldW = w - padX * 2, fieldH = h - padY * 2
  const points: NodePoint[] = STATES.map((e) => {
    const lane = AXIS_LANE[AXIS[e.id] ?? 'none'] // -1 west · 0 neutral · +1 east
    const jit = ((hash(e.id + '#') % 1000) / 1000 - 0.5) // -0.5..0.5
    // map lane (-1..1) to 0..1 across the field, with jitter spreading clusters apart
    const nx = 0.5 + lane * 0.34 + jit * 0.2
    const ny = 1 - e.power / 100 // strong powers ride the top
    return {
      e,
      // the detail panel reads this against the reference state (defaults to ישראל)
      r: e.id === refId ? { tension: 0, friction: 0, harmony: 1 } : relation(refId, e.id),
      x: padX + Math.min(Math.max(nx, 0.02), 0.98) * fieldW,
      y: padY + Math.min(Math.max(ny, 0.02), 0.98) * fieldH,
      d: Math.max(8, Math.min(small ? 20 : 30, powerSize(e.power) * (small ? 0.34 : 0.42))),
    }
  })
  relaxCollisions(points, w, h, 30, small ? 13 : 18)
  // edges from authored relations — only between two plotted states
  const posOf = new Map(points.map((p) => [p.e.id, p]))
  const edges: Edge[] = []
  for (const rel of AUTHORED_RELATIONS) {
    const [a, b] = rel.pair
    if (!STATE_IDS.has(a) || !STATE_IDS.has(b)) continue
    const pa = posOf.get(a), pb = posOf.get(b)
    if (!pa || !pb) continue
    const s = rel.t + rel.f + rel.h
    const t = rel.t / s, f = rel.f / s, hh = rel.h / s
    const pole: Pole = t >= f && t >= hh ? 'tension' : hh >= f ? 'harmony' : 'friction'
    const strength = Math.max(t, f, hh) // 0–1, dominant share
    if (strength < 0.34) continue // hide noise-floor edges that would clutter
    edges.push({ a, b, ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y, pole, strength })
  }
  return { mode: 'constellation' as const, points, edges }
}

export default function RelationsView() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [mode, setMode] = useState<Mode>('triangle')
  const [refId, setRefId] = useState('israel')
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
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
    // so the triangle lays out at true size (getBoundingClientRect would be transform-shrunk).
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const tri = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return null
    return triangleGeo(refId, w, h)
  }, [size, refId])

  const net = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return null
    return networkGeo(refId, w, h)
  }, [size, refId])

  const geo = mode === 'triangle' ? tri : net

  const refNode = byId.get(refId)!
  const focusId = pinned ?? hovered
  const focusPoint = geo?.points.find((p) => p.e.id === focusId)
  const dom = focusPoint ? dominantOf(focusPoint.r) : null
  // ego-network: edge keys ('a|b') touching the focused node — those light, the rest dim
  const egoEdges = useMemo(() => {
    if (mode !== 'constellation' || !net || !focusId) return null
    const keys = new Set<string>()
    for (const ed of net.edges) {
      if (ed.a === focusId || ed.b === focusId) keys.add(`${ed.a}|${ed.b}`)
    }
    return keys
  }, [mode, net, focusId])
  useDeCollide(fieldRef, '.rnode', '.rnode__name', focusId, [size, mode, refId, hovered, pinned])

  const setReference = (id: string) => { sound.play('select'); setRefId(id); setPinned(null); setHovered(null) }
  const setModeAndReset = (m: Mode) => { if (m === mode) return; sound.play('tab'); setMode(m); setPinned(null); setHovered(null) }

  return (
    <div className="stage relations" dir="rtl">
      <div className={`rel-field${mode === 'constellation' ? ' rel-field--net' : ''}${leaving ? ' rel-field--leaving' : ''}`} ref={fieldRef} onClick={() => { setPinned(null); setHovered(null) }}>
        {mode === 'triangle' && tri && (
          <>
            <svg className="rel-tri" width={size.w} height={size.h}>
              {/* faint vertex glows — make the three poles legible as zones */}
              <defs>
                <radialGradient id="relpole" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--yellow-10)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              {[tri.Vt, tri.Vf, tri.Vh].map((v, i) => (
                <circle key={i} className="rel-zone" cx={v.x} cy={v.y} r={Math.min(size.w, size.h) * 0.26} fill="url(#relpole)" />
              ))}
              <polygon className="rel-poly" points={`${tri.Vt.x},${tri.Vt.y} ${tri.Vf.x},${tri.Vf.y} ${tri.Vh.x},${tri.Vh.y}`} fill="var(--yellow-018)" stroke="var(--yellow-22)" strokeWidth="1" />
              {/* the relationship link: a flowing tether from the reference (centre) to the focused body */}
              {focusPoint && (
                <line className="rel-tether" x1={tri.cx} y1={tri.cy} x2={focusPoint.x} y2={focusPoint.y} />
              )}
              {/* barycentric guide-lines: focus point → each vertex, weighted by component */}
              {focusPoint && (
                <g className="rel-guides">
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={tri.Vt.x} y2={tri.Vt.y} stroke="var(--yellow)" strokeOpacity={0.06 + focusPoint.r.tension * 0.42} strokeWidth={0.5 + focusPoint.r.tension * 1.4} />
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={tri.Vf.x} y2={tri.Vf.y} stroke="var(--yellow)" strokeOpacity={0.06 + focusPoint.r.friction * 0.42} strokeWidth={0.5 + focusPoint.r.friction * 1.4} />
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={tri.Vh.x} y2={tri.Vh.y} stroke="var(--yellow)" strokeOpacity={0.06 + focusPoint.r.harmony * 0.42} strokeWidth={0.5 + focusPoint.r.harmony * 1.4} />
                </g>
              )}
            </svg>
            <span className="rel-vtx rel-vtx--t" style={{ left: tri.Vt.x, top: tri.Vt.y - 26 }}>מתח<i>עוינות פעילה</i></span>
            <span className="rel-vtx rel-vtx--f" style={{ left: tri.Vf.x - 8, top: tri.Vf.y + 16 }}>חיכוך<i>אינטרסים מתנגשים</i></span>
            <span className="rel-vtx rel-vtx--h" style={{ left: tri.Vh.x + 8, top: tri.Vh.y + 16 }}>הרמוניה<i>שיתוף פעולה</i></span>
            {/* reference marker at centroid — the lens through which every relation is read */}
            <div className="rel-ref" style={{ left: tri.cx, top: tri.cy }}>
              <span className="rel-ref__dot" />
              <span className="rel-ref__name">{refNode.he}</span>
              <span className="rel-ref__tag">מדינת ייחוס</span>
            </div>
          </>
        )}
        {/* CONSTELLATION edges — drawn behind the DOM nodes; endpoints share the node positions */}
        {mode === 'constellation' && net && (
          <svg className="rel-constellation" width={size.w} height={size.h}>
            {net.edges.map((ed) => {
              const key = `${ed.a}|${ed.b}`
              const isEgo = !!egoEdges?.has(key)
              const baseOp = 0.12 + 0.5 * ed.strength
              const op = focusId ? (isEgo ? Math.min(0.92, baseOp + 0.4) : 0.06) : baseOp
              return (
                <line
                  key={key}
                  className={`rel-edge rel-edge--${ed.pole}${isEgo ? ' rel-edge--ego' : ''}`}
                  x1={ed.ax} y1={ed.ay} x2={ed.bx} y2={ed.by}
                  strokeOpacity={op}
                  strokeWidth={1 + ed.strength}
                />
              )
            })}
          </svg>
        )}
        {geo && (
          <>
            {/* plotted states */}
            {geo.points.map(({ e, x, y, d }, i) => {
              const isFocus = e.id === focusId
              const isPinned = e.id === pinned
              const dim = focusId && !isFocus
              const rim = AXIS_RIM[AXIS[e.id] ?? 'none']
              // per-node exit delay — spread over ~360ms in index order, count-independent so the
              // cascade window matches the canvas views' EXIT_SPREAD regardless of node count.
              const exitDelay = (geo.points.length <= 1 ? 0 : i / (geo.points.length - 1)) * 360
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
                  style={{ left: x, top: y, animationDelay: leaving ? `${exitDelay}ms` : `${0.12 + i * 0.04}s` }}
                  onMouseEnter={() => setHovered(e.id)}
                  onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                  onFocus={() => setHovered(e.id)}
                  onBlur={() => setHovered((h) => (h === e.id ? null : h))}
                  onClick={(ev) => { ev.stopPropagation(); sound.play('click'); setPinned((p) => (p === e.id ? null : e.id)) }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); sound.play('click'); setPinned((p) => (p === e.id ? null : e.id)) } }}
                  title="לחיצה מקבעת את היחס; ׳קבעו כייחוס׳ בלוח מחליפה את מדינת הייחוס"
                >
                  <span className="rnode__disk" style={{ width: d, height: d, borderColor: `rgba(${rim},0.55)` }} />
                  <span className="rnode__name">{e.he}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      <PanelDock>
      {/* mode toggle — the headline switch between the per-reference triangle and the whole web */}
      <div className="rel-modeswitch" role="tablist" aria-label="מצב תצוגה">
        <button
          role="tab"
          aria-selected={mode === 'triangle'}
          className={`rel-modeswitch__btn${mode === 'triangle' ? ' rel-modeswitch__btn--on' : ''}`}
          onClick={() => setModeAndReset('triangle')}
        >משולש</button>
        <button
          role="tab"
          aria-selected={mode === 'constellation'}
          className={`rel-modeswitch__btn${mode === 'constellation' ? ' rel-modeswitch__btn--on' : ''}`}
          onClick={() => setModeAndReset('constellation')}
        >קונסטלציה</button>
      </div>
      {focusPoint && dom ? (
        <aside className="panel panel--detail rel-detail" dir="rtl" key={focusPoint.e.id}>
          {pinned && <button className="panel__close" onClick={() => setPinned(null)} aria-label="ביטול קיבוע">✕</button>}
          <span className="rel-detail__kicker">{focusPoint.e.id === refId ? 'מדינת הייחוס' : `היחס מול ${refNode.he}`}</span>
          <h1 className="panel__title">{focusPoint.e.he}</h1>
          <p className={`rel-detail__verdict rel-detail__verdict--${dom}`}>{VERDICT[dom]}</p>
          {focusPoint.r.why && <p className="panel__why">{focusPoint.r.why}</p>}
          <div className="panel__forces">
            <span className="panel__rels-h">מאפייני היחס</span>
            {(['tension', 'friction', 'harmony'] as Pole[]).map((pole, bi) => {
              const v = Math.round(focusPoint.r[pole] * 100)
              return (
                <div className={`fbar${pole === dom ? ' fbar--on' : ''}`} key={pole} style={{ '--bd': `${bi * 0.08}s` } as React.CSSProperties}>
                  <span className="fbar__k">{POLE_HE[pole]}</span>
                  <span className="fbar__track"><span className="fbar__fill" style={{ width: `${v}%` }} /></span>
                  <span className="fbar__v">{v}</span>
                </div>
              )
            })}
          </div>
          <div className="panel__meta">
            <div className="panel__row"><span className="panel__row-k">אופי</span><span className="panel__row-v"><bdi>{focusPoint.e.dispo}</bdi></span></div>
            <div className="panel__row"><span className="panel__row-k">שיוך</span><span className="panel__row-v"><bdi>{AXIS_LABEL[AXIS[focusPoint.e.id] ?? 'none']}</bdi></span></div>
          </div>
          {mode === 'triangle' && (
            <button className="panel__setref" onClick={() => setReference(focusPoint.e.id)}>
              קבעו את {focusPoint.e.he} כמדינת הייחוס ←
            </button>
          )}
        </aside>
      ) : mode === 'constellation' ? (
        <aside className="panel" dir="rtl">
          <h1 className="panel__title">קונסטלציה</h1>
          <p className="panel__body">
            כל רשת הקשרים באזור בבת אחת. כל קו מחבר שתי מדינות, וצבעו מסמן את אופי
            הקשר ביניהן. מיקום אופקי לפי הציר, גובה לפי כוח.
          </p>
          <p className="rel-hint">רחפו על מדינה כדי להאיר את רשת הקשרים שלה</p>
          <div className="rel-legend">
            <span className="panel__rels-h">מקרא הקשרים</span>
            <div className="rel-legend__row"><span className="rel-legend__swatch rel-legend__swatch--tension" /><span className="rel-legend__lbl">מתח</span></div>
            <div className="rel-legend__row"><span className="rel-legend__swatch rel-legend__swatch--friction" /><span className="rel-legend__lbl">חיכוך</span></div>
            <div className="rel-legend__row"><span className="rel-legend__swatch rel-legend__swatch--harmony" /><span className="rel-legend__lbl">הרמוניה</span></div>
          </div>
          <p className="panel__note">לחיצה על מדינה פותחת את פרטיה.</p>
        </aside>
      ) : (
        <aside className="panel" dir="rtl">
          <h1 className="panel__title">מערכות היחסים</h1>
          <p className="panel__body">
            כל יחס באזור נמתח בין שלושה קטבים: מתח, חיכוך והרמוניה. מיקומה של כל מדינה
            במשולש מגדיר את אופי הקשר שלה מול מדינת הייחוס.
          </p>
          <div className="panel__refpick">
            <span className="panel__rels-h">מדינת הייחוס</span>
            <div className="panel__rels-list">
              {REF_CHOICES.map((id) => {
                const n = byId.get(id)!
                return (
                  <button key={id} className={`panel__rel${id === refId ? ' panel__rel--on' : ''}`} onClick={() => setReference(id)}>
                    {n.he}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="panel__note">רחפו לבחינת יחס · לחיצה מקבעת אותו · לחיצה על מדינה במפה פותחת את פרטיה.</p>
        </aside>
      )}
      </PanelDock>
    </div>
  )
}
