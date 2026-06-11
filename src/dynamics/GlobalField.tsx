import { useRef } from 'react'
import { useGravityField } from './useGravityField'

// The site-wide particle background: one fixed full-screen canvas behind every view,
// drifting inward (the gravity motif) and reacting to clicks anywhere.
export function GlobalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useGravityField(canvasRef)
  return <canvas ref={canvasRef} className="globalfield" aria-hidden />
}
