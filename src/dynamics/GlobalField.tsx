import { useRef } from 'react'
import { useGravityField } from './useGravityField'
import { useParallaxDust } from './useParallaxDust'
import type { View } from './Chrome'

// The site-wide particle background: one fixed full-screen canvas behind every view.
// Drifts inward (the gravity motif) on home/dynamics; a calm scattered field on forces (distance-
// from-centre already encodes power there, so an inward pull would conflict); cursor-parallax dust
// on relations (see useParallaxDust — a genuinely different, non-gravity mechanic, so the
// constellation's background doesn't read as "the same field again").
// Two small components rather than one with a mode branch: each hook must be called
// unconditionally within its own component (rules of hooks), so the choice between them has to be
// a conditional RENDER, not a conditional call — swapping `view` unmounts one canvas/hook pair and
// mounts the other cleanly.
function GravityCanvas({ mode }: { mode: 'inward' | 'scattered' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGravityField(canvasRef, undefined, mode)
  return <canvas ref={canvasRef} className="globalfield" aria-hidden />
}
function ParallaxDustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParallaxDust(canvasRef)
  return <canvas ref={canvasRef} className="globalfield" aria-hidden />
}
export function GlobalField({ view }: { view: View }) {
  if (view === 'relations') return <ParallaxDustCanvas />
  return <GravityCanvas mode={view === 'forces' ? 'scattered' : 'inward'} />
}
