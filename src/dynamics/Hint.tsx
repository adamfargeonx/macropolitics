import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

// ── Hint — the ONE tooltip primitive. Explains an element (an encoding, a metric, a piece of
// jargon); never restates a label the user can already read.
//
// Uses the real Popover API (`popover` attribute + showPopover()), NOT merely `position: fixed`.
// That distinction is the whole point: the panels here are overflow-scroll containers that also
// carry a transform, which makes them the containing block for fixed descendants AND clips them —
// so a `position: fixed` tooltip is still cut off exactly like the `::after` pattern this
// replaces. Only the top layer (popover / dialog) escapes ancestor clipping entirely.
//
// Position comes from CSS anchor positioning (see .hint in base.css): explicit anchor() insets,
// measured to place it reliably, with a flip-block fallback when there's no room above.
//
// Opens on hover AND focus (keyboard parity), after a short delay so it doesn't fire while the
// cursor is merely crossing. Closes instantly.
const OPEN_DELAY_MS = 250

export function Hint({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
  const rawId = useId()
  const anchor = `--hint-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const popRef = useRef<HTMLSpanElement>(null)
  const timer = useRef(0)
  const [open, setOpen] = useState(false)

  // showPopover/hidePopover must run against the mounted node, so drive them from an effect
  // rather than at event time (the node doesn't exist yet on the opening render).
  useEffect(() => {
    const el = popRef.current
    if (!el) return
    try {
      if (open) el.showPopover()
      else if (el.matches(':popover-open')) el.hidePopover()
    } catch { /* popover unsupported — the element still renders, just un-elevated */ }
  }, [open])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS)
  }, [])
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setOpen(false)
  }, [])

  return (
    <>
      <span
        className={className} tabIndex={0} aria-describedby={rawId}
        style={{ anchorName: anchor } as React.CSSProperties}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      >
        {children}
      </span>
      <span
        ref={popRef} id={rawId} role="tooltip" className="hint" dir="rtl" popover="manual"
        style={{ positionAnchor: anchor } as React.CSSProperties}
      >
        {text}
      </span>
    </>
  )
}
