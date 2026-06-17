import { useState } from 'react'
import { useYear, yearStore } from '../model/year-store'
import { DEFAULT_RAW } from './forces-model'
import { YearToggle, ScenarioSliders } from './ScenarioControls'
import { useScenarioWeights } from './useScenario'
import { usePresence } from './usePresence'
import { sound } from '../sound'

// Dynamics control surface — brings the Time Axis + Scenario Sandbox onto the synthesis view itself
// (they used to be reachable only from the Forces tools panel). A top-centre trigger opens a panel
// that reuses the shared controls + the .forcestools styling, so it reads as the same instrument.
// The dot lights when the model is off reality; the panel offers a one-tap "back to reality".
export function DynamicsControls() {
  const year = useYear()
  const { raw, setRaw, normW, scenario } = useScenarioWeights()
  const [open, setOpen] = useState(false)
  const panel = usePresence(open)
  const active = year !== 2025 || scenario
  const resetReality = () => { setRaw(DEFAULT_RAW); yearStore.set(2025) }

  return (
    <div className="dynctl" dir="rtl">
      <button
        className={`dynctl__trigger${open ? ' is-open' : ''}${active ? ' is-on' : ''}`}
        onClick={() => { sound.play('tab'); setOpen((o) => !o) }}
        aria-expanded={open}
      >
        <span className="dynctl__dot" aria-hidden />
        ציר זמן · תרחיש
        {active && !open && <span className="dynctl__tag">{scenario ? 'תרחיש' : year}</span>}
      </button>

      {panel.mounted && (
        <div className={`forcestools${panel.exiting ? ' forcestools--out' : ''}`} dir="rtl">
          <YearToggle year={year} setYear={(y) => yearStore.set(y)} />
          <div className="forcestools__divider" />
          <ScenarioSliders raw={raw} setRaw={setRaw} normW={normW} scenario={scenario} />
          {year !== 2025 && (
            <p className="sandbox__hint forcestools__timenote">
              ציר זמן · {year}: כלכלה (IMF) וצבא (SIPRI) ממקור — גאוגרפיה ויציבות מוחזקות להווה
            </p>
          )}
          {active && (
            <button className="forcestools__reset-all" onClick={() => { resetReality(); setOpen(false) }}>
              × חזרה למציאות
            </button>
          )}
        </div>
      )}
    </div>
  )
}
