# State: Macropolitics

**Updated:** 2026-06-11 (overnight deep-improvement pass)
**Current milestone:** Phase 0 complete → Phase 1 (Empirical Gravity Backbone) is next.
**Mode:** YOLO · Coarse. Visual polish runs as a fast loop outside phases.
**Backup:** tag `pre-overnight-2026-06-10` + branch `backup/pre-overnight-2026-06-10` + tarball
`~/Claude/projects/macropolitics-backup-pre-overnight-2026-06-10.tar.gz` — revert any piece from there.

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
