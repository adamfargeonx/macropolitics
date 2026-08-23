// ── Side-panel beat schedule ──────────────────────────────────────────────────────────────────
// The panel changes in ORDER, not all at once: the name lands, a beat passes, the headline score
// counts, a beat passes, the breakdown moves. Each beat is wide enough to register as its own
// event instead of blurring into one simultaneous flicker.
//
// Lives in its own module (not PanelMotion.tsx) so that file only exports components and React
// Fast Refresh keeps working.
//
// +20% across the board (was title 0 / score 0.30 / lede 0.42 / rows 0.60 / rowStep 0.08) — the
// gaps between beats read as too quick at the original spacing.
export const BEAT = {
  title: 0,      // the name — always first, nothing waits on it
  score: 0.36,   // the gravity numeral + its tier chip
  lede: 0.50,    // the one-line read, trailing the number it explains
  rows: 0.72,    // eco / mil / geo — bars, values and descriptions together
  rowStep: 0.10, // a small internal offset so the three rows read top-down, not as a block
} as const

// ── The RANKED-LIST beat schedule (ForcesIndexPanel) — same "in order, not at once" idea, for
// the OTHER thing that lives in the panel frame (see PanelFrame in Chrome.tsx: index and detail
// now share one persistent <aside>, so switching between them mounts/unmounts each content block
// in place — this is what plays each time the ranked list itself becomes visible).
export const INDEX_BEAT = {
  title: 0,
  desc: 0.30,
  controls: 0.46,
  ab: 0.54,
  listHeader: 0.62,
  rowsStart: 0.70,
  rowStep: 0.028,
} as const
