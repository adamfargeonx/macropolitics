# State: Macropolitics

**Updated:** 2026-06-13 (Phase 1 — all 3 axes sourced + provenance UI + forces arrangements)
**Current milestone:** Phase 1 (Empirical Gravity Backbone) — **eco + mil + geo all sourced & live**;
remaining sub-phases: Scenario Sandbox (live WEIGHTS sliders) + Time Axis (`eco[year]`).
**Mode:** YOLO · Coarse. Visual polish runs as a fast loop outside phases.
**Branch:** `empirical-backbone` (off `main` @ d78aaa6) — 4 commits: U1–U12 polish · Phase 1 compute ·
verified sourcing+evidence · forces arrangements. **NOT merged to main** (user reviews).
**Backup:** tag `pre-overnight-2026-06-10` + branch `backup/pre-overnight-2026-06-10` + tarball
`~/Claude/projects/macropolitics-backup-pre-overnight-2026-06-10.tar.gz` — revert any piece from there.

## Session 2026-06-13 (verified sourcing + provenance UI + forces arrangements)
Standing rule from the user: **verify sources before committing; flag the half-baked.** Acted on it.
- **Sourcing (verified vs primaries):** military = SIPRI 2025 (DB upd. 27 Apr 2026); economic = IMF
  WEO GDP-PPP 2026; geo-strategic = geography + EIA chokepoints (labelled 'judgment', interpretive).
  Re-verification CAUGHT memory errors: Saudi GDP-PPP 2.1→2.9T, Pakistan 1.6→2.17T, Syria 60→110B,
  Yemen 60→31B; mil now real SIPRI figures not guesses. Effective scores barely moved (judgment held).
- **Provenance model** (`src/data/empirical.ts`): per-axis `{figure, source, year, url, status}` +
  honest `flags`. Flags ONLY where genuinely weak: Iran (off-budget missiles, SIPRI-noted), Egypt
  (opaque budget), UAE/Syria/Yemen (SIPRI reports no data), Syria/Lebanon (collapsed economy).
- **Evidence overlay** (`src/dynamics/EvidenceOverlay.tsx`, `mp-evidence` event): per body, shows
  THE CALCULATION (axes×weights×stability+backing, real numbers) + THE SOURCES (figure, dataset,
  year, link, status badge). Opened from the forces panel ('המקורות והחישוב'). = directives #3 + #4.
- **Forces arrangements** (`ForcesView` control bar) = directive #5: order by סה״כ/כלכלי/צבאי/גאו
  (re-ranks index, re-sizes nodes, re-arranges orrery — strongest-on-axis→centre, rings become
  quantiles, nodes glide via left/top transition); bloc filter (מערב/מזרח/ניטרלי); threshold slider סף≥N.
- **Scenario Sandbox** (`src/model/weights-store.ts` + `ForcesView` 'תרחיש' panel): the model's
  WEIGHTS are now a reactive store; dragging the 3 axis-weight sliders recomputes gravity live and
  re-equilibrates the constellation + index + panel + evidence overlay. Closing it / leaving forces
  restores canon. Verified: mil-weight 51% → Russia 7.6→8.0, Israel→7.0, Iran into top-6. The payoff
  of computing power from its parts: "don't trust my numbers — move the weights."
- **Time Axis — credible slice shipped, full scrubber deferred.** Sourced military-spend trend
  (`MIL_TREND` in empirical.ts) from SIPRI 2020 + 2025 factsheets (both scraped, current-USD), 9
  major bodies, shown in the evidence overlay: Russia +208% (war), Israel +123%, Iran −53% (FLAGGED
  rial/USD artifact). Bodies without clean figures show no trend (not fabricated). The full
  constellation-over-time scrubber is DEFERRED: 2020 GDP-PPP wouldn't extract cleanly via firecrawl,
  and stability/alliance/non-state-over-time is interpretive → a dedicated sourcing pass, not invented.
- ⚠️ Playwright gotcha: controlled `<input type=range>` ignores synthetic `.value`+input events
  (React value-tracker). Verify sliders with real keyboard (`page.keyboard.press('ArrowRight')`) or drag.

## Session 2026-06-12 (Phase 1 — empirical gravity backbone, slice)
**The score is now computed from its parts.** Was: `power` (0–100) and `FORCES.{eco,mil,geo}`

## Session 2026-06-12 (Phase 1 — empirical gravity backbone, slice)
**The score is now computed from its parts.** Was: `power` (0–100) and `FORCES.{eco,mil,geo}`
hand-set independently, so `forceScore = power/10` disagreed with the bars (Israel `power:58` but
axes `(7,9,7)`→~77). Now:
- `src/model/gravity.ts` — pure engine: `intrinsic = (Σ w·axis) × stability`, `backing = α·intrinsic(patron)`,
  `gravity = intrinsic + backing` → 0–100 `power`. `WEIGHTS` in one place (Sandbox-ready).
