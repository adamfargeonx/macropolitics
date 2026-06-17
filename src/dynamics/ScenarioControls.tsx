import { type Dispatch, type SetStateAction } from 'react'
import { type Year } from '../data/empirical'
import { sound } from '../sound'
import { SB_AXES, DEFAULT_RAW, type Raw } from './forces-model'

// Shared Time-Axis + Scenario-Sandbox controls, used by both the Forces tools panel and the
// Dynamics control surface. Presentational only — state lives in the caller (see useScenarioWeights).

const YEARS: Year[] = [2000, 2020, 2025]

// Time Axis — snapshot-year selector across the sourced keyframes.
export function YearToggle({ year, setYear }: { year: Year; setYear: (y: Year) => void }) {
  return (
    <div className="forcestools__row" role="group" aria-label="שנה">
      <span className="forcestools__lbl">שנה</span>
      {YEARS.map((y) => (
        <button
          key={y}
          className={`forcesctl__opt${year === y ? ' is-on' : ''}`}
          onClick={() => { sound.play('tab'); setYear(y) }}
          aria-pressed={year === y}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

// Scenario Sandbox — the three axis-weight sliders + reset-to-canon + a one-line hint.
export function ScenarioSliders({ raw, setRaw, normW, scenario }: {
  raw: Raw
  setRaw: Dispatch<SetStateAction<Raw>>
  normW: Raw
  scenario: boolean
}) {
  return (
    <>
      <div className="forcestools__row forcestools__row--head">
        <span className="forcestools__lbl forcestools__lbl--title">תרחיש · משקלי הצירים</span>
        {scenario && <button className="sandbox__reset" onClick={() => setRaw(DEFAULT_RAW)}>איפוס</button>}
      </div>
      {SB_AXES.map(({ k, he }) => (
        <div className="forcestools__row forcestools__row--slider" key={k}>
          <span className="sandbox__k">{he}</span>
          <input
            className="sandbox__slider"
            type="range"
            min={5}
            max={70}
            step={1}
            value={raw[k]}
            dir="ltr"
            onChange={(e) => setRaw((r) => ({ ...r, [k]: Number(e.target.value) }))}
            aria-label={`משקל ${he}`}
          />
          <span className="sandbox__v">{Math.round(normW[k] * 100)}%</span>
        </div>
      ))}
      <p className="sandbox__hint">גררו לשינוי המשקל — המודל מתעדכן מיידית.</p>
    </>
  )
}
