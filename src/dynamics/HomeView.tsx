import { useEffect, useRef, useState } from 'react'
import { type View } from './Chrome'
import { sound } from '../sound'
import { Words } from './Words'

// Nav anchored around the orbit ring: dynamics top, forces bottom-left, relations bottom-right.
// `sub` is the brief explainer revealed on hover (and when the orbit dot sweeps near — see below).
const NAV: { view: View; he: string; sub: string; pos: string }[] = [
  { view: 'dynamics', he: 'יחסי הכוחות', sub: 'התמונה המלאה', pos: 'top' },
  { view: 'forces', he: 'הכוחות', sub: 'כוח המשיכה של המדינות', pos: 'bl' },
  { view: 'relations', he: 'היחסים', sub: 'מערכות היחסים ביניהן', pos: 'br' },
]

// The opener thesis — backbone line + the description on two lines (no equation; that lives inside).
const INTRO_L1 = 'תורת היחסות של המזרח התיכון'
const INTRO_L2A = 'כל מדינה היא גוף בעל כובד: כוח מכופף מרחב, וקרבה היא משיכה.'
const INTRO_L2B = 'מאקרופוליטיקה היא מערכת הממפה את מדינות המזרח התיכון לכדי מערך של כוחות ויחסים המניעים את האזור.'

const LEAN_MAX = 16    // px — the closed core leans, magnetically, toward the cursor

// Orbit-dot rotation (deg) at which the dot aligns with each nav title — shared by the scroll
// proximity-trigger and the click-to-lock page transition.
const LOCK_ANGLE: Record<View, number> = { dynamics: 0, relations: 120, forces: 240, home: 0 }
const LOCK_SWEEP_MS = 900 // must match App's LOCK — the dramatic dot sweep before diving into a page

/**
 * The home is one circle in two states:
 *  - closed → a breathing core (the landing), with a permanent two-line thesis describing the site
 *  - open   → the orbit ring expands, wordmark + nav + tagline + equation reveal; the orbit dot is
 *             JS-driven so scrolling accelerates it, and as it sweeps near a title that title's
 *             descriptor reveals. Faster scrolling makes the core glow (speed-sensitive).
 * Clicking the centre toggles between them; the expansion is animated, not a dissolve.
 */
