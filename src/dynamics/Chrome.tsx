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
export function PanelDock({ children, forceOpen, forceClosed }: { children: ReactNode; forceOpen?: boolean; forceClosed?: boolean }) {
  // mounts closed, then slides in after the page transition has landed — the panel
  // arriving a beat late reads as a considered reveal, not a static frame.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 850)
    return () => window.clearTimeout(t)
  }, [])
  // mobile map/list toggle drives the sheet: forceClosed (map, nothing selected) keeps the field
  // full-screen; forceOpen (list, or a body selected) pins it open. Desktop passes neither.
  const isOpen = forceClosed ? false : (forceOpen || open)
  return (
    <div className={`pdock${isOpen ? ' pdock--open' : ' pdock--closed'}`}>
      <div className="pdock__panel">{children}</div>
      <button
        className="pdock__handle"
        onClick={() => { sound.play('tab'); setOpen((o) => !o) }}
        aria-label={isOpen ? 'הסתרת לוח המידע' : 'הצגת לוח המידע'}
        aria-expanded={isOpen}
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

// One scored parameter row (forces · ציון mode). Number sits IMMEDIATELY beside the
// category label for fast label→value scanning; the bar is a full-width track beneath.
// Fixed min-height so all three rows share identical height regardless of label length.
function ForceParam({ label, value, icon, hint }: { label: string; value?: number; icon: IconName; hint?: string }) {
  return (
    <div className="fparam">
      <div className="fparam__lead">
        <span className="fparam__label" data-hint={hint}><Icon name={icon} className="fparam__icon" />{label}</span>
        {value != null && <span className="fparam__val">{value}</span>}
      </div>
      {value != null && (
        <span className="fparam__track"><i style={{ width: `${value * 10}%` }} /></span>
      )}
    </div>
  )
}

// The evidence link — opens the sources/calculation overlay. A subtle on-brand text link
// (not a grey box), consistent with the panel's accent language.
function EvidenceLink({ detail }: { detail: EntityDetail }) {
  if (!detail.id) return null
  return (
    <button
      className="fevidence"
      onClick={() => window.dispatchEvent(new CustomEvent('mp-evidence', { detail: { id: detail.id } }))}
    >
      המקורות והחישוב <span aria-hidden>↗</span>
    </button>
  )
}

// FORCES narrative (forces · תיאור mode): the interpretation layer, shown flat (no collapsible).
// General read plus three axis blocks (eco/mil/geo) drawn from FORCES_DESCRIPTIONS. Falls back to
// the short POWER_NOTES summaries where a long description is absent, so the mode is never empty.
function ForcesNarrative({ detail }: { detail: EntityDetail }) {
  const desc = detail.id ? FORCES_DESCRIPTIONS[detail.id] : undefined
  const notes = detail.powerNotes
  const general = desc?.general ?? notes?.general
  const axes: { label: string; icon: IconName; text?: string }[] = [
    { label: 'כלכלי', icon: 'eco', text: desc?.eco ?? notes?.eco },
    { label: 'צבאי', icon: 'mil', text: desc?.mil ?? notes?.mil },
    { label: 'גאו-אסטרטגי', icon: 'geo', text: desc?.geo ?? notes?.geo },
  ]
  if (!general && axes.every((a) => !a.text)) return null
  return (
    <div className="fnarr">
      {general && <p className="fnarr__gen">{general}</p>}
      {axes.filter((a) => a.text).map((a) => (
        <div key={a.label} className="fnarr__axis">
          <span className="fnarr__axis-l"><Icon name={a.icon} className="fnarr__axis-icon" />{a.label}</span>
          <p className="fnarr__axis-t">{a.text}</p>
        </div>
      ))}
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

// DYNAMICS card (dynamics view only) — a dedicated COMPACT layout fusing forces × relations,
// sized to fit the first fold with no vertical scroll. Replaces the verbose forces stack here.
// Compact header · power fingerprint (forces) · 2–3 defining ties (relations) · fused caption.
function DynamicsCard({ detail, onClose, onRelSelect }: DetailProps) {
  const heById = useMemo(() => new Map(NODES.map((n) => [n.id, n.he])), [])
  const id = detail.id
  const f = detail.forces
  const score = detail.scoreLabel ? detail.scoreLabel.split(' ')[0] : String(detail.power)
  // the two tight descriptor chips (tier + axis) — disposition is dropped to stay compact
  const chips: { icon: IconName; text: string }[] = [
    { icon: TIER_ICON[detail.tier] ?? 'tier', text: detail.tier },
    { icon: AXIS_ICON[detail.axisLabel] ?? 'axis', text: detail.axisLabel },
  ]
  // the 2–3 sharpest authored relations — most defining ties first (by dominant-pole strength)
  const top = useMemo(() => {
    if (!id) return []
    return relationsFor(id)
      .map((r) => ({ ...r, dom: dominantPole(r.rel) }))
      .sort((a, b) => b.dom.v - a.dom.v)
      .slice(0, 3)
  }, [id])
  // fused caption: strongest axis + top-tension partner + top-harmony partner
  const axisName = f
    ? (['eco', 'mil', 'geo'] as const).map((k) => ({ k, v: f[k] })).reduce((m, x) => (x.v > m.v ? x : m)).k
    : null
  const AXIS_HE: Record<'eco' | 'mil' | 'geo', string> = { eco: 'הכוח הכלכלי', mil: 'הכוח הצבאי', geo: 'המעמד הגאו-אסטרטגי' }
  const all = id ? relationsFor(id) : []
  const topTension = all.slice().sort((a, b) => b.rel.t - a.rel.t)[0]
  const topHarmony = all.slice().sort((a, b) => b.rel.h - a.rel.h)[0]
  const caption =
    axisName && topTension && topHarmony
      ? `${detail.he}: עוצמתה נשענת על ${AXIS_HE[axisName]}, מתוחה מול ${heById.get(topTension.other) ?? topTension.other}, ונסמכת על ${heById.get(topHarmony.other) ?? topHarmony.other}.`
      : null
  return (
    <aside className="panelb dcard panel--detail" dir="rtl">
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <header className="dcard__head">
        {detail.rank && <span className="dcard__rank">{String(detail.rank).padStart(2, '0')}</span>}
        <h1 className="dcard__title">{detail.he}</h1>
        <div className="dcard__chips">
          {chips.map((c) => (
            <span key={c.text} className="dcard__chip"><Icon name={c.icon} className="dcard__chip-icon" />{c.text}</span>
          ))}
        </div>
      </header>
      {f && (
        <div className="dcard__fingerprint" data-hint="טביעת הכוח — שלושת מרכיבי העוצמה וכוח המשיכה הכולל">
          <div className="dcard__bars">
            {(['eco', 'mil', 'geo'] as const).map((k) => (
              <div key={k} className="dcard__bar">
                <Icon name={k} className="dcard__bar-icon" />
                <span className="dcard__bar-track"><i style={{ width: `${f[k] * 10}%` }} /></span>
                <span className="dcard__bar-v">{f[k]}</span>
              </div>
            ))}
          </div>
          <div className="dcard__score">
            <b>{score}</b><span>כוח משיכה</span>
          </div>
        </div>
      )}
      {top.length > 0 && (
        <div className="dcard__ties">
          <span className="dcard__ties-h">קשרים מגדירים</span>
          {top.map(({ other, dom }) => (
            <button key={other} className="dcard__tie" onClick={() => onRelSelect?.(other)}>
              <span className="dcard__tie-name">{heById.get(other) ?? other}</span>
              <span className={`panelb__chip ${POLE[dom.key].cls}`}>{POLE[dom.key].he}</span>
            </button>
          ))}
        </div>
      )}
      {caption && <p className="dcard__caption">{caption}</p>}
    </aside>
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

// Shared identity header — rank + title, with descriptor chips right-aligned (RTL leading edge)
// in a cohesive cluster beneath the title. Used by the forces detail panel.
function PanelHeader({ detail }: { detail: EntityDetail }) {
  const descriptors: { icon: IconName; text: string; hint: string }[] = [
    { icon: TIER_ICON[detail.tier] ?? 'tier', text: detail.tier, hint: 'דרגת העוצמה — סיווג הכוח של הגוף (כוח-על, אזורי, ביניים או קצה)' },
    { icon: AXIS_ICON[detail.axisLabel] ?? 'axis', text: detail.axisLabel, hint: 'שיוך — הגוש הגאו-פוליטי שאליו נוטה הגוף' },
    ...(detail.dispo ? [{ icon: (DISPO_ICON[detail.dispo] ?? 'dispo') as IconName, text: detail.dispo, hint: 'עמדה — האוריינטציה האסטרטגית של הגוף' }] : []),
  ]
  return (
    <header className="phead">
      <div className="phead__line">
        {detail.rank && <span className="phead__rank" data-hint="הדירוג בכוח המשיכה — מקומו של הגוף בטבלת העוצמה">{String(detail.rank).padStart(2, '0')}</span>}
        <h1 className="phead__title">{detail.he}</h1>
      </div>
      <div className="phead__descriptors">
        {descriptors.map((d) => (
          <span key={d.text} className="panelb__desc" data-hint={d.hint}>
            <Icon name={d.icon} className="panelb__desc-icon" />{d.text}
          </span>
        ))}
      </div>
    </header>
  )
}

// The grading cluster (forces · ציון mode) — power gauge + three fixed-height parameter rows,
// backing note (if any), and the evidence link. One grouped, scannable unit.
function ForcesScore({ detail }: { detail: EntityDetail }) {
  const score = detail.scoreLabel ? detail.scoreLabel.split(' ')[0] : String(detail.power)
  const unit = detail.scoreLabel ? '/ 10' : '/ 100'
  const scoreNum = Number(score)
  return (
    <div className="fscore">
      <div className="panelb__scorebox" data-hint="כוח משיכה — המשקל הפוליטי הכולל: שקלול הכוח הכלכלי, הצבאי והגאו-אסטרטגי">
        <div className="panelb__score"><b>{score}</b><span>{unit}</span></div>
        <div className="panelb__score-side">
          <span className="panelb__score-lbl">כוח משיכה</span>
          {detail.rank && detail.total && <span className="panelb__score-rank">מדורגת {detail.rank} מתוך {detail.total}</span>}
        </div>
        <span className="panelb__gauge"><i style={{ width: `${Number.isFinite(scoreNum) ? scoreNum * 10 : detail.power}%` }} /></span>
      </div>
      <div className="fparams">
        <ForceParam label="כלכלי" icon="eco" value={detail.forces?.eco} hint="כוח כלכלי — תמ״ג, סחר, פיננסים ומשקל בשרשראות האספקה" />
        <ForceParam label="צבאי" icon="mil" value={detail.forces?.mil} hint="כוח צבאי — הוצאות ביטחון, יכולות וכוח אש" />
        <ForceParam label="גאו-אסטרטגי" icon="geo" value={detail.forces?.geo} hint="כוח גאו-אסטרטגי — מיקום, בריתות והשפעה אזורית" />
      </div>
      {detail.backing && (
        <div className="fbacking">
          <span className="fbacking__label">גיבוי ⟵ {detail.backing.patronHe}</span>
          <span className="fbacking__val">+{detail.backing.amount}</span>
          <p className="fbacking__text">משקל פוליטי מושאל — חלק מכוח המשיכה תלוי בנותן החסות.</p>
        </div>
      )}
      <EvidenceLink detail={detail} />
    </div>
  )
}

// FORCES detail panel (forces view) — grouped header + a segmented switch (ציון / תיאור)
// that toggles the body between the grading cluster and the narrative. Default = ציון.
function ForcesPanel({ detail, onClose, onRelSelect }: DetailProps) {
  const [mode, setMode] = useState<'score' | 'desc'>('score')
  // a fresh selection always lands on ציון — the switch is per-body, not sticky.
  const [lastId, setLastId] = useState(detail.id)
  if (detail.id !== lastId) { setLastId(detail.id); setMode('score') }
  const pick = (m: 'score' | 'desc') => { if (m !== mode) { sound.play('tab'); setMode(m) } }
  return (
    <aside className="panelb panel--detail" dir="rtl">
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <PanelHeader detail={detail} />
      <div className="fswitch" role="tablist" aria-label="תצוגת הכוח">
        <button className={`fswitch__btn${mode === 'score' ? ' is-on' : ''}`} role="tab" aria-selected={mode === 'score'} onClick={() => pick('score')}>ציון</button>
        <button className={`fswitch__btn${mode === 'desc' ? ' is-on' : ''}`} role="tab" aria-selected={mode === 'desc'} onClick={() => pick('desc')}>תיאור</button>
      </div>
      <div className="fbody">
        {mode === 'score' ? <ForcesScore detail={detail} /> : <ForcesNarrative detail={detail} />}
      </div>
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

// Router for the selected-body panel: a compact card for Dynamics, the richer two-mode
// layout for Forces (and any other view that surfaces a detail).
function SidePanelHybrid({ detail, onClose, onRelSelect, view }: DetailProps) {
  if (view === 'dynamics') {
    return <DynamicsCard detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
  }
  return <ForcesPanel detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
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
