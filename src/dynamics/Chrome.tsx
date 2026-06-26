// Static page chrome around the field: logo, side panel, right rail, bottom tabs.
// Co-located presentational components.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NODES, type PowerNotes } from '../data/entities'
import type { AxisProvenance } from '../data/empirical'
import { FORCES_DESCRIPTIONS } from '../data/forces-descriptions'
import { AUTHORED_RELATIONS, type AuthoredRelation } from '../data/relations'
import { sound } from '../sound'
import { Words } from './Words'
import { Icon, type IconName } from './Icon'

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
      <button
        className="hdr__logo"
        onClick={onHome}
        aria-label="דף הבית"
        title="חזרה לדף הבית"
        onMouseEnter={() => window.dispatchEvent(new Event('mp-freeze'))}
        onMouseLeave={() => window.dispatchEvent(new Event('mp-unfreeze'))}
      >
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
        <Icon name="model" className="unav__icon" />המודל
      </button>
      <button className="unav__legend" aria-label="מקרא — השפה החזותית" onClick={() => window.dispatchEvent(new Event('mp-legend'))} title="מקרא — השפה החזותית">
        <Icon name="legend" className="unav__icon" />מקרא
      </button>
    </div>
  )
}

export interface EntityDetail {
  id?: string // forces view: lets the evidence overlay look up sources + the calculation
  he: string; power: number; tier: string; dispo: string
  axisLabel: string; parentHe: string | null; relations: { id: string; he: string }[]
  satellites?: { id: string; he: string }[] // dynamics: bodies that orbit THIS one (orbital children)
  scoreLabel?: string // forces view: "6.6 / 10" instead of "/100"
  forces?: { eco: number; mil: number; geo: number }
  powerNotes?: PowerNotes // forces view: four short paragraphs (general + components)
  rank?: number; total?: number // forces view: rank in the gravity index
  backing?: { amount: number; patronHe: string } | null // forces: borrowed weight from a patron
  prov?: { eco: AxisProvenance; mil: AxisProvenance; geo: AxisProvenance } // per-axis provenance
  flags?: string[] // prominent data-quality caveats (only when genuinely half-baked)
  components?: { base: number; intrinsic: number; backing: number; gravity: number; stability: number } // for the methodology drill-down
}

// One power note: a label, an optional 0–10 bar (the three components), ≤20-word text,
// and a concise source line (dataset + year) with a ⚑ marker when the figure is weak/flagged.
// The full figure + link live in the evidence overlay (opened from the panel).
function PowerNote({ label, text, value, source, icon, hint }: { label: string; text: string; value?: number; source?: AxisProvenance; icon?: IconName; hint?: string }) {
  const weak = source && source.status !== 'sourced'
  return (
    <div className="pnote">
      <div className="pnote__head">
        <span className="pnote__label" data-hint={hint}>{icon && <Icon name={icon} className="pnote__icon" />}{label}</span>
        {value != null && (
          <>
            <span className="pnote__track"><span className="pnote__fill" style={{ width: `${value * 10}%` }} /></span>
            <span className="pnote__val">{value}</span>
          </>
        )}
      </div>
      <p className="pnote__text">{text}</p>
      {source && (
        <p className={`pnote__src${weak ? ' pnote__src--flag' : ''}`} data-hint={source.note ?? source.figure}>
          {weak && <span className="pnote__flag" aria-hidden>⚑ </span>}{source.source}
        </p>
      )}
    </div>
  )
}

// The trigger that opens the evidence overlay: full per-axis sources, data-quality flags, and the
// gravity calculation, for the curious. Sources + flags are concealed from the default panel — they
// live behind this one tap, keeping the resting view clean.
function EvidenceTrigger({ detail }: { detail: EntityDetail }) {
  if (!detail.id) return null
  return (
    <div className="evidence">
      <button
        className="evidence__btn"
        onClick={() => window.dispatchEvent(new CustomEvent('mp-evidence', { detail: { id: detail.id } }))}
      >
        המקורות והחישוב <span aria-hidden>↗</span>
      </button>
    </div>
  )
}

