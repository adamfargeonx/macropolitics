import { useEffect, useMemo, useRef } from 'react'

// ForcesField — the ambient gravitational-potential layer behind the Forces constellation.
// Each body warps space at its OWN ring position (distance from centre already = power/rank), so
// the field reinforces the ranking instead of inventing an arbitrary layout: deep basins form
// around the strong, weak bodies sit in their patron's basin, and a ridge separates rival blocs.
// Drawn top-down as iso-contours (marching squares) — legible, not a tilted depth you can't read.
// Static + memoised (recomputed only when the bodies or field size change), so it costs nothing
// per frame; pan/zoom is handled by the parent .forces-zoom transform.

export interface FieldBody { x: number; y: number; m: number }

const GRID_STEP = 6 // layout px between potential samples (smaller = smoother, costlier)
const SOFT_FRAC = 0.06 // softening radius as a fraction of the min field dimension (larger = smoother)
const LEVELS = 5 // number of contour rings
const LEVEL_BASE = 0.6 // each ring sits at LEVEL_BASE^i of the peak — keeps contours hugging the basins, no edge wisps
const YELLOW = '251, 255, 0'

interface Contours { segs: [number, number][][]; alphas: number[] }

function buildContours(bodies: FieldBody[], w: number, h: number): Contours {
  const empty: Contours = { segs: [], alphas: [] }
  if (!w || !h || bodies.length === 0) return empty
  const soft = Math.pow(Math.min(w, h) * SOFT_FRAC, 2)
  const cols = Math.ceil(w / GRID_STEP)
  const rows = Math.ceil(h / GRID_STEP)
  const stride = cols + 1
  const g = new Float64Array(stride * (rows + 1))
  let hi = 0
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const px = c * GRID_STEP
      const py = r * GRID_STEP
      let phi = 0
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]
        const dx = px - b.x
        const dy = py - b.y
        phi += b.m / (dx * dx + dy * dy + soft)
      }
      g[r * stride + c] = phi
      if (phi > hi) hi = phi
    }
  }
  if (hi <= 0) return empty

  // geometric levels (halving) — natural for a 1/r^2 falloff: nested basins around the strong
  const levels: number[] = []
  const alphas: number[] = []
  for (let i = 1; i <= LEVELS; i++) {
    levels.push(hi * Math.pow(LEVEL_BASE, i))
    // inner contours (i small) brighter, outer fainter
    alphas.push(0.06 + 0.13 * (1 - (i - 1) / (LEVELS - 1)))
  }

  const lerp = (a: number, b: number, level: number) => {
    const d = b - a
    return Math.abs(d) < 1e-9 ? 0.5 : Math.min(1, Math.max(0, (level - a) / d))
  }

  const segsPerLevel: [number, number][][] = levels.map((level) => {
    const segs: [number, number][] = []
    const push = (a: [number, number], b: [number, number]) => { segs.push(a); segs.push(b) }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = c * GRID_STEP
        const y0 = r * GRID_STEP
        const x1 = x0 + GRID_STEP
        const y1 = y0 + GRID_STEP
        const tl = g[r * stride + c]
        const tr = g[r * stride + c + 1]
        const br = g[(r + 1) * stride + c + 1]
        const bl = g[(r + 1) * stride + c]
        let idx = 0
        if (tl > level) idx |= 8
        if (tr > level) idx |= 4
        if (br > level) idx |= 2
        if (bl > level) idx |= 1
        if (idx === 0 || idx === 15) continue
        const top = (): [number, number] => [x0 + GRID_STEP * lerp(tl, tr, level), y0]
        const right = (): [number, number] => [x1, y0 + GRID_STEP * lerp(tr, br, level)]
        const bottom = (): [number, number] => [x0 + GRID_STEP * lerp(bl, br, level), y1]
        const left = (): [number, number] => [x0, y0 + GRID_STEP * lerp(tl, bl, level)]
        switch (idx) {
          case 1: case 14: push(left(), bottom()); break
          case 2: case 13: push(bottom(), right()); break
          case 3: case 12: push(left(), right()); break
          case 4: case 11: push(top(), right()); break
          case 6: case 9: push(top(), bottom()); break
          case 7: case 8: push(left(), top()); break
          case 5: push(left(), top()); push(bottom(), right()); break
          case 10: push(left(), bottom()); push(top(), right()); break
        }
      }
    }
    return segs
  })

  return { segs: segsPerLevel, alphas }
}

export function ForcesField({ bodies, size }: { bodies: FieldBody[]; size: { w: number; h: number } }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const contours = useMemo(() => buildContours(bodies, size.w, size.h), [bodies, size.w, size.h])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.round(size.w * dpr))
    canvas.height = Math.max(1, Math.round(size.h * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.lineWidth = 0.9
    ctx.lineCap = 'round'
    contours.segs.forEach((segs, li) => {
      ctx.strokeStyle = `rgba(${YELLOW}, ${contours.alphas[li]})`
      ctx.beginPath()
      for (let i = 0; i < segs.length; i += 2) {
        ctx.moveTo(segs[i][0], segs[i][1])
        ctx.lineTo(segs[i + 1][0], segs[i + 1][1])
      }
      ctx.stroke()
    })
  }, [contours, size.w, size.h])

  return (
    <canvas
      ref={ref}
      className="forces-fieldlayer"
      style={{ width: size.w, height: size.h }}
      aria-hidden="true"
    />
  )
}
