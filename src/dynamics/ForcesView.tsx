import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, FORCES, POWER_NOTES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { Header, SidePanel, PanelDock, RightRail, TabBar, type EntityDetail, type View } from './Chrome'
import { useStarfield } from './useStarfield'
import { useDeCollide } from './useDeCollide'

const TAU = Math.PI * 2
const BANDS = ['great', 'regional', 'intermediate', 'edge', 'nonstate'] as const
const BAND_R: Record<string, number> = { great: 0.26, regional: 0.47, intermediate: 0.65, edge: 0.81, nonstate: 0.96 }
const TIER_LABEL: Record<string, string> = {
  great: 'כוח-על', regional: 'כוח אזורי', intermediate: 'כוח ביניים', edge: 'כוח קצה', nonstate: 'שחקנים לא-מדינתיים',
}
const AXIS_RIM: Record<string, string> = { west: '132,160,196', east: '198,134,98', neutral: '150,150,160', none: '120,120,128' }

const byId = new Map(NODES.map((n) => [n.id, n]))

function buildForceDetail(id: string | null): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id); if (!e) return null
  return {
    he: e.he, power: e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: null, relations: [],
    scoreLabel: `${forceScore(e.power).toFixed(1)} / 10`, forces: FORCES[id], powerNotes: POWER_NOTES[id],
  }
}

export default function ForcesView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  useStarfield(canvasRef)

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return { nodes: [] as any[], rings: [] as any[], cx: 0, cy: 0 }
    const cx = w / 2, cy = h / 2, halfMin = Math.min(w, h) / 2
    const nodes: { e: typeof NODES[number]; x: number; y: number; d: number }[] = []
    const rings = BANDS.map((k) => ({ k, r: BAND_R[k] * halfMin }))
    for (const kind of BANDS) {
      const items = NODES.filter((n) => n.kind === kind)
      const R = BAND_R[kind] * halfMin
      const off = kind === 'great' ? 0.4 : kind.length * 0.7
      items.forEach((e, i) => {
        const ang = (i / items.length) * TAU + Math.PI / 2 + off
        nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: Math.max(8, Math.min(66, powerSize(e.power) * 0.5)) })
      })
    }
    return { nodes, rings, cx, cy }
  }, [size])

  const focus = selected ?? hovered
  const detail = useMemo(() => buildForceDetail(selected), [selected])
  useDeCollide(fieldRef, '.fnode', '.fnode__name', focus, [size, hovered, selected])

  return (
    <div className="stage forces" dir="rtl" onClick={() => setSelected(null)}>
      <canvas ref={canvasRef} className="field" />
      <div className="forces-field" ref={fieldRef}>
        {/* tier guide rings + labels */}
        {layout.rings.map((ring) => (
          <div key={ring.k} className="forces-ring" style={{ width: ring.r * 2, height: ring.r * 2, left: layout.cx, top: layout.cy }}>
            <span className="forces-ring__label">{TIER_LABEL[ring.k]}</span>
          </div>
        ))}
        {/* bodies */}
        {layout.nodes.map(({ e, x, y, d }, i) => {
          const isFocus = e.id === focus
          const dim = focus && !isFocus
          const nonstate = e.kind === 'nonstate'
          const rim = AXIS_RIM[AXIS[e.id] ?? 'none']
          return (
            <div
              key={e.id}
              data-id={e.id}
              data-power={e.power}
              className={`fnode${nonstate ? ' fnode--ns' : ''}${isFocus ? ' fnode--focus' : ''}${dim ? ' fnode--dim' : ''}`}
              style={{ left: x, top: y, animationDelay: `${0.12 + i * 0.055}s` }}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
              onClick={(ev) => { ev.stopPropagation(); setSelected((s) => (s === e.id ? null : e.id)) }}
            >
              <span className="fnode__disk" style={{ width: d, height: d, borderColor: `rgba(${rim},0.5)` }} />
              <span className="fnode__name">{e.he}</span>
              <span className="fnode__score">{forceScore(e.power).toFixed(1)}</span>
            </div>
          )
        })}
      </div>
      <Header onHome={() => onView('home')} />
      <PanelDock>
        {selected ? (
          <SidePanel detail={detail} onClose={() => setSelected(null)} />
        ) : (
          <aside className="panel" dir="rtl">
            <h1 className="panel__title">כבידה</h1>
            <p className="panel__body">
              כבידתה של מדינה נמדדת לפי כוחה הכלכלי, הצבאי והגאו-אסטרטגי — והיא המבטאת את משקלה הפוליטי.
              ככל שהגוף קרוב למרכז וגדול יותר, כך כבידתו רבה יותר.
            </p>
            <p className="panel__note">בחרו מדינה כדי לראות את מרכיבי כבידתה.</p>
          </aside>
        )}
      </PanelDock>
      <RightRail />
      <TabBar view={view} onView={onView} />
    </div>
  )
}
