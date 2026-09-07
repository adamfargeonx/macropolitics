import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../sound'

// Default exit animation duration — must match the .is-closing keyframe in overlays.css for the
// CARD overlays (legend / evidence). The takeover ("המודל") is a different kind of transition —
// a full-viewport slide, not a card dropping — and passes its own longer `exitMs` below so its
// entrance and exit read as the same move in both directions instead of arriving slow and leaving
// in a blink.
export const OVERLAY_EXIT_MS = 280

// Shared controller for the modal overlays (legend / about). Listens for a global toggle event,
// owns `open` plus a transient `closing` flag so the overlay can play an EXIT animation before it
// unmounts, and wires Escape. Consolidates logic that was duplicated across the overlays.
// `exitMs` defaults to OVERLAY_EXIT_MS; a caller whose CSS exit animation runs a different
// duration (see AboutOverlay) passes its own value so the unmount timer stays in sync with it.
export function useOverlay(eventName: string, exitMs: number = OVERLAY_EXIT_MS) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const openRef = useRef(false)
  const closingRef = useRef(false)
  const timer = useRef(0)
  useEffect(() => { openRef.current = open }, [open])
  useEffect(() => { closingRef.current = closing }, [closing])

  const close = useCallback(() => {
    if (!openRef.current || closingRef.current) return
    sound.play('back')
    setClosing(true)
    timer.current = window.setTimeout(() => { setOpen(false); setClosing(false) }, exitMs)
  }, [exitMs])

  useEffect(() => {
    const onToggle = () => {
      if (openRef.current) close()
      else { clearTimeout(timer.current); sound.play('open'); setClosing(false); setOpen(true) }
    }
    window.addEventListener(eventName, onToggle)
    return () => { window.removeEventListener(eventName, onToggle); clearTimeout(timer.current) }
  }, [eventName, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return { open, closing, close }
}
