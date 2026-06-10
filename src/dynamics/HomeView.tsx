import { useRef } from 'react'
import { Header, type View } from './Chrome'
import { useGravityField, type Impulse } from './useGravityField'
import { sound } from '../sound'

// Nav anchored around the orbit ring: dynamics top, forces bottom-left, relations bottom-right.
// `sub` is the brief explainer revealed on hover.
const NAV: { view: View; he: string; sub: string; pos: string }[] = [
  { view: 'dynamics', he: 'יחסי הכוחות', sub: 'התמונה המלאה', pos: 'top' },
  { view: 'forces', he: 'הכוחות', sub: 'כבידתן של המדינות', pos: 'bl' },
  { view: 'relations', he: 'היחסים', sub: 'מערכות היחסים ביניהן', pos: 'br' },
]

/**
 * The home is one circle in two states:
 *  - closed → a breathing core (the opener), particles drifting inward
 *  - open   → the orbit ring expands, wordmark + nav + tagline reveal
 * Clicking the centre toggles between them; the expansion is animated, not a dissolve.
 */
export default function HomeView({ open, onToggle, onView }: { open: boolean; onToggle: () => void; onView: (v: View) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const impulseRef = useRef<Impulse | null>(null)
  useGravityField(canvasRef, impulseRef)

  // every click scatters particles; the centre core toggles open/close
  const scatter = (e: React.PointerEvent) => { impulseRef.current = { x: e.clientX, y: e.clientY, t: performance.now() } }
  const toggle = () => { sound.start(); sound.play(open ? 'back' : 'open'); onToggle() }

  return (
    <div className={`stage home ${open ? 'home--open' : 'home--closed'}`} dir="rtl" onPointerDown={scatter}>
      <canvas ref={canvasRef} className="field" />

      <div className="home-center" aria-hidden>
        <div className="home-orbit"><div className="home-orbit__spin"><span className="home-orbit__dot" /></div></div>
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
