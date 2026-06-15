import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { REACT_R, MAX_NUDGE, NEAR_R } from './forces-model'

type Pos = { x: number; y: number }
type Cam = { z: number; x: number; y: number }

const clampZ = (z: number) => Math.min(3, Math.max(0.6, z))

// Pan / zoom / cursor-proximity for the constellation field. Owns the camera, the field size,
// and the "nearest body" (proximal) signal — all the imperative pointer math, kept out of the view.
export function useForcesCamera(
  fieldRef: React.RefObject<HTMLDivElement | null>,
  posRef: React.RefObject<Map<string, Pos>>,
) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [proximal, setProximal] = useState<string | null>(null)
  const [cam, setCam] = useState<Cam>({ z: 1, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false) // drives the grab cursor (state, so it re-renders)
  // Escape-hatch refs read inside pointer handlers — synced from state in effects, never in render.
  const proxRef = useRef<string | null>(null)
  const camRef = useRef(cam)
  const rectRef = useRef<DOMRect | null>(null) // cached field rect — avoids forced reflow per pointer event
  useLayoutEffect(() => { proxRef.current = proximal }, [proximal])
  useLayoutEffect(() => { camRef.current = cam }, [cam])
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const dragMoved = useRef(false)

  useEffect(() => {
    const el = fieldRef.current; if (!el) return
    const measure = () => { const r = el.getBoundingClientRect(); rectRef.current = r; return r }
    const ro = new ResizeObserver(() => { const r = measure(); setSize({ w: r.width, h: r.height }) })
    ro.observe(el)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = rectRef.current ?? measure(); const mx = e.clientX - r.left, my = e.clientY - r.top
      setCam((c) => { const z = clampZ(c.z * (1 - e.deltaY * 0.0015)); const k = z / c.z; return { z, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k } })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', onWheel) }
  }, [fieldRef])

  const onPanDown = (e: React.PointerEvent) => { drag.current = { sx: e.clientX, sy: e.clientY, px: camRef.current.x, py: camRef.current.y }; dragMoved.current = false; setIsDragging(true) }
  const react = (e: React.PointerEvent) => {
    const el = fieldRef.current; if (!el) return
    const r = rectRef.current ?? el.getBoundingClientRect(); const c = camRef.current
    const fx = (e.clientX - r.left - c.x) / c.z, fy = (e.clientY - r.top - c.y) / c.z
    let nearest: string | null = null, nd = NEAR_R
    el.querySelectorAll<HTMLElement>('.fnode').forEach((node) => {
      const id = node.dataset.id; if (!id) return
      const p = posRef.current.get(id); if (!p) return
      const dx = fx - p.x, dy = fy - p.y, dist = Math.hypot(dx, dy)
      if (dist < REACT_R && dist > 0.01) {
        const prox = 1 - dist / REACT_R
        const mag = Math.min(MAX_NUDGE, prox * prox * MAX_NUDGE * 1.8)
        node.style.translate = `${(dx / dist) * mag}px ${(dy / dist) * mag}px`
      } else if (node.style.translate) node.style.translate = ''
      if (dist < nd) { nd = dist; nearest = id }
    })
    if (proxRef.current !== nearest) setProximal(nearest)
  }
  const clearReact = () => {
    fieldRef.current?.querySelectorAll<HTMLElement>('.fnode').forEach((n) => { if (n.style.translate) n.style.translate = '' })
    if (proxRef.current) setProximal(null)
  }
  const onMove = (e: React.PointerEvent) => {
    react(e)
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (!dragMoved.current && Math.hypot(dx, dy) > 4) dragMoved.current = true
    if (dragMoved.current) setCam((c) => ({ ...c, x: d.px + dx, y: d.py + dy }))
  }
  const onPanUp = () => { drag.current = null; setIsDragging(false) }
  // Returns whether the just-finished gesture was a drag (so the view can swallow the click), and resets.
  const consumeDragMoved = () => { const moved = dragMoved.current; dragMoved.current = false; return moved }
  const zoomBy = (f: number) => { const el = fieldRef.current; if (!el) return; const r = el.getBoundingClientRect(); const mx = r.width / 2, my = r.height / 2; setCam((c) => { const z = clampZ(c.z * f); const k = z / c.z; return { z, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k } }) }
  const resetCam = () => setCam({ z: 1, x: 0, y: 0 })

  const fieldHandlers = {
    onPointerDown: onPanDown,
    onPointerMove: onMove,
    onPointerUp: onPanUp,
    onPointerLeave: () => { onPanUp(); clearReact() },
  }

  return { size, cam, proximal, isDragging, consumeDragMoved, fieldHandlers, zoomBy, resetCam }
}
