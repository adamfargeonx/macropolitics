import { useEffect, useRef } from 'react'

// Full-viewport custom cursor — a ring that enlarges over an interactive node.
export function CustomCursor({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (el) el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return <div ref={ref} className={`cursor${active ? ' cursor--active' : ''}`} aria-hidden />
}
