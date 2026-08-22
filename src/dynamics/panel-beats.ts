// ── Side-panel beat schedule ──────────────────────────────────────────────────────────────────
// The panel changes in ORDER, not all at once: the name lands, a beat passes, the headline score
// counts, a beat passes, the breakdown moves. Each beat is wide enough to register as its own
// event instead of blurring into one simultaneous flicker.
//
// Lives in its own module (not PanelMotion.tsx) so that file only exports components and React
// Fast Refresh keeps working.
export const BEAT = {
  title: 0,      // the name — always first, nothing waits on it
  score: 0.30,   // the gravity numeral + its tier chip
  lede: 0.42,    // the one-line read, trailing the number it explains
  rows: 0.60,    // eco / mil / geo — bars, values and descriptions together
  rowStep: 0.08, // a small internal offset so the three rows read top-down, not as a block
} as const
