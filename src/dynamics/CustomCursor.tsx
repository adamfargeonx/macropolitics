import { useEffect, useRef } from 'react'
import { sound, isInteractive } from '../sound'

// Global reactive cursor: a tight dot + a trailing ring that grows over interactive targets.
// Also the single place that fires hover/click sounds (visual + audio coupled).
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my
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
    document.addEventListener('pointerleave', onLeave)

    const loop = () => {
      const k = reduce ? 1 : 0.2
      rx += (mx - rx) * k; ry += (my - ry) * k
      const active = targetActive || document.body.classList.contains('cursor-grab')
      const ring = ringRef.current, dot = dotRef.current
      if (ring) {
        const s = (active ? 1.8 : 1) * (pressed ? 0.82 : 1)
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${s})`
        ring.style.opacity = visible ? '1' : '0'
        ring.classList.toggle('cursor--on', active)
      }
      if (dot) {
        dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
        dot.style.opacity = visible ? (active ? '0' : '1') : '0'
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
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="cursor" aria-hidden />
      <div ref={dotRef} className="cursor-dot" aria-hidden />
    </>
  )
}