// Orbital context (dynamics only): what this body orbits + which bodies orbit it. Clicking a
// satellite re-centres the panel on it. Renders nothing where there's no orbital data (forces).
function OrbitSection({ detail, onRelSelect }: { detail: EntityDetail; onRelSelect?: (id: string) => void }) {
  const sats = detail.satellites ?? []
  if (!detail.parentHe && sats.length === 0) return null
  return (
    <div className="panel__orbit">
      <span className="panel__rels-h"><Icon name="orbit" className="panel__orbit-icon" />מסלול</span>
      {detail.parentHe && <p className="panel__orbit-parent">במסלול סביב <b>{detail.parentHe}</b></p>}
      {sats.length > 0 && (
        <>
          <span className="panel__orbit-sub">בתחום הכבידה שלה</span>
          <div className="panel__rels-list">
            {sats.map((s) => (
              <button key={s.id} className="panel__rel" onClick={() => onRelSelect?.(s.id)}>{s.he}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// FORCES drill-down (forces view only): the interpretation layer. A toggle reveals the
// general read plus three axis blocks (eco/mil/geo) drawn from FORCES_DESCRIPTIONS. Collapsed
// by default; resets when the selection changes. Renders nothing where there's no description.
function ForcesDrillDown({ detail }: { detail: EntityDetail }) {
  const [open, setOpen] = useState(false)
  // a fresh selection should always land collapsed — the drawer is per-body, not sticky.
  // Reset during render on id change (React's recommended replacement for a setState-in-effect).
  const [lastId, setLastId] = useState(detail.id)
  if (detail.id !== lastId) { setLastId(detail.id); setOpen(false) }
  const desc = detail.id ? FORCES_DESCRIPTIONS[detail.id] : undefined
  if (!desc) return null
  const axes: { label: string; icon: IconName; text: string }[] = [
    { label: 'כלכלי', icon: 'eco', text: desc.eco },
    { label: 'צבאי', icon: 'mil', text: desc.mil },
    { label: 'גאו-אסטרטגי', icon: 'geo', text: desc.geo },
  ]
  return (
    <div className="panelb__forces-detail">
      <button
        className="panelb__forces-toggle"
        onClick={() => { sound.play('tab'); setOpen((o) => !o) }}
        aria-expanded={open}
      >
        {open ? 'הסתרת המידע' : 'מידע על הכוחות'}
        <span className={`panelb__forces-chev${open ? ' panelb__forces-chev--open' : ''}`} aria-hidden>▾</span>
      </button>
      <div className={`panelb__forces-body${open ? ' panelb__forces-body--open' : ''}`}>
        <div className="panelb__forces-inner">
          <p className="panelb__forces-gen">{desc.general}</p>
          {axes.map((a) => (
            <div key={a.label} className="panelb__forces-axis">
              <span className="panelb__forces-axis-l"><Icon name={a.icon} className="panelb__forces-axis-icon" />{a.label}</span>
              <p className="panelb__forces-axis-t">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Authored relations involving a given id, both directions, paired with the OTHER body's id.
function relationsFor(id: string): { other: string; rel: AuthoredRelation }[] {
  const out: { other: string; rel: AuthoredRelation }[] = []
  for (const rel of AUTHORED_RELATIONS) {
    const [a, b] = rel.pair
    if (a === id) out.push({ other: b, rel })
    else if (b === id) out.push({ other: a, rel })
  }
  return out
}

// The dominant pole of a relation + its display chrome (Hebrew label + token-driven colour).
const POLE: Record<'t' | 'f' | 'h', { he: string; cls: string }> = {
  t: { he: 'מתח', cls: 'panelb__chip--t' },
  f: { he: 'חיכוך', cls: 'panelb__chip--f' },
  h: { he: 'הרמוניה', cls: 'panelb__chip--h' },
}
function dominantPole(rel: AuthoredRelation): { key: 't' | 'f' | 'h'; v: number } {
  const entries: ['t' | 'f' | 'h', number][] = [['t', rel.t], ['f', rel.f], ['h', rel.h]]
  let best: { key: 't' | 'f' | 'h'; v: number } = { key: 't', v: -1 }
  for (const [k, v] of entries) if (v > best.v) best = { key: k, v }
  return best
}

// DYNAMICS synthesis (dynamics view only) — the relations-of-power read: compressed forces,
// the three sharpest authored relations, and a derived one-liner that fuses axis + relation.
function DynamicsSynthesis({ detail, onRelSelect }: { detail: EntityDetail; onRelSelect?: (id: string) => void }) {
  const heById = useMemo(() => new Map(NODES.map((n) => [n.id, n.he])), [])
  const id = detail.id
  const f = detail.forces
  // top relations by the strength of their dominant pole — the most defining ties first
  const top = useMemo(() => {
    if (!id) return []
    return relationsFor(id)
      .map((r) => ({ ...r, dom: dominantPole(r.rel) }))
      .sort((a, b) => b.dom.v - a.dom.v)
      .slice(0, 3)
  }, [id])
  if (!id) return null
  // strongest forces axis (for the caption)
  const axisName = f
    ? (['eco', 'mil', 'geo'] as const)
        .map((k) => ({ k, v: f[k] }))
        .reduce((m, x) => (x.v > m.v ? x : m)).k
    : null
  const AXIS_HE: Record<'eco' | 'mil' | 'geo', string> = { eco: 'הכוח הכלכלי', mil: 'הכוח הצבאי', geo: 'המעמד הגאו-אסטרטגי' }
  // top tension partner + top harmony partner among authored relations (for the caption)
  const all = relationsFor(id)
  const topTension = all.slice().sort((a, b) => b.rel.t - a.rel.t)[0]
  const topHarmony = all.slice().sort((a, b) => b.rel.h - a.rel.h)[0]
  const caption =
    axisName && topTension && topHarmony
      ? `${detail.he}: עוצמתה נשענת על ${AXIS_HE[axisName]}, מתוחה מול ${heById.get(topTension.other) ?? topTension.other}, ונסמכת על ${heById.get(topHarmony.other) ?? topHarmony.other}.`
      : null
  return (
    <div className="panelb__synth">
      <span className="panel__rels-h"><Icon name="orbit" className="panel__orbit-icon" />סינתזה</span>
      {f && (
        <div className="panelb__mini-bars">
          {(['eco', 'mil', 'geo'] as const).map((k) => (
            <div key={k} className="panelb__mini-bar">
              <Icon name={k} className="panelb__mini-icon" />
              <span className="panelb__mini-track"><i style={{ width: `${f[k] * 10}%` }} /></span>
              <span className="panelb__mini-v">{f[k]}</span>
            </div>
          ))}
        </div>
      )}
      {top.length > 0 && (
        <div className="panelb__rel-rows">
          {top.map(({ other, rel, dom }) => (
            <button key={other} className="panelb__rel-row" onClick={() => onRelSelect?.(other)}>
              <span className="panelb__rel-name">{heById.get(other) ?? other}</span>
              <span className={`panelb__chip ${POLE[dom.key].cls}`}>{POLE[dom.key].he}</span>
              <span className="panelb__rel-why">{rel.why}</span>
            </button>
          ))}
        </div>
      )}
      {caption && <p className="panelb__synth-caption">{caption}</p>}
    </div>
  )
}

interface DetailProps { detail: EntityDetail; onClose?: () => void; onRelSelect?: (id: string) => void; view?: View }

// Per-value icon lookups — each specific label gets its own distinct mark.
// Fallback to the generic category icon if a value is unrecognised.
const TIER_ICON: Record<string, IconName> = {
  'כוח-על': 'tier-great', 'כוח אזורי': 'tier-regional', 'כוח ביניים': 'tier-mid',
  'כוח קצה': 'tier-edge', 'שחקן לא-מדינתי': 'tier-nonstate',
}
const AXIS_ICON: Record<string, IconName> = {
  'הציר המערבי': 'axis-west', 'הציר המזרחי': 'axis-east',
  'גוש ניטרלי': 'axis-neutral', 'ללא שיוך': 'axis-none',
}
const DISPO_ICON: Record<string, IconName> = {
  'אגרסיבית': 'dispo-agg', 'אסרטיבית': 'dispo-assert', 'זהירה': 'dispo-caut',
}

// The detail panel — top: rank + title + three descriptors; score gauge; bottom: pnotes (כללי
// reads as plain intro text; eco/mil/geo as scored component rows). Sources live in the evidence overlay.
function SidePanelHybrid({ detail, onClose, onRelSelect, view }: DetailProps) {
  const score = detail.scoreLabel ? detail.scoreLabel.split(' ')[0] : String(detail.power)
  const unit = detail.scoreLabel ? '/ 10' : '/ 100'
  const scoreNum = Number(score)
  const descriptors: { icon: IconName; text: string; hint: string }[] = [
    { icon: TIER_ICON[detail.tier] ?? 'tier', text: detail.tier, hint: 'דרגת העוצמה — סיווג הכוח של הגוף (כוח-על, אזורי, ביניים או קצה)' },
    { icon: AXIS_ICON[detail.axisLabel] ?? 'axis', text: detail.axisLabel, hint: 'שיוך — הגוש הגאו-פוליטי שאליו נוטה הגוף' },
    ...(detail.dispo ? [{ icon: (DISPO_ICON[detail.dispo] ?? 'dispo') as IconName, text: detail.dispo, hint: 'עמדה — האוריינטציה האסטרטגית של הגוף' }] : []),
  ]
  return (
    <aside className="panelb panel--detail" dir="rtl">
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <div className="panelb__top">
        {detail.rank && <span className="panelb__rank" data-hint="הדירוג בכוח המשיכה — מקומו של הגוף בטבלת העוצמה">{String(detail.rank).padStart(2, '0')}</span>}
        <div className="panelb__id">
          <h1 className="panelb__title">{detail.he}</h1>
          <div className="panelb__descriptors">
            {descriptors.map(d => (
              <span key={d.text} className="panelb__desc" data-hint={d.hint}>
                <Icon name={d.icon} className="panelb__desc-icon" />{d.text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="panelb__scorebox" data-hint="כוח משיכה — המשקל הפוליטי הכולל: שקלול הכוח הכלכלי, הצבאי והגאו-אסטרטגי">
        <div className="panelb__score"><b>{score}</b><span>{unit}</span></div>
        <div className="panelb__score-side">
          <span className="panelb__score-lbl">כוח משיכה</span>
          {detail.rank && detail.total && <span className="panelb__score-rank">מדורגת {detail.rank} מתוך {detail.total}</span>}
        </div>
        <span className="panelb__gauge"><i style={{ width: `${Number.isFinite(scoreNum) ? scoreNum * 10 : detail.power}%` }} /></span>
      </div>
      {detail.powerNotes && (
        <div className="pnotes">
          <p className="pnotes__intro" data-hint="תיאור כללי — תמצית מעמדו של הגוף במערך הכוחות">{detail.powerNotes.general}</p>
          <PowerNote label="כלכלי" icon="eco" text={detail.powerNotes.eco} value={detail.forces?.eco} hint="כוח כלכלי — תמ״ג, סחר, פיננסים ומשקל בשרשראות האספקה" />
          <PowerNote label="צבאי" icon="mil" text={detail.powerNotes.mil} value={detail.forces?.mil} hint="כוח צבאי — הוצאות ביטחון, יכולות וכוח אש" />
          <PowerNote label="גאו-אסטרטגי" icon="geo" text={detail.powerNotes.geo} value={detail.forces?.geo} hint="כוח גאו-אסטרטגי — מיקום, בריתות והשפעה אזורית" />
          {detail.backing && (
            <div className="pnote pnote--backing">
              <div className="pnote__head">
                <span className="pnote__label">גיבוי ⟵ {detail.backing.patronHe}</span>
                <span className="pnote__val">+{detail.backing.amount}</span>
              </div>
              <p className="pnote__text">משקל פוליטי מושאל — חלק מכוח המשיכה תלוי בנותן החסות.</p>
            </div>
          )}
          {view === 'forces' && <ForcesDrillDown detail={detail} />}
          <EvidenceTrigger detail={detail} />
        </div>
      )}
      {view === 'dynamics' && <DynamicsSynthesis detail={detail} onRelSelect={onRelSelect} />}
      <OrbitSection detail={detail} onRelSelect={onRelSelect} />
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

export function SidePanel({ detail, onClose, onRelSelect, view }: { detail?: EntityDetail | null; onClose?: () => void; onRelSelect?: (id: string) => void; view?: View }) {
  if (detail) {
    return <SidePanelHybrid detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
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

export type View = 'home' | 'forces' | 'relations' | 'dynamics'
const TABS: { he: string; view: View; ready?: boolean }[] = [
  { he: 'הכוחות', view: 'forces', ready: true },
  { he: 'היחסים', view: 'relations', ready: true },
  { he: 'יחסי הכוחות', view: 'dynamics', ready: true },
]

export function TabBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  const navRef = useRef<HTMLElement>(null)
  // a single shared marker that slides (translateX) to the active tab; measured from real
  // tab geometry so RTL + varying Hebrew widths both stay correct. Re-measures on resize.
  const [marker, setMarker] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current
      if (!nav) return
      const idx = TABS.findIndex((t) => t.view === view)
      if (idx < 0) { setMarker(null); return }
      const tabEl = nav.children[idx] as HTMLElement | undefined
      if (!tabEl) return
      // offsetLeft is relative to the nav's padding box — already RTL-correct
      setMarker({ x: tabEl.offsetLeft, w: tabEl.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view])

  return (
    <nav className="tabs" dir="rtl" aria-label="תצוגות" ref={navRef}>
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
      {marker && (
        <span
          className="tabs__marker"
          aria-hidden
          style={{ width: marker.w, transform: `translateX(${marker.x}px)` }}
        />
      )}
    </nav>
  )
}