- `src/data/empirical.ts` — 29 bodies: effective eco/mil/geo, stability discount (Syria 0.45,
  Lebanon 0.5, Yemen 0.6, Iraq 0.75), graph backing (proxies' supplied weight), `ECO_SOURCE`/`AXIS_SOURCE`.
- `src/data/entities.ts` — `NODE_DEFS` (structure) → `NODES` with **computed** `power`; `FORCES`
  derived from the same axes; `GRAVITY` map + `backingOf()` exported. APIs unchanged → all consumers work.
- Forces panel surfaces **provenance** (source line per axis; USA → "תמ״ג PPP ~$29 טריליון · IMF 2024")
  + **backing** relationally ("גיבוי ⟵ איראן +16"). Economic sourced; mil/geo flagged interim.
- `scripts/check-model.ts` — calibration + 9 regression assertions (run with `node --experimental-strip-types`).
- Verified: tsc clean; forces gindex renders the computed order (USA 10.0→Lebanon 1.2); Hezbollah
  panel shows borrowed weight; 4 views error-free. Ranking deltas are deliberate model corrections.

## Session 2026-06-12 (U1–U12 polish batch)
Home: brighter rest particles (`useGravityField` floor 0.4); **pitch-black mask nested INSIDE
`.home-orbit`** (inset:0 → tracks ring size; hover→50%); wordmark kerning 0.3em.
Logo: **mini orbit before the wordmark** (`.hdr__orbit`) + bloom-on-hover (back-to-home cue).
Transitions: home gets a **zoom-OUT** entrance (`homeZoomOut`); pages keep the zoom-in iris.
**Per-word body reveal** (`Words.tsx`, applied to default panel bodies + about lede).
Leading −12% across body copy; +15% kerning on the smallest text.
**Sidebar opens after an 850 ms delay** (PanelDock mounts closed).
Forces: **cursor-reactive stars** (lean toward cursor via `style.translate`), proximity
highlight (nearest within 76px → focus+name), **names/rankings clean toggle**, **names hidden
by default and cascade in by rank past 180% zoom**. **Fixed the Arial bug** — `<button>` doesn't
inherit font-family; added `button,input,select,textarea { font-family: inherit }`.
Legend trigger → **labelled מקרא pill** (size-ramp icon). **About toast** (one-time top-left intro).
Model modal polished (orbit mark, card lenses, focal equation). **Loader → 5 s, dimmer/slower.**
All verified via Playwright DOM/geometry sampling; tsc clean; 4 views render error-free.

⚠️ **Gotcha:** headless Chromium (Playwright) **freezes CSS transitions whose value changes on a
class flip** in the home subtree (orbit width→var, mask opacity 0→1 both stick at the start value;
removing the transition yields the correct value). It's an env artifact — real browsers animate
fine — so verify these with `transition:none` probes, not raw computed values.

## Session 2026-06-11 (T1–T7 batch)
Home nav on the ring circumference; +30% wordmark kerning; Light logo (0.3em).
**Global click-reactive particle field** (one fixed canvas behind all views; per-view
starfields removed; dynamics engine `noStarfield`). Sidebar redesigned + **root-caused the
"hard to open" bug** (RightRail z6 was eating handle clicks — RightRail removed). Model+legend
moved to a top-left utility cluster (prominent המודל pill + SVG info icon). **Powers overhaul:**
כבידה→כוח משיכה; fly-from-centre entrance; breathing states; pan+zoom; B-panel redesign;
numerals→Tel-Aviv. **Power-model critique → `docs/power-model.md`** (the GSD Phase 1 blueprint).

## Where things stand
- Foundation built (home, three lenses, design system, sound, chrome, legend, dock).
- **Editorial layer added (overnight 06-11):** gravity notes for ALL 29 bodies; 35 authored
  relation pairs with why-lines (`src/data/relations.ts`); "המודל" methodology overlay.
- **Relations view rebuilt:** authored data + sharpened/relaxed layout (zero overlaps),
  pin-on-click, barycentric guide-lines, reference picker, set-as-reference.
- **Forces:** ranked gravity index (29 rows, map-linked). **Dynamics:** richer hover readout,
  faint always-on alliance web (flagged in engine VISUALS).
- **Platform:** URL hash deep-links, keyboard nav (1/2/3/ESC), quick loader on repeat visits.
- Data is still interpretive: `power` / `FORCES` / authored relations are reasoned judgment,
  flagged honestly in the המודל overlay. Empirical wiring remains GSD Phase 1.
- Docs: `docs/macropolitics-model.md`, `docs/design-system.md`, `docs/improvement-ideas.md`.

## Active polish backlog (fast loop — not phases)
Tracked here so it's explicit without GSD ceremony. Knocked out in batches.
- [x] 10% kerning on body + light titles
- [x] Home particle field visibility (inward gravity, fade-clear trails, click-reactive)
- [x] Home section-on-ring positioning + optical-alignment pass
- [x] Home section hover transitions (brief explainer, fluid)
- [x] Remove the disruptive fixed sidebar divider line (scrim fades on dock-collapse)
- [x] Text-reveal animations sitewide (clip-mask rise)
- [x] Page transition → circle-mask (iris) with slight zoom-in
- [x] Fix jumpy open/close on the side dock (pinned handle, :has peek)
- [x] "Gravity" (כבידה) terminology pass sitewide
- [x] Side-panel redesign with an A/B compare toggle (Variant B "dossier")
- [x] New screens: concept-driven loader (~4.5s) + relations zoom-out entrance
- [x] Sound: ambient off by default; distinct crisp click; licensed drop-in kept

## Open follow-ups (noted, not yet done)
- Title kerning is now a uniform 10% (was "huge") — confirm this is the wanted value.
- Relations "zoom-out showing all states" is an entrance animation; if a persistent
  overview *mode* was meant, that's a small follow-up.
- "Familiar Patterns" (Hanna Lindgren) is licensed — drop the MP3 at public/audio/ambient.mp3.

## Next GSD step
When the polish settles, run `plan-phase` on **Phase 1** (empirical gravity backbone): start
with the methodology (DATA-01), then source + wire the dataset (DATA-02…04).

## Decision log
- Adopted GSD for the analytical chapter only; visual polish stays a live ref-driven loop.
- Ambient music: a licensed track drops into `public/audio/ambient.mp3` (not bundled — copyright).
