import { useEffect, useRef, type RefObject } from 'react'
import type { View } from './Chrome'

// Warp-speed starfield — particles stream outward from a vanishing point (the hero motif).
// The vanishing point eases toward the pointer (parallax); a click gives a brief warp boost.
function useWarpField(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let raf = 0, w = 0, h = 0, focal = 0
    let vx = 0, vy = 0            // current vanishing point
    let mx = 0, my = 0           // pointer target
    let boost = 0                // click warp boost (decays)
    type S = { x: number; y: number; z: number; px: number; py: number }
    let stars: S[] = []

    const project = (s: S) => { const k = focal / s.z; return [vx + s.x * k, vy + s.y * k] as const }
    const spawn = (s: S, fresh = false) => {
      s.x = (Math.random() * 2 - 1); s.y = (Math.random() * 2 - 1)
      s.z = fresh ? 0.2 + Math.random() * 0.8 : 1
      const [sx, sy] = project(s); s.px = sx; s.py = sy
    }
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      focal = Math.max(w, h) * 0.5
      vx = w / 2; vy = h / 2; mx = w / 2; my = h / 2
      stars = Array.from({ length: Math.min(850, Math.round((w * h) / 2000)) }, () => {
        const s = { x: 0, y: 0, z: 1, px: 0, py: 0 }; spawn(s, true); return s
      })
    }
    resize(); window.addEventListener('resize', resize)

    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY }
    const onDown = () => { boost = 1 }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)

    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.012)
      // vanishing point eases toward pointer (subtle parallax)
      vx += ((w / 2 + (mx - w / 2) * 0.10) - vx) * 0.06
      vy += ((h / 2 + (my - h / 2) * 0.10) - vy) * 0.06
      boost *= 0.94
      const speed = (reduce ? 0.4 : 1) * (1 + boost * 2.2)

      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        s.z -= 0.0055 * speed
        if (s.z < 0.04) { spawn(s); continue }
        const [sx, sy] = project(s)
        const near = 1 - s.z                     // 0 (far) → 1 (close)
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.95, (0.09 + near * 0.8)) * intro})`
        ctx.lineWidth = 0.6 + near * 2.0
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(sx, sy); ctx.stroke()
        s.px = sx; s.py = sy
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [canvasRef])
}

const NAV: { view: View; he: string }[] = [
  { view: 'forces', he: 'הכוחות' },
  { view: 'relations', he: 'היחסים' },
  { view: 'dynamics', he: 'יחסי הכוחות' },
]

export default function HomeView({ onView }: { onView: (v: View) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useWarpField(canvasRef)
  return (
    <div className="stage home" dir="rtl">
      <canvas ref={canvasRef} className="field" />

      {/* the orbiting-circle motif */}
      <div className="home-orbit" aria-hidden>
        <div className="home-orbit__spin"><span className="home-orbit__dot" /></div>
      </div>

      <div className="home2">
        <h1 className="home2__title">מאקרו<span className="home2__sep" />פוליטיקה</h1>
        <nav className="home2__nav" aria-label="כניסה">
          {NAV.map((n) => (
            <button key={n.view} className="home2__nav-item" onClick={() => onView(n.view)}>{n.he}</button>
          ))}
        </nav>
      </div>

      <p className="home2__tagline">תורת היחסות של המזרח התיכון</p>
    </div>
  )
}
