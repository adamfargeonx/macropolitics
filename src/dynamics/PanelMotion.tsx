import { useEffect, useRef, useState } from 'react'

// ── Panel motion primitives ───────────────────────────────────────────────────────────────────
// The side panel's rule: the FRAME never moves. Containers, section labels, buttons and links are
// permanently static — they exist identically for every body, so re-animating them on each switch
// read as the whole panel washing out and back in. Only the three things that actually differ
// between one body and the next animate, and each does it in a way that says something true about
// the datum it carries:
//
//   LetterSwap — the name. Letters of the outgoing name drop away as the incoming name's letters
//                rise in, staggered. The most expressive moment in the panel, because the name is
//                the one field where the change IS the whole story.
//   CountUp    — any score. Tweens from the PREVIOUS value to the new one, so the numeral itself
//                reports the direction and size of the change instead of merely reappearing.
//   Gauge      — any bar. Tweens its width from where it was to where it lands, for the same
//                reason: the movement is the comparison.
//
// Paragraph text keeps the existing per-word rise (see Words) — it is already content-only motion.
// All three honour prefers-reduced-motion by snapping straight to the end state.

const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// ── LetterSwap ────────────────────────────────────────────────────────────────
// Both names are mounted together for one beat: the outgoing one animating out, the incoming one
// animating in. RTL-safe the same way Words/Letters are — characters stay in document order and
// the ancestor's `dir` handles visual direction.
const SWAP_OUT_MS = 360

export function LetterSwap({ text, className }: { text: string; className?: string }) {
  // `prev` is the name still leaving. Derived during render (React's documented "adjust state when
  // a prop changes" pattern, already used by ForcesPanel) rather than in an effect, so the outgoing
  // copy is present in the SAME commit that introduces the new one — no one-frame flash of neither.
  const [pair, setPair] = useState<{ cur: string; prev: string | null }>({ cur: text, prev: null })
  if (pair.cur !== text) setPair({ cur: text, prev: pair.cur })

  useEffect(() => {
    if (pair.prev == null) return
    const t = window.setTimeout(() => setPair((p) => ({ ...p, prev: null })), SWAP_OUT_MS)
    return () => window.clearTimeout(t)
  }, [pair.prev])

  return (
    <span className={`lswap${className ? ` ${className}` : ''}`} aria-label={text}>
      {pair.prev != null && <SwapLayer text={pair.prev} step={0.03} variant="out" key={`out-${pair.prev}`} />}
      <SwapLayer text={pair.cur} step={0.045} variant="in" key={`in-${pair.cur}`} />
    </span>
  )
}

// One name, split into per-letter spans for the cascade — but grouped BY WORD, each word an
// inline-block that cannot break internally. A flat run of letter spans lets the browser break
// anywhere, including mid-word, and the single nowrap line it replaced simply overflowed the panel
// (the long multi-word names — הכוחות הדמוקרטיים, הרשות הפלסטינית — ran straight past its edge).
// Grouping restores ordinary word wrapping while keeping the per-letter stagger, with the delay
// counted across the WHOLE name so the cascade still reads as one continuous sweep over the break.
function SwapLayer({ text, step, variant }: { text: string; step: number; variant: 'in' | 'out' }) {
  let ci = 0
  const words = text.split(' ')
  return (
    <span className={`lswap__layer lswap__layer--${variant}`} aria-hidden>
      {words.map((word, wi) => (
        <span className="lswap__w" key={wi}>
          {Array.from(word).map((ch, i) => (
            <i key={i} style={{ animationDelay: `${ci++ * step}s` }}>{ch}</i>
          ))}
          {/* nbsp, not a literal space — same collapse issue as Letters (see Words.tsx): a
              trailing space glued to the end of a nowrap inline-block gets trimmed away. */}
          {wi < words.length - 1 ? '\u00A0' : null}
        </span>
      ))}
    </span>
  )
}

// ── CountUp ───────────────────────────────────────────────────────────────────
const COUNT_MS = 620
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function CountUp({ value, decimals = 1, delay = 0 }: { value: number; decimals?: number; delay?: number }) {
  // reduced-motion is read ONCE into state rather than branched on inside the effect: setting state
  // synchronously in an effect body cascades renders (and the lint rule rightly rejects it), so the
  // reduced path simply renders `value` and never schedules a tween at all.
  const [reduced] = useState(reducedMotion)
  // starts at 0 so the FIRST open reads as the panel counting the body up from nothing; every
  // switch after that counts from the previous body's value.
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    if (reduced) return
    const from = fromRef.current
    if (from === value) return
    let raf = 0
    // hold at the PREVIOUS value through the delay — the number must not jump early, it waits its
    // turn in the sequence and then counts.
    const timer = window.setTimeout(() => {
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / COUNT_MS)
        setShown(from + (value - from) * easeOutCubic(k))
        if (k < 1) raf = requestAnimationFrame(tick)
        else fromRef.current = value
      }
      raf = requestAnimationFrame(tick)
    }, delay * 1000)
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [value, reduced, delay])

  // NOTE: the "subtle glow on change" the panel wants lives once on the PANEL ITSELF
  // (ForcesPanelFrame's .panel-glow), not per-value — an earlier pass put a small glow on every
  // numeral/bar individually, which wasn't the ask and just added visual noise.
  return <>{(reduced ? value : shown).toFixed(decimals)}</>
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
// Width is a CSS transition (see .fparam__track i), so React only ever sets the target; mounting at
// 0 and stepping to the real value on the next frame makes the first paint animate too.
export function Gauge({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  const [reduced] = useState(reducedMotion)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (reduced) return
    const raf = requestAnimationFrame(() => setW(value))
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])
  return (
    <span className={className ?? 'fparam__track'}>
      <i style={{ width: `${reduced ? value : w}%`, transitionDelay: `${delay}s` }} />
    </span>
  )
}
