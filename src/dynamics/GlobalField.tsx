import { useRef } from 'react'
import { useGravityField } from './useGravityField'
import type { View } from './Chrome'

// The site-wide particle background: one fixed full-screen canvas behind every view.
// Drifts inward (the gravity motif) everywhere except the forces view, where it rotates
// (orbital) — there, distance-from-centre already encodes power, so an inward pull would conflict.
export function GlobalField({ view }: { view: View }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGravityField(canvasRef, undefined, view === 'forces' ? 'orbital' : 'inward')
  return <canvas ref={canvasRef} className="globalfield" aria-hidden />
}
