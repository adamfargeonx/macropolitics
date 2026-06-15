import { useEffect, type RefObject } from 'react'

const TAU = Math.PI * 2

export interface Impulse { x: number; y: number; t: number }

// The site's universal particle field (window-sized): particles drift INWARD toward the
// centre of the screen — the project's gravity motif — leaving soft trails, then respawn
// at the rim. Self-listens for clicks anywhere: scatters nearby particles + a yellow ripple.
// `impulseRef` is optional for programmatic pulses (the loader injects a centre pulse).
export function useGravityField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  impulseRef?: RefObject<Impulse | null>,
) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0, w = 0, h = 0, cx = 0, cy = 0
    type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; b: number }
    let ps: P[] = []
    let imp: { x: number; y: number; s: number } | null = null
    let lastImpT = 0
    let ripple: { x: number; y: number; t: number } | null = null

    const spawn = (): P => {
      const ang = Math.random() * TAU
      const r = Math.max(w, h) * (0.42 + Math.random() * 0.55)
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
      const toC = Math.atan2(cy - y, cx - x)
      const sp = 0.12 + Math.random() * 0.18
      return { x, y, px: x, py: y, vx: Math.cos(toC + 0.5) * sp, vy: Math.sin(toC + 0.5) * sp, b: 0.5 + Math.random() * 0.5 }
    }
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1) // re-read: handles a move to a different-DPI monitor
      w = window.innerWidth; h = window.innerHeight; cx = w * 0.5; cy = h * 0.5
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ps = Array.from({ length: Math.min(440, Math.round((w * h) / 3000)) }, spawn)
    }
    // debounce: re-seeding 440 particles on every continuous resize event is wasteful
    let resizeT = 0
    const onResize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(resize, 120) }
    resize(); window.addEventListener('resize', onResize)

    // self-listen for clicks anywhere → scatter + ripple
    const onDown = (e: PointerEvent) => {
      imp = { x: e.clientX, y: e.clientY, s: 1 }
      ripple = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    window.addEventListener('pointerdown', onDown)

    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.012)
      const now = performance.now()
      // programmatic impulse (e.g. loader centre pulse)
      const cur = impulseRef?.current
      if (cur && cur.t !== lastImpT) { lastImpT = cur.t; imp = { x: cur.x, y: cur.y, s: 1 }; ripple = { x: cur.x, y: cur.y, t: now } }

      // fade-clear → trails; the near-black fill is the site's flat dark field
      ctx.fillStyle = 'rgba(6,3,15,0.17)'
      ctx.fillRect(0, 0, w, h)
      for (const p of ps) {
        const dx = cx - p.x, dy = cy - p.y, d2 = dx * dx + dy * dy
        const d = Math.sqrt(d2) || 1
        const a = Math.min(0.08, 22 / (d2 + 3000))
        p.vx += (dx / d) * a * d * 0.1; p.vy += (dy / d) * a * d * 0.1
        if (imp && imp.s > 0.02) {
          const ix = p.x - imp.x, iy = p.y - imp.y, id2 = ix * ix + iy * iy
          const infl = Math.exp(-id2 / 26000) * imp.s
          const il = Math.sqrt(id2) || 1
          p.vx += (ix / il) * infl * 2.8; p.vy += (iy / il) * infl * 2.8
        }
        p.vx *= 0.98; p.vy *= 0.98
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy
        const speed = Math.hypot(p.vx, p.vy)
        const near = 1 - Math.min(1, d / (Math.max(w, h) * 0.5))
        // visible at rest (a calm starfield), brighter when stirred by gravity/clicks (+15% visibility)
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.97, (0.4 + speed * 0.55) * p.b * 1.15) * intro})`
        ctx.lineWidth = 0.8 + near * 1.4
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
        if (d < 11) Object.assign(p, spawn())
      }
      // click ripple
      if (ripple) {
        const age = (now - ripple.t) / 1000
        if (age < 0.6) { ctx.strokeStyle = `rgba(251,255,0,${(1 - age / 0.6) * 0.4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ripple.x, ripple.y, age * 220, 0, TAU); ctx.stroke() }
        else ripple = null
      }
      if (imp) imp.s *= 0.9
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); clearTimeout(resizeT); window.removeEventListener('resize', onResize); window.removeEventListener('pointerdown', onDown) }
  }, [canvasRef, impulseRef])
}
