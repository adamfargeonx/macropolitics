import { useEffect, type RefObject } from 'react'
import { isInteractive } from '../sound'

const TAU = Math.PI * 2

export interface Impulse { x: number; y: number; t: number }
export type FieldMode = 'inward' | 'scattered'

// The site's universal particle field (window-sized). Two behaviours, same particles:
//   'inward'    — particles stream toward the centre (the gravity motif; home/relations/dynamics)
//   'scattered' — particles are spread uniformly and drift gently with no centre pull, wrapping at
//                 the edges (forces: distance-from-centre already encodes power, so a centre-seeking
//                 field would fight the reading — a calm dispersed field reads cleaner there)
// Leaves soft trails. Self-listens for clicks → scatter + a yellow ripple. The field re-seeds when
// `mode` changes so the new layout is correct immediately (masked by the page transition).
// `impulseRef` is optional for programmatic pulses (the loader injects a centre pulse).
export function useGravityField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  impulseRef?: RefObject<Impulse | null>,
  mode: FieldMode = 'inward',
) {
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0, w = 0, h = 0, cx = 0, cy = 0
    type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; bx: number; by: number; b: number }
    let ps: P[] = []
    let imp: { x: number; y: number; s: number } | null = null
    let lastImpT = 0
    let ripple: { x: number; y: number; t: number } | null = null

    const spawn = (): P => {
      const bx = (Math.random() - 0.5) * 0.5, by = (Math.random() - 0.5) * 0.5 // smooth baseline drift
      if (mode === 'scattered') {
        // uniform across the whole screen — a dispersed field, no centre bias
        const x = Math.random() * w, y = Math.random() * h
        return { x, y, px: x, py: y, vx: bx, vy: by, bx, by, b: 0.5 + Math.random() * 0.5 }
      }
      // inward: spawn at the rim, aimed across the centre (streams in)
      const ang = Math.random() * TAU
      const r = Math.max(w, h) * (0.42 + Math.random() * 0.55)
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
      const toC = Math.atan2(cy - y, cx - x)
      const sp = 0.25 + Math.random() * 0.3
      return { x, y, px: x, py: y, vx: Math.cos(toC + 0.5) * sp, vy: Math.sin(toC + 0.5) * sp, bx, by, b: 0.5 + Math.random() * 0.5 }
    }
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1) // re-read: handles a move to a different-DPI monitor
      w = window.innerWidth; h = window.innerHeight; cx = w * 0.5; cy = h * 0.5
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // scattered (forces) mode uses far fewer particles — the ring constellation is the signal,
      // the field is just ambient texture; too many particles compete with the viz
      const count = mode === 'scattered'
        ? Math.min(140, Math.round((w * h) / 10000))
        : Math.min(440, Math.round((w * h) / 3000))
      ps = Array.from({ length: count }, (_, idx) => {
        if (mode === 'scattered') return spawn()
        // 85% pre-seeded anywhere in the field, 15% spawn at rim
        if (idx < count * 0.85) {
          const x = cx + (Math.random() - 0.5) * w * 0.9
          const y = cy + (Math.random() - 0.5) * h * 0.9
          const toC = Math.atan2(cy - y, cx - x)
          const sp = 0.4 + Math.random() * 0.5
          const bx = (Math.random() - 0.5) * 0.5, by = (Math.random() - 0.5) * 0.5
          return { x, y, px: x, py: y, vx: Math.cos(toC + 0.15) * sp, vy: Math.sin(toC + 0.15) * sp, bx, by, b: 0.5 + Math.random() * 0.5 }
        }
        return spawn()
      })
    }
    // debounce: re-seeding 440 particles on every continuous resize event is wasteful
    let resizeT = 0
    const onResize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(resize, 120) }
    resize(); window.addEventListener('resize', onResize)

    // self-listen for clicks on EMPTY space → scatter + ripple (ignore buttons/nodes/panels,
    // so selecting a body or using a control doesn't also disturb the background field)
    const onDown = (e: PointerEvent) => {
      if (isInteractive(e.target)) return
      imp = { x: e.clientX, y: e.clientY, s: 1 }
      ripple = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    window.addEventListener('pointerdown', onDown)

    const scattered = mode === 'scattered'
    let intro = 0
    const loop = () => {
      intro = Math.min(1, intro + 0.05)
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
        if (scattered) {
          // ease velocity toward the smooth baseline drift — gentle dispersed motion, no centre pull
          p.vx += (p.bx - p.vx) * 0.02; p.vy += (p.by - p.vy) * 0.02
        } else {
          const a = Math.min(0.08, 22 / (d2 + 3000))
          p.vx += (dx / d) * a * d * 0.1; p.vy += (dy / d) * a * d * 0.1
        }
        if (imp && imp.s > 0.02) {
          const ix = p.x - imp.x, iy = p.y - imp.y, id2 = ix * ix + iy * iy
          const infl = Math.exp(-id2 / 26000) * imp.s
          const il = Math.sqrt(id2) || 1
          p.vx += (ix / il) * infl * 2.8; p.vy += (iy / il) * infl * 2.8
        }
        if (!scattered) { p.vx *= 0.98; p.vy *= 0.98 } // inward needs damping; scattered self-regulates
        p.px = p.x; p.py = p.y; p.x += p.vx; p.y += p.vy
        const speed = Math.hypot(p.vx, p.vy)
        const near = scattered ? 0 : 1 - Math.min(1, d / (Math.max(w, h) * 0.5))
        if (scattered) {
          // a dispersed field of fine points (slow drift → trails would be near-zero-length and
          // invisible, so render as dots) — calm and evenly spread, no centre. Opacity at 50% of
          // the original: the full-strength field read too noisy behind the forces dashboard.
          const a = Math.min(0.9, (0.45 + speed * 0.4) * p.b * 1.0) * 0.28 * intro
          ctx.fillStyle = `rgba(255,255,255,${a})`
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.0, 0, TAU); ctx.fill()
        } else {
          // streaking trails toward the centre (the gravity motif)
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.85, (0.35 + speed * 0.5) * p.b * 1.0) * intro})`
          ctx.lineWidth = 0.8 + near * 1.4
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
        }
        if (scattered) {
          // wrap at the edges → an evenly-dispersed field that never empties or clumps
          if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w
          if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h
        } else if (d < 11) {
          Object.assign(p, spawn())
        }
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
  }, [canvasRef, impulseRef, mode])
}
