import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, LINKS, AXIS, AXIS_LABEL, DISPO, powerSize } from '../data/entities'
import { authoredRelation } from '../data/relations'
import { Header, PanelDock, TabBar, type View } from './Chrome'
import { useDeCollide } from './useDeCollide'
import { AXIS_RIM } from './forces-model'
import { sound } from '../sound'

const byId = new Map(NODES.map((n) => [n.id, n]))
const STATES = NODES.filter((n) => n.kind !== 'nonstate')
// reference picker — the states whose constellations matter most
const REF_CHOICES = ['israel', 'usa', 'iran', 'saudi', 'turkey', 'egypt', 'russia', 'qatar']

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Rel { harmony: number; tension: number; friction: number; why?: string }

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

const charOf = (r: Rel) =>
  r.tension >= r.friction && r.tension >= r.harmony ? 'יחס מתוח'
    : r.harmony >= r.friction ? 'יחס הרמוני' : 'יחס מורכב'

export default function RelationsView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [refId, setRefId] = useState('israel')
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return null
    const cx = w / 2, cy = h / 2 + h * 0.02, s = Math.min(w, h) * 0.47
    const Vt = { x: cx, y: cy - s * 0.95 }       // מתח — top
    const Vf = { x: cx - s * 0.92, y: cy + s * 0.72 } // חיכוך — bottom-left
    const Vh = { x: cx + s * 0.92, y: cy + s * 0.72 } // הרמוניה — bottom-right
    const points = STATES.filter((e) => e.id !== refId).map((e) => {
      const raw = relation(refId, e.id)
      const r = sharpen(raw)
      const jx = ((hash(e.id) % 1000) / 1000 - 0.5) * 18
      const jy = ((hash(e.id + '~') % 1000) / 1000 - 0.5) * 18
      return {
        e, r: raw,
        x: r.tension * Vt.x + r.friction * Vf.x + r.harmony * Vh.x + jx,
        y: r.tension * Vt.y + r.friction * Vf.y + r.harmony * Vh.y + jy,
        d: Math.max(9, Math.min(30, powerSize(e.power) * 0.42)),
      }
    })
    // collision relaxation — separate overlapping bodies (small, label-aware gap) while
    // staying near their barycentric position; ~98% of meaning kept, 100% legibility gained.
    for (let iter = 0; iter < 24; iter++) {
      let moved = false
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j]
          const min = (a.d + b.d) / 2 + 21 // disk radii + room for the name label
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
    // keep everything inside the field (labels included)
    for (const p of points) { p.x = Math.min(Math.max(p.x, 46), w - 46); p.y = Math.min(Math.max(p.y, 34), h - 40) }
    return { cx, cy, Vt, Vf, Vh, points }
  }, [size, refId])

  const refNode = byId.get(refId)!
  const focusId = pinned ?? hovered
  const focusPoint = geo?.points.find((p) => p.e.id === focusId)
  useDeCollide(fieldRef, '.rnode', '.rnode__name', focusId, [size, refId, hovered, pinned])

  const setReference = (id: string) => { sound.play('select'); setRefId(id); setPinned(null); setHovered(null) }

  return (
    <div className="stage relations" dir="rtl">
      <div className="rel-field" ref={fieldRef} onClick={() => setPinned(null)}>
        {geo && (
          <>
            <svg className="rel-tri" width={size.w} height={size.h}>
              <polygon points={`${geo.Vt.x},${geo.Vt.y} ${geo.Vf.x},${geo.Vf.y} ${geo.Vh.x},${geo.Vh.y}`} fill="rgba(251,255,0,0.018)" stroke="rgba(251,255,0,0.22)" strokeWidth="1" />
              {/* barycentric guide-lines: focus point → each vertex, weighted by component */}
              {focusPoint && (
                <g className="rel-guides">
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={geo.Vt.x} y2={geo.Vt.y} stroke="rgba(251,255,0,1)" strokeOpacity={0.08 + focusPoint.r.tension * 0.55} strokeWidth={0.5 + focusPoint.r.tension * 1.6} />
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={geo.Vf.x} y2={geo.Vf.y} stroke="rgba(251,255,0,1)" strokeOpacity={0.08 + focusPoint.r.friction * 0.55} strokeWidth={0.5 + focusPoint.r.friction * 1.6} />
                  <line x1={focusPoint.x} y1={focusPoint.y} x2={geo.Vh.x} y2={geo.Vh.y} stroke="rgba(251,255,0,1)" strokeOpacity={0.08 + focusPoint.r.harmony * 0.55} strokeWidth={0.5 + focusPoint.r.harmony * 1.6} />
                </g>
              )}
            </svg>
            <span className="rel-vtx rel-vtx--t" style={{ left: geo.Vt.x, top: geo.Vt.y - 26 }}>מתח<i>עוינות פעילה</i></span>
            <span className="rel-vtx rel-vtx--f" style={{ left: geo.Vf.x - 8, top: geo.Vf.y + 16 }}>חיכוך<i>אינטרסים מתנגשים</i></span>
            <span className="rel-vtx rel-vtx--h" style={{ left: geo.Vh.x + 8, top: geo.Vh.y + 16 }}>הרמוניה<i>שיתוף פעולה</i></span>
            {/* reference marker at centroid */}
            <div className="rel-ref" style={{ left: geo.cx, top: geo.cy }}>
              <span className="rel-ref__dot" />
              <span className="rel-ref__name">{refNode.he}</span>
              <span className="rel-ref__tag">מדינת ייחוס</span>
            </div>
            {/* plotted states */}
            {geo.points.map(({ e, x, y, d }, i) => {
              const isFocus = e.id === focusId
              const isPinned = e.id === pinned
              const dim = focusId && !isFocus
              const rim = AXIS_RIM[AXIS[e.id] ?? 'none']
              return (
                <div
                  key={e.id}
                  data-id={e.id}
                  data-power={e.power}
                  role="button"
                  tabIndex={0}
                  aria-label={`${e.he} — ${charOf(relation(refId, e.id))} מול ${refNode.he}`}
                  aria-pressed={e.id === pinned}
                  className={`rnode${isFocus ? ' rnode--hover' : ''}${isPinned ? ' rnode--pin' : ''}${dim ? ' rnode--dim' : ''}`}
                  style={{ left: x, top: y, animationDelay: `${0.12 + i * 0.05}s` }}
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

      <Header onHome={() => onView('home')} />
      <PanelDock>
      {focusPoint ? (
        <aside className="panel panel--detail" dir="rtl">
          {pinned && <button className="panel__close" onClick={() => setPinned(null)} aria-label="ביטול קיבוע">✕</button>}
          <h1 className="panel__title">{focusPoint.e.he}</h1>
          <p className="panel__rel-toward">{charOf(focusPoint.r)} מול {refNode.he}</p>
          {focusPoint.r.why && <p className="panel__why">{focusPoint.r.why}</p>}
          <div className="panel__meta">
            <div className="panel__row"><span className="panel__row-k">אופי</span><span className="panel__row-v">{focusPoint.e.dispo}</span></div>
            <div className="panel__row"><span className="panel__row-k">שיוך</span><span className="panel__row-v">{AXIS_LABEL[AXIS[focusPoint.e.id] ?? 'none']}</span></div>
          </div>
          <div className="panel__forces">
            <span className="panel__rels-h">מאפייני היחס</span>
            <div className="fbar"><span className="fbar__k">מתח</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(focusPoint.r.tension * 100)}%` }} /></span><span className="fbar__v">{Math.round(focusPoint.r.tension * 100)}</span></div>
            <div className="fbar"><span className="fbar__k">חיכוך</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(focusPoint.r.friction * 100)}%` }} /></span><span className="fbar__v">{Math.round(focusPoint.r.friction * 100)}</span></div>
            <div className="fbar"><span className="fbar__k">הרמוניה</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(focusPoint.r.harmony * 100)}%` }} /></span><span className="fbar__v">{Math.round(focusPoint.r.harmony * 100)}</span></div>
          </div>
          <button className="panel__setref" onClick={() => setReference(focusPoint.e.id)}>
            קבעו את {focusPoint.e.he} כמדינת הייחוס ←
          </button>
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
      <TabBar view={view} onView={onView} />
    </div>
  )
}
