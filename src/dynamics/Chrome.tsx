// Static page chrome around the field: logo, side panel, right rail, bottom tabs.
// Kept together (all small, presentational) — split out if any grows past ~40 lines.

export function Header() {
  return (
    <header className="hdr">
      <span className="hdr__logo">מאקרופוליטיקה</span>
      <span className="hdr__info" aria-hidden>ⓘ</span>
    </header>
  )
}

export interface EntityDetail {
  he: string; power: number; tier: string; dispo: string
  axisLabel: string; parentHe: string | null; relations: string[]
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel__row">
      <span className="panel__row-k">{label}</span>
      <span className="panel__row-v">{value}</span>
    </div>
  )
}

export function SidePanel({ detail, onClose }: { detail?: EntityDetail | null; onClose?: () => void }) {
  if (detail) {
    return (
      <aside className="panel panel--detail" dir="rtl">
        <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
        <h1 className="panel__title">{detail.he}</h1>
        <div className="panel__meta">
          <MetaRow label="כוח משיכה" value={`${detail.power} / 100`} />
          <MetaRow label="מעמד" value={detail.tier} />
          <MetaRow label="אופי" value={detail.dispo} />
          <MetaRow label="שיוך" value={detail.axisLabel} />
          {detail.parentHe && <MetaRow label="במסלול סביב" value={detail.parentHe} />}
        </div>
        {detail.relations.length > 0 && (
          <div className="panel__rels">
            <span className="panel__rels-h">יחסים</span>
            <div className="panel__rels-list">
              {detail.relations.map((r) => <span key={r} className="panel__rel">{r}</span>)}
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

const TABS = [
  { he: 'הכוחות', href: '#forces' },
  { he: 'היחסים', href: '#relations' },
  { he: 'יחסי הכוחות', href: '#dynamics', active: true },
]

export function TabBar() {
  return (
    <nav className="tabs" dir="rtl" aria-label="תצוגות">
      {TABS.map((t) => (
        <a key={t.he} href={t.href} className={`tab${t.active ? ' tab--active' : ''}`}>
          {t.he}
        </a>
      ))}
    </nav>
  )
}
