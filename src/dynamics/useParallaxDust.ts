import { useEffect, type RefObject } from 'react'

const TAU = Math.PI * 2

// Relations-only background. Not a third useGravityField mode on purpose: inward/scattered share
// one velocity-based physics loop (particles accelerate, damp, stream or wrap) — this has no
// velocity at all. Particles sit at a fixed seeded position; each one carries a depth (0..1) and
// the whole field offsets by a fraction of the cursor's distance from screen-centre, nearer layers
// shifting more — parallax, not gravity. Genuinely different mechanic from what every other screen
// already uses, kept in its own hook so useGravityField's two-mode contract stays clean.
// Eased toward the cursor target (not snapped), so a fast mouse move doesn't jolt the field — and
// kept restrained (dot count, opacity, max shift) to match the site's own "considered ≠ loud" bar.
export function useParallaxDust(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0, w = 0, h = 0
    type P = { x0: number; y0: number; depth: number; b: number; tw: number }
    let ps: P[] = []
    let targetX = 0, targetY = 0 // cursor offset from centre, -1..1
    let curX = 0, curY = 0       // eased toward target

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth; h = window.innerHeight
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // sparser than either gravity mode (140/260) — this is pure ambience behind a DOM-rendered
      // constellation, not a field competing for attention with it.
      const count = Math.min(150, Math.round((w * h) / 8600))
      ps = Array.from({ length: count }, () => ({
        x0: Math.random() * w, y0: Math.random() * h,
        depth: 0.15 + Math.random() * 0.85,
        b: 0.35 + Math.random() * 0.5,
        tw: Math.random() * TAU,
      }))
    }
    let resizeT = 0
    const onResize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(resize, 120) }
    resize(); window.addEventListener('resize', onResize)

    const MAX_SHIFT = 26 // px at depth 1 — subtle, not a camera pan
    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / w - 0.5) * 2
      targetY = (e.clientY / h - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)
    // cursor leaving the window relaxes the field back to centre rather than freezing at whatever
    // offset it last had.
    const onLeave = () => { targetX = 0; targetY = 0 }
    document.addEventListener('mouseleave', onLeave)

    let intro = 0
    const loop = (now: number) => {
      intro = Math.min(1, intro + 0.03)
      curX += (targetX - curX) * 0.05
      curY += (targetY - curY) * 0.05
      ctx.clearRect(0, 0, w, h)
      const t = now * 0.001
      for (const p of ps) {
        const x = p.x0 + curX * MAX_SHIFT * p.depth
        const y = p.y0 + curY * MAX_SHIFT * p.depth
        // desynced opacity breathing — same idiom as the constellation's own per-star twinkle
        // (RelationsView.tsx) and the canvas engines' pulse phase offsets.
        const twinkle = 0.6 + Math.sin(t * 0.6 + p.tw) * 0.4
        const a = Math.min(0.55, 0.12 + p.depth * 0.22) * p.b * twinkle * intro
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath(); ctx.arc(x, y, 0.6 + p.depth * 0.9, 0, TAU); ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resizeT)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [canvasRef])
}
