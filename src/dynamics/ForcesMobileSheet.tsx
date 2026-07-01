import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../sound'

// Mobile Forces has ONE structural element instead of competing bands of chrome: a single
// draggable sheet. Collapsed (peek) it's a slim strip and the field owns the screen; dragged or
// tapped open it grows toward near-full-screen. No separate map/list mode buttons, no floating
// controls-open toggle — the sheet's own height IS the mode. Modelled on the native map-app
// bottom sheet (Google Maps / Apple Maps): the field never resizes, the sheet just covers more
// of it as it grows.
export type Snap = 'peek' | 'half' | 'full'
const SNAP_ORDER: Snap[] = ['peek', 'half', 'full']
const PEEK_PX = 64

function snapPx(s: Snap): number {
  const vh = window.innerHeight
  if (s === 'peek') return PEEK_PX
  if (s === 'half') return Math.round(vh * 0.56)
  return Math.round(vh * 0.9)
}

export function ForcesMobileSheet({
  summary, onFilterClick, filterActive, minSnap, children,
}: {
  summary: ReactNode
  onFilterClick: () => void
  filterActive: boolean
  minSnap?: Snap // e.g. 'half' once a body is selected, so its detail is guaranteed visible
  children: ReactNode
}) {
  const [snap, setSnap] = useState<Snap>('peek')
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startH: number; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  // portal into #panel-root (a sibling of .nav-rail, see App.tsx) — .nav-rail carries
  // will-change:transform, which makes any position:fixed descendant (like this sheet) a
  // passenger of its page-transition zoom/scale. Rendering here instead keeps the sheet a
  // foreground layer that only ever animates via its own height/drag logic.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  useEffect(() => { setRoot(document.getElementById('panel-root')) }, [])

  // never auto-collapse (selecting → deselecting shouldn't yank the sheet down), only ever
  // bump UP to satisfy a minimum when it's requested (e.g. a body gets selected while peeked).
  // Adjusted DURING render (React's endorsed pattern for "derive state from a prop change")
  // rather than in an effect, so it settles in the same render pass instead of a cascade.
  const [prevMinSnap, setPrevMinSnap] = useState(minSnap)
  if (minSnap !== prevMinSnap) {
    setPrevMinSnap(minSnap)
    if (minSnap && SNAP_ORDER.indexOf(minSnap) > SNAP_ORDER.indexOf(snap)) setSnap(minSnap)
  }

  // apply the current snap's height whenever it changes (tap-cycle, forced minimum, resize) —
  // NOT during an active drag, where height is driven directly by the pointer instead
  useEffect(() => {
    if (dragging) return
    const el = sheetRef.current
    if (!el) return
    el.style.height = `${snapPx(snap)}px`
  }, [snap, dragging])

  useEffect(() => {
    const onResize = () => {
      const el = sheetRef.current
      if (el && !dragging) el.style.height = `${snapPx(snap)}px`
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [snap, dragging])

  const onHandleDown = (ev: ReactPointerEvent) => {
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId)
    const startH = sheetRef.current?.getBoundingClientRect().height ?? snapPx(snap)
    dragRef.current = { startY: ev.clientY, startH, moved: false }
    setDragging(true)
  }
  const onHandleMove = (ev: ReactPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dy = d.startY - ev.clientY // dragging up (finger moves up) = grow
    if (Math.abs(dy) > 4) d.moved = true
    const vh = window.innerHeight
    const h = Math.max(PEEK_PX - 12, Math.min(vh * 0.94, d.startH + dy))
    if (sheetRef.current) sheetRef.current.style.height = `${h}px`
  }
  const onHandleUp = () => {
    const d = dragRef.current
    dragRef.current = null
    setDragging(false)
    if (!d) return
    if (!d.moved) {
      // a plain tap on the handle — cycle to the next snap state
      sound.play('tab')
      setSnap((s) => SNAP_ORDER[(SNAP_ORDER.indexOf(s) + 1) % SNAP_ORDER.length])
      return
    }
    // drag release — settle on whichever of the three heights the release point is nearest
    const finalH = sheetRef.current?.getBoundingClientRect().height ?? snapPx(snap)
    let best: Snap = 'peek'; let bestD = Infinity
    for (const s of SNAP_ORDER) {
      const dd = Math.abs(snapPx(s) - finalH)
      if (dd < bestD) { bestD = dd; best = s }
    }
    setSnap(best)
  }

  const node = (
    <div ref={sheetRef} className={`fmsheet fmsheet--${snap}${dragging ? ' fmsheet--dragging' : ''}`} dir="rtl" onClick={(e) => e.stopPropagation()}>
      <div
        className="fmsheet__handle"
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        role="button" tabIndex={0}
        aria-label="גרירה או הקשה לשינוי גובה הלוח"
        aria-expanded={snap !== 'peek'}
      >
        <span className="fmsheet__grip" aria-hidden />
      </div>
      <div className="fmsheet__header">
        <span className="fmsheet__summary">{summary}</span>
        <button
          className={`fmsheet__filter-btn${filterActive ? ' is-on' : ''}`}
          onClick={onFilterClick} aria-pressed={filterActive} aria-label="מיון וסינון"
        ><span aria-hidden>⚙</span> סינון</button>
      </div>
      <div className="fmsheet__body">{children}</div>
    </div>
  )
  return root ? createPortal(node, root) : node
}
