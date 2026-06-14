import { type Dispatch, type SetStateAction } from 'react'
import { type Year } from '../data/empirical'
import { sound } from '../sound'
import {
  BLOCS, BLOC_LABEL, SB_AXES, DEFAULT_RAW,
  type Bloc, type Raw,
} from './forces-model'

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
  onResetAll: () => void
  onClose: () => void
}

// The "⚙ כלים" disclosure: bloc filter, threshold, year toggle, and the scenario weight sandbox.
export function ForcesTools(props: ForcesToolsProps) {
  const { filterBloc, setFilterBloc, minScore, setMinScore, year, setYear, raw, setRaw, normW, scenario, stateActive, onResetAll, onClose } = props
  return (
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
            onClick={() => { sound.play('tab'); setYear(y) }} aria-pressed={year === y}>{y}</button>
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
        <button className="forcestools__reset-all" onClick={() => { onResetAll(); onClose() }}>
          × איפוס כל הסינונים
        </button>
      )}
    </div>
  )
}
