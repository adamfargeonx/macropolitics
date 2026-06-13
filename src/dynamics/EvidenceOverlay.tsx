import { useEffect, useMemo, useState } from 'react'
import { DATA, BODY_INPUTS, MIL_TREND, MIL_TREND_SOURCE, type SourceStatus } from '../data/empirical'
import { NODES } from '../data/entities'
import { computeGravities } from '../model/gravity'
import { useWeights } from '../model/weights-store'
import { sound } from '../sound'

// The evidence overlay — opened from a body's forces panel (the 'mp-evidence' event with {id}).
// For the curious: it shows (1) THE CALCULATION — how this body's gravity is derived from its
// axes, weights, stability and backing, with the actual numbers; and (2) THE SOURCES — the
// underlying figure, dataset, year and link for every axis, with a flag where the data is weak.

const HE_AXIS = { eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' } as const
const STATUS_LABEL: Record<SourceStatus, string> = {
  sourced: 'מקור ראשי',
  estimate: 'אומדן',
  judgment: 'שיפוט',
  'no-data': 'אין נתונים',
}

export function EvidenceOverlay() {
  const [id, setId] = useState<string | null>(null)
  const weights = useWeights() // live (possibly scenario) weights → the calculation stays consistent
  const grav = useMemo(() => computeGravities(BODY_INPUTS, weights), [weights])

  useEffect(() => {
    const onOpen = (e: Event) => { sound.play('open'); setId((e as CustomEvent).detail?.id ?? null) }
    window.addEventListener('mp-evidence', onOpen)
    return () => window.removeEventListener('mp-evidence', onOpen)
  }, [])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { sound.play('back'); setId(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id])

  if (!id) return null
  const d = DATA[id]; const node = NODES.find((n) => n.id === id); const g = grav.get(id)
  if (!d || !g || !node) return null
  const close = () => { sound.play('back'); setId(null) }
  const b = g.patron && g.backing > 0
    ? { amount: Math.round(g.backing * 10), patronHe: NODES.find((n) => n.id === g.patron)?.he ?? g.patron }
    : null
  const w = weights

  return (
    <div className="legend__scrim" onClick={close}>
      <aside className="evid" dir="rtl" role="dialog" aria-label="מקורות וחישוב" onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>
        <header className="evid__head">
          <h2 className="evid__title">{node.he}</h2>
          <span className="evid__score">כוח משיכה {g.gravity.toFixed(1)} / 10 · {node.power}/100</span>
        </header>

        {/* ── THE CALCULATION (drill-down for the curious) ── */}
        <section className="evid__sec">
          <h3 className="evid__h">החישוב</h3>
          <p className="evid__formula">כוח משיכה = ( כלכלי·w + צבאי·w + גאו·w ) × יציבות + גיבוי</p>
          <div className="evid__calc">
            <div className="evid__step">
              <span className="evid__step-k">בסיס משוקלל</span>
              <span className="evid__math">{w.eco.toFixed(2)}×{d.axes.eco} + {w.mil.toFixed(2)}×{d.axes.mil} + {w.geo.toFixed(2)}×{d.axes.geo} = <b>{g.base.toFixed(2)}</b></span>
            </div>
            <div className="evid__step">
              <span className="evid__step-k">× יציבות {g.stability.toFixed(2)}</span>
              <span className="evid__math">{g.base.toFixed(2)} × {g.stability.toFixed(2)} = <b>{g.intrinsic.toFixed(2)}</b></span>
            </div>
            {b && (
              <div className="evid__step">
                <span className="evid__step-k">+ גיבוי ⟵ {b.patronHe}</span>
                <span className="evid__math">+{g.backing.toFixed(2)} <b>(+{b.amount})</b></span>
              </div>
            )}
            <div className="evid__step evid__step--total">
              <span className="evid__step-k">= כוח משיכה</span>
              <span className="evid__math"><b>{g.gravity.toFixed(2)}</b> × 10 → {node.power}/100</span>
            </div>
          </div>
          <p className="evid__weights">
            פרמטרים — משקלים: כלכלי {w.eco} · צבאי {w.mil} · גאו-אסטרטגי {w.geo}
            {g.stability < 1 && <> · יציבות {g.stability} (הנחתת שלמות; ברוב הגופים = 1)</>}
          </p>
        </section>

        {/* ── THE SOURCES (full provenance, beyond the one-line) ── */}
        <section className="evid__sec">
          <h3 className="evid__h">המקורות</h3>
          {(['eco', 'mil', 'geo'] as const).map((axis) => {
            const p = d.prov[axis]; const weak = p.status !== 'sourced'
            return (
              <div className={`evid__src${weak ? ' evid__src--flag' : ''}`} key={axis}>
                <div className="evid__src-head">
                  <span className="evid__src-axis">{HE_AXIS[axis]}</span>
                  <span className="evid__src-score">{d.axes[axis]}/10</span>
                  <span className={`evid__badge evid__badge--${p.status}`}>{STATUS_LABEL[p.status]}</span>
                </div>
                <p className="evid__figure">{p.figure}</p>
                <a className="evid__link" href={p.url} target="_blank" rel="noreferrer">{p.source} · {p.year} ↗</a>
                {p.note && <p className="evid__note">{p.note}</p>}
                {axis === 'mil' && MIL_TREND[id] && (() => {
                  const t = MIL_TREND[id]
                  const pct = Math.round(((t.y2025 - t.y2020) / t.y2020) * 100)
                  const up = pct >= 0
                  return (
                    <div className="evid__trend">
                      <span className="evid__trend-lbl">מגמה · הוצאה צבאית</span>
                      <span className="evid__trend-line" dir="ltr">
                        <span>{`$${t.y2020}B`}</span>
                        <span className="evid__trend-arrow">→</span>
                        <span>{`$${t.y2025}B`}</span>
                        <span className={`evid__trend-pct evid__trend-pct--${up ? 'up' : 'down'}`}>{up ? '+' : ''}{pct}%</span>
                        <span className="evid__trend-years">’20→’25</span>
                      </span>
                      <span className="evid__trend-src">{MIL_TREND_SOURCE}</span>
                      {t.note && <p className="evid__note">{t.note}</p>}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </section>

        {d.flags && d.flags.length > 0 && (
          <section className="evid__flags">
            {d.flags.map((f, i) => <p key={i}><span aria-hidden>⚑ </span>{f}</p>)}
          </section>
        )}

        <footer className="evid__foot">
          הציון האפקטיבי הוא הערכה מנומקת המעוגנת בנתון המקור — לא מדידה. המשקלים והשיפוט ניתנים לערעור.
        </footer>
      </aside>
    </div>
  )
}
