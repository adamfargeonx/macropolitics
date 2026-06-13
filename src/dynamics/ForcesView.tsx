import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, FORCES, POWER_NOTES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { DATA, BODY_INPUTS } from '../data/empirical'
import { computeGravities, type GravityResult } from '../model/gravity'
import { useWeights, weightsStore, isDefaultWeights } from '../model/weights-store'
import { Header, SidePanel, PanelDock, TabBar, type EntityDetail, type View } from './Chrome'
import { useDeCollide } from './useDeCollide'
import { Words } from './Words'
import { sound } from '../sound'

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

// ── forces-screen arrangements: order by an axis (or total), filter by bloc ──
type Order = 'total' | 'eco' | 'mil' | 'geo'
type Bloc = 'all' | 'west' | 'east' | 'neutral'
const ORDERS: Order[] = ['total', 'eco', 'mil', 'geo']
const ORDER_LABEL: Record<Order, string> = { total: 'כוח משיכה', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' }
const ORDER_SHORT: Record<Order, string> = { total: 'סה״כ', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו' }
const BLOCS: Bloc[] = ['all', 'west', 'east', 'neutral']
const BLOC_LABEL: Record<Bloc, string> = { all: 'הכל', west: 'מערב', east: 'מזרח', neutral: 'ניטרלי' }
// when ordered by an axis, rings become rank-quantiles rather than the curated tier bands
const QUANTILE_LABEL = ['המובילים', 'חזקים', 'בינוניים', 'חלשים', 'שוליים']
const RANK_BANDS = [0.26, 0.47, 0.65, 0.81, 0.96]
// sandbox slider defaults (unnormalised) — mirror the canonical WEIGHTS .36/.34/.30
const DEFAULT_RAW = { eco: 36, mil: 34, geo: 30 }
const SB_AXES: { k: 'eco' | 'mil' | 'geo'; he: string }[] = [{ k: 'eco', he: 'כלכלי' }, { k: 'mil', he: 'צבאי' }, { k: 'geo', he: 'גאו' }]
// the value a body is ranked / sized by, on a shared 0–100 scale. `total` reads the (possibly
// scenario-reweighted) gravity map so the Scenario Sandbox re-equilibrates the field live.
const metricVal = (e: typeof NODES[number], ord: Order, grav: Map<string, GravityResult>) =>
  (ord === 'total' ? (grav.get(e.id)?.power ?? 0) : (FORCES[e.id]?.[ord] ?? 0) * 10)
const passesBloc = (id: string, bloc: Bloc) => bloc === 'all' || (AXIS[id] ?? 'none') === bloc

// cursor reactivity tuning (field units)
const REACT_R = 210   // how far the cursor's pull reaches
const MAX_NUDGE = 13  // how far a star drifts toward the cursor (slight)
const NEAR_R = 76     // within this, a star is "picked up" → highlighted + named
const ZOOM_NAMES_AT = 1.8 // +80% zoom → names cascade in by rank

// `grav` is the live (possibly scenario-reweighted) map, so the panel stays consistent with the
// constellation: score, backing and rank all reflect the current weights.
function buildForceDetail(id: string | null, grav: Map<string, GravityResult>): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id); if (!e) return null
  const g = grav.get(id)
  const d = DATA[id]
  const score = g ? g.gravity : forceScore(e.power)
  const backing = g && g.patron && g.backing > 0
    ? { amount: Math.round(g.backing * 10), patronHe: byId.get(g.patron)?.he ?? g.patron }
    : null
  const rank = [...NODES].sort((a, b) => (grav.get(b.id)?.power ?? 0) - (grav.get(a.id)?.power ?? 0))
    .findIndex((n) => n.id === id) + 1
  return {
    id,
    he: e.he, power: g ? g.power : e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: null, relations: [],
    scoreLabel: `${score.toFixed(1)} / 10`, forces: FORCES[id], powerNotes: POWER_NOTES[id],
    rank, total: NODES.length,
    backing,
    prov: d?.prov,
    flags: d?.flags,
    components: g ? { base: g.base, intrinsic: g.intrinsic, backing: g.backing, gravity: g.gravity, stability: g.stability } : undefined,
  }
}

