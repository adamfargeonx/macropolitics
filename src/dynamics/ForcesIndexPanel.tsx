import { type Year } from '../data/empirical'
import { NODES } from '../data/entities'
import { type GravityResult } from '../model/gravity'
import { Words } from './Words'
import {
  metricVal, ORDER_LABEL, BLOC_LABEL, INDEX_PREVIEW_N,
  type Order, type Bloc,
} from './forces-model'

type ForcesIndexPanelProps = {
  orderBy: Order
  filterBloc: Bloc
  year: Year
  scenario: boolean
  grav: Map<string, GravityResult>
  hovered: string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onHoverId: (id: string) => void
  onSelect: (id: string) => void
  ranked: typeof NODES[number][]
  indexRows: typeof NODES[number][]
  showAllIndex: boolean
  setShowAllIndex: (fn: (v: boolean) => boolean) => void
}

// The resting side panel: the thesis line + the ranked gravity index (map-linked rows).
export function ForcesIndexPanel(props: ForcesIndexPanelProps) {
  const { orderBy, filterBloc, year, scenario, grav, hovered, setHovered, onHoverId, onSelect, ranked, indexRows, showAllIndex, setShowAllIndex } = props
  return (
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
            onMouseEnter={() => onHoverId(e.id)}
            onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
            onClick={() => onSelect(e.id)}
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
  )
}
