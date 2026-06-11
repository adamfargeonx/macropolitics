import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, FORCES, POWER_NOTES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { Header, SidePanel, PanelDock, TabBar, type EntityDetail, type View } from './Chrome'
import { useDeCollide } from './useDeCollide'
import { Words } from './Words'

const TAU = Math.PI * 2
const BANDS = ['great', 'regional', 'intermediate', 'edge', 'nonstate'] as const
const BAND_R: Record<string, number> = { great: 0.26, regional: 0.47, intermediate: 0.65, edge: 0.81, nonstate: 0.96 }
const TIER_LABEL: Record<string, string> = {
  great: 'כוח-על', regional: 'כוח אזורי', intermediate: 'כוח ביניים', edge: 'כוח קצה', nonstate: 'שחקנים לא-מדינתיים',
}
const AXIS_RIM: Record<string, string> = { west: '132,160,196', east: '198,134,98', neutral: '150,150,160', none: '120,120,128' }

const byId = new Map(NODES.map((n) => [n.id, n]))
const RANKED = [...NODES].sort((a, b) => b.power - a.power)
const RANK_OF = new Map(RANKED.map((n, i) => [n.id, i]))

// cursor reactivity tuning (field units)
const REACT_R = 210   // how far the cursor's pull reaches
const MAX_NUDGE = 13  // how far a star drifts toward the cursor (slight)
const NEAR_R = 76     // within this, a star is "picked up" → highlighted + named
const ZOOM_NAMES_AT = 1.8 // +80% zoom → names cascade in by rank

function buildForceDetail(id: string | null): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id); if (!e) return null
  return {
    he: e.he, power: e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: null, relations: [],
    scoreLabel: `${forceScore(e.power).toFixed(1)} / 10`, forces: FORCES[id], powerNotes: POWER_NOTES[id],
    rank: RANKED.findIndex((n) => n.id === id) + 1, total: RANKED.length,
  }
}

