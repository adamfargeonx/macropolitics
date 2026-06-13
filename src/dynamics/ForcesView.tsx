import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, FORCES, POWER_NOTES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { DATA, BODY_INPUTS, bodyInputsForYear, type Year } from '../data/empirical'
import { computeGravities, type GravityResult } from '../model/gravity'
import { useWeights, weightsStore, isDefaultWeights } from '../model/weights-store'
import { useYear, yearStore } from '../model/year-store'
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

type Order = 'total' | 'eco' | 'mil' | 'geo'
type Bloc = 'all' | 'west' | 'east' | 'neutral'
const ORDERS: Order[] = ['total', 'eco', 'mil', 'geo']
const ORDER_LABEL: Record<Order, string> = { total: 'כוח משיכה', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' }
const ORDER_SHORT: Record<Order, string> = { total: 'סה״כ', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו' }
const BLOCS: Bloc[] = ['all', 'west', 'east', 'neutral']
const BLOC_LABEL: Record<Bloc, string> = { all: 'הכל', west: 'מערב', east: 'מזרח', neutral: 'ניטרלי' }
const QUANTILE_LABEL = ['המובילים', 'חזקים', 'בינוניים', 'חלשים', 'שוליים']
const RANK_BANDS = [0.26, 0.47, 0.65, 0.81, 0.96]
const DEFAULT_RAW = { eco: 36, mil: 34, geo: 30 }
const SB_AXES: { k: 'eco' | 'mil' | 'geo'; he: string }[] = [{ k: 'eco', he: 'כלכלי' }, { k: 'mil', he: 'צבאי' }, { k: 'geo', he: 'גאו' }]

const metricVal = (e: typeof NODES[number], ord: Order, grav: Map<string, GravityResult>) =>
  (ord === 'total' ? (grav.get(e.id)?.power ?? 0) : (FORCES[e.id]?.[ord] ?? 0) * 10)
const passesBloc = (id: string, bloc: Bloc) => bloc === 'all' || (AXIS[id] ?? 'none') === bloc

const REACT_R = 210
const MAX_NUDGE = 13
const NEAR_R = 76
const ZOOM_NAMES_AT = 1.8
// top-N bodies always show their names at rest (before zoom / hover)
const TOP_NAMES_N = 8
// index preview before "expand" is clicked
const INDEX_PREVIEW_N = 8

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
  const [namesOff, setNamesOff] = useState(false)
  const [proximal, setProximal] = useState<string | null>(null)
  const [orderBy, setOrderBy] = useState<Order>('total')
  const [filterBloc, setFilterBloc] = useState<Bloc>('all')
  const [minScore, setMinScore] = useState(0)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [showAllIndex, setShowAllIndex] = useState(false)

  const weights = useWeights()
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const scenario = !isDefaultWeights(weights)
  const [raw, setRaw] = useState(DEFAULT_RAW)
  useEffect(() => {
    const sum = raw.eco + raw.mil + raw.geo || 1
    weightsStore.set({ eco: raw.eco / sum, mil: raw.mil / sum, geo: raw.geo / sum })
  }, [raw])
  useEffect(() => () => { weightsStore.reset(); yearStore.reset() }, [])
  const normW = (() => { const s = raw.eco + raw.mil + raw.geo || 1; return { eco: raw.eco / s, mil: raw.mil / s, geo: raw.geo / s } })()

  // any non-default secondary filter — drives the breadcrumb
  const stateActive = filterBloc !== 'all' || minScore > 0 || year !== 2025 || scenario
  const resetAll = () => {
    setFilterBloc('all')
    setMinScore(0)
    setRaw(DEFAULT_RAW)
    yearStore.set(2025)
  }

  const proxRef = useRef<string | null>(null); proxRef.current = proximal
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const [cam, setCam] = useState({ z: 1, x: 0, y: 0 })
  const camRef = useRef(cam); camRef.current = cam
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const dragMoved = useRef(false)
  const clampZ = (z: number) => Math.min(3, Math.max(0.6, z))

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top
      setCam((c) => { const z = clampZ(c.z * (1 - e.deltaY * 0.0015)); const k = z / c.z; return { z, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k } })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', onWheel) }
  }, [])

  const onPanDown = (e: React.PointerEvent) => { drag.current = { sx: e.clientX, sy: e.clientY, px: camRef.current.x, py: camRef.current.y }; dragMoved.current = false }
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

  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>()
    layout.nodes.forEach((n) => m.set(n.e.id, { x: n.x, y: n.y }))
    posRef.current = m
  }, [layout])

  const ranked = useMemo(
    () => NODES
      .filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
      .sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)),
    [orderBy, filterBloc, minScore, grav],
  )

  // top-N by the active metric — names always visible on the constellation
  const topIds = useMemo(() => new Set(ranked.slice(0, TOP_NAMES_N).map((n) => n.id)), [ranked])
  const indexRows = showAllIndex ? ranked : ranked.slice(0, INDEX_PREVIEW_N)

  const focus = selected ?? hovered ?? proximal
  const zoomNames = cam.z >= ZOOM_NAMES_AT
  const detail = useMemo(() => buildForceDetail(selected, grav), [selected, grav])
  useDeCollide(fieldRef, '.fnode', '.fnode__name', focus, [size, hovered, selected, proximal])

  return (
    <div
      className={`stage forces${namesOff ? ' forces--clean' : ''}${zoomNames && !namesOff ? ' forces--names' : ''}`}
      dir="rtl"
      onClick={() => {
        if (dragMoved.current) { dragMoved.current = false; return }
        setSelected(null)
        setToolsOpen(false)
      }}
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
        {layout.rings.map((ring) => (
          <div key={ring.k} className="forces-ring" style={{ width: ring.r * 2, height: ring.r * 2, left: layout.cx, top: layout.cy }}>
            <span className="forces-ring__label">{ring.label}</span>
          </div>
        ))}
        {layout.nodes.map(({ e, x, y, d }, i) => {
          const isFocus = e.id === focus
          const dim = focus && !isFocus
          const nonstate = e.kind === 'nonstate'
          const rim = AXIS_RIM[AXIS[e.id] ?? 'none']
          const isTop = topIds.has(e.id)
          return (
            <div
              key={e.id}
              data-id={e.id}
              data-power={e.power}
              className={`fnode${isTop ? ' fnode--toplabel' : ''}${nonstate ? ' fnode--ns' : ''}${isFocus ? ' fnode--focus' : ''}${dim ? ' fnode--dim' : ''}`}
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

      {/* ── Primary controls: order-by (always visible) + tools disclosure ── */}
      <div className="forcesctl" dir="rtl">
        <div className="forcesctl__group" role="group" aria-label="מיון">
          <span className="forcesctl__lbl">מיון</span>
          {ORDERS.map((o) => (
            <button
              key={o}
              className={`forcesctl__opt${orderBy === o ? ' is-on' : ''}`}
              onClick={(ev) => { ev.stopPropagation(); sound.play('tab'); setOrderBy(o) }}
              aria-pressed={orderBy === o}
            >{ORDER_SHORT[o]}</button>
          ))}
        </div>
        <button
          className={`forcesctl__tools${toolsOpen ? ' is-on' : ''}${stateActive ? ' has-state' : ''}`}
          onClick={(ev) => { ev.stopPropagation(); sound.play('tab'); setToolsOpen((o) => !o) }}
          aria-pressed={toolsOpen}
          title="סינון, ציר זמן, תרחיש"
        >
          <span aria-hidden>⚙</span> כלים
          {stateActive && !toolsOpen && <span className="forcesctl__tools-badge" aria-hidden />}
        </button>
      </div>

      {/* ── Compound state breadcrumb — one-tap reset of all secondary filters ── */}
      {stateActive && !toolsOpen && (
        <div className="forces-state" dir="rtl">
          {filterBloc !== 'all' && <span className="forces-state__tag">{BLOC_LABEL[filterBloc]}</span>}
          {minScore > 0 && <span className="forces-state__tag">סף≥{minScore}</span>}
          {year !== 2025 && <span className="forces-state__tag">{year}</span>}
          {scenario && <span className="forces-state__tag">תרחיש</span>}
          <button className="forces-state__reset" onClick={(ev) => { ev.stopPropagation(); resetAll() }}>× הכל</button>
        </div>
      )}

      {/* ── Tools disclosure panel: bloc, threshold, year, scenario sandbox ── */}
      {toolsOpen && (
        <div className="forcestools" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
          <div className="forcestools__row" role="group" aria-label="גוש">
            <span className="forcestools__lbl">גוש</span>
            {BLOCS.map((bl) => (
              <button key={bl} className={`forcesctl__opt${filterBloc === bl ? ' is-on' : ''}`}
                onClick={() => { sound.play('tab'); setFilterBloc(bl) }} aria-pressed={filterBloc === bl}>
                {BLOC_LABEL[bl]}
              </button>
            ))}
          </div>
          <div className="forcestools__row">
            <span className="forcestools__lbl">סף ≥ {minScore}</span>
            <input className="forcesctl__slider" type="range" min={0} max={9} step={1} value={minScore} dir="ltr"
              onChange={(e) => setMinScore(Number(e.target.value))} aria-label="סף ציון מינימלי" />
          </div>
          <div className="forcestools__row" role="group" aria-label="שנה">
            <span className="forcestools__lbl">שנה</span>
            {([2020, 2025] as Year[]).map((y) => (
              <button key={y} className={`forcesctl__opt${year === y ? ' is-on' : ''}`}
                onClick={() => { sound.play('tab'); yearStore.set(y) }} aria-pressed={year === y}>{y}</button>
            ))}
          </div>
          <div className="forcestools__divider" />
          <div className="forcestools__row forcestools__row--head">
            <span className="forcestools__lbl forcestools__lbl--title">תרחיש · משקלי הצירים</span>
            {scenario && <button className="sandbox__reset" onClick={() => setRaw(DEFAULT_RAW)}>איפוס</button>}
          </div>
          {SB_AXES.map(({ k, he }) => (
            <div className="forcestools__row forcestools__row--slider" key={k}>
              <span className="sandbox__k">{he}</span>
              <input className="sandbox__slider" type="range" min={5} max={70} step={1} value={raw[k]} dir="ltr"
                onChange={(e) => setRaw((r) => ({ ...r, [k]: Number(e.target.value) }))} aria-label={`משקל ${he}`} />
              <span className="sandbox__v">{Math.round(normW[k] * 100)}%</span>
            </div>
          ))}
          <p className="sandbox__hint">גררו לשינוי המשקל — הדירוג מתעדכן מיידית.</p>
          {year !== 2025 && (
            <p className="sandbox__hint forcestools__timenote">
              ציר זמן · {year}: כלכלה (IMF) וצבא (SIPRI) ממקור — גאוגרפיה ויציבות מוחזקות להווה
            </p>
          )}
          {stateActive && (
            <button className="forcestools__reset-all" onClick={() => { resetAll(); setToolsOpen(false) }}>
              × איפוס כל הסינונים
            </button>
          )}
        </div>
      )}

      <div className="zoomctl" dir="ltr">
        <button onClick={() => zoomBy(1.25)} aria-label="התקרבות">+</button>
        <span className="zoomctl__val">{Math.round(cam.z * 100)}%</span>
        <button onClick={() => zoomBy(0.8)} aria-label="התרחקות">−</button>
        <button className="zoomctl__reset" onClick={resetCam} aria-label="איפוס">⟲</button>
      </div>
      <button
        className={`namestoggle${namesOff ? ' namestoggle--off' : ''}`}
        dir="rtl"
        onClick={() => setNamesOff((v) => !v)}
        aria-pressed={!namesOff}
        title={namesOff ? 'הצגת שמות ודירוגים' : 'הסתרת שמות ודירוגים'}
      >
        <span className="namestoggle__icon" aria-hidden>{namesOff ? '◍' : '◉'}</span>
        שמות
      </button>

      {/* ── Hint — visible until the user selects something for the first time ── */}
      {!selected && (
        <div className="forces-hint" dir="rtl" aria-live="polite">
          לחצו על גוף לפרטים · גרר לניווט
        </div>
      )}

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
              <span className="gindex__h">מדד {ORDER_LABEL[orderBy]}{filterBloc !== 'all' ? ` · ${BLOC_LABEL[filterBloc]}` : ''}{year !== 2025 ? ` · ${year}` : ''}{scenario && orderBy === 'total' ? ' · תרחיש' : ''}</span>
              {indexRows.map((e, i) => (
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
              {ranked.length > INDEX_PREVIEW_N && (
                <button className="gindex__more" onClick={() => setShowAllIndex((v) => !v)}>
                  {showAllIndex ? '▲ פחות' : `▼ כל הגופים (${ranked.length})`}
                </button>
              )}
            </div>
          </aside>
        )}
      </PanelDock>
      <TabBar view={view} onView={onView} />
    </div>
  )
}
