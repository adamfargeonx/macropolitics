import { useEffect, useRef } from 'react'
import { sound, isInteractive } from '../sound'

// TEST — trying a solid triangular pointer shape in place of the dot+ring, per the operator's own
// request ("don't kill the current cursor system"). Flip to false to instantly revert: nothing
// about the original dot+ring is removed below, only hidden via CSS (see .cursor--hidden), and
// every bit of the reactive mechanics (position tracking, hover-sound coupling, press feedback)
// stays identically wired to whichever visual is showing.
const CURSOR_SHAPE_TEST = true

// Global reactive cursor: a tight dot + a trailing ring that grows over interactive targets.
// Also the single place that fires hover/click sounds (visual + audio coupled).
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const shapeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mx = innerWidth / 2, my = innerHeight / 2
    let targetActive = false, pressed = false, visible = false, raf = 0

    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; visible = true }
    const onOver = (e: PointerEvent) => {
      const i = isInteractive(e.target)
      if (i && !targetActive) sound.play('hover')
      targetActive = i
    }
    const onDown = (e: PointerEvent) => { pressed = true; sound.start(); if (isInteractive(e.target)) sound.play('click') }
    const onUp = () => { pressed = false }
    const onLeave = () => { visible = false }
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerover', onOver)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    // documentElement (not document) — fires only when the pointer truly leaves the viewport,
    // not on transitions between child elements (which would wrongly blank the cursor)
    document.documentElement.addEventListener('pointerleave', onLeave)

    const loop = () => {
      // No positional lag — ring tracks the pointer exactly (scale still eases via CSS).
      const active = targetActive || document.body.classList.contains('cursor-grab')
      const ring = ringRef.current, dot = dotRef.current
      if (ring) {
        // hover contracts the ring to a tight circle (was: grew); press tightens a touch more
        const s = (active ? 0.5 : 1) * (pressed ? 0.82 : 1)
        ring.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(${s})`
        ring.style.opacity = visible ? '1' : '0'
        ring.classList.toggle('cursor--on', active)
      }
      if (dot) {
        dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
        dot.style.opacity = visible ? (active ? '0' : '1') : '0'
      }
      const shape = shapeRef.current
      if (shape) {
        // same reactive language as the ring: contracts on hover, tightens further on press —
        // just applied to a shape instead of a circle radius.
        // NOT -50%,-50%: unlike the ring/dot's circles (rotationally symmetric, so centering is
        // the hotspot), an arrow's hotspot is its TIP — and the tip in cursor-arrow.svg sits at
        // roughly (30%, 4%) of the box, not its center. Centering it put the visible tip well
        // above-left of where clicks actually land (the offset the operator flagged). Translating
        // by -(tip%) instead moves that exact point in the shape to the real pointer position.
        const s = (active ? 0.82 : 1) * (pressed ? 0.88 : 1)
        shape.style.transform = `translate(${mx}px, ${my}px) translate(-30%, -4%) scale(${s})`
        shape.style.opacity = visible ? '1' : '0'
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className={`cursor${CURSOR_SHAPE_TEST ? ' cursor--hidden' : ''}`} aria-hidden />
      <div ref={dotRef} className={`cursor-dot${CURSOR_SHAPE_TEST ? ' cursor--hidden' : ''}`} aria-hidden />
      {CURSOR_SHAPE_TEST && <div ref={shapeRef} className="cursor-shape" aria-hidden />}
    </>
  )
}
