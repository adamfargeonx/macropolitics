import { MIL_TREND, GDP_PPP } from '../data/empirical'
import type { Axis } from './evidence-data'

// Sourced 2020→2025 trend (eco GDP-PPP · mil spend) — a real temporal datapoint, read as a
// three-cell instrument plate (2020 / 2025 / % change) rather than one run-on line — borrowed from
// the "instrument" axis-panel mockup, which read as a genuine readout where the old inline line
// read as a caption. The dataset's own citation is dropped here (not just hidden): it duplicated
// the source already linked directly below this in the panel's provenance line, and this component
// now has that one caller only.
export function Trend({ id, axis }: { id: string; axis: Axis }) {
  const trend = axis === 'mil' && MIL_TREND[id]
    ? { pair: MIL_TREND[id], fmt: (v: number) => `$${v}B` }
    : axis === 'eco' && GDP_PPP[id]
      ? { pair: GDP_PPP[id], fmt: (v: number) => `$${(v / 1000).toFixed(1)}T` }
      : null
  if (!trend) return null
  const { pair, fmt } = trend
  const pct = Math.round(((pair.y2025 - pair.y2020) / pair.y2020) * 100)
  const up = pct >= 0
  return (
    <dl className="axp__cells">
      <div className="axp__cell"><dt>2020</dt><dd dir="ltr">{fmt(pair.y2020)}</dd></div>
      <div className="axp__cell"><dt>2025</dt><dd dir="ltr">{fmt(pair.y2025)}</dd></div>
      <div className="axp__cell"><dt>שינוי</dt><dd className={`axp__cell--${up ? 'up' : 'down'}`} dir="ltr">{up ? '+' : ''}{pct}%</dd></div>
    </dl>
  )
}
