import { useEffect, type RefObject } from 'react'

const TAU = Math.PI * 2

// Calm drifting starfield on a canvas sized to its parent. Shared by /forces and /relations.
// (The interactive particle field is the /dynamics signature; these views stay quiet.)
export function useStarfield(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    let raf = 0, w = 0, h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let stars: { x: number; y: number; vx: number; vy: number; s: number; b: number }[] = []
    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect(); w = r.width; h = r.height
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: Math.min(150, Math.round((w * h) / 9000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08,
        s: 0.6 + Math.random() * 1.2, b: 0.12 + Math.random() * 0.4,
      }))
    }
    resize(); window.addEventListener('resize', resize)
    let t = 0
    const loop = () => {
      t += 0.016; ctx.clearRect(0, 0, w, h)
      for (const p of stars) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w
        if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h
        const tw = 0.6 + 0.4 * Math.sin(t * 1.1 + p.x * 0.04)
        ctx.fillStyle = `rgba(255,255,255,${p.b * tw})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [canvasRef])
}
