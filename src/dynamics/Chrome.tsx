// Static page chrome around the field: logo, side panel, right rail, bottom tabs.
// Kept together (all small, presentational) — split out if any grows past ~40 lines.
import { useState, type ReactNode } from 'react'
import type { PowerNotes } from '../data/entities'
import { sound } from '../sound'

// Collapsible dock for the side panel: a grip handle that slides the panel off the
// right edge; when collapsed, hovering the handle peeks it open to signal it's clickable.
export function PanelDock({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  // Handle is pinned (never moves) so hovering it can't jitter; only the panel slides.
  // The panel renders BEFORE the handle so the handle paints on top while peeking.
  return (
    <div className={`pdock${open ? '' : ' pdock--closed'}`}>
      <div className="pdock__panel">{children}</div>
      <button
        className="pdock__handle"
        onClick={() => { sound.play('tab'); setOpen((o) => !o) }}
        aria-label={open ? 'הסתרת לוח המידע' : 'הצגת לוח המידע'}
        aria-expanded={open}
      >
        <span className="pdock__grip" />
      </button>
    </div>
  )
}

export function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="hdr">
      <button className="hdr__logo" onClick={onHome} aria-label="דף הבית">מאקרופוליטיקה</button>
      <button className="hdr__info" aria-label="מקרא" onClick={() => window.dispatchEvent(new Event('mp-legend'))}>ⓘ</button>
    </header>
  )
}

export interface EntityDetail {
  he: string; power: number; tier: string; dispo: string
  axisLabel: string; parentHe: string | null; relations: { id: string; he: string }[]
  scoreLabel?: string // forces view: "6.6 / 10" instead of "/100"
  forces?: { eco: number; mil: number; geo: number }
  powerNotes?: PowerNotes // forces view: four short paragraphs (general + components)
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel__row">
      <span className="panel__row-k">{label}</span>
      <span className="panel__row-v">{value}</span>
    </div>
  )
}

// One power note: a label, an optional 0–10 bar (the three components), and ≤20-word text.
function PowerNote({ label, text, value }: { label: string; text: string; value?: number }) {
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
    </div>
  )
}

export function SidePanel({ detail, onClose, onRelSelect }: { detail?: EntityDetail | null; onClose?: () => void; onRelSelect?: (id: string) => void }) {
  if (detail) {
    return (
      <aside className="panel panel--detail" dir="rtl">
        <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
        <h1 className="panel__title">{detail.he}</h1>
        <div className="panel__meta">
          <MetaRow label="כבידה" value={detail.scoreLabel ?? `${detail.power} / 100`} />
          <MetaRow label="מעמד" value={detail.tier} />
          {!detail.powerNotes && <MetaRow label="אופי" value={detail.dispo} />}
          <MetaRow label="שיוך" value={detail.axisLabel} />
          {detail.parentHe && <MetaRow label="במסלול סביב" value={detail.parentHe} />}
        </div>
        {detail.powerNotes && (
          <div className="pnotes">
            <span className="pnotes__h">פרופיל הכבידה</span>
            <PowerNote label="כללי" text={detail.powerNotes.general} />
            <PowerNote label="כלכלי" text={detail.powerNotes.eco} value={detail.forces?.eco} />
            <PowerNote label="צבאי" text={detail.powerNotes.mil} value={detail.forces?.mil} />
            <PowerNote label="גאו-אסטרטגי" text={detail.powerNotes.geo} value={detail.forces?.geo} />
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
  return (
    <aside className="panel" dir="rtl">
      <h1 className="panel__title">יחסי הכוחות</h1>
      <p className="panel__body">
        במערך יחסי הכוחות ניתן לראות את השילוב של הכוחות והיחסים, ולהבין את הדינמיקות דרך
        הגופים, מעגלי ההשפעה ומרכזי הכובד. גודלם נקבע על פי כוח משיכתם, והמרחקים ביניהם
        מעידים על אופי היחסים שלהם.
      </p>
      <h2 className="panel__eq">יחסי הכוחות = הכוחות + היחסים</h2>
      <p className="panel__note">בחרו גוף במפה כדי לראות את נתוניו.</p>
    </aside>
  )
}

export function RightRail() {
  return (
    <nav className="rail" dir="rtl" aria-label="מעברים">
      <span className="rail__item">הכוחות</span>
      <span className="rail__item">היחסים</span>
    </nav>
  )
}

export type View = 'home' | 'forces' | 'relations' | 'dynamics'
const TABS: { he: string; view: View; ready?: boolean }[] = [
  { he: 'הכוחות', view: 'forces', ready: true },
  { he: 'היחסים', view: 'relations', ready: true },
  { he: 'יחסי הכוחות', view: 'dynamics', ready: true },
]

export function TabBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <nav className="tabs" dir="rtl" aria-label="תצוגות">
      {TABS.map((t) => (
        <button
          key={t.he}
          className={`tab${view === t.view ? ' tab--active' : ''}${t.ready === false ? ' tab--soon' : ''}`}
          onClick={() => t.ready !== false && onView(t.view)}
        >
          {t.he}
        </button>
      ))}
    </nav>
  )
}
