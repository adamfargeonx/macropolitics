import { useEffect, type RefObject } from 'react'

const TAU = Math.PI * 2

export interface Impulse { x: number; y: number; t: number }

// Subtle particle field: particles drift INWARD toward the centre leaving a faint
// trail, then respawn at the rim. Clicks (via impulseRef) scatter nearby particles
// outward, which then re-converge — the calm, breathing background of the home/opener.
export function useGravityField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  impulseRef: RefObject<Impulse | null>,
) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let raf = 0, w = 0, h = 0, cx = 0, cy = 0
    type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; b: number }
    let ps: P[] = []
    let imp: { x: number; y: number; s: number } | null = null
    let lastImpT = 0

    const spawn = (): P => {
      const ang = Math.random() * TAU
      const r = Math.max(w, h) * (0.42 + Math.random() * 0.5)
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
      const toC = Math.atan2(cy - y, cx - x)
      const sp = 0.12 + Math.random() * 0.18           // gentle
      return { x, y, px: x, py: y, vx: Math.cos(toC + 0.5) * sp, vy: Math.sin(toC + 0.5) * sp, b: 0.3 + Math.random() * 0.55 }
    }
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height; cx = w * 0.5; cy = h * 0.5
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ps = Array.from({ length: Math.min(440, Math.round((w * h) / 3400)) }, spawn)
    }
    resize(); window.addEventListener('resize', resize)

    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.012)
      // pick up a fresh click impulse
      const cur = impulseRef.current
      if (cur && cur.t !== lastImpT) { lastImpT = cur.t; imp = { x: cur.x, y: cur.y, s: 1 } }

      ctx.clearRect(0, 0, w, h)
      for (const p of ps) {
        const dx = cx - p.x, dy = cy - p.y, d2 = dx * dx + dy * dy
        const d = Math.sqrt(d2) || 1
        // gentle inward pull (stronger near centre, capped so it stays calm)
        const a = Math.min(0.06, 18 / (d2 + 3200))
        p.vx += (dx / d) * a * d * 0.06; p.vy += (dy / d) * a * d * 0.06
        // click impulse: push away from the impulse point
        if (imp && imp.s > 0.02) {
          const ix = p.x - imp.x, iy = p.y - imp.y, id2 = ix * ix + iy * iy
          const infl = Math.exp(-id2 / 26000) * imp.s
          const il = Math.sqrt(id2) || 1
          p.vx += (ix / il) * infl * 2.6; p.vy += (iy / il) * infl * 2.6
        }
        p.vx *= 0.965; p.vy *= 0.965                    // damping → no runaway speed
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy
        const speed = Math.hypot(p.vx, p.vy)
        const near = 1 - Math.min(1, d / (Math.max(w, h) * 0.5))
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.6, (0.08 + speed * 0.4) * p.b) * intro})`
        ctx.lineWidth = 0.5 + near * 1.1
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
        if (d < 11) Object.assign(p, spawn())
      }
      if (imp) imp.s *= 0.9
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [canvasRef, impulseRef])
}
