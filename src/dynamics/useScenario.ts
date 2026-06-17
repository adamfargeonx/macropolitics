import { useEffect, useMemo, useState } from 'react'
import { weightsStore, isDefaultWeights, useWeights } from '../model/weights-store'
import { DEFAULT_RAW, type Raw } from './forces-model'

// Scenario Sandbox weight-state — shared by the Forces and Dynamics lenses (only one is mounted at
// a time). Holds the raw 0–70 slider values, normalizes them to weights that sum to 1, and pushes
// them into the global weightsStore so every reader recomputes. `scenario` is true whenever the
// active weights differ from canon. Callers own the reset-on-unmount (each lens leaves at reality).
export function useScenarioWeights() {
  const [raw, setRaw] = useState<Raw>(DEFAULT_RAW)
  useEffect(() => {
    const sum = raw.eco + raw.mil + raw.geo || 1
    weightsStore.set({ eco: raw.eco / sum, mil: raw.mil / sum, geo: raw.geo / sum })
  }, [raw])
  const normW: Raw = useMemo(() => {
    const s = raw.eco + raw.mil + raw.geo || 1
    return { eco: raw.eco / s, mil: raw.mil / s, geo: raw.geo / s }
  }, [raw])
  const scenario = !isDefaultWeights(useWeights())
  return { raw, setRaw, normW, scenario }
}
