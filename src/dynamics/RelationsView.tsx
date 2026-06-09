import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, LINKS, AXIS, AXIS_LABEL, DISPO, powerSize } from '../data/entities'
import { Header, RightRail, TabBar, type View } from './Chrome'
import { CustomCursor } from './CustomCursor'
import { useStarfield } from './useStarfield'
import { useDeCollide } from './useDeCollide'

const byId = new Map(NODES.map((n) => [n.id, n]))
const STATES = NODES.filter((n) => n.kind !== 'nonstate')

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

// Derived relationship of target toward reference (placeholder model → empirical later).
// Built from bloc alignment + alliances + the target's disposition.
function relation(refId: string, tId: string) {
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

const charOf = (r: { harmony: number; tension: number; friction: number }) =>
  r.tension >= r.friction && r.tension >= r.harmony ? 'יחס מתוח'
    : r.harmony >= r.friction ? 'יחס הרמוני' : 'יחס מורכב'

export default function RelationsView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [refId, setRefId] = useState('israel')
  const [hovered, setHovered] = useState<string | null>(null)
  useStarfield(canvasRef)

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return null
    const cx = w / 2, cy = h / 2, s = Math.min(w, h) * 0.47
    const Vt = { x: cx, y: cy - s * 0.95 }       // מתח (tension) — top
    const Vf = { x: cx - s * 0.92, y: cy + s * 0.72 } // חיכוך (friction) — bottom-left
    const Vh = { x: cx + s * 0.92, y: cy + s * 0.72 } // הרמוניה (harmony) — bottom-right
    const points = STATES.filter((e) => e.id !== refId).map((e) => {
      const r = relation(refId, e.id)
      const jx = ((hash(e.id) % 1000) / 1000 - 0.5) * 30
      const jy = ((hash(e.id + '~') % 1000) / 1000 - 0.5) * 30
      return {
        e, r,
        x: r.tension * Vt.x + r.friction * Vf.x + r.harmony * Vh.x + jx,
        y: r.tension * Vt.y + r.friction * Vf.y + r.harmony * Vh.y + jy,
        d: Math.max(9, Math.min(30, powerSize(e.power) * 0.42)),
      }
    })
    return { cx, cy, Vt, Vf, Vh, points }
  }, [size, refId])

  const refNode = byId.get(refId)!
  const hoveredPoint = geo?.points.find((p) => p.e.id === hovered)
  useDeCollide(fieldRef, '.rnode', '.rnode__name', hovered, [size, refId, hovered])

  return (
    <div className="stage relations" dir="rtl">
      <canvas ref={canvasRef} className="field" />
      <div className="rel-field" ref={fieldRef}>
        {geo && (
          <>
            <svg className="rel-tri" width={size.w} height={size.h}>
              <polygon points={`${geo.Vt.x},${geo.Vt.y} ${geo.Vf.x},${geo.Vf.y} ${geo.Vh.x},${geo.Vh.y}`} fill="rgba(251,255,0,0.018)" stroke="rgba(251,255,0,0.22)" strokeWidth="1" />
            </svg>
            <span className="rel-vtx" style={{ left: geo.Vt.x, top: geo.Vt.y - 18 }}>מתח</span>
            <span className="rel-vtx" style={{ left: geo.Vf.x - 8, top: geo.Vf.y + 14 }}>חיכוך</span>
            <span className="rel-vtx" style={{ left: geo.Vh.x + 8, top: geo.Vh.y + 14 }}>הרמוניה</span>
            {/* reference marker at centroid */}
            <div className="rel-ref" style={{ left: geo.cx, top: geo.cy }}>
              <span className="rel-ref__dot" />
              <span className="rel-ref__name">{refNode.he}</span>
              <span className="rel-ref__tag">מדינת ייחוס</span>
            </div>
            {/* plotted states */}
            {geo.points.map(({ e, x, y, d }) => {
              const isHover = e.id === hovered
              const dim = hovered && !isHover
              const rim = AXIS[e.id] === 'west' ? '132,160,196' : AXIS[e.id] === 'east' ? '198,134,98' : '150,150,160'
              return (
                <div
                  key={e.id}
                  data-id={e.id}
                  data-power={e.power}
                  className={`rnode${isHover ? ' rnode--hover' : ''}${dim ? ' rnode--dim' : ''}`}
                  style={{ left: x, top: y }}
                  onMouseEnter={() => setHovered(e.id)}
                  onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                  onClick={() => { setRefId(e.id); setHovered(null) }}
                  title="לחצו כדי לבחור כמדינת ייחוס"
                >
                  <span className="rnode__disk" style={{ width: d, height: d, borderColor: `rgba(${rim},0.55)` }} />
                  <span className="rnode__name">{e.he}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      <Header />
      {hoveredPoint ? (
        <aside className="panel panel--detail" dir="rtl">
          <h1 className="panel__title">{hoveredPoint.e.he}</h1>
          <p className="panel__rel-toward">{charOf(hoveredPoint.r)} מול {refNode.he}</p>
          <div className="panel__meta">
            <div className="panel__row"><span className="panel__row-k">אופי</span><span className="panel__row-v">{hoveredPoint.e.dispo}</span></div>
            <div className="panel__row"><span className="panel__row-k">שיוך</span><span className="panel__row-v">{AXIS_LABEL[AXIS[hoveredPoint.e.id] ?? 'none']}</span></div>
          </div>
          <div className="panel__forces">
            <span className="panel__rels-h">מאפייני היחס</span>
            <div className="fbar"><span className="fbar__k">מתח</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(hoveredPoint.r.tension * 100)}%` }} /></span><span className="fbar__v">{Math.round(hoveredPoint.r.tension * 100)}</span></div>
            <div className="fbar"><span className="fbar__k">חיכוך</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(hoveredPoint.r.friction * 100)}%` }} /></span><span className="fbar__v">{Math.round(hoveredPoint.r.friction * 100)}</span></div>
            <div className="fbar"><span className="fbar__k">הרמוניה</span><span className="fbar__track"><span className="fbar__fill" style={{ width: `${Math.round(hoveredPoint.r.harmony * 100)}%` }} /></span><span className="fbar__v">{Math.round(hoveredPoint.r.harmony * 100)}</span></div>
          </div>
        </aside>
      ) : (
        <aside className="panel" dir="rtl">
          <h1 className="panel__title">מערכות היחסים</h1>
          <p className="panel__body">
            מערכות היחסים באזור בנויות על שלושה צירים היוצרים משולש: מתח, חיכוך והרמוניה.
            כל נקודה היא מדינה, ומיקומה מגדיר את אופי הקשר שלה מול מדינת הייחוס.
          </p>
          <div className="panel__meta" style={{ marginTop: 18 }}>
            <div className="panel__row"><span className="panel__row-k">מדינת ייחוס</span><span className="panel__row-v">{refNode.he}</span></div>
          </div>
          <p className="panel__note">לחצו על מדינה כדי להפוך אותה למדינת הייחוס; רחפו כדי לבחון יחס.</p>
        </aside>
      )}
      <RightRail />
      <TabBar view={view} onView={onView} />
      <CustomCursor active={!!hovered} />
    </div>
  )
}
