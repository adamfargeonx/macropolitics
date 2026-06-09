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

export function SidePanel() {
  return (
    <aside className="panel" dir="rtl">
      <h1 className="panel__title">יחסי הכוחות</h1>
      <p className="panel__body">
        במערך יחסי הכוחות ניתן לראות את השילוב של הכוחות והיחסים, ולהבין את הדינמיקות דרך
        הגופים, מעגלי ההשפעה ומרכזי הכובד. גודלם נקבע על פי כוח משיכתם, והמרחקים ביניהם
        מעידים על אופי היחסים שלהם.
      </p>
      <h2 className="panel__eq">יחסי הכוחות = הכוחות + היחסים</h2>
      <p className="panel__note">יחסי הכוחות הם השילוב בין מעגלי היחסים ומשוואת הכוחות.</p>
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
