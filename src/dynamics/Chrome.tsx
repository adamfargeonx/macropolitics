// Static page chrome around the field: logo, side panel, right rail, bottom tabs.
// Co-located presentational components. TODO: the two SidePanel variants have grown —
// extract SidePanelDetailA/B into their own files if either gains more logic.
import { useEffect, useState, type ReactNode } from 'react'
import type { PowerNotes } from '../data/entities'
import type { AxisProvenance } from '../data/empirical'
import { sound } from '../sound'
import { usePanelVariant } from './panelAB'
import { Words } from './Words'

// Collapsible dock for the side panel. A clearly-labelled drawer tab (chevron + "מידע")
// at the right edge slides the panel in/out. The tab is pinned (no jitter); hovering it
// while collapsed peeks the panel as a preview.
export function PanelDock({ children }: { children: ReactNode }) {
  // mounts closed, then slides in after the page transition has landed — the panel
  // arriving a beat late reads as a considered reveal, not a static frame.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 850)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className={`pdock${open ? ' pdock--open' : ' pdock--closed'}`}>
      <div className="pdock__panel">{children}</div>
      <button
        className="pdock__handle"
        onClick={() => { sound.play('tab'); setOpen((o) => !o) }}
        aria-label={open ? 'הסתרת לוח המידע' : 'הצגת לוח המידע'}
        aria-expanded={open}
      >
        <svg className="pdock__chev" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="9 5 16 12 9 19" />
        </svg>
        <span className="pdock__handle-lbl">מידע</span>
      </button>
    </div>
  )
}

export function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="hdr">
      {/* a mini of the home orbit, before the wordmark — a portal back to the homepage */}
      <button className="hdr__logo" onClick={onHome} aria-label="דף הבית" title="חזרה לדף הבית">
        <span className="hdr__orbit" aria-hidden><span className="hdr__orbit-spin"><i className="hdr__orbit-dot" /></span></span>
        <span className="hdr__wm">מאקרופוליטיקה</span>
      </button>
    </header>
  )
}

// Utility cluster — top-left. "המודל" (the methodology, made prominent) + a crisp info
// icon (the legend). Both dispatch the global overlay events. Hidden on the closed home.
export function UtilityNav() {
  return (
    <div className="unav" dir="rtl">
      <button className="unav__model" onClick={() => window.dispatchEvent(new Event('mp-about'))} title="המודל — המתודולוגיה">
        <span className="unav__dot" />המודל
      </button>
      <button className="unav__legend" aria-label="מקרא — השפה החזותית" onClick={() => window.dispatchEvent(new Event('mp-legend'))} title="מקרא — השפה החזותית">
        <svg className="unav__legend-icon" viewBox="0 0 24 16" aria-hidden="true">
          <circle cx="4.5" cy="8" r="2.4" />
          <circle cx="12" cy="8" r="3.4" />
          <circle cx="19.8" cy="8" r="1.6" />
        </svg>
        מקרא
      </button>
    </div>
  )
}

export interface EntityDetail {
  id?: string // forces view: lets the evidence overlay look up sources + the calculation
  he: string; power: number; tier: string; dispo: string
  axisLabel: string; parentHe: string | null; relations: { id: string; he: string }[]
  scoreLabel?: string // forces view: "6.6 / 10" instead of "/100"
  forces?: { eco: number; mil: number; geo: number }
  powerNotes?: PowerNotes // forces view: four short paragraphs (general + components)
  rank?: number; total?: number // forces view: rank in the gravity index
  backing?: { amount: number; patronHe: string } | null // forces: borrowed weight from a patron
  prov?: { eco: AxisProvenance; mil: AxisProvenance; geo: AxisProvenance } // per-axis provenance
  flags?: string[] // prominent data-quality caveats (only when genuinely half-baked)
  components?: { base: number; intrinsic: number; backing: number; gravity: number; stability: number } // for the methodology drill-down
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel__row">
      <span className="panel__row-k">{label}</span>
      <span className="panel__row-v"><bdi>{value}</bdi></span>
    </div>
  )
}

// One power note: a label, an optional 0–10 bar (the three components), ≤20-word text,
// and a concise source line (dataset + year) with a ⚑ marker when the figure is weak/flagged.
// The full figure + link live in the evidence overlay (opened from the panel).
function PowerNote({ label, text, value, source }: { label: string; text: string; value?: number; source?: AxisProvenance }) {
  const weak = source && source.status !== 'sourced'
  return (
    <div className="pnote">
      <div className="pnote__head">
        <span className="pnote__label">{label}</span>
        {value != null && (
          <>
            <span className="pnote__track"><span className="pnote__fill" style={{ width: `${value * 10}%` }} /></span>
            <span className="pnote__val">{value}</span>
          </>
        )}
      </div>
      <p className="pnote__text">{text}</p>
      {source && (
        <p className={`pnote__src${weak ? ' pnote__src--flag' : ''}`} title={source.note ?? source.figure}>
          {weak && <span className="pnote__flag" aria-hidden>⚑ </span>}{source.source}
        </p>
      )}
    </div>
  )
}

