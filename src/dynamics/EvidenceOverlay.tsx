import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DATA, MIL_TREND, MIL_TREND_SOURCE, GDP_PPP, GDP_PPP_SOURCE, bodyInputsForYear, type SourceStatus } from '../data/empirical'
import { NODES } from '../data/entities'
import { computeGravities } from '../model/gravity'
import { useWeights } from '../model/weights-store'
import { useYear } from '../model/year-store'
import { useFocusTrap } from './useFocusTrap'
import { OVERLAY_EXIT_MS } from './useOverlay'
import { Icon, type IconName } from './Icon'
import { sound } from '../sound'

// The evidence overlay — opened from a body's forces panel (the 'mp-evidence' event with {id}).
// Two tabs: SOURCES (the figure, dataset, composite breakdown + flag per axis) and CALCULATION
// (how those axes roll up into gravity). Wide, side-by-side axes, no deep scroll.

const HE_AXIS = { eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' } as const
const AXIS_SRC = { eco: 'IMF · בנק עולמי · S&P', mil: 'SIPRI · IISS · FAS · NCPI', geo: 'CIA · OPEC · BP · EIA' } as const
const AXIS_ICON: Record<'eco' | 'mil' | 'geo', IconName> = { eco: 'eco', mil: 'mil', geo: 'geo' }

const MIL_ROWS = [
  { k: 'spend', he: 'הוצאה צבאית' }, { k: 'manpower', he: 'כוח אדם' },
  { k: 'nuclear', he: 'ארסנל גרעיני' }, { k: 'cyber', he: 'עוצמת סייבר' },
] as const
const GEO_ROWS = [
  { k: 'area', he: 'שטח' }, { k: 'borders', he: 'גבולות' },
  { k: 'resources', he: 'נפט+גז' }, { k: 'chokepoints', he: 'צוואר בקבוק' },
] as const
const ECO_ROWS = [
  { k: 'mass', he: 'מסה (PPP)' }, { k: 'percap', he: 'לנפש' }, { k: 'reserves', he: 'יתרות' },
  { k: 'fdi', he: 'FDI' }, { k: 'cab', he: 'חשבון שוטף' }, { k: 'debt', he: 'חוב/תוצר' }, { k: 'credit', he: 'אשראי' },
] as const
const AXIS_ROWS = { eco: ECO_ROWS, mil: MIL_ROWS, geo: GEO_ROWS } as const

const milMissing = (k: string, m: string[]) => m.includes(k)
const geoMissing = (k: string, m: string[]) => (k === 'resources' ? m.includes('oil') || m.includes('gas') : false)
const ecoMissing = (k: string, m: string[]) => (k === 'credit' ? m.includes('rating') || m.includes('inflation') : m.includes(k))
const AXIS_MISS = { eco: ecoMissing, mil: milMissing, geo: geoMissing } as const

const STATUS_LABEL: Record<SourceStatus, string> = {
  sourced: 'מקור ראשי', estimate: 'אומדן', judgment: 'שיפוט', 'no-data': 'אין נתונים',
}
// Inline status glyphs for the per-parameter evidence bars (item 8): every parameter — sourced or
// assessed — is a bar row carrying its provenance status, so the evidence layer reads as complete.
const STATUS_GLYPH: Record<SourceStatus, string> = {
  sourced: '✓', estimate: '~', judgment: '⊙', 'no-data': '✕',
}

type Axis = 'eco' | 'mil' | 'geo'

// Per-parameter provenance status: missing → no-data; the geo axis is inherently interpretive
// (judgment/assessment); economic & military figures rest on primary datasets (sourced).
function paramStatus(axis: Axis, miss: boolean): SourceStatus {
  if (miss) return 'no-data'
  if (axis === 'geo') return 'judgment'
  return 'sourced'
}

// Unified composite sub-criteria breakdown (eco 7 · mil 4 · geo 4) — every parameter is a bar row
// with an inline status badge (sourced ✓ · estimate ~ · assessment ⊙ · no-data ✕). One component, three axes.
function Composite({ axis, sub, missing, status }: { axis: Axis; sub: Record<string, number>; missing: string[]; status: SourceStatus }) {
  const rows = AXIS_ROWS[axis]
  const missFn = AXIS_MISS[axis]
  const hasBreakdown = Object.keys(sub).length > 0
  return (
    <div className="evid__comp">
      <span className="evid__comp-lbl">מדד מורכב · <bdi>{AXIS_SRC[axis]}</bdi></span>
      <div className="evid__comp-grid">
        {rows.map(({ k, he }) => {
          const has = k in sub
          const v = sub[k] ?? 0
          const miss = missFn(k, missing)
          // status per row: missing→no-data; value present→axis-derived status;
          // value absent (assessed, not sourced)→judgment so it still reads as graded
          const rowStatus: SourceStatus = miss ? 'no-data' : has ? paramStatus(axis, false) : (hasBreakdown ? 'judgment' : (status === 'sourced' ? 'estimate' : status))
          return (
            <div className={`evid__comp-row${miss || !has ? ' evid__comp-row--miss' : ''}`} key={k}>
              <span className={`evid__comp-status evid__comp-status--${rowStatus}`} title={STATUS_LABEL[rowStatus]} aria-label={STATUS_LABEL[rowStatus]}>{STATUS_GLYPH[rowStatus]}</span>
              <span className="evid__comp-k">{he}</span>
              <span className="evid__comp-bar"><i style={{ width: `${has ? v * 10 : 0}%` }} /></span>
              <span className="evid__comp-v">{has ? v.toFixed(1) : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Sourced 2020→2025 trend (eco GDP-PPP · mil spend) — a real temporal datapoint.
function Trend({ id, axis }: { id: string; axis: Axis }) {
  const trend = axis === 'mil' && MIL_TREND[id]
    ? { pair: MIL_TREND[id], fmt: (v: number) => `$${v}B`, src: MIL_TREND_SOURCE }
    : axis === 'eco' && GDP_PPP[id]
      ? { pair: GDP_PPP[id], fmt: (v: number) => `$${(v / 1000).toFixed(1)}T`, src: GDP_PPP_SOURCE }
      : null
  if (!trend) return null
  const { pair, fmt, src } = trend
  const pct = Math.round(((pair.y2025 - pair.y2020) / pair.y2020) * 100)
  const up = pct >= 0
  return (
    <div className="evid__trend">
      <span className="evid__trend-line" dir="ltr">
        <span>{fmt(pair.y2020)}</span><span className="evid__trend-arrow">→</span><span>{fmt(pair.y2025)}</span>
        <span className={`evid__trend-pct evid__trend-pct--${up ? 'up' : 'down'}`}>{up ? '+' : ''}{pct}%</span>
        <span className="evid__trend-years">’20→’25</span>
      </span>
      <span className="evid__trend-src">{src}</span>
    </div>
  )
}

export function EvidenceOverlay() {
  const [id, setId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false) // play an exit animation before unmounting
  const [tab, setTab] = useState<'sources' | 'calc'>('sources')
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
    const onOpen = (e: Event) => { clearTimeout(closeT.current); sound.play('open'); setClosing(false); setTab('sources'); setId((e as CustomEvent).detail?.id ?? null) }
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
  const breakdown: Record<Axis, Record<string, number> | undefined> = {
    eco: d.ecoBreakdown?.sub as Record<string, number> | undefined,
    mil: d.milBreakdown?.sub as Record<string, number> | undefined,
    geo: d.geoBreakdown?.sub as Record<string, number> | undefined,
  }
  const missingOf: Record<Axis, string[]> = {
    eco: d.ecoBreakdown?.missing ?? [], mil: d.milBreakdown?.missing ?? [], geo: d.geoBreakdown?.missing ?? [],
  }

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="evid" dir="rtl" role="dialog" aria-modal="true" aria-label="מקורות וחישוב" inert={closing} onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>
        <header className="evid__head">
          <h2 className="evid__title">{node.he}</h2>
          <div className="evid__grav">
            <span className="evid__grav-lbl">כוח משיכה{year !== 2025 ? ` · ${year}` : ''}</span>
            <span className="evid__grav-num"><bdi>{g.gravity.toFixed(1)}</bdi><i>/10</i></span>
          </div>
        </header>

        <div className="evid__tabs" role="tablist" aria-label="תצוגה">
          <button className={`evid__tab${tab === 'sources' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'sources'}
            onClick={() => { sound.play('tab'); setTab('sources') }}><Icon name="sources" className="evid__tab-icon" />מקורות</button>
          <button className={`evid__tab${tab === 'calc' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'calc'}
            onClick={() => { sound.play('tab'); setTab('calc') }}><Icon name="calc" className="evid__tab-icon" />החישוב</button>
        </div>

        {tab === 'sources' ? (
          <div className="evid__sources">
            {(['eco', 'mil', 'geo'] as Axis[]).map((axis) => {
              const p = d.prov[axis]; const weak = p.status !== 'sourced'
              return (
                <section className={`evid__src${weak ? ' evid__src--flag' : ''}`} key={axis}>
                  <div className="evid__src-head">
                    <span className="evid__src-axis"><Icon name={AXIS_ICON[axis]} className="evid__src-icon" />{HE_AXIS[axis]}</span>
                    <span className="evid__src-score">{d.axes[axis]}</span>
                  </div>
                  <Composite axis={axis} sub={breakdown[axis] ?? {}} missing={missingOf[axis]} status={d.prov[axis].status} />
                  <div className="evid__src-meta">
                    <span className={`evid__badge evid__badge--${p.status}`}>{STATUS_LABEL[p.status]}</span>
                    <p className="evid__figure">{p.figure}</p>
                    <Trend id={id} axis={axis} />
                    {p.note && <p className="evid__note">{p.note}</p>}
                    <a className="evid__link" href={p.url} target="_blank" rel="noreferrer"><bdi>{p.source} · {p.year}</bdi> ↗</a>
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="evid__calc-tab">
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
              משקלים: כלכלי {w.eco} · צבאי {w.mil} · גאו-אסטרטגי {w.geo}
              {g.stability < 1 && <> · יציבות {g.stability} (הנחתת שלמות; ברוב הגופים = 1)</>}
            </p>
          </div>
        )}

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