export default function ForcesView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [namesOff, setNamesOff] = useState(false)          // manual "clean visuals" toggle
  const [proximal, setProximal] = useState<string | null>(null) // nearest star to the cursor
  const [orderBy, setOrderBy] = useState<Order>('total')   // rank/size metric: total or one axis
  const [filterBloc, setFilterBloc] = useState<Bloc>('all') // show only one bloc
  const [minScore, setMinScore] = useState(0)               // threshold: hide bodies below this on the active metric

  // Scenario Sandbox — live axis weights; the gravity map recomputes and the field re-equilibrates
  const weights = useWeights()
  const grav = useMemo(() => computeGravities(BODY_INPUTS, weights), [weights])
  const scenario = !isDefaultWeights(weights)
  const [sbOpen, setSbOpen] = useState(false)
  const [raw, setRaw] = useState(DEFAULT_RAW) // unnormalised slider values (eco/mil/geo)
  useEffect(() => {
    const sum = raw.eco + raw.mil + raw.geo || 1
    weightsStore.set({ eco: raw.eco / sum, mil: raw.mil / sum, geo: raw.geo / sum })
  }, [raw])
  useEffect(() => () => weightsStore.reset(), []) // restore the canonical model when leaving forces
  const toggleSandbox = () => { sound.play('tab'); setSbOpen((o) => { if (o) setRaw(DEFAULT_RAW); else setOrderBy('total'); return !o }) }
  const normW = (() => { const s = raw.eco + raw.mil + raw.geo || 1; return { eco: raw.eco / s, mil: raw.mil / s, geo: raw.geo / s } })()
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
    if (!w || !h) return { nodes: [] as any[], rings: [] as { k: string; r: number; label: string }[], cx: 0, cy: 0 }
    const cx = w / 2, cy = h / 2, halfMin = Math.min(w, h) / 2
    const nodes: { e: typeof NODES[number]; x: number; y: number; d: number }[] = []
    const vis = NODES.filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
    const sizeOf = (e: typeof NODES[number]) => Math.max(8, Math.min(66, powerSize(metricVal(e, orderBy, grav)) * 0.5))
    let rings: { k: string; r: number; label: string }[]

    if (orderBy === 'total') {
      // curated tier bands (the default look): each band's bodies placed by rank, phase-staggered
      rings = BANDS.map((k) => ({ k, r: BAND_R[k] * halfMin, label: TIER_LABEL[k] }))
      const BAND_PHASE: Record<string, number> = { great: 0, regional: 0.55, intermediate: 0.25, edge: 0.8, nonstate: 0.45 }
      for (const kind of BANDS) {
        const items = vis.filter((n) => n.kind === kind).sort((a, b) => b.power - a.power)
        const R = BAND_R[kind] * halfMin
        items.forEach((e, i) => {
          const ang = -Math.PI / 2 + BAND_PHASE[kind] + (i / Math.max(1, items.length)) * TAU
          nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: sizeOf(e) })
        })
      }
    } else {
      // ordered by an axis → rings become rank-quantiles: strongest-on-this-axis toward the centre
      const sorted = [...vis].sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav))
      const per = Math.max(1, Math.ceil(sorted.length / 5))
      rings = RANK_BANDS.map((rr, qi) => ({ k: `q${qi}`, r: rr * halfMin, label: QUANTILE_LABEL[qi] }))
      sorted.forEach((e, idx) => {
        const qi = Math.min(4, Math.floor(idx / per))
        const within = idx - qi * per
        const groupSize = Math.min(per, sorted.length - qi * per)
        const ang = -Math.PI / 2 + qi * 0.4 + (within / Math.max(1, groupSize)) * TAU
        const R = RANK_BANDS[qi] * halfMin
        nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: sizeOf(e) })
      })
    }
    return { nodes, rings, cx, cy }
  }, [size, orderBy, filterBloc, minScore, grav])

  // keep the cursor-reaction lookup table in sync with the laid-out positions
  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>()
    layout.nodes.forEach((n) => m.set(n.e.id, { x: n.x, y: n.y }))
    posRef.current = m
  }, [layout])

  // the gravity index, re-ranked by the active metric and filtered by bloc + threshold
  const ranked = useMemo(
    () => NODES
      .filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
      .sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)),
    [orderBy, filterBloc, minScore, grav],
  )

  const focus = selected ?? hovered ?? proximal
  const zoomNames = cam.z >= ZOOM_NAMES_AT
  const detail = useMemo(() => buildForceDetail(selected, grav), [selected, grav])
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
            <span className="forces-ring__label">{ring.label}</span>
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
              <span className="fnode__score">{(metricVal(e, orderBy, grav) / 10).toFixed(1)}</span>
            </div>
          )
        })}
       </div>
      </div>
      {/* arrangement controls — order the field by an axis, filter by bloc */}
      <div className="forcesctl" dir="rtl">
        <div className="forcesctl__group" role="group" aria-label="מיון">
          <span className="forcesctl__lbl">מיון</span>
          {ORDERS.map((o) => (
            <button
              key={o}
              className={`forcesctl__opt${orderBy === o ? ' is-on' : ''}`}
              onClick={() => { sound.play('tab'); setOrderBy(o) }}
              aria-pressed={orderBy === o}
            >{ORDER_SHORT[o]}</button>
          ))}
        </div>
        <div className="forcesctl__group" role="group" aria-label="סינון לפי גוש">
          <span className="forcesctl__lbl">גוש</span>
          {BLOCS.map((bl) => (
            <button
              key={bl}
              className={`forcesctl__opt${filterBloc === bl ? ' is-on' : ''}`}
              onClick={() => { sound.play('tab'); setFilterBloc(bl) }}
              aria-pressed={filterBloc === bl}
            >{BLOC_LABEL[bl]}</button>
          ))}
        </div>
        <div className="forcesctl__group forcesctl__group--slider">
          <span className="forcesctl__lbl">סף ≥ {minScore}</span>
          <input
            className="forcesctl__slider" type="range" min={0} max={9} step={1} value={minScore} dir="ltr"
            onChange={(e) => setMinScore(Number(e.target.value))}
            aria-label={`סף ציון מינימלי ב${ORDER_LABEL[orderBy]}`}
          />
        </div>
        <button className={`forcesctl__sb${sbOpen ? ' is-on' : ''}${scenario ? ' has-scenario' : ''}`} onClick={toggleSandbox} aria-pressed={sbOpen} title="תרחיש — שינוי משקלי הצירים">
          <span aria-hidden>⚖︎</span> תרחיש
        </button>
      </div>
      {/* Scenario Sandbox — drag the axis weights; the gravity map re-equilibrates live */}
      {sbOpen && (
        <div className="sandbox" dir="rtl">
          <div className="sandbox__head">
            <span className="sandbox__title">תרחיש · משקלי הצירים</span>
            {scenario && <button className="sandbox__reset" onClick={() => setRaw(DEFAULT_RAW)}>איפוס</button>}
          </div>
          {SB_AXES.map(({ k, he }) => (
            <div className="sandbox__row" key={k}>
              <span className="sandbox__k">{he}</span>
              <input
                className="sandbox__slider" type="range" min={5} max={70} step={1} value={raw[k]} dir="ltr"
                onChange={(e) => setRaw((r) => ({ ...r, [k]: Number(e.target.value) }))}
                aria-label={`משקל ${he}`}
              />
              <span className="sandbox__v">{Math.round(normW[k] * 100)}%</span>
            </div>
          ))}
          <p className="sandbox__hint">גררו לשינוי המשקל היחסי — הדירוג והמפה (מיון "כוח משיכה") מתעדכנים מיידית.</p>
        </div>
      )}
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
              <span className="gindex__h">מדד {ORDER_LABEL[orderBy]}{filterBloc !== 'all' ? ` · ${BLOC_LABEL[filterBloc]}` : ''}{scenario && orderBy === 'total' ? ' · תרחיש' : ''}</span>
              {ranked.map((e, i) => (
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
                  <span className="gindex__bar"><i style={{ width: `${metricVal(e, orderBy, grav)}%` }} /></span>
                  <span className="gindex__score">{(metricVal(e, orderBy, grav) / 10).toFixed(1)}</span>
                </button>
              ))}
              {ranked.length === 0 && <p className="gindex__empty">אין גופים בגוש זה</p>}
            </div>
          </aside>
        )}
      </PanelDock>
      <TabBar view={view} onView={onView} />
    </div>
  )
}