// Inline data-quality flags (only when genuinely half-baked) + the trigger that opens the
// evidence overlay: full per-axis sources and the gravity calculation, for the curious.
function EvidenceTrigger({ detail }: { detail: EntityDetail }) {
  if (!detail.id) return null
  return (
    <div className="evidence">
      {detail.flags?.map((f, i) => (
        <p className="evidence__flag" key={i}><span aria-hidden>⚑ </span>{f}</p>
      ))}
      <button
        className="evidence__btn"
        onClick={() => window.dispatchEvent(new CustomEvent('mp-evidence', { detail: { id: detail.id } }))}
      >
        המקורות והחישוב <span aria-hidden>↗</span>
      </button>
    </div>
  )
}

interface DetailProps { detail: EntityDetail; onClose?: () => void; onRelSelect?: (id: string) => void }

// Variant A — the original: meta rows + gravity profile with inline horizontal bars.
function SidePanelDetailA({ detail, onClose, onRelSelect }: DetailProps) {
  return (
    <aside className="panel panel--detail" dir="rtl">
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <h1 className="panel__title">{detail.he}</h1>
      <div className="panel__meta">
        <MetaRow label="כוח משיכה" value={detail.scoreLabel ?? `${detail.power} / 100`} />
        <MetaRow label="מעמד" value={detail.tier} />
        {!detail.powerNotes && <MetaRow label="אופי" value={detail.dispo} />}
        <MetaRow label="שיוך" value={detail.axisLabel} />
        {detail.parentHe && <MetaRow label="במסלול סביב" value={detail.parentHe} />}
      </div>
      {detail.powerNotes && (
        <div className="pnotes">
          <span className="pnotes__h">פרופיל כוח המשיכה</span>
          <PowerNote label="כללי" text={detail.powerNotes.general} />
          <PowerNote label="כלכלי" text={detail.powerNotes.eco} value={detail.forces?.eco} source={detail.prov?.eco} />
          <PowerNote label="צבאי" text={detail.powerNotes.mil} value={detail.forces?.mil} source={detail.prov?.mil} />
          <PowerNote label="גאו-אסטרטגי" text={detail.powerNotes.geo} value={detail.forces?.geo} source={detail.prov?.geo} />
          {detail.backing && (
            <div className="pnote pnote--backing">
              <div className="pnote__head">
                <span className="pnote__label">גיבוי ⟵ {detail.backing.patronHe}</span>
                <span className="pnote__val">+{detail.backing.amount}</span>
              </div>
              <p className="pnote__text">משקל פוליטי מושאל — חלק מכוח המשיכה תלוי בנותן החסות, לא עצמאי.</p>
            </div>
          )}
          <EvidenceTrigger detail={detail} />
        </div>
      )}
      {detail.relations.length > 0 && (
        <div className="panel__rels">
          <span className="panel__rels-h">יחסים</span>
          <div className="panel__rels-list">
            {detail.relations.map((r) => (
              <button key={r.id} className="panel__rel" onClick={() => onRelSelect?.(r.id)}>{r.he}</button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

// Variant B — a "dossier" layout: hero with a big score, vertical component columns,
// and the gravity profile as a numbered editorial list.
function SidePanelDetailB({ detail, onClose, onRelSelect }: DetailProps) {
  const score = detail.scoreLabel ? detail.scoreLabel.split(' ')[0] : String(detail.power)
  const unit = detail.scoreLabel ? '/ 10' : '/ 100'
  const comps: [string, number | undefined][] = [['כלכלי', detail.forces?.eco], ['צבאי', detail.forces?.mil], ['גאו', detail.forces?.geo]]
  const notes = detail.powerNotes
  const scoreNum = Number(score)
  return (
    <aside className="panelb panel--detail" dir="rtl">
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <div className="panelb__top">
        {detail.rank && <span className="panelb__rank">{String(detail.rank).padStart(2, '0')}</span>}
        <div className="panelb__id">
          <span className="panelb__kicker">{detail.tier} · {detail.axisLabel} · {detail.dispo}</span>
          <h1 className="panelb__title">{detail.he}</h1>
        </div>
      </div>
      <div className="panelb__scorebox">
        <div className="panelb__score"><b>{score}</b><span>{unit}</span></div>
        <div className="panelb__score-side">
          <span className="panelb__score-lbl">כוח משיכה</span>
          {detail.rank && detail.total && <span className="panelb__score-rank">מדורגת {detail.rank} מתוך {detail.total}</span>}
        </div>
        <span className="panelb__gauge"><i style={{ width: `${Number.isFinite(scoreNum) ? scoreNum * 10 : detail.power}%` }} /></span>
      </div>
      {detail.forces && (
        <div className="panelb__comps">
          <span className="panelb__comps-h">מרכיבי הכוח</span>
          <div className="panelb__cols">
            {comps.map(([l, v]) => (
              <div className="panelb__col" key={l}>
                <span className="panelb__col-v">{v ?? '—'}</span>
                <span className="panelb__col-track"><i style={{ height: `${(v ?? 0) * 10}%` }} /></span>
                <span className="panelb__col-l">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {notes && (
        <ol className="panelb__notes">
          <li><span className="panelb__note-k">כללי</span><p>{notes.general}</p></li>
          <li><span className="panelb__note-k">כלכלי</span><p>{notes.eco}</p>{detail.prov?.eco && <span className={`panelb__src${detail.prov.eco.status !== 'sourced' ? ' panelb__src--flag' : ''}`}>{detail.prov.eco.status !== 'sourced' && '⚑ '}{detail.prov.eco.source}</span>}</li>
          <li><span className="panelb__note-k">צבאי</span><p>{notes.mil}</p>{detail.prov?.mil && <span className={`panelb__src${detail.prov.mil.status !== 'sourced' ? ' panelb__src--flag' : ''}`}>{detail.prov.mil.status !== 'sourced' && '⚑ '}{detail.prov.mil.source}</span>}</li>
          <li><span className="panelb__note-k">גאו-אסטרטגי</span><p>{notes.geo}</p>{detail.prov?.geo && <span className="panelb__src">{detail.prov.geo.source}</span>}</li>
          {detail.backing && (
            <li className="panelb__note--backing"><span className="panelb__note-k">גיבוי ⟵ {detail.backing.patronHe}</span><p>משקל מושאל · ‎+{detail.backing.amount} מכוח המשיכה תלוי בנותן החסות.</p></li>
          )}
        </ol>
      )}
      <EvidenceTrigger detail={detail} />
      {detail.relations.length > 0 && (
        <div className="panelb__rels">
          {detail.relations.map((r) => (
            <button key={r.id} className="panel__rel" onClick={() => onRelSelect?.(r.id)}>{r.he}</button>
          ))}
        </div>
      )}
    </aside>
  )
}

export function SidePanel({ detail, onClose, onRelSelect }: { detail?: EntityDetail | null; onClose?: () => void; onRelSelect?: (id: string) => void }) {
  const variant = usePanelVariant()
  if (detail) {
    return variant === 'b'
      ? <SidePanelDetailB detail={detail} onClose={onClose} onRelSelect={onRelSelect} />
      : <SidePanelDetailA detail={detail} onClose={onClose} onRelSelect={onRelSelect} />
  }
  return (
    <aside className="panel" dir="rtl">
      <h1 className="panel__title">יחסי הכוחות</h1>
      <p className="panel__body panel__body--words">
        <Words delay={0.2} text="במערך יחסי הכוחות ניתן לראות את השילוב של הכוחות והיחסים, ולהבין את הדינמיקות דרך הגופים, מעגלי ההשפעה ומרכזי הכובד. גודלם נקבע על פי כוח משיכתם, והמרחקים ביניהם מעידים על אופי היחסים שלהם." />
      </p>
      <h2 className="panel__eq">יחסי הכוחות = הכוחות + היחסים</h2>
      <p className="panel__note">בחרו גוף במפה כדי לראות את נתוניו.</p>
    </aside>
  )
}

export type View = 'home' | 'forces' | 'relations' | 'dynamics' | 'well'
const TABS: { he: string; view: View; ready?: boolean }[] = [
  { he: 'הכוחות', view: 'forces', ready: true },
  { he: 'היחסים', view: 'relations', ready: true },
  { he: 'יחסי הכוחות', view: 'dynamics', ready: true },
  { he: 'שדה כוח', view: 'well', ready: true },
]

export function TabBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <nav className="tabs" dir="rtl" aria-label="תצוגות">
      {TABS.map((t) => (
        <button
          key={t.he}
          className={`tab${view === t.view ? ' tab--active' : ''}${t.ready === false ? ' tab--soon' : ''}`}
          aria-current={view === t.view ? 'page' : undefined}
          onClick={() => t.ready !== false && onView(t.view)}
        >
          {t.he}
        </button>
      ))}
    </nav>
  )
}
