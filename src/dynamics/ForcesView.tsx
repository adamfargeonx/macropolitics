import { useEffect, useMemo, useState } from 'react'
import { NODES } from '../data/entities'
import { bodyInputsForYear, type Year } from '../data/empirical'
import { computeGravities } from '../model/gravity'
import { useWeights, weightsStore } from '../model/weights-store'
import { useYear, yearStore } from '../model/year-store'
import { useScenarioWeights } from './useScenario'
import { SidePanel, PanelDock } from './Chrome'
import { sound } from '../sound'
import { usePresence } from './usePresence'
import { ForcesTools } from './ForcesTools'
import { ForcesIndexPanel } from './ForcesIndexPanel'
import { ForcesSheet } from './ForcesSheet'
import {
  BLOC_LABEL, DEFAULT_RAW, INDEX_PREVIEW_N,
  metricVal, passesBloc, buildForceDetail,
  type Order, type Bloc,
} from './forces-model'

// Tracks the mobile (bottom-sheet) breakpoint so the map/list toggle only drives the sheet there.
function useIsMobile() {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(max-width: 768px)')
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

// The Forces page — a single committed reading: the horizontal force-field. States are luminous
// bodies sized by live gravity (mass = power), spread across the full width and sorted strong→weak.
// The canvas (ForcesSheet) owns hover/select; the SAME side panel + ranked index drive both.
export default function ForcesView() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [orderBy, setOrderBy] = useState<Order>('total')
  const [filterBloc, setFilterBloc] = useState<Bloc>('all')
  const [minScore, setMinScore] = useState(0)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [showAllIndex, setShowAllIndex] = useState(false)
  // mobile only: toggle the field (map) vs the ranked index (list) as the primary surface
  const [mobileMode, setMobileMode] = useState<'map' | 'list'>('map')
  // mobile only: a way to reach sort/filter from Map mode without switching to List —
  // peeks the same index sheet up over the field, then retracts
  const [controlsOpen, setControlsOpen] = useState(false)
  const isMobile = useIsMobile()

  const weights = useWeights()
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const { raw, setRaw, normW, scenario } = useScenarioWeights()
  useEffect(() => () => { weightsStore.reset(); yearStore.reset() }, [])

  // any non-default secondary filter — drives the breadcrumb
  const stateActive = filterBloc !== 'all' || minScore > 0 || year !== 2025 || scenario
  const resetAll = () => {
    setFilterBloc('all')
    setMinScore(0)
    setRaw(DEFAULT_RAW)
    yearStore.set(2025)
  }

  const ranked = useMemo(
    () => NODES
      .filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
      .sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)),
    [orderBy, filterBloc, minScore, grav],
  )
  const indexRows = showAllIndex ? ranked : ranked.slice(0, INDEX_PREVIEW_N)

  const detail = useMemo(() => buildForceDetail(selected, grav), [selected, grav])
  const tools = usePresence(toolsOpen) // keep the disclosure mounted through its exit animation

  return (
    <div
      className={`stage forces forces--m-${mobileMode}`}
      dir="rtl"
      onClick={() => { setSelected(null); setToolsOpen(false) }}
    >
      <ForcesSheet grav={grav} orderBy={orderBy} selected={selected} onSelect={setSelected} onHover={setHovered} />

      {/* mobile-only map/list switch — choose the field or the ranked index as the lead surface.
          A third "⚙" chip (map mode only) peeks the same index/sort/filter sheet up over the
          field without leaving Map — sort and filters stay reachable either way. */}
      <div className="forces-mswitch" role="tablist" aria-label="תצוגת מובייל" onClick={(e) => e.stopPropagation()}>
        <button role="tab" aria-selected={mobileMode === 'map'} className={`forces-mswitch__btn${mobileMode === 'map' ? ' is-on' : ''}`} onClick={() => { sound.play('tab'); setMobileMode('map'); setControlsOpen(false) }}>מפה</button>
        <button role="tab" aria-selected={mobileMode === 'list'} className={`forces-mswitch__btn${mobileMode === 'list' ? ' is-on' : ''}`} onClick={() => { sound.play('tab'); setMobileMode('list'); setControlsOpen(false) }}>רשימה</button>
        <button
          className={`forces-mswitch__gear${controlsOpen ? ' is-on' : ''}`}
          aria-label="מיון וסינון" title="מיון וסינון" aria-pressed={controlsOpen}
          onClick={() => { sound.play('tab'); setControlsOpen((v) => !v) }}
        ><span aria-hidden>⚙</span></button>
      </div>

      {/* ── Compound state breadcrumb — one-tap reset of all secondary filters ── */}
      {stateActive && !tools.mounted && !(isMobile && toolsOpen) && (
        <div className="forces-state" dir="rtl">
          {filterBloc !== 'all' && <span className="forces-state__tag">{BLOC_LABEL[filterBloc]}</span>}
          {minScore > 0 && <span className="forces-state__tag">סף≥{minScore}</span>}
          {year !== 2025 && <span className="forces-state__tag">{year}</span>}
          {scenario && <span className="forces-state__tag">תרחיש</span>}
          <button className="forces-state__reset" onClick={(ev) => { ev.stopPropagation(); resetAll() }}>× הכל</button>
        </div>
      )}

      {/* ── Tools disclosure — desktop only: a floating card over the canvas. On mobile the
          same control renders INLINE inside the sheet instead (see PanelDock below), so it
          expands in place rather than floating over — and overlapping — the sheet content. ── */}
      {!isMobile && tools.mounted && (
        <ForcesTools
          filterBloc={filterBloc} setFilterBloc={setFilterBloc}
          minScore={minScore} setMinScore={setMinScore}
          year={year} setYear={(y: Year) => yearStore.set(y)}
          raw={raw} setRaw={setRaw} normW={normW}
          scenario={scenario} stateActive={stateActive} exiting={tools.exiting}
          onResetAll={resetAll} onClose={() => setToolsOpen(false)}
        />
      )}

      <PanelDock
        forceOpen={isMobile ? (mobileMode === 'list' || !!selected || controlsOpen || toolsOpen) : undefined}
        forceClosed={isMobile && mobileMode === 'map' && !selected && !controlsOpen && !toolsOpen}
        onHandleClick={isMobile ? () => { setControlsOpen(false); setToolsOpen(false) } : undefined}
      >
        {selected ? (
          <SidePanel detail={detail} view="forces" onClose={() => setSelected(null)} />
        ) : isMobile && toolsOpen ? (
          <div className="forces-tools-mobile" dir="rtl">
            <button className="forces-tools-mobile__back" onClick={() => { sound.play('tab'); setToolsOpen(false) }}>‹ חזרה לרשימה</button>
            <ForcesTools
              filterBloc={filterBloc} setFilterBloc={setFilterBloc}
              minScore={minScore} setMinScore={setMinScore}
              year={year} setYear={(y: Year) => yearStore.set(y)}
              raw={raw} setRaw={setRaw} normW={normW}
              scenario={scenario} stateActive={stateActive}
              onResetAll={resetAll} onClose={() => setToolsOpen(false)}
            />
          </div>
        ) : (
          <ForcesIndexPanel
            orderBy={orderBy} setOrderBy={setOrderBy}
            toolsOpen={toolsOpen} setToolsOpen={setToolsOpen} stateActive={stateActive}
            filterBloc={filterBloc} year={year} scenario={scenario} grav={grav}
            hovered={hovered} setHovered={setHovered}
            onHoverId={(id) => setHovered(id)} onSelect={(id) => { setSelected(id); setHovered(null) }}
            ranked={ranked} indexRows={indexRows}
            showAllIndex={showAllIndex} setShowAllIndex={setShowAllIndex}
          />
        )}
      </PanelDock>
    </div>
  )
}
