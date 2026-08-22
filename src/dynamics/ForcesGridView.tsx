import { useEffect, useMemo, useState } from 'react'
import { NODES } from '../data/entities'
import { bodyInputsForYear } from '../data/empirical'
import { computeGravities } from '../model/gravity'
import { useWeights, weightsStore } from '../model/weights-store'
import { useYear, yearStore } from '../model/year-store'
import { useScenarioWeights } from './useScenario'
import { SidePanel, PanelDock } from './Chrome'
import { ForcesSheet } from './ForcesSheet'
import { ForcesIndexPanel } from './ForcesIndexPanel'
import {
  DEFAULT_RAW, INDEX_PREVIEW_N,
  metricVal, passesBloc, buildForceDetail,
  type Order, type Bloc,
} from './forces-model'

// ALTERNATE Forces screen — the counter-proposal to ForcesView, kept ALONGSIDE it (not replacing
// it) so the two compositions can be compared directly: /#/forces vs /#/forces-grid.
//
// The argument it makes, against the packed field's:
//   · the field packs bodies by bloc and lets RADIUS carry power permanently — the hierarchy is the
//     picture, and the weak states are literally specks;
//   · the grid gives every state an IDENTICAL cell at an IDENTICAL radius, ranked strongest→weakest
//     in RTL reading order, and states power only TEMPORALLY — a wave travels down the ranking,
//     swelling each body to its true power radius and surfacing its score for a beat before letting
//     it settle back into the uniform grid.
// Same data, opposite rhetoric: permanent-and-spatial vs. equal-at-rest-and-revealed-in-passing.
//
// Everything else is deliberately shared, not forked: the same canvas engine (ForcesSheet, with
// composition="grid"), the same scroll-tour guidance, the same side panel and ranked index, the
// same exit cascade. Only the composition and the panel's top block differ.
//
// Desktop-only for now — the mobile sheet/filter chrome stays with ForcesView until this
// composition is chosen; building a second mobile stack for a screen that may not survive the
// comparison is exactly the speculative work the project's own rules say not to do.
export default function ForcesGridView() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [orderBy, setOrderBy] = useState<Order>('total')
  const [filterBloc] = useState<Bloc>('all')
  const [minScore] = useState(0)
  const [showAllIndex, setShowAllIndex] = useState(false)

  const weights = useWeights()
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const { setRaw, scenario } = useScenarioWeights()
  useEffect(() => () => { weightsStore.reset(); yearStore.reset() }, [])
  // the tools sheet that owned these lives on the field screen; reset defensively on unmount so a
  // scenario left set here can't leak into the other composition
  useEffect(() => () => { setRaw(DEFAULT_RAW) }, [setRaw])

  const ranked = useMemo(
    () => NODES
      .filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
      .sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)),
    [orderBy, filterBloc, minScore, grav],
  )
  const indexRows = showAllIndex ? ranked : ranked.slice(0, INDEX_PREVIEW_N)
  const detail = useMemo(() => buildForceDetail(selected, grav), [selected, grav])

  return (
    <div className="stage forces forces--grid" dir="rtl" onClick={() => setSelected(null)}>
      <ForcesSheet
        composition="grid"
        grav={grav} orderBy={orderBy} filterBloc={filterBloc}
        selected={selected} onSelect={setSelected} onHover={setHovered}
      />

      <PanelDock>
        {selected ? (
          <SidePanel detail={detail} view="forces" onClose={() => setSelected(null)} />
        ) : (
          <ForcesIndexPanel
            compact composition="grid"
            orderBy={orderBy} setOrderBy={setOrderBy}
            toolsOpen={false} setToolsOpen={() => false} stateActive={false}
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
