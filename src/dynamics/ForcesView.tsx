import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, AXIS } from '../data/entities'
import { bodyInputsForYear, type Year } from '../data/empirical'
import { computeGravities } from '../model/gravity'
import { useWeights, weightsStore, isDefaultWeights } from '../model/weights-store'
import { useYear, yearStore } from '../model/year-store'
import { Header, SidePanel, PanelDock, TabBar, type View } from './Chrome'
import { useDeCollide } from './useDeCollide'
import { useForcesCamera } from './useForcesCamera'
import { ForcesTools } from './ForcesTools'
import { ForcesIndexPanel } from './ForcesIndexPanel'
import { sound } from '../sound'
import {
  AXIS_RIM, ORDERS, ORDER_SHORT, BLOC_LABEL, DEFAULT_RAW, RANK_OF,
  ZOOM_NAMES_AT, TOP_NAMES_N, INDEX_PREVIEW_N,
  metricVal, passesBloc, buildForceDetail, computeLayout,
  type Order, type Bloc, type Raw,
} from './forces-model'

export default function ForcesView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const { size, cam, proximal, isDragging, consumeDragMoved, fieldHandlers, zoomBy, resetCam } = useForcesCamera(fieldRef, posRef)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [namesOff, setNamesOff] = useState(false)
  const [orderBy, setOrderBy] = useState<Order>('total')
  const [filterBloc, setFilterBloc] = useState<Bloc>('all')
  const [minScore, setMinScore] = useState(0)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [showAllIndex, setShowAllIndex] = useState(false)

  const weights = useWeights()
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const scenario = !isDefaultWeights(weights)
  const [raw, setRaw] = useState<Raw>(DEFAULT_RAW)
  useEffect(() => {
    const sum = raw.eco + raw.mil + raw.geo || 1
    weightsStore.set({ eco: raw.eco / sum, mil: raw.mil / sum, geo: raw.geo / sum })
  }, [raw])
  useEffect(() => () => { weightsStore.reset(); yearStore.reset() }, [])
  const normW: Raw = useMemo(() => { const s = raw.eco + raw.mil + raw.geo || 1; return { eco: raw.eco / s, mil: raw.mil / s, geo: raw.geo / s } }, [raw])

  // any non-default secondary filter — drives the breadcrumb
  const stateActive = filterBloc !== 'all' || minScore > 0 || year !== 2025 || scenario
  const resetAll = () => {
    setFilterBloc('all')
    setMinScore(0)
    setRaw(DEFAULT_RAW)
    yearStore.set(2025)
  }

  const layout = useMemo(
    () => computeLayout(size, orderBy, filterBloc, minScore, grav),
    [size, orderBy, filterBloc, minScore, grav],
  )

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
        if (consumeDragMoved()) return
        setSelected(null)
        setToolsOpen(false)
      }}
    >
      <div
        className={`forces-field${isDragging ? ' forces-field--grab' : ''}`}
        ref={fieldRef}
        {...fieldHandlers}
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
              role="button"
              tabIndex={0}
              aria-label={`${e.he} — ${(metricVal(e, orderBy, grav) / 10).toFixed(1)}`}
              aria-pressed={e.id === selected}
              className={`fnode${isTop ? ' fnode--toplabel' : ''}${nonstate ? ' fnode--ns' : ''}${isFocus ? ' fnode--focus' : ''}${dim ? ' fnode--dim' : ''}`}
              style={{ left: x, top: y, '--fx': `${layout.cx - x}px`, '--fy': `${layout.cy - y}px`, '--rk': RANK_OF.get(e.id) ?? 0, animationDelay: `${0.15 + i * 0.035}s` } as React.CSSProperties}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
              onFocus={() => setHovered(e.id)}
              onBlur={() => setHovered((h) => (h === e.id ? null : h))}
              onClick={(ev) => { ev.stopPropagation(); setSelected((s) => (s === e.id ? null : e.id)) }}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); sound.play('tab'); setSelected((s) => (s === e.id ? null : e.id)) } }}
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
        <ForcesTools
          filterBloc={filterBloc} setFilterBloc={setFilterBloc}
          minScore={minScore} setMinScore={setMinScore}
          year={year} setYear={(y: Year) => yearStore.set(y)}
          raw={raw} setRaw={setRaw} normW={normW}
          scenario={scenario} stateActive={stateActive}
          onResetAll={resetAll} onClose={() => setToolsOpen(false)}
        />
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
          <ForcesIndexPanel
            orderBy={orderBy} filterBloc={filterBloc} year={year} scenario={scenario} grav={grav}
            hovered={hovered} setHovered={setHovered}
            onHoverId={(id) => setHovered(id)} onSelect={(id) => setSelected(id)}
            ranked={ranked} indexRows={indexRows}
            showAllIndex={showAllIndex} setShowAllIndex={setShowAllIndex}
          />
        )}
      </PanelDock>
      <TabBar view={view} onView={onView} />
    </div>
  )
}
