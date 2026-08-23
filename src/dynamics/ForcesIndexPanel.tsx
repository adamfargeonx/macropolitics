import { type Year } from '../data/empirical'
import { NODES } from '../data/entities'
import { type GravityResult } from '../model/gravity'
import { sound } from '../sound'
import {
  metricVal, ORDERS, ORDER_SHORT, ORDER_LABEL, BLOC_LABEL,
  type Order, type Bloc,
} from './forces-model'
import { INDEX_BEAT } from './panel-beats'
import { LetterSwap } from './PanelMotion'
import { Words } from './Words'

export type ForcesIndexPanelProps = {
  orderBy: Order
  setOrderBy: (o: Order) => void
  toolsOpen: boolean
  setToolsOpen: (fn: (v: boolean) => boolean) => void
  stateActive: boolean
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
  /** Drop the panel's top block (metric title + description) — the grid screen's composition
   *  leads with the field itself, so the explanatory header is dead weight there. */
  compact?: boolean
  /** Which forces composition is on screen. When set, the control row grows a toggle that flips
   *  between the packed field and the alternate ranked grid, so the two can be compared without
   *  hand-editing the URL. Omit to hide the toggle entirely (retires the experiment). */
  composition?: 'field' | 'grid'
}

const METRIC_TITLE: Record<Order, string> = {
  total: 'כוח משיכה', eco: 'כוח כלכלי', mil: 'כוח צבאי', geo: 'כוח גאו-אסטרטגי',
}

const METRIC_DESC: Record<Order, string> = {
  total: 'כוח המשיכה — שקלול הכוח הכלכלי, הצבאי והגאו-אסטרטגי, שהוא משקלו הפוליטי של כל גוף. קרוב יותר למרכז, גדול וכבד יותר.',
  eco:   'כוח כלכלי — תמ״ג, סחר, פיננסים ומשקל בשרשראות האספקה הגלובליות. כלכלה חזקה מאפשרת לממן כוח צבאי ולהניע השפעה מדינית.',
  mil:   'כוח צבאי — הוצאות ביטחון, יכולות טכנולוגיות, כוח אש ורוחב הנוכחות הצבאית. עוצמה קינטית שמכריעה ומרתיעה.',
  geo:   'כוח גאו-אסטרטגי — מיקום, משאבים טבעיים, בריתות ועומק השפעה אזורית. מציאות שאי אפשר לקנות ולא ניתן לשנות.',
}

type RankedListProps = {
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

// The ranked ledger itself — shared by the desktop side panel (below) and the mobile sheet
// (ForcesMobileSheet), so the row markup/behaviour lives in exactly one place.
export function RankedList(props: RankedListProps) {
  const { orderBy, filterBloc, year, scenario, grav, hovered, setHovered, onHoverId, onSelect, ranked } = props
  // Default = the FULL ranked ledger. The panel fills the available height and scrolls
  // internally (see the .panel/.panelb height rule), so there is no preview/expand step.
  return (
    <div className="gindex">
      <span className="gindex__h" style={{ animationDelay: `${INDEX_BEAT.listHeader}s` }}>מדד {ORDER_LABEL[orderBy]}{filterBloc !== 'all' ? ` · ${BLOC_LABEL[filterBloc]}` : ''}{year !== 2025 ? ` · ${year}` : ''}{scenario && orderBy === 'total' ? ' · תרחיש' : ''}</span>
      {ranked.map((e, i) => (
        <button
          key={e.id}
          className={`gindex__row${e.kind === 'nonstate' ? ' gindex__row--ns' : ''}${e.id === hovered ? ' gindex__row--lit' : ''}`}
          style={{ animationDelay: `${Math.min(INDEX_BEAT.rowsStart + i * INDEX_BEAT.rowStep, INDEX_BEAT.rowsStart + 1.1)}s` }}
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
    </div>
  )
}

// Content only — no outer <aside>. Mounted inside the shared PanelFrame shell (Chrome.tsx) so it
// swaps in and out of the SAME persistent panel box a selected body's detail also lives in,
// instead of owning its own <aside> that would remount the whole shell on every ranked-list ⇄
// detail toggle (see PanelFrame's own comment for why that mattered).
export function ForcesIndexPanel(props: ForcesIndexPanelProps) {
  // toolsOpen / setToolsOpen / stateActive are still in the props type (ForcesView owns that
  // state and the ForcesTools sheet it drives) but this panel no longer renders a trigger for
  // them — the ⚙ כלים button was removed and מקרא took its slot. See the note in ForcesView.
  const { orderBy, setOrderBy, filterBloc, year, scenario, grav, hovered, setHovered, onHoverId, onSelect, ranked, indexRows, showAllIndex, setShowAllIndex, compact, composition } = props

  return (
    <>
      {!compact && (
        <h1 className="panel__title" style={{ animationDelay: `${INDEX_BEAT.title}s` }}>
          <LetterSwap text={METRIC_TITLE[orderBy]} />
        </h1>
      )}
      {/* short (1–2 line) metric description — shown in full, no read-more toggle. Same Words
          per-word rise every other body-text line on the site uses, not a plain block fade. */}
      {!compact && (
        <p className="panel__body panel__body--metric" style={{ animationDelay: `${INDEX_BEAT.desc}s` }}>
          <Words key={orderBy} text={METRIC_DESC[orderBy]} />
        </p>
      )}
      {/* unified controls — sort the index + open the tools disclosure */}
      <div className="gctl" role="group" aria-label="מיון וכלים" style={{ animationDelay: `${INDEX_BEAT.controls}s` }}>
        <span className="gctl__lbl">מיון</span>
        {ORDERS.map((o) => (
          <button
            key={o}
            className={`gctl__opt${orderBy === o ? ' is-on' : ''}`}
            onClick={() => { sound.play('tab'); setOrderBy(o) }}
            aria-pressed={orderBy === o}
          >
            <span>{ORDER_SHORT[o]}</span>
          </button>
        ))}
        {/* מקרא takes the slot the tools (⚙ כלים) button held — it moved out of the panel shell's
            floating corner button into the panel's own control row, where it sits with the sort
            controls instead of hovering beside the panel. */}
        <button
          className="gctl__legend"
          onClick={() => { sound.play('tab'); window.dispatchEvent(new Event('mp-legend')) }}
        >מקרא</button>
      </div>
      {/* composition A/B — names the OTHER composition (what you'd switch to), the same way a
          toggle labels its destination rather than its current state. */}
      {composition && (
        <button
          className="gctl__ab"
          style={{ animationDelay: `${INDEX_BEAT.ab}s` }}
          onClick={() => { sound.play('tab'); window.dispatchEvent(new Event('mp-forces-composition')) }}
        >{composition === 'grid' ? 'תצוגת שדה' : 'תצוגת רשת'}</button>
      )}
      <RankedList
        orderBy={orderBy} filterBloc={filterBloc} year={year} scenario={scenario} grav={grav}
        hovered={hovered} setHovered={setHovered} onHoverId={onHoverId} onSelect={onSelect}
        ranked={ranked} indexRows={indexRows} showAllIndex={showAllIndex} setShowAllIndex={setShowAllIndex}
      />
    </>
  )
}
