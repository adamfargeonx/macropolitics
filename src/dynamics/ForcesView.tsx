import { useEffect, useMemo, useState } from 'react'
import { NODES } from '../data/entities'
import { bodyInputsForYear, type Year } from '../data/empirical'
import { computeGravities } from '../model/gravity'
import { useWeights, weightsStore } from '../model/weights-store'
import { useYear, yearStore } from '../model/year-store'
import { useScenarioWeights } from './useScenario'
import { SidePanel, PanelDock } from './Chrome'
import { usePresence } from './usePresence'
import { ForcesTools } from './ForcesTools'
import { ForcesIndexPanel, RankedList } from './ForcesIndexPanel'
import { ForcesSheet } from './ForcesSheet'
import { ForcesMobileSheet } from './ForcesMobileSheet'
import { ForcesFilterSheet } from './ForcesFilterSheet'
import {
  BLOC_LABEL, DEFAULT_RAW, INDEX_PREVIEW_N, ORDER_LABEL,
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
//
// Mobile structure: ONE draggable sheet (ForcesMobileSheet) instead of competing bands of chrome
// (a map/list mode switch, a separate controls-open toggle, a floating tools card, a floating
// breadcrumb all used to stack up at once). ONE filter entry point (ForcesFilterSheet) replaces
// every standing row of sort/tier/bloc chips with a single settings-style sheet. Desktop is
// untouched — it keeps the side panel + floating tools disclosure as before.
export default function ForcesView() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [orderBy, setOrderBy] = useState<Order>('total')
  const [filterBloc, setFilterBloc] = useState<Bloc>('all')
  const [minScore, setMinScore] = useState(0)
  const [toolsOpen, setToolsOpen] = useState(false) // desktop-only floating disclosure
  const [showAllIndex, setShowAllIndex] = useState(false)
  // mobile only: which tier the field is focused on (0 = all) — set from the filter sheet,
  // replacing the old on-canvas tier-chip row
  const [tierFocus, setTierFocus] = useState(0)
  // mobile only: the single consolidated sort/filter sheet
  const [filterOpen, setFilterOpen] = useState(false)
  const isMobile = useIsMobile()

  const weights = useWeights()
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const { raw, setRaw, normW, scenario } = useScenarioWeights()
  useEffect(() => () => { weightsStore.reset(); yearStore.reset() }, [])

  // any non-default secondary filter — drives the breadcrumb (desktop) / the filter button's
  // active state (mobile)
  const stateActive = filterBloc !== 'all' || minScore > 0 || year !== 2025 || scenario
  const filterActive = stateActive || tierFocus !== 0
  const resetAll = () => {
    setFilterBloc('all')
    setMinScore(0)
    setRaw(DEFAULT_RAW)
    yearStore.set(2025)
    setTierFocus(0)
  }

  const ranked = useMemo(
    () => NODES
      .filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
      .sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)),
    [orderBy, filterBloc, minScore, grav],
  )
  const indexRows = showAllIndex ? ranked : ranked.slice(0, INDEX_PREVIEW_N)

  const detail = useMemo(() => buildForceDetail(selected, grav), [selected, grav])
  const tools = usePresence(toolsOpen) // keep the desktop disclosure mounted through its exit animation

  const summary = selected && detail
    ? `${detail.he} · ${detail.scoreLabel ?? detail.power}`
    : `${ranked.length} גופים · מיון: ${ORDER_LABEL[orderBy]}`

  return (
    <div
      className="stage forces"
      dir="rtl"
      onClick={() => { setSelected(null); setToolsOpen(false) }}
    >
      <ForcesSheet
        grav={grav} orderBy={orderBy} selected={selected} onSelect={setSelected} onHover={setHovered}
        tierFocus={isMobile ? tierFocus : undefined}
      />

      {!isMobile && (
        <>
          {/* ── Compound state breadcrumb — one-tap reset of all secondary filters ── */}
          {stateActive && !tools.mounted && (
            <div className="forces-state" dir="rtl">
              {filterBloc !== 'all' && <span className="forces-state__tag">{BLOC_LABEL[filterBloc]}</span>}
              {minScore > 0 && <span className="forces-state__tag">סף≥{minScore}</span>}
              {year !== 2025 && <span className="forces-state__tag">{year}</span>}
              {scenario && <span className="forces-state__tag">תרחיש</span>}
              <button className="forces-state__reset" onClick={(ev) => { ev.stopPropagation(); resetAll() }}>× הכל</button>
            </div>
          )}

          {/* ── Tools disclosure — a floating card over the canvas ── */}
          {tools.mounted && (
            <ForcesTools
              filterBloc={filterBloc} setFilterBloc={setFilterBloc}
              minScore={minScore} setMinScore={setMinScore}
              year={year} setYear={(y: Year) => yearStore.set(y)}
              raw={raw} setRaw={setRaw} normW={normW}
              scenario={scenario} stateActive={stateActive} exiting={tools.exiting}
              onResetAll={resetAll} onClose={() => setToolsOpen(false)}
            />
          )}

          <PanelDock>
            {selected ? (
              <SidePanel detail={detail} view="forces" onClose={() => setSelected(null)} />
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
        </>
      )}

      {isMobile && (
        <>
          <ForcesMobileSheet
            summary={summary}
            onFilterClick={() => setFilterOpen(true)}
            filterActive={filterActive}
            minSnap={selected ? 'half' : undefined}
          >
            {selected ? (
              <SidePanel detail={detail} view="forces" onClose={() => setSelected(null)} />
            ) : (
              <RankedList
                orderBy={orderBy} filterBloc={filterBloc} year={year} scenario={scenario} grav={grav}
                hovered={hovered} setHovered={setHovered}
                onHoverId={(id) => setHovered(id)} onSelect={(id) => { setSelected(id); setHovered(null) }}
                ranked={ranked} indexRows={indexRows}
                showAllIndex={showAllIndex} setShowAllIndex={setShowAllIndex}
              />
            )}
          </ForcesMobileSheet>

          {filterOpen && (
            <ForcesFilterSheet
              orderBy={orderBy} setOrderBy={setOrderBy}
              tierFocus={tierFocus} setTierFocus={setTierFocus}
              filterBloc={filterBloc} setFilterBloc={setFilterBloc}
              minScore={minScore} setMinScore={setMinScore}
              year={year} setYear={(y: Year) => yearStore.set(y)}
              raw={raw} setRaw={setRaw} normW={normW} scenario={scenario}
              stateActive={filterActive}
              onResetAll={resetAll}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
