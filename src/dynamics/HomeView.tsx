import { Header, type View } from './Chrome'
import { sound } from '../sound'

// Nav anchored around the orbit ring: dynamics top, forces bottom-left, relations bottom-right.
// `sub` is the brief explainer revealed on hover.
const NAV: { view: View; he: string; sub: string; pos: string }[] = [
  { view: 'dynamics', he: 'יחסי הכוחות', sub: 'התמונה המלאה', pos: 'top' },
  { view: 'forces', he: 'הכוחות', sub: 'כוח המשיכה של המדינות', pos: 'bl' },
  { view: 'relations', he: 'היחסים', sub: 'מערכות היחסים ביניהן', pos: 'br' },
]

/**
 * The home is one circle in two states:
 *  - closed → a breathing core (the opener), particles drifting inward
 *  - open   → the orbit ring expands, wordmark + nav + tagline reveal
 * Clicking the centre toggles between them; the expansion is animated, not a dissolve.
 */
export default function HomeView({ open, onToggle, onView }: { open: boolean; onToggle: () => void; onView: (v: View) => void }) {
  // The global particle field handles the background + click reactivity now.
  const toggle = () => { sound.start(); sound.play(open ? 'back' : 'open'); onToggle() }

  return (
    <div className={`stage home ${open ? 'home--open' : 'home--closed'}`} dir="rtl">
      <div className="home-center" aria-hidden>
        {/* the mask fills the ring (a child of the orbit → tracks its size exactly): pitch-black
            core that particles fall into; hover exposes the field behind at 50% */}
        <div className="home-orbit"><div className="home-mask" /><div className="home-orbit__spin"><span className="home-orbit__dot" /></div></div>
      </div>
      <button className="home-core" onClick={toggle} aria-label={open ? 'סגירת המעגל' : 'פתיחת המעגל'}>
        <span className="home-core__dot" />
      </button>

      <p className="home-tagline"><span>תורת היחסות של המזרח התיכון</span></p>
      <h1 className="home-title"><span>מאקרופוליטיקה</span></h1>
      <p className="home-eq" aria-hidden><span>יחסי הכוחות = הכוחות + היחסים</span></p>

      <nav className="home-nav" aria-label="כניסה">
        {NAV.map((n, i) => (
          <button
            key={n.view}
            className={`home-nav__item home-nav__item--${n.pos}`}
            style={{ '--bd': `${i * 0.6}s` } as React.CSSProperties}
            onClick={() => onView(n.view)}
          >
            <span className="home-nav__label"><span>{n.he}</span></span>
            <span className="home-nav__sub">{n.sub}</span>
          </button>
        ))}
      </nav>

      <p className="home-hint">לחצו</p>
      <p className="home-credit">מודל 0.9 · השיפוט פרשני · מקרא ומתודולוגיה בכותרת</p>
      <Header onHome={() => {}} />
    </div>
  )
}
