import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../sound'

// Exit animation duration — must match the .is-closing keyframe in overlays.css.
export const OVERLAY_EXIT_MS = 280

// Shared controller for the modal overlays (legend / about). Listens for a global toggle event,
// owns `open` plus a transient `closing` flag so the overlay can play an EXIT animation before it
// unmounts, and wires Escape. Consolidates logic that was duplicated across the overlays.
export function useOverlay(eventName: string) {
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
    timer.current = window.setTimeout(() => { setOpen(false); setClosing(false) }, OVERLAY_EXIT_MS)
  }, [])

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
