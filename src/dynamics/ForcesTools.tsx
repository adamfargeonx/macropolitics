import { type Dispatch, type SetStateAction } from 'react'
import { type Year } from '../data/empirical'
import { NODES } from '../data/entities'
import { AXIS } from '../data/entities'
import { sound } from '../sound'
import { YearToggle, ScenarioSliders } from './ScenarioControls'
import {
  BLOCS, BLOC_LABEL,
  type Bloc, type Raw,
} from './forces-model'

const BLOC_COUNT: Record<Bloc, number> = {
  all: NODES.length,
  west: NODES.filter(n => AXIS[n.id] === 'west').length,
  east: NODES.filter(n => AXIS[n.id] === 'east').length,
  neutral: NODES.filter(n => AXIS[n.id] === 'neutral').length,
}

type ForcesToolsProps = {
  filterBloc: Bloc
  setFilterBloc: (b: Bloc) => void
  minScore: number
  setMinScore: (n: number) => void
  year: Year
  setYear: (y: Year) => void
  raw: Raw
  setRaw: Dispatch<SetStateAction<Raw>>
  normW: Raw
  scenario: boolean
  stateActive: boolean
  exiting?: boolean
  onResetAll: () => void
  onClose: () => void
}

// The "⚙ כלים" disclosure: bloc filter, threshold, year toggle, and the scenario weight sandbox.
export function ForcesTools(props: ForcesToolsProps) {
  const { filterBloc, setFilterBloc, minScore, setMinScore, year, setYear, raw, setRaw, normW, scenario, stateActive, exiting, onResetAll, onClose } = props
  return (
    <div className={`forcestools${exiting ? ' forcestools--out' : ''}`} dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      <div className="forcestools__row" role="group" aria-label="גוש">
        <span className="forcestools__lbl">גוש</span>
        {BLOCS.map((bl) => (
          <button key={bl} className={`forcesctl__opt${filterBloc === bl ? ' is-on' : ''}`}
            onClick={() => { sound.play('tab'); setFilterBloc(bl) }} aria-pressed={filterBloc === bl}>
            {BLOC_LABEL[bl]} ({BLOC_COUNT[bl]})
          </button>
        ))}
      </div>
      <div className="forcestools__row">
        <span className="forcestools__lbl">סף ≥ {minScore}</span>
        <input className="forcesctl__slider" type="range" min={0} max={9} step={1} value={minScore} dir="ltr"
          onChange={(e) => setMinScore(Number(e.target.value))} aria-label="סף ציון מינימלי" />
      </div>
      <YearToggle year={year} setYear={setYear} />
      <div className="forcestools__divider" />
      <ScenarioSliders raw={raw} setRaw={setRaw} normW={normW} scenario={scenario} />
      {year !== 2025 && (
        <p className="sandbox__hint forcestools__timenote">
          ציר זמן · {year}: כלכלה (IMF) וצבא (SIPRI) ממקור — גאוגרפיה ויציבות מוחזקות להווה
        </p>
      )}
      {stateActive && (
        <button className="forcestools__reset-all" onClick={() => { onResetAll(); onClose() }}>
          × איפוס כל הסינונים
        </button>
      )}
    </div>
  )
}
