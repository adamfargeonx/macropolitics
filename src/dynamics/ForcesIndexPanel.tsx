import { useState, useRef, useLayoutEffect } from 'react'
import { type Year } from '../data/empirical'
import { NODES } from '../data/entities'
import { type GravityResult } from '../model/gravity'
import { sound } from '../sound'
import {
  metricVal, ORDERS, ORDER_SHORT, ORDER_LABEL, BLOC_LABEL, INDEX_PREVIEW_N,
  type Order, type Bloc,
} from './forces-model'

// ── Read-more text: only show the toggle when there's a CONSIDERABLE amount of extra text to
// reveal — never for a purely cosmetic few-word difference. Measures the real rendered overflow
// (collapsed clientHeight vs full scrollHeight) rather than guessing from word/char counts, since
// word count doesn't map cleanly to rendered line count with RTL Hebrew text. The threshold is
// expressed in line-heights (derived from the element's computed line-height), not raw pixels or
// words, so it stays meaningful across font-size contexts.
const OVERFLOW_LINES_THRESHOLD = 1 // hide the toggle unless collapsing would hide > ~1 extra line

export function ExpandableText({ text, className, textClassName, toggleClassName }: {
  text: string
  className?: string
  textClassName?: string
  toggleClassName?: string
}) {
  // NOTE: callers pass `key={...}` keyed on the entity/metric id, so switching to a new text
  // remounts this component fresh (open/hasOverflow both reset naturally) rather than needing
  // an effect to reset state — avoids a setState-in-effect lint violation.
  const [open, setOpen] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // measure against the COLLAPSED (clamped) box — scrollHeight is the full unclamped content
    // height, clientHeight is what's actually visible while clamped. If open, briefly we can't
    // measure the clamp directly, but clientHeight/scrollHeight remain stable across the toggle
    // since the clamp is CSS-only (line-clamp), so measuring while collapsed is sufficient; we
    // just don't re-measure while expanded (the collapsed metrics don't change).
    if (open) return
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18
    const overflowPx = el.scrollHeight - el.clientHeight
    setHasOverflow(overflowPx > lineHeight * OVERFLOW_LINES_THRESHOLD)
  }, [text, open])

  return (
    <div className={`panel__desc-wrap${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      <p ref={ref} className={`panel__desc-text${textClassName ? ` ${textClassName}` : ''}`}>
        {text}
      </p>
      {hasOverflow && (
        <button
          className={`panel__desc-toggle${toggleClassName ? ` ${toggleClassName}` : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '▲ פחות' : '▼ קרא עוד'}
        </button>
      )}
    </div>
  )
}

type ForcesIndexPanelProps = {
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
}

const METRIC_TITLE: Record<Order, string> = {
  total: 'כוח משיכה', eco: 'כוח כלכלי', mil: 'כוח צבאי', geo: 'כוח גאו-אסטרטגי',
}

const METRIC_DESC: Record<Order, string> = {
  total: 'כוח המשיכה — שקלול הכוח הכלכלי, הצבאי והגאו-אסטרטגי — הוא משקלו הפוליטי של כל גוף. קרוב יותר למרכז, גדול יותר — כבד יותר.',
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
  const { orderBy, filterBloc, year, scenario, grav, hovered, setHovered, onHoverId, onSelect, ranked, indexRows, showAllIndex, setShowAllIndex } = props
  return (
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
  )
}

export function ForcesIndexPanel(props: ForcesIndexPanelProps) {
  const { orderBy, setOrderBy, toolsOpen, setToolsOpen, stateActive, filterBloc, year, scenario, grav, hovered, setHovered, onHoverId, onSelect, ranked, indexRows, showAllIndex, setShowAllIndex } = props

  return (
    <aside className="panel" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      <h1 className="panel__title" key={orderBy}>{METRIC_TITLE[orderBy]}</h1>
      <ExpandableText
        key={`desc-${orderBy}`}
        text={METRIC_DESC[orderBy]}
        textClassName="panel__body panel__body--metric"
      />
      {/* unified controls — sort the index + open the tools disclosure */}
      <div className="gctl" role="group" aria-label="מיון וכלים">
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
        <button
          className={`gctl__tools${toolsOpen ? ' is-on' : ''}${stateActive ? ' has-state' : ''}`}
          onClick={() => { sound.play('tab'); setToolsOpen((v) => !v) }}
          aria-pressed={toolsOpen}
          title="סינון, ציר זמן, תרחיש"
        ><span aria-hidden>⚙</span> כלים</button>
      </div>
      <RankedList
        orderBy={orderBy} filterBloc={filterBloc} year={year} scenario={scenario} grav={grav}
        hovered={hovered} setHovered={setHovered} onHoverId={onHoverId} onSelect={onSelect}
        ranked={ranked} indexRows={indexRows} showAllIndex={showAllIndex} setShowAllIndex={setShowAllIndex}
      />
    </aside>
  )
}