export default function HomeView({ open, intro = false, lockTo = null, onToggle, onView }: { open: boolean; intro?: boolean; lockTo?: View | null; onToggle: () => void; onView: (v: View) => void }) {
  const toggle = () => { sound.start(); sound.play(open ? 'back' : 'open'); onToggle() }
  const [orbitHovered, setOrbitHovered] = useState(false)
  const [nearNav, setNearNav] = useState<View | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<HTMLDivElement>(null)
  const lockRef = useRef<{ to: View; from: number; target: number; t0: number } | null>(null)

  // arm a dramatic sweep when App requests a lock (home → page). The orbit tick captures the
  // current angle, loops a full turn, then decelerates onto the chosen title's angle.
  useEffect(() => {
    lockRef.current = lockTo == null ? null : { to: lockTo, from: NaN, target: NaN, t0: 0 }
  }, [lockTo])

  // the thesis is a permanent part of the landing (closed) state — never dismissed; it gives way
  // only when the visitor enters (the open state).
  const showThesis = intro && !open

  // magnetic lean — the closed core drifts a few px toward the cursor (transform-only, rAF-gated)
  useEffect(() => {
    if (open) { rootRef.current?.style.setProperty('--lean-x', '0px'); rootRef.current?.style.setProperty('--lean-y', '0px'); return }
    let raf = 0
    const onMove = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = rootRef.current
        if (!el) return
        const dx = (e.clientX - innerWidth / 2) / (innerWidth / 2)
        const dy = (e.clientY - innerHeight / 2) / (innerHeight / 2)
        el.style.setProperty('--lean-x', `${Math.max(-1, Math.min(1, dx)) * LEAN_MAX}px`)
        el.style.setProperty('--lean-y', `${Math.max(-1, Math.min(1, dy)) * LEAN_MAX}px`)
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [open])

  // open-state orbit engine — JS drives the dot's rotation so the wheel can accelerate it. Extra
  // velocity decays back to the idle spin. Near a title → reveal its descriptor. Speed → core glow.
  useEffect(() => {
    if (!open) return
    const spin = spinRef.current
    const root = rootRef.current
    if (!spin || !root) return
    const BASE = 8.2, GAIN = 0.05, MAX = 900, DECAY = 2.6, NEAR = 16
    let angle = 0, vel = BASE, last = performance.now(), raf = 0, near: View | null = null
    const onWheel = (e: WheelEvent) => { e.preventDefault(); vel = Math.max(-MAX, Math.min(MAX, vel + e.deltaY * GAIN)) }
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      // lock sweep — drive the dot to the chosen title (full loop, decelerating), glow swelling
      const L = lockRef.current
      if (L) {
        if (Number.isNaN(L.from)) {
          L.from = angle; L.t0 = now
          // shortest signed turn to the chosen title — no extra full loops, just rotate the near way
          const cur = ((angle % 360) + 360) % 360
          let delta = LOCK_ANGLE[L.to] - cur
          delta = ((delta + 180) % 360 + 360) % 360 - 180
          L.target = angle + delta
        }
        const p = Math.min(1, (now - L.t0) / LOCK_SWEEP_MS)
        angle = L.from + (L.target - L.from) * (1 - Math.pow(1 - p, 3))
        spin.style.transform = `rotate(${angle}deg)`
        root.style.setProperty('--orbit-glow', (0.35 + 0.65 * Math.sin(p * Math.PI)).toFixed(3))
        raf = requestAnimationFrame(tick)
        return
      }
      vel = BASE + (vel - BASE) * Math.exp(-DECAY * dt)
      angle = (angle + vel * dt) % 360
      spin.style.transform = `rotate(${angle}deg)`
      root.style.setProperty('--orbit-glow', Math.min(1, Math.abs(vel - BASE) / 220).toFixed(3))
      let hit: View | null = null
      for (const n of NAV) {
        let d = Math.abs(angle - LOCK_ANGLE[n.view]); d = Math.min(d, 360 - d)
        if (d < NEAR) { hit = n.view; break }
      }
      if (hit !== near) { near = hit; setNearNav(hit) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('wheel', onWheel); root.style.setProperty('--orbit-glow', '0'); setNearNav(null) }
  }, [open])

  return (
    <div ref={rootRef} className={`stage home ${open ? 'home--open' : 'home--closed'}${open && orbitHovered ? ' home--orbit-hover' : ''}${!open && orbitHovered ? ' home--core-hover' : ''}`} dir="rtl">
      <div className="home-center" aria-hidden>
        {/* the mask fills the ring: pitch-black core, hover exposes field at 50%. Orbit hover also
            triggers the formula reveal — so we track enter/leave on the mask too. */}
        <div className="home-orbit">
          <div
            className="home-mask"
            onClick={toggle}
            onMouseEnter={() => setOrbitHovered(true)}
            onMouseLeave={() => setOrbitHovered(false)}
          />
          <div className="home-orbit__spin" ref={spinRef}><span className="home-orbit__dot" /></div>
        </div>
      </div>
      <button
        className="home-core"
        onClick={toggle}
        aria-label={open ? 'סגירת המעגל' : 'פתיחת המעגל'}
        onMouseEnter={() => setOrbitHovered(true)}
        onMouseLeave={() => setOrbitHovered(false)}
      >
        <span className="home-core__dot" />
      </button>

      {showThesis && (
        <div className="home-intro" aria-label={`${INTRO_L1}. ${INTRO_L2A} ${INTRO_L2B}`}>
          <p className="home-intro__l1"><Words text={INTRO_L1} step={0.05} /></p>
          <p className="home-intro__l2"><Words text={INTRO_L2A} delay={0.5} step={0.03} /></p>
          <p className="home-intro__l2"><Words text={INTRO_L2B} delay={0.95} step={0.03} /></p>
        </div>
      )}

      <p className="home-tagline"><span>תורת היחסות של המזרח התיכון</span></p>
      <h1 className="home-title"><span>מאקרופוליטיקה</span></h1>
      <p className="home-eq" aria-hidden><span>יחסי הכוחות = הכוחות + היחסים</span></p>

      <nav className="home-nav" aria-label="כניסה">
        {NAV.map((n, i) => (
          <button
            key={n.view}
            className={`home-nav__item home-nav__item--${n.pos}${nearNav === n.view ? ' home-nav__item--near' : ''}`}
            style={{ '--bd': `${i * 0.6}s` } as React.CSSProperties}
            onClick={() => onView(n.view)}
          >
            <span className="home-nav__label"><span>{n.he}</span></span>
            <span className="home-nav__sub">{n.sub}</span>
          </button>
        ))}
      </nav>

      <p className="home-credit">מודל 0.9 · השיפוט פרשני · מקרא ומתודולוגיה בכותרת</p>
    </div>
  )
}
