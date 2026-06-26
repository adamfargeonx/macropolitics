import { useEffect, useState } from 'react'

const FADE_AT = 2600 // contraction has resolved onto the core — begin fading the cover
const DONE = 3000    // unmount → the home-closed core (already mounted underneath) takes over

// Opener: a single ring contracts from beyond the screen edges down to the home core —
// matter falling to a singularity. No flash, no burst, no equation. It resolves onto the
// exact dot you click; the thesis then reveals on the home itself. One experience for every
// visit (no quick variant, no reduced-motion downgrade — deliberate, per design).
export default function LoaderView({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const fade = window.setTimeout(() => setOut(true), FADE_AT)
    const done = window.setTimeout(onDone, DONE)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [onDone])

  return (
    <div className={`loader${out ? ' loader--out' : ''}`} dir="rtl" aria-label="טעינה" aria-busy={!out}>
      <span className="loader-ring" aria-hidden />
      <span className="loader-dot" aria-hidden />
    </div>
  )
}
