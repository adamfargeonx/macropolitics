import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { NODES, FORCES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { Header, SidePanel, RightRail, TabBar, type EntityDetail, type View } from './Chrome'
import { CustomCursor } from './CustomCursor'

const TAU = Math.PI * 2
const BANDS = ['great', 'regional', 'intermediate', 'edge', 'nonstate'] as const
const BAND_R: Record<string, number> = { great: 0.16, regional: 0.37, intermediate: 0.58, edge: 0.77, nonstate: 0.94 }
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
    scoreLabel: `${forceScore(e.power).toFixed(1)} / 10`, forces: FORCES[id],
  }
}

// drifting starfield background (calm; the interactive field is the /dynamics signature)
function useStarfield(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    let raf = 0, w = 0, h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let stars: { x: number; y: number; vx: number; vy: number; s: number; b: number }[] = []
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: Math.min(150, Math.round((w * h) / 9000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08,
        s: 0.6 + Math.random() * 1.2, b: 0.12 + Math.random() * 0.4,
      }))
    }
    resize(); window.addEventListener('resize', resize)
    let t = 0
    const loop = () => {
      t += 0.016; ctx.clearRect(0, 0, w, h)
      for (const p of stars) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w
        if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h
        const tw = 0.6 + 0.4 * Math.sin(t * 1.1 + p.x * 0.04)
        ctx.fillStyle = `rgba(255,255,255,${p.b * tw})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [canvasRef])
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
        const ang = (i / items.length) * TAU - Math.PI / 2 + off
        nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: Math.max(8, powerSize(e.power) * 0.72) })
      })
    }
    return { nodes, rings, cx, cy }
  }, [size])

  const focus = selected ?? hovered
  const detail = useMemo(() => buildForceDetail(selected), [selected])

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
        {layout.nodes.map(({ e, x, y, d }) => {
          const isFocus = e.id === focus
          const dim = focus && !isFocus
          const nonstate = e.kind === 'nonstate'
          const rim = AXIS_RIM[AXIS[e.id] ?? 'none']
          return (
            <div
              key={e.id}
              className={`fnode${nonstate ? ' fnode--ns' : ''}${isFocus ? ' fnode--focus' : ''}${dim ? ' fnode--dim' : ''}`}
              style={{ left: x, top: y }}
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
      <Header />
      {selected ? (
        <SidePanel detail={detail} onClose={() => setSelected(null)} />
      ) : (
        <aside className="panel" dir="rtl">
          <h1 className="panel__title">כוחות המשיכה</h1>
          <p className="panel__body">
            כוח המשיכה של מדינה נמדד לפי כוחה הכלכלי, הצבאי והגאו-אסטרטגי — ומהווה את כוחה הפוליטי.
            ככל שהגוף קרוב למרכז וגדול יותר, כך כוח משיכתו רב יותר.
          </p>
          <p className="panel__note">בחרו מדינה כדי לראות את מרכיבי כוחה.</p>
        </aside>
      )}
      <RightRail />
      <TabBar view={view} onView={onView} />
      <CustomCursor active={!!hovered} />
    </div>
  )
}
