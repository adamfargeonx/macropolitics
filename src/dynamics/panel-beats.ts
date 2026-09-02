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
  listHeader: 0.62,
  rowsStart: 0.70,
  rowStep: 0.028,
} as const

// ── The AXIS DRILL-DOWN schedule (ForcesAxisPanel) — the third content state the panel frame can
// hold, after the ranked list and a body's detail. Reads top-down in the order the eye needs it:
// where am I (axis + score) → the shape of that score (composition bar) → what makes it up (the
// criteria groups) → provenance last, because it's the footnote, not the point.
// rowStep is deliberately half BEAT.rowStep: this list runs 5-7 rows deep, not 3, and the wider
// spacing that reads as considered on three rows reads as sluggish by the seventh.
export const AXIS_BEAT = {
  back: 0,
  head: 0.14,
  // analysis (this body's specific read) leads the panel — content, not decoration, so it gets
  // its own beat ahead of the graph. Used to share this slot with a generic "why this axis
  // matters" blurb line (removed); analysis took the blurb's own 0.24 slot when that line went,
  // and bar/groups pulled back by the same 0.10s so the analysis→bar→groups spacing (0.16 between
  // each) stays exactly what it was tuned to — one beat removed, not the rhythm.
  analysis: 0.24,
  bar: 0.40,
  groups: 0.56,
  groupStep: 0.16,
  rowStep: 0.05,
  // floor only — ForcesAxisPanel derives the real footer delay from the actual last row's beat
  // (a static number can't be right for every axis: mil has 7 unmodeled rows, eco has 0).
  foot: 1.02,
} as const
