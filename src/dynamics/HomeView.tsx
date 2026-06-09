import { useEffect, useRef, type RefObject } from 'react'
import type { View } from './Chrome'

const TAU = Math.PI * 2

// Gravity-well hero: light streaks spiral inward to a luminous core (echoes the original home).
function useGravityWell(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let raf = 0, w = 0, h = 0, cx = 0, cy = 0
    type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; b: number }
    let ps: P[] = []
    const spawn = (): P => {
      const ang = Math.random() * TAU
      const r = Math.max(w, h) * (0.55 + Math.random() * 0.5)
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
      // mostly inward + slight tangential → spiral
      const toC = Math.atan2(cy - y, cx - x)
      const sp = 0.2 + Math.random() * 0.3
      return { x, y, px: x, py: y, vx: Math.cos(toC + 0.5) * sp, vy: Math.sin(toC + 0.5) * sp, b: 0.3 + Math.random() * 0.6 }
    }
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height; cx = w * 0.5; cy = h * 0.46
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ps = Array.from({ length: Math.min(420, Math.round((w * h) / 3400)) }, spawn)
    }
    resize(); window.addEventListener('resize', resize)
    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.012)
      ctx.clearRect(0, 0, w, h)
      // central glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150)
      g.addColorStop(0, `rgba(255,255,255,${0.16 * intro})`); g.addColorStop(0.5, `rgba(251,255,0,${0.04 * intro})`); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, TAU); ctx.fill()
      for (const p of ps) {
        const dx = cx - p.x, dy = cy - p.y, d2 = dx * dx + dy * dy
        const d = Math.sqrt(d2) || 1
        const a = 26 / (d2 + 2200) // gravity (stronger near centre)
        p.vx += (dx / d) * a * d; p.vy += (dy / d) * a * d
        p.vx *= 0.99; p.vy *= 0.99
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy
        const speed = Math.hypot(p.vx, p.vy)
        const near = 1 - Math.min(1, d / (Math.max(w, h) * 0.5))
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.7, (0.12 + speed * 0.5) * p.b) * intro})`
        ctx.lineWidth = 0.6 + near * 1.2
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
        if (d < 14) Object.assign(p, spawn())
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [canvasRef])
}

const LENSES: { view: View; he: string; sub: string }[] = [
  { view: 'forces', he: 'הכוחות', sub: 'עוצמתן של המדינות' },
  { view: 'relations', he: 'היחסים', sub: 'מערכות היחסים ביניהן' },
  { view: 'dynamics', he: 'יחסי הכוחות', sub: 'התמונה המלאה' },
]

export default function HomeView({ onView }: { onView: (v: View) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGravityWell(canvasRef)
  return (
    <div className="stage home" dir="rtl">
      <canvas ref={canvasRef} className="field" />
      <div className="home__content">
        <span className="home__eyebrow">מאקרופוליטיקה</span>
        <h1 className="home__title">יחסי הכוחות<br />במזרח התיכון</h1>
        <p className="home__intro">
          פרויקט ניסיוני הממפה את מערכי הכוח שבין מדינות המזרח התיכון — דרך שלושה ממדים
          המשתלבים לכדי תמונה אחת.
        </p>
        <nav className="home__lenses" aria-label="כניסה">
          {LENSES.map((l, i) => (
            <button key={l.view} className="home__lens" style={{ animationDelay: `${0.15 + i * 0.12}s` }} onClick={() => onView(l.view)}>
              <span className="home__lens-num">{['א', 'ב', 'ג'][i]}</span>
              <span className="home__lens-he">{l.he}</span>
              <span className="home__lens-sub">{l.sub}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
