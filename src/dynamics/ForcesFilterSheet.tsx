import { type Dispatch, type SetStateAction } from 'react'
import { type Year } from '../data/empirical'
import { NODES, AXIS } from '../data/entities'
import { sound } from '../sound'
import { ScenarioSliders } from './ScenarioControls'
import {
  ORDERS, ORDER_LABEL, BLOCS, BLOC_LABEL, TIER_ANNOTS,
  type Order, type Bloc, type Raw,
} from './forces-model'

const BLOC_COUNT: Record<Bloc, number> = {
  all: NODES.length,
  west: NODES.filter((n) => AXIS[n.id] === 'west').length,
  east: NODES.filter((n) => AXIS[n.id] === 'east').length,
  neutral: NODES.filter((n) => AXIS[n.id] === 'neutral').length,
}
const YEARS: Year[] = [2025, 2020, 2000]

type Props = {
  orderBy: Order; setOrderBy: (o: Order) => void
  tierFocus: number; setTierFocus: (n: number) => void
  filterBloc: Bloc; setFilterBloc: (b: Bloc) => void
  minScore: number; setMinScore: (n: number) => void
  year: Year; setYear: (y: Year) => void
  raw: Raw; setRaw: Dispatch<SetStateAction<Raw>>
  normW: Raw; scenario: boolean
  stateActive: boolean
  onResetAll: () => void
  onClose: () => void
}

// One single-select list row — the replacement for every "row of tabs/pills" pattern in the
// mobile filter surface (sort, tier-focus, bloc, year all used to be separate chip rows
// standing on the screen at once; here they're sections in ONE settings-style sheet).
function Row({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button className={`ffilter__row${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="ffilter__row-lbl">{label}</span>
      {count != null && <span className="ffilter__row-count">{count}</span>}
      <span className="ffilter__row-check" aria-hidden>{on ? '✓' : ''}</span>
    </button>
  )
}

// The single entry point for every sort/filter/scenario control on mobile Forces — replaces
// the standing chip rows (sort tabs, tier tabs, bloc pills) with one full-screen settings-style
// sheet: pick, it applies live underneath, close when done. Nothing competes for space anymore.
export function ForcesFilterSheet(props: Props) {
  const {
    orderBy, setOrderBy, tierFocus, setTierFocus, filterBloc, setFilterBloc,
    minScore, setMinScore, year, setYear, raw, setRaw, normW, scenario,
    stateActive, onResetAll, onClose,
  } = props
  const pick = <T,>(fn: (v: T) => void, v: T) => { sound.play('tab'); fn(v) }
  return (
    <div className="ffilter-scrim" onClick={onClose}>
      <div className="ffilter" dir="rtl" role="dialog" aria-modal="true" aria-label="מיון וסינון" onClick={(e) => e.stopPropagation()}>
        <header className="ffilter__head">
          <h2 className="ffilter__title">מיון וסינון</h2>
          <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
        </header>

        <div className="ffilter__body">
          <section className="ffilter__group">
            <h3 className="ffilter__group-h">מיין לפי</h3>
            {ORDERS.map((o) => (
              <Row key={o} label={ORDER_LABEL[o]} on={orderBy === o} onClick={() => pick(setOrderBy, o)} />
            ))}
          </section>

          <section className="ffilter__group">
            <h3 className="ffilter__group-h">התמקדות בשכבת עוצמה</h3>
            <Row label="הכל" on={tierFocus === 0} onClick={() => pick(setTierFocus, 0)} />
            {TIER_ANNOTS.map((a) => (
              <Row key={a.stage} label={a.label} count={a.count} on={tierFocus === a.stage} onClick={() => pick(setTierFocus, a.stage)} />
            ))}
          </section>

          <section className="ffilter__group">
            <h3 className="ffilter__group-h">גוש</h3>
            {BLOCS.map((bl) => (
              <Row key={bl} label={BLOC_LABEL[bl]} count={BLOC_COUNT[bl]} on={filterBloc === bl} onClick={() => pick(setFilterBloc, bl)} />
            ))}
          </section>

          <section className="ffilter__group">
            <h3 className="ffilter__group-h">סף ציון ≥ {minScore}</h3>
            <input
              className="forcesctl__slider ffilter__slider" type="range" min={0} max={9} step={1} value={minScore} dir="ltr"
              onChange={(e) => setMinScore(Number(e.target.value))} aria-label="סף ציון מינימלי"
            />
          </section>

          <section className="ffilter__group">
            <h3 className="ffilter__group-h">ציר זמן</h3>
            {YEARS.map((y) => (
              <Row key={y} label={String(y)} on={year === y} onClick={() => pick(setYear, y)} />
            ))}
            {year !== 2025 && (
              <p className="sandbox__hint">ציר זמן · {year}: כלכלה (IMF) וצבא (SIPRI) ממקור — גאוגרפיה ויציבות מוחזקות להווה</p>
            )}
          </section>

          <section className="ffilter__group">
            <ScenarioSliders raw={raw} setRaw={setRaw} normW={normW} scenario={scenario} />
          </section>
        </div>

        <footer className="ffilter__foot">
          {stateActive && <button className="ffilter__reset" onClick={onResetAll}>איפוס כל הסינונים</button>}
          <button className="ffilter__apply" onClick={onClose}>סגירה</button>
        </footer>
      </div>
    </div>
  )
}
