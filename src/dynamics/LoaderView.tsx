import { useEffect, useRef, useState } from 'react'
import { useGravityField, type Impulse } from './useGravityField'

const DURATION = 4500
const FADE_AT = 3900

// Concept-driven loader: particles coalesce inward (gravity forms a system), a ring draws
// itself around the core, the wordmark reveals, and a progress line fills — then it fades
// to reveal the home's breathing core beneath. Overlay so the handoff is a clean crossfade.
export default function LoaderView({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const impulseRef = useRef<Impulse | null>(null)
  const [out, setOut] = useState(false)
  useGravityField(canvasRef, impulseRef)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { const t = window.setTimeout(onDone, 600); return () => clearTimeout(t) }
    // a gentle coalescing pulse just before the fade
    const pulse = window.setTimeout(() => { impulseRef.current = { x: innerWidth / 2, y: innerHeight / 2, t: 1 } }, FADE_AT - 250)
    const fade = window.setTimeout(() => setOut(true), FADE_AT)
    const done = window.setTimeout(onDone, DURATION)
    return () => { clearTimeout(pulse); clearTimeout(fade); clearTimeout(done) }
  }, [onDone])

  return (
    <div className={`loader${out ? ' loader--out' : ''}`} dir="rtl" aria-label="טעינה" aria-busy={!out}>
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
