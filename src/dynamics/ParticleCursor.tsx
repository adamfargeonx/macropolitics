import { useEffect, useRef } from 'react'

// ── ParticleCursor ────────────────────────────────────────────────────────────────────────────
// A trail of ink that follows the pointer, drawn on a canvas sized to its own container.
//
// Scoped deliberately: this mounts INSIDE the yellow takeover, not globally. The site's own
// cursor (CustomCursor) is a precision instrument — a tight arrow whose hotspot matters because
// almost every screen is a hit-tested map. A decaying trail on those screens would smear over the
// data it is meant to help you read. On the takeover there is nothing to hit-test and one flat
// field of colour, which is exactly where a trail has room to be a pleasure rather than noise.
//
// Canvas, not DOM nodes: a few hundred short-lived particles as elements would mean a few hundred
// style recalcs a frame. One canvas and one rAF costs a single composite.
const MAX = 240
const SPAWN_PER_MOVE = 2
const LIFE_MS = 900

interface P { x: number; y: number; vx: number; vy: number; born: number; r: number }

export function ParticleCursor({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    // Honour reduced motion by simply never mounting the loop — a trail is pure decoration, so
    // the correct reduced variant is nothing at all, not a slower version of it.
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parts: P[] = []
    let raf = 0
    let dpr = 1

    const size = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)

    // Spawn relative to the CANVAS, not the viewport: the takeover slides in from off-screen, so
    // for most of its entrance the canvas origin is not the viewport origin. Using clientX/Y
    // directly would trail the particles a full screen-width away from the pointer.
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      if (x < 0 || y < 0 || x > r.width || y > r.height) return
      for (let i = 0; i < SPAWN_PER_MOVE; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = Math.random() * 0.5
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.12, born: performance.now(), r: 1 + Math.random() * 2.6 })
      }
      // oldest-first eviction keeps the trail's TAIL trimmed rather than its head, so a fast
      // sweep shortens the tail instead of punching holes in the part nearest the pointer.
      while (parts.length > MAX) parts.shift()
    }
    window.addEventListener('pointermove', onMove)

    const loop = () => {
      const now = performance.now()
      const r = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, r.width, r.height)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        const age = (now - p.born) / LIFE_MS
        if (age >= 1) { parts.splice(i, 1); continue }
        p.x += p.vx; p.y += p.vy
        p.vy += 0.006            // the faintest drift downward, so the trail settles rather than hangs
        const fade = 1 - age
        ctx.globalAlpha = fade * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * fade, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(loop)
    }
    // ink colour is inherited from the element's own `color`, so the stylesheet owns it and this
    // component never hardcodes a value that could fall out of step with the field behind it.
    ctx.fillStyle = getComputedStyle(canvas).color
    loop()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden />
}
