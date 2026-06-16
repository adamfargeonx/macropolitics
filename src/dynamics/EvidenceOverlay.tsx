import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DATA, MIL_TREND, MIL_TREND_SOURCE, GDP_PPP, GDP_PPP_SOURCE, bodyInputsForYear, type SourceStatus } from '../data/empirical'
import { NODES } from '../data/entities'
import { computeGravities } from '../model/gravity'
import { useWeights } from '../model/weights-store'
import { useYear } from '../model/year-store'
import { useFocusTrap } from './useFocusTrap'
import { OVERLAY_EXIT_MS } from './useOverlay'
import { sound } from '../sound'

// The evidence overlay — opened from a body's forces panel (the 'mp-evidence' event with {id}).
// For the curious: it shows (1) THE CALCULATION — how this body's gravity is derived from its
// axes, weights, stability and backing, with the actual numbers; and (2) THE SOURCES — the
// underlying figure, dataset, year and link for every axis, with a flag where the data is weak.

const HE_AXIS = { eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' } as const

// Military composite's four sourced criteria (src/model/military.ts), Hebrew labels for the overlay.
const MIL_ROWS = [
  { k: 'spend',    he: 'הוצאה צבאית (SIPRI)' },
  { k: 'manpower', he: 'כוח אדם פעיל (IISS)' },
  { k: 'nuclear',  he: 'ארסנל גרעיני (FAS)' },
  { k: 'cyber',    he: 'עוצמת סייבר (NCPI)' },
] as const
const milMissing = (k: string, missing: string[]) => missing.includes(k)

// Geo-strategic composite's four sourced criteria (src/model/geo.ts), Hebrew labels for the overlay.
const GEO_ROWS = [
  { k: 'area',        he: 'שטח (CIA 2024)'                     },
  { k: 'borders',     he: 'גבולות יבשתיים (ריבוניים)'          },
  { k: 'resources',   he: 'עתודות נפט+גז (OPEC · BP 2024)'     },
  { k: 'chokepoints', he: 'צוואר בקבוק ימי (EIA)'              },
] as const
const geoMissing = (k: string, missing: string[]) =>
  k === 'resources' ? missing.includes('oil') || missing.includes('gas') : false

// The economic composite's seven sub-criteria (src/model/economic.ts), Hebrew labels for the overlay.
const ECO_ROWS = [
  { k: 'mass', he: 'מסה · תמ״ג PPP' },
  { k: 'percap', he: 'תוצר לנפש' },
  { k: 'reserves', he: 'יתרות מט״ח' },
  { k: 'fdi', he: 'השקעות חוץ (FDI)' },
  { k: 'cab', he: 'מאזן חשבון שוטף' },
  { k: 'debt', he: 'חוב ציבורי / תוצר' },
  { k: 'credit', he: 'דירוג אשראי + יציבות' },
] as const
const ecoMissing = (k: string, missing: string[]) =>
  k === 'credit' ? missing.includes('rating') || missing.includes('inflation') : missing.includes(k)
const STATUS_LABEL: Record<SourceStatus, string> = {
  sourced: 'מקור ראשי',
  estimate: 'אומדן',
  judgment: 'שיפוט',
  'no-data': 'אין נתונים',
}

export function EvidenceOverlay() {
  const [id, setId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false) // play an exit animation before unmounting
  const weights = useWeights() // live (possibly scenario) weights → the calculation stays consistent
  const year = useYear()
  const grav = useMemo(() => computeGravities(bodyInputsForYear(year), weights), [weights, year])
  const dialogRef = useFocusTrap<HTMLElement>(!!id && !closing)
  const closeT = useRef(0)

  const close = useCallback(() => {
    sound.play('back'); setClosing(true)
    closeT.current = window.setTimeout(() => { setId(null); setClosing(false) }, OVERLAY_EXIT_MS)
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => { clearTimeout(closeT.current); sound.play('open'); setClosing(false); setId((e as CustomEvent).detail?.id ?? null) }
    window.addEventListener('mp-evidence', onOpen)
    return () => { window.removeEventListener('mp-evidence', onOpen); clearTimeout(closeT.current) }
  }, [])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, close])

  if (!id) return null
  const d = DATA[id]; const node = NODES.find((n) => n.id === id); const g = grav.get(id)
  if (!d || !g || !node) return null
  const b = g.patron && g.backing > 0
    ? { amount: Math.round(g.backing * 10), patronHe: NODES.find((n) => n.id === g.patron)?.he ?? g.patron }
    : null
  const w = weights

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="evid" dir="rtl" role="dialog" aria-modal="true" aria-label="מקורות וחישוב" onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>
        <header className="evid__head">
          <h2 className="evid__title">{node.he}</h2>
          <span className="evid__score">כוח משיכה <bdi>{g.gravity.toFixed(1)} / 10</bdi> · <bdi>{g.power}/100</bdi>{year !== 2025 ? ` · ${year}` : ''}</span>
        </header>

        {/* ── THE CALCULATION (drill-down for the curious) ── */}
        <section className="evid__sec">
          <h3 className="evid__h">החישוב</h3>
          <p className="evid__formula">כוח משיכה = ( כלכלי·w + צבאי·w + גאו·w ) × יציבות + גיבוי</p>
          <div className="evid__calc">
            <div className="evid__step">
              <span className="evid__step-k">בסיס משוקלל</span>
              <span className="evid__math">{w.eco.toFixed(2)}×{g.eco} + {w.mil.toFixed(2)}×{g.mil} + {w.geo.toFixed(2)}×{g.geo} = <b>{g.base.toFixed(2)}</b></span>
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
              <span className="evid__math"><b>{g.gravity.toFixed(2)}</b> × 10 → {g.power}/100</span>
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
                <a className="evid__link" href={p.url} target="_blank" rel="noreferrer"><bdi>{p.source} · {p.year}</bdi> ↗</a>
                {p.note && <p className="evid__note">{p.note}</p>}
                {axis === 'mil' && d.milBreakdown && (() => {
                  const bk = d.milBreakdown!
                  return (
                    <div className="evid__mil">
                      <span className="evid__mil-lbl">מדד מורכב · 4 פרמטרים ממקור <bdi>(SIPRI · IISS · FAS · NCPI)</bdi></span>
                      <div className="evid__mil-grid">
                        {MIL_ROWS.map(({ k, he }) => {
                          const v = bk.sub[k as keyof typeof bk.sub]
                          const miss = milMissing(k, bk.missing)
                          return (
                            <div className={`evid__mil-row${miss ? ' evid__mil-row--miss' : ''}`} key={k}>
                              <span className="evid__mil-k">{he}</span>
                              <span className="evid__mil-bar"><i style={{ width: `${v * 10}%` }} /></span>
                              <span className="evid__mil-v">{v.toFixed(1)}{miss ? ' ⚑' : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                      <span className="evid__mil-foot">
                        הוצאה {bk.spendScore.toFixed(1)} +כוח אדם {bk.manBonus.toFixed(1)} +גרעין {bk.nucBonus.toFixed(1)} +סייבר {bk.cyberBonus.toFixed(1)} → <b>צבאי {bk.mil.toFixed(1)}</b>
                      </span>
                      <span className="evid__mil-judgment">
                        7 קריטריונים נוספים (לוגיסטיקה, ניסיון קרב, תעשיית ביטחון, ציוד, מודיעין, ברית, אימון) — שיפוט; לא ממודלים
                      </span>
                    </div>
                  )
                })()}
                {axis === 'eco' && d.ecoBreakdown && (() => {
                  const bk = d.ecoBreakdown!
                  return (
                    <div className="evid__eco">
                      <span className="evid__eco-lbl">מדד מורכב · 7 פרמטרים ממקור <bdi>(IMF · בנק עולמי · S&amp;P)</bdi></span>
                      <div className="evid__eco-grid">
                        {ECO_ROWS.map(({ k, he }) => {
                          const v = bk.sub[k as keyof typeof bk.sub]
                          const miss = ecoMissing(k, bk.missing)
                          return (
                            <div className={`evid__eco-row${miss ? ' evid__eco-row--miss' : ''}`} key={k}>
                              <span className="evid__eco-k">{he}</span>
                              <span className="evid__eco-bar"><i style={{ width: `${v * 10}%` }} /></span>
                              <span className="evid__eco-v">{v.toFixed(1)}{miss ? ' ⚑' : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                      <span className="evid__eco-foot">
                        עמוד שדרה (מסה×0.7 + לנפש×0.3) {bk.spine.toFixed(1)} · בריאות פיסקלית {bk.health.toFixed(1)} → <b>כלכלי {bk.eco.toFixed(1)}</b>
                      </span>
                    </div>
                  )
                })()}
                {axis === 'geo' && d.geoBreakdown && (() => {
                  const bk = d.geoBreakdown!
                  return (
                    <div className="evid__geo">
                      <span className="evid__geo-lbl">מדד מורכב · 4 פרמטרים ממקור <bdi>(CIA · OPEC · BP · EIA)</bdi></span>
                      <div className="evid__geo-grid">
                        {GEO_ROWS.map(({ k, he }) => {
                          const v = bk.sub[k as keyof typeof bk.sub]
                          const miss = geoMissing(k, bk.missing)
                          return (
                            <div className={`evid__geo-row${miss ? ' evid__geo-row--miss' : ''}`} key={k}>
                              <span className="evid__geo-k">{he}</span>
                              <span className="evid__geo-bar"><i style={{ width: `${v * 10}%` }} /></span>
                              <span className="evid__geo-v">{v.toFixed(1)}{miss ? ' ⚑' : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                      <span className="evid__geo-foot">
                        שטח {bk.sizeScore.toFixed(1)}×0.4 + גבולות {bk.borderScore.toFixed(1)}×0.3 + עתודות +{bk.resBonus.toFixed(2)} + מיקום +{bk.chokeBonus.toFixed(2)} → <b>גיאו {bk.geo.toFixed(1)}</b>
                      </span>
                      <span className="evid__geo-judgment">
                        2 קריטריונים נוספים (מיקום אסטרטגי, טופוגרפיה) — שיפוט; לא ממודלים
                      </span>
                    </div>
                  )
                })()}
                {(() => {
                  const trend = axis === 'mil' && MIL_TREND[id]
                    ? { pair: MIL_TREND[id], fmt: (v: number) => `$${v}B`, src: MIL_TREND_SOURCE, lbl: 'מגמה · הוצאה צבאית' }
                    : axis === 'eco' && GDP_PPP[id]
                      ? { pair: GDP_PPP[id], fmt: (v: number) => `$${(v / 1000).toFixed(1)}T`, src: GDP_PPP_SOURCE, lbl: 'מגמה · תמ״ג PPP' }
                      : null
                  if (!trend) return null
                  const { pair, fmt, src, lbl } = trend
                  const pct = Math.round(((pair.y2025 - pair.y2020) / pair.y2020) * 100)
                  const up = pct >= 0
                  return (
                    <div className="evid__trend">
                      <span className="evid__trend-lbl">{lbl}</span>
                      <span className="evid__trend-line" dir="ltr">
                        <span>{fmt(pair.y2020)}</span>
                        <span className="evid__trend-arrow">→</span>
                        <span>{fmt(pair.y2025)}</span>
                        <span className={`evid__trend-pct evid__trend-pct--${up ? 'up' : 'down'}`}>{up ? '+' : ''}{pct}%</span>
                        <span className="evid__trend-years">’20→’25</span>
                      </span>
                      <span className="evid__trend-src">{src}</span>
                      {'note' in pair && !!(pair as { note?: string }).note && <p className="evid__note">{(pair as { note?: string }).note}</p>}
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
