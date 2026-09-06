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

// ── Relations' own two panel-adjacent schedules — same "in order, not at once" rule, extended to
// a screen that grew its entrance timings ad hoc (bespoke literal delays scattered across
// views.css) instead of importing this module. Neither existed until this pass.

// The field's side panel — DETAIL state (a pinned country's own relation to the reference).
// kicker leads (it names the relationship before anything else does); rows starts well after
// `why` lands, not at 0 — the force bars used to begin filling before the text above had even
// finished revealing.
export const REL_BEAT = {
  kicker: 0,
  title: 0.14,
  headline: 0.30, // the dominant-share numeral + verdict chip, together — was `verdict`, renamed
                   // now that a numeral shares the slot with the chip it used to be alone in.
  why: 0.44,
  // The composition bar used to start at a flat 0.66s regardless of how long `why` actually runs
  // — for a 30-word description (this data runs 13–30 words) the bars started filling while the
  // text was still on word six. `compFloor` is only the MINIMUM; RelationsView derives the real
  // delay as why + (word count × wordStep) + a settle beat, the same "derive from the actual last
  // beat" precedent AXIS_BEAT.foot already documents for its own footer. wordStep must match
  // Words' own default step (Words.tsx) or the derived number is simply wrong.
  compFloor: 1.00,
  wordStep: 0.04,
  compSettle: 0.30,
  // meta/action are offsets FROM THE COMPUTED comp delay, not from t=0 — .panel__meta used to
  // inherit an unrelated shared 0.04s rule and landed BEFORE the verdict it was meant to follow;
  // tying it to comp instead of a hardcoded literal means it can never drift ahead of the content
  // above it again, however long `why` turns out to be.
  metaAfterComp: 0.22,
  actionAfterComp: 0.38,
} as const

// The relations GRID (the entry screen's overview of all 20 countries) — its own header
// (sortbar) and its 20-cell cascade. Mirrors INDEX_BEAT's shape (a ranked list is the closest
// analog to a grid of cells) rather than reusing INDEX_BEAT itself, since this schedule also
// carries the per-cell `cellStep`/`cellMax` cascade that the axis/index schedules don't need.
export const GRID_BEAT = {
  sort: 0,
  note: 0.2, // band headers ride this too, +0.07 each — all landed by ~0.34
  // ── The cell's three-phase load ──────────────────────────────────────────────────────────────
  // A cell doesn't arrive as one object. Its OUTLINE draws itself first, then the constellation
  // lands inside the shape that's now waiting for it, then the caption names what you've been
  // looking at. The gaps between the three are the whole point — each phase reads as finished
  // before the next starts, which is what makes it feel deliberate rather than merely staggered.
  //
  // Durations live in views.css (draw 0.70s / dot 0.42s / caption 0.50s); only the delays are here.
  // Tuned so each phase is FULLY done before the next begins — measured ends 1.41 / 2.54 / 3.56s,
  // leaving two ~0.16s silences. Those silences are the deliverable: overlap the phases even
  // slightly and it stops reading as three events and becomes one long blur.
  strokeStart: 0.35, // after the container's own relGridIn rise has essentially landed
  strokeStep: 0.02,
  strokeMax: 0.36,   // capped like every other cascade here — 20 cells at full step is sluggish
  // Dots do NOT cascade in cell order. Their delay is hashed per dot, so the constellations fill
  // in across the whole screen at once rather than triangle by triangle — "sporadic" is the brief,
  // and a per-cell sweep would just repeat the stroke phase's motion one layer down.
  dotsStart: 1.57,
  dotsSpread: 0.55,
  capStart: 2.70,
  capStep: 0.02,
  capMax: 0.36,
} as const

// ── The relations FIELD's post-landing load ───────────────────────────────────────────────────
// Everything here waits for the stars to STOP. A star's own flight ends at ENTRANCE_HOLD (0.5s) +
// up to 18 × ENTRANCE_STEP (0.045s) + rnodeRise's own 1s ≈ 2.31s, so nothing below may start
// before that — a name that rides its star in is unreadable while the star is still travelling,
// and poles that race the stars label a field that isn't there yet.
//
// Order is deliberate: the three poles land FIRST (they are what makes a position mean anything),
// and only then are the individual stars named.
export const FIELD_BEAT = {
  vtxStart: 2.40,
  vtxStep: 0.14,   // between the three poles — each is a per-character cascade of its own on top
  nameStart: 2.80,
  nameStep: 0.018, // 19 stars; a wider step here drags the tail past 3.5s
} as const

// ── GRID_PICK ────────────────────────────────────────────────────────────────────────────────
// The grid → field hand-off, choreographed rather than cross-faded. The grid used to leave as one
// block (relGridOut: the whole container fading and shrinking 6% in 340ms), which read as a cut —
// the screen you picked FROM and the screen you arrived AT shared no motion.
//
// It now runs as five stated beats, with a real hold between each so the sequence is legible:
//   1. glow      — the picked triangle lights; nothing else moves yet.
//   2. dismiss   — every OTHER cell scales out and fades, staggered by distance from the pick, so
//                  the field empties outward from the thing you chose rather than in reading order.
//   3. undress   — the picked cell sheds its own parts in turn: stance label, then name, then its
//                  stars, leaving only the outline. (Its parts arrived in that order on load; they
//                  leave in it too.)
//   4. travel    — the bare outline moves to the centre of the screen.
//   5. expand    — it scales up to the size of the field's own triangle and fades out as the field
//                  zooms in underneath, so the outline you were looking at becomes the frame you
//                  land in. Nothing "arrives"; the same shape carries you across.
// Seconds (CSS), except GRID_PICK_MS which is the total the VIEW waits before swapping mode.
export const GRID_PICK = {
  glow: 0,
  dismissStart: 0.26, dismissSpread: 0.36, dismissDur: 0.32,
  poleOut: 0.82, nameOut: 0.90,
  dotsStart: 0.98, dotsSpread: 0.22, partDur: 0.26,
  travelStart: 1.32, travelDur: 0.98, // travel + expand are ONE animation; 53% of it is the move
} as const
// The field mounts at 2260 while the outline's fade runs to 2300 — a deliberate 40ms overlap, so
// the field's own relZoomOut begins UNDER the last frames of the outline rather than after them.
export const GRID_PICK_MS = 2260
