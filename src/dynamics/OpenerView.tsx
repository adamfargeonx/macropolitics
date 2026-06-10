import { useEffect, useRef, useState, type RefObject } from 'react'
import { sound } from '../sound'

const TAU = Math.PI * 2

// Particle field that streams INWARD toward the centre (a gravity well). On exit
// (mode → 'out') it reverses and blows outward — the "opening" of the orbit.
function useGravityField(canvasRef: RefObject<HTMLCanvasElement | null>, modeRef: RefObject<'in' | 'out'>) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let raf = 0, w = 0, h = 0, cx = 0, cy = 0
    type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; b: number }
    let ps: P[] = []
    const spawn = (): P => {
      const ang = Math.random() * TAU
      const r = Math.max(w, h) * (0.45 + Math.random() * 0.55)
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
      const toC = Math.atan2(cy - y, cx - x)
      const sp = 0.15 + Math.random() * 0.25
      return { x, y, px: x, py: y, vx: Math.cos(toC + 0.5) * sp, vy: Math.sin(toC + 0.5) * sp, b: 0.3 + Math.random() * 0.6 }
    }
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height; cx = w * 0.5; cy = h * 0.5
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ps = Array.from({ length: Math.min(460, Math.round((w * h) / 3200)) }, spawn)
    }
    resize(); window.addEventListener('resize', resize)
    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.014)
      ctx.clearRect(0, 0, w, h)
      const out = modeRef.current === 'out'
      for (const p of ps) {
        const dx = cx - p.x, dy = cy - p.y, d2 = dx * dx + dy * dy
        const d = Math.sqrt(d2) || 1
        if (out) {
          // blow outward, accelerating
          p.vx -= (dx / d) * 1.4; p.vy -= (dy / d) * 1.4
        } else {
          const a = 24 / (d2 + 2400)
          p.vx += (dx / d) * a * d; p.vy += (dy / d) * a * d
          p.vx *= 0.99; p.vy *= 0.99
        }
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy
        const speed = Math.hypot(p.vx, p.vy)
        const near = 1 - Math.min(1, d / (Math.max(w, h) * 0.5))
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.7, (0.1 + speed * 0.45) * p.b) * intro})`
        ctx.lineWidth = 0.6 + near * 1.2
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
        if (!out && d < 12) Object.assign(p, spawn())
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [canvasRef, modeRef])
}

// The opener: breathing core that the user clicks to open the orbit → homepage.
export default function OpenerView({ onEnter }: { onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<'in' | 'out'>('in')
  const [leaving, setLeaving] = useState(false)
  useGravityField(canvasRef, modeRef)

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    modeRef.current = 'out'
    sound.start(); sound.play('open')
    window.setTimeout(onEnter, 880)
  }

  return (
    <div className={`stage opener${leaving ? ' opener--leaving' : ''}`} dir="rtl" onPointerDown={enter} role="button" aria-label="כניסה">
      <canvas ref={canvasRef} className="field" />
      <div className="opener-core">
        <span className="opener-core__ring" />
        <span className="opener-core__dot" />
      </div>
      <span className="opener-hint">לחצו להתחלה</span>
    </div>
  )
}