export default function ForcesView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [namesOff, setNamesOff] = useState(false)          // manual "clean visuals" toggle
  const [proximal, setProximal] = useState<string | null>(null) // nearest star to the cursor
  const proxRef = useRef<string | null>(null); proxRef.current = proximal
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  // camera: pan (drag) + zoom (wheel / buttons), applied to a transform wrapper
  const [cam, setCam] = useState({ z: 1, x: 0, y: 0 })
  const camRef = useRef(cam); camRef.current = cam
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const dragMoved = useRef(false)
  const clampZ = (z: number) => Math.min(3, Math.max(0.6, z))

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el)
    // wheel zoom-to-cursor (non-passive so we can preventDefault)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top
      setCam((c) => { const z = clampZ(c.z * (1 - e.deltaY * 0.0015)); const k = z / c.z; return { z, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k } })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', onWheel) }
  }, [])

  const onPanDown = (e: React.PointerEvent) => { drag.current = { sx: e.clientX, sy: e.clientY, px: camRef.current.x, py: camRef.current.y }; dragMoved.current = false }
  // every star leans slightly toward the cursor; the nearest one is "picked up" (highlighted + named)
  const react = (e: React.PointerEvent) => {
    const el = fieldRef.current; if (!el) return
    const r = el.getBoundingClientRect(); const c = camRef.current
    const fx = (e.clientX - r.left - c.x) / c.z, fy = (e.clientY - r.top - c.y) / c.z
    let nearest: string | null = null, nd = NEAR_R
    el.querySelectorAll<HTMLElement>('.fnode').forEach((node) => {
      const id = node.dataset.id; if (!id) return
      const p = posRef.current.get(id); if (!p) return
      const dx = fx - p.x, dy = fy - p.y, dist = Math.hypot(dx, dy)
      if (dist < REACT_R && dist > 0.01) {
        const prox = 1 - dist / REACT_R
        const mag = Math.min(MAX_NUDGE, prox * prox * MAX_NUDGE * 1.8)
        node.style.translate = `${(dx / dist) * mag}px ${(dy / dist) * mag}px`
      } else if (node.style.translate) node.style.translate = ''
      if (dist < nd) { nd = dist; nearest = id }
    })
    if (proxRef.current !== nearest) setProximal(nearest)
  }
  const clearReact = () => {
    fieldRef.current?.querySelectorAll<HTMLElement>('.fnode').forEach((n) => { if (n.style.translate) n.style.translate = '' })
    if (proxRef.current) setProximal(null)
  }
  const onMove = (e: React.PointerEvent) => {
    react(e)
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (!dragMoved.current && Math.hypot(dx, dy) > 4) dragMoved.current = true
    if (dragMoved.current) setCam((c) => ({ ...c, x: d.px + dx, y: d.py + dy }))
  }
  const onPanUp = () => { drag.current = null }
  const zoomBy = (f: number) => { const el = fieldRef.current; if (!el) return; const r = el.getBoundingClientRect(); const mx = r.width / 2, my = r.height / 2; setCam((c) => { const z = clampZ(c.z * f); const k = z / c.z; return { z, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k } }) }
  const resetCam = () => setCam({ z: 1, x: 0, y: 0 })

  const layout = useMemo(() => {
    const { w, h } = size
    if (!w || !h) return { nodes: [] as any[], rings: [] as any[], cx: 0, cy: 0 }
    const cx = w / 2, cy = h / 2, halfMin = Math.min(w, h) / 2
    const nodes: { e: typeof NODES[number]; x: number; y: number; d: number }[] = []
    const rings = BANDS.map((k) => ({ k, r: BAND_R[k] * halfMin }))
    // place each band's bodies by RANK: strongest starts at 12 o'clock, then clockwise.
    // Bands are phase-staggered so first items don't align into one column.
    const BAND_PHASE: Record<string, number> = { great: 0, regional: 0.55, intermediate: 0.25, edge: 0.8, nonstate: 0.45 }
    for (const kind of BANDS) {
      const items = NODES.filter((n) => n.kind === kind).sort((a, b) => b.power - a.power)
      const R = BAND_R[kind] * halfMin
      items.forEach((e, i) => {
        const ang = -Math.PI / 2 + BAND_PHASE[kind] + (i / items.length) * TAU
        nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: Math.max(8, Math.min(66, powerSize(e.power) * 0.5)) })
      })
    }
    return { nodes, rings, cx, cy }
  }, [size])

  // keep the cursor-reaction lookup table in sync with the laid-out positions
  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>()
    layout.nodes.forEach((n) => m.set(n.e.id, { x: n.x, y: n.y }))
    posRef.current = m
  }, [layout])

  const focus = selected ?? hovered ?? proximal
  const zoomNames = cam.z >= ZOOM_NAMES_AT
  const detail = useMemo(() => buildForceDetail(selected), [selected])
  useDeCollide(fieldRef, '.fnode', '.fnode__name', focus, [size, hovered, selected, proximal])

  return (
    <div
      className={`stage forces${namesOff ? ' forces--clean' : ''}${zoomNames && !namesOff ? ' forces--names' : ''}`}
      dir="rtl"
      onClick={() => { if (dragMoved.current) { dragMoved.current = false; return } setSelected(null) }}
    >
      <div
        className={`forces-field${drag.current ? ' forces-field--grab' : ''}`}
        ref={fieldRef}
        onPointerDown={onPanDown}
        onPointerMove={onMove}
        onPointerUp={onPanUp}
        onPointerLeave={() => { onPanUp(); clearReact() }}
      >
       <div className="forces-zoom" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
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
              style={{ left: x, top: y, '--fx': `${layout.cx - x}px`, '--fy': `${layout.cy - y}px`, '--rk': RANK_OF.get(e.id) ?? 0, animationDelay: `${0.15 + i * 0.035}s` } as React.CSSProperties}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
              onClick={(ev) => { ev.stopPropagation(); setSelected((s) => (s === e.id ? null : e.id)) }}
            >
              <span className="fnode__disk" style={{ width: d, height: d, borderColor: `rgba(${rim},0.5)`, animationDelay: `-${(i % 9) * 0.47}s` }} />
              <span className="fnode__name">{e.he}</span>
              <span className="fnode__score">{forceScore(e.power).toFixed(1)}</span>
            </div>
          )
        })}
       </div>
      </div>
      <div className="zoomctl" dir="ltr">
        <button onClick={() => zoomBy(1.25)} aria-label="התקרבות">+</button>
        <span className="zoomctl__val">{Math.round(cam.z * 100)}%</span>
        <button onClick={() => zoomBy(0.8)} aria-label="התרחקות">−</button>
        <button className="zoomctl__reset" onClick={resetCam} aria-label="איפוס">⟲</button>
      </div>
      {/* clean-visuals toggle — hide names + rankings on the map */}
      <button
        className={`namestoggle${namesOff ? ' namestoggle--off' : ''}`}
        dir="rtl"
        onClick={() => setNamesOff((v) => !v)}
        aria-pressed={!namesOff}
        title={namesOff ? 'הצגת שמות ודירוגים' : 'הסתרת שמות ודירוגים'}
      >
        <span className="namestoggle__icon" aria-hidden>{namesOff ? '◍' : '◉'}</span>
        {namesOff ? 'שמות' : 'שמות'}
      </button>
      <Header onHome={() => onView('home')} />
      <PanelDock>
        {selected ? (
          <SidePanel detail={detail} onClose={() => setSelected(null)} />
        ) : (
          <aside className="panel" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
            <h1 className="panel__title">כוח משיכה</h1>
            <p className="panel__body panel__body--words">
              <Words delay={0.2} text="כוח המשיכה — שקלול הכוח הכלכלי, הצבאי והגאו-אסטרטגי — הוא משקלו הפוליטי של כל גוף. קרוב יותר למרכז, גדול יותר — כבד יותר." />
            </p>
            <div className="gindex">
              <span className="gindex__h">מדד כוח המשיכה</span>
              {RANKED.map((e, i) => (
                <button
                  key={e.id}
                  className={`gindex__row${e.kind === 'nonstate' ? ' gindex__row--ns' : ''}${e.id === hovered ? ' gindex__row--lit' : ''}`}
                  style={{ animationDelay: `${Math.min(0.05 + i * 0.03, 0.9)}s` }}
                  onMouseEnter={() => setHovered(e.id)}
                  onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                  onClick={() => setSelected(e.id)}
                >
                  <span className="gindex__rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="gindex__name">{e.he}</span>
                  <span className="gindex__bar"><i style={{ width: `${e.power}%` }} /></span>
                  <span className="gindex__score">{forceScore(e.power).toFixed(1)}</span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </PanelDock>
      <TabBar view={view} onView={onView} />
    </div>
  )
}
