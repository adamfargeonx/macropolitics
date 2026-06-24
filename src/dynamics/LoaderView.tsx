import { useEffect, useRef, useState } from 'react'
import { useGravityField, type Impulse } from './useGravityField'

const DURATION = 8000
const FADE_AT = 7700
const IGNITE_AT = 5500
const QUICK_DURATION = 2500
const QUICK_FADE_AT = 2200
const QUICK_IGNITE = 900

// Loader concept: gravitational COLLAPSE → IGNITION → settle. A wide faint ring contracts inward
// (matter falling together) while particles stream to the centre; at the climax the core ignites —
// a flash, a ring bursts outward and a body spins into orbit — then it all settles to the size of
// the home's click-core and hands off. No text. Pure motion. (~4.6s; ~1.7s on repeat visits.)
export default function LoaderView({ onDone, quick = false }: { onDone: () => void; quick?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const impulseRef = useRef<Impulse | null>(null)
  const [out, setOut] = useState(false)
  useGravityField(canvasRef, impulseRef)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { const t = window.setTimeout(onDone, 600); return () => clearTimeout(t) }
    const dur = quick ? QUICK_DURATION : DURATION
    const fadeAt = quick ? QUICK_FADE_AT : FADE_AT
    const igniteAt = quick ? QUICK_IGNITE : IGNITE_AT
    // ignition pulse — scatters the accreted particles outward in sync with the burst ring
    const ignite = window.setTimeout(() => { impulseRef.current = { x: innerWidth / 2, y: innerHeight / 2, t: performance.now() } }, igniteAt)
    const fade = window.setTimeout(() => setOut(true), fadeAt)
    const done = window.setTimeout(onDone, dur)
    return () => { clearTimeout(ignite); clearTimeout(fade); clearTimeout(done) }
  }, [onDone, quick])

  return (
    <div className={`loader${quick ? ' loader--quick' : ''}${out ? ' loader--out' : ''}`} dir="rtl" aria-label="טעינה" aria-busy={!out}>
      <canvas ref={canvasRef} className="field" />
      <div className="loader-core">
        <div className="loader-thesis" aria-hidden>
          <span className="loader-thesis__kicker">מה זה?</span>
          <span className="loader-thesis__eq">יחסי הכוחות = הכוחות + היחסים</span>
        </div>
        <span className="loader-collapse" aria-hidden />
        <span className="loader-flash" aria-hidden />
        <span className="loader-burst" aria-hidden />
        <div className="loader-orbit" aria-hidden><span className="loader-orbit__dot" /></div>
        <span className="loader-dot" aria-hidden />
      </div>
    </div>
  )
}
