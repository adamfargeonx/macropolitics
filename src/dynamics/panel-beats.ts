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
  note: 0.2, // band headers ride this too, +0.07 each — all landed by ~0.34
  // ── The cell's three-phase load ──────────────────────────────────────────────────────────────
  // A cell doesn't arrive as one object. Its OUTLINE draws itself first, then the constellation
  // lands inside the shape that's now waiting for it, then the caption names what you've been
  // looking at. The gaps between the three are the whole point — each phase reads as finished
  // before the next starts, which is what makes it feel deliberate rather than merely staggered.
  //
  // Durations live in views.css (draw 0.70s / dot 0.42s / caption 0.50s); only the delays are here.
  // Tuned so each phase is FULLY done before the next begins — measured ends 2.25 / 3.38 / 4.40s,
  // leaving two ~0.16s silences. Those silences are the deliverable: overlap the phases even
  // slightly and it stops reading as three events and becomes one long blur.
  strokeStart: 0.35, // after the container's own relGridIn rise has essentially landed
  // Was a rank-ordered ladder (i * step, capped) — a real, pronounced offset, but a LEGIBLE one:
  // row 1, then row 2, then row 3. Reported as "not random enough" — the brief was scattered
  // individually, not a reading-order sweep. Now hashed per cell (see strokeDelay in
  // RelationsGrid.tsx) across this full window, uncorrelated with rank/row/column.
  strokeSpread: 1.2,
  // Dots do NOT cascade in cell order. Their delay is hashed per dot, so the constellations fill
  // in across the whole screen at once rather than triangle by triangle — "sporadic" is the brief,
  // and a per-cell sweep would just repeat the stroke phase's motion one layer down.
  dotsStart: 2.41,
  dotsSpread: 0.55,
  capStart: 3.54,
  capStep: 0.02,
  capMax: 0.36,
} as const
// The sort rail used to be the FIRST thing on screen (sort: 0) — reported live as wanting it to
// read as the last thing instead, arriving only once every triangle has actually finished loading.
// Offset from the caption phase's own measured end (capStart + capMax + its 0.5s CSS duration —
// see the comment above, "measured ends 2.25 / 3.38 / 4.40s") rather than a fresh literal, so it
// can never drift ahead of a cascade it's supposed to wait out. +0.15s so it doesn't land in the
// exact instant the last caption settles — a small breath first, then its own (slower) rise.
export const GRID_BEAT_SORT_START = GRID_BEAT.capStart + GRID_BEAT.capMax + 0.5 + 0.15
// The rail's 4 items (מיון label + 3 sort buttons) used to rise in as ONE rigid block off a single
// container-level delay — reported live as wanting each to appear individually, offset from one
// another, not uniform. Per-item delay is GRID_BEAT_SORT_START/its fast equivalent + index * this.
export const GRID_BEAT_SORT_STEP = 0.09

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
// Five stated beats now, with a real hold between each so the sequence is legible:
//   1. glow      — the picked triangle lights, its stance forced fully visible (see
//                  .rel-grid__cell--chosen .rel-grid__pole .letters__ch in views.css — otherwise
//                  it's whatever phase the ambient cycle happened to be in). Held before anything
//                  else moves, so there's actually time to read it — reported live as picking a
//                  triangle giving no chance to see what you chose.
//   2. dismiss   — every OTHER cell scales out and fades, staggered by distance from the pick, so
//                  the field empties outward from the thing you chose rather than in reading order.
//   3. shrink    — a held beat alone in the emptied grid, then the picked cell — outline, stars,
//                  name, stance, as ONE object — shrinks to nothing IN PLACE. Was three separate
//                  beats (shed its parts → fly the bare outline to screen centre → collapse it
//                  there), matched to the field's own triangle position/size via a live
//                  getBoundingClientRect read. Reported as "too slow, not what I asked for" — the
//                  travel-and-land was solving a problem ("arrive where the field's triangle will
//                  be") nobody had asked to see solved; the simpler read is just the thing you
//                  picked disappearing on the spot before the interstitial takes over.
//   4. title     — into the empty centre, a full-screen line writes itself in letter by letter
//                  (the same per-character stagger every other title on the site uses), names the
//                  constellation you're about to see, holds a beat, then rises up and away.
//   5. field mounts the INSTANT beat 4's rise-away starts, not after it finishes — the title's
//                  own exit and the field's stars-rising-in entrance play AT THE SAME TIME, so the
//                  title reads as swept off by the same upward motion the stars arrive on. Lives
//                  outside RelationsGrid now (see RelationsView.tsx's pickTitleId) since the grid
//                  itself unmounts the moment the field mounts, and the title needs to keep
//                  animating past that instant.
// Seconds (CSS), except GRID_PICK_MS which is the total the VIEW waits before swapping mode.
// PICK_HOLD (beat 1's own length) was 1.0s, then 0.45s — cut again to 0.18s: still a real glow-
// flash (long enough to register "that one, right there"), but no longer a beat you have to wait
// through before the rest of the sequence gets moving. Every beat-2-onward literal below is that
// same country's OWN start time, just offset by one constant, so the whole sequence still moves
// as one block and nothing needed re-deriving individually.
const PICK_HOLD = 0.18
export const GRID_PICK = {
  glow: 0,
  dismissStart: PICK_HOLD + 0.2, dismissSpread: 0.36, dismissDur: 0.32,
  // Was 0.16s — reported live as the picked cell just sitting there too long once everything
  // else had already cleared out ("without the long pause"). Cut to a token beat: still enough
  // gap that the shrink doesn't start on the exact same frame the last dismissal lands, but no
  // longer a held beat you have to wait through.
  shrinkPause: 0.03,
  shrinkDur: 0.42,   // beat 3: the whole cell scales to nothing in place
  // beat 4: title card. Step matches the grid's own per-character cascades elsewhere (0.018s);
  // holdDur is the beat it sits fully written before clearing. outDur was 0.22s, a fast plain
  // fade with no motion — reported as disconnected from the field's own entrance (stars rising
  // in below while the title just dissolved in place, in two unrelated gestures). Lengthened to
  // 0.5s and paired with an upward rise (relPickTitleOut in views.css) so the title reads as
  // being carried off by the SAME upward motion the stars arrive on, not a separate event.
  // holdDur was 0.35s — harmless on its own, but once the beats around it (dismiss/shrink) got
  // cut down, a fully-written title just sitting there motionless for a third of a second read
  // as the whole sequence stalling ("stuck on screen"), not a considered pause. Cut to a beat
  // just long enough to register as read, not as a wait.
  titlePause: 0.12, titleStep: 0.018, titleHoldDur: 0.12, titleOutDur: 0.5,
} as const
const GRID_PICK_DISMISS_END = GRID_PICK.dismissStart + GRID_PICK.dismissSpread + GRID_PICK.dismissDur
export const GRID_PICK_SHRINK_START = GRID_PICK_DISMISS_END + GRID_PICK.shrinkPause
// The moment the picked cell finishes shrinking away (beat 3 ends) — everything from the title
// card on is timed as an offset from THIS, not as more literals, so the two can never drift.
const GRID_PICK_SHRINK_END = GRID_PICK_SHRINK_START + GRID_PICK.shrinkDur
export const GRID_PICK_TITLE_START = GRID_PICK_SHRINK_END + GRID_PICK.titlePause
// Longest realistic constellation title ("קונסטלציית היחסים של האמירויות" ≈ 30 characters) sets
// the worst-case write-in span this waits out; shorter names simply finish their own cascade
// earlier and sit in the hold a little longer, never held up by the schedule.
const GRID_PICK_TITLE_WORST_CHARS = 30
const GRID_PICK_TITLE_WRITE_MS = (GRID_PICK_TITLE_WORST_CHARS * GRID_PICK.titleStep + 0.4) * 1000
export const GRID_PICK_TITLE_OUT_START =
  GRID_PICK_TITLE_START + GRID_PICK_TITLE_WRITE_MS / 1000 + GRID_PICK.titleHoldDur
// The field mounts the INSTANT the title starts its rise-away, not after it finishes — the two
// motions have to run together for the title to read as carried off by the same upward force the
// stars arrive on, not merely "not waiting as long before the next thing". RelationsView.tsx uses
// this to time the mode switch; the title itself is kept mounted separately (see its
// pickTitleId/titleTimerRef) until GRID_PICK_MS below, so its own animation gets to finish while
// the field is already live underneath it.
export const GRID_PICK_FIELD_MOUNT_MS = Math.round(GRID_PICK_TITLE_OUT_START * 1000)
// The title's own fade-out finishing — when RelationsView.tsx finally drops the title from the DOM.
export const GRID_PICK_MS = Math.round((GRID_PICK_TITLE_OUT_START + GRID_PICK.titleOutDur) * 1000)
