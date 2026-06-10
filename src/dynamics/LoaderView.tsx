import { useEffect, useRef, useState } from 'react'
import { useGravityField, type Impulse } from './useGravityField'

const DURATION = 4500
const FADE_AT = 3900
const QUICK_DURATION = 1500
const QUICK_FADE_AT = 950

// Concept-driven loader: particles coalesce inward (gravity forms a system), a ring draws
// itself around the core, the wordmark reveals, and a progress line fills — then it fades
// to reveal the home's breathing core beneath. Overlay so the handoff is a clean crossfade.
// `quick` (repeat visits in the same session) keeps the moment but kills the wait.
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
    // a gentle coalescing pulse just before the fade
    const pulse = window.setTimeout(() => { impulseRef.current = { x: innerWidth / 2, y: innerHeight / 2, t: 1 } }, fadeAt - 250)
    const fade = window.setTimeout(() => setOut(true), fadeAt)
    const done = window.setTimeout(onDone, dur)
    return () => { clearTimeout(pulse); clearTimeout(fade); clearTimeout(done) }
  }, [onDone, quick])

  return (
    <div className={`loader${quick ? ' loader--quick' : ''}${out ? ' loader--out' : ''}`} dir="rtl" aria-label="טעינה" aria-busy={!out}>
      <canvas ref={canvasRef} className="field" />
      <div className="loader-core">
        <svg className="loader-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" />
        </svg>
        <span className="loader-dot" />
      </div>
      <h1 className="loader-brand"><span>מאקרופוליטיקה</span></h1>
      <p className="loader-sub"><span>מיפוי כבידתי של המזרח התיכון</span></p>
      <div className="loader-bar" aria-hidden><i /></div>
    </div>
  )
}
