import { useEffect, useRef } from 'react'

// ── Cursor-proximity letter effect ──────────────────────────────────────────────────────────────
// Adapted from a Framer "VariableFontCursorProximity" component: each letter near the cursor
// reacts, ramping in/out with an eased (not linear) transition as the cursor approaches/leaves.
//
// The reference morphs `font-variation-settings: 'wght'` per letter — but that only works on a
// TRUE variable font (one file spanning a weight range via a wght axis). This site's display face
// (Tel Aviv Brutalist) ships as three separate STATIC weight files, so setting
// font-variation-settings on it is simply ignored — no morph, nothing happens. The reference
// component's own fallback for this exact situation is to force the text onto a bundled Inter
// Variable loaded from an external CDN — but Inter is explicitly banned as a primary face by this
// project's own typography rules, and pulling a font from an external host mid-session isn't a
// like-for-like swap-in.
//
// So: same proximity math, same eased ramp, different target property. Instead of `wght`, this
// drives a CSS custom property (--px, 0→1) that a stylesheet rule turns into a yellow-tint glow
// (color-mix + a soft text-shadow) — something a static font can express. Writing to a custom
// property (read by `color`/`text-shadow`, not `transform`/`opacity`/`filter`) is also why this is
// safe to layer onto the SAME letters the entrance/exit choreography already animates: those use
// transform + opacity + filter exclusively, so there is no property collision.
export function useLetterProximity(containerRef: React.RefObject<HTMLElement | null>, opts?: { reach?: number; tau?: number }) {
  const reach = opts?.reach ?? 180 // px — full effect at 0 distance, fades to 0 by this radius
  const tau = opts?.tau ?? 0.12 // s — exponential smoothing time constant (ramp in/out speed)

  const mouseRef = useRef({ x: -99999, y: -99999 })
  const factorsRef = useRef<number[]>([])
  const rafRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const container = containerRef.current
    if (!container) return

    const onMove = (x: number, y: number) => { mouseRef.current = { x, y } }
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove)

    const tick = (now: number) => {
      const letters = container.querySelectorAll<HTMLElement>('.letters__ch')
      const dt = Math.min(0.1, Math.max(0, (now - (lastRef.current || now)) / 1000))
      lastRef.current = now
      const a = 1 - Math.exp(-dt / tau)
      const { x: mx, y: my } = mouseRef.current

      letters.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dist = Math.hypot(mx - cx, my - cy)
        const target = Math.min(Math.max(1 - dist / reach, 0), 1)
        const prev = factorsRef.current[i] ?? 0
        const f = prev + (target - prev) * a
        factorsRef.current[i] = f
        // skip the write once settled at rest — avoids thrashing style recalc for 15 idle letters
        if (f < 0.002 && prev < 0.002) return
        el.style.setProperty('--px', f.toFixed(3))
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [containerRef, reach, tau])
}
