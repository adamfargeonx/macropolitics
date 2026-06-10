# State: Macropolitics

**Updated:** 2026-06-10
**Current milestone:** Phase 0 complete → Phase 1 (Empirical Gravity Backbone) is next.
**Mode:** YOLO · Coarse. Visual polish runs as a fast loop outside phases.

## Where things stand
- Foundation built (home, three lenses, design system, sound, chrome, legend, dock).
- Data is placeholder: `power` / `FORCES` / `relation()` are hand-tuned in `src/data/entities.ts`.
- Docs: `docs/macropolitics-model.md`, `docs/design-system.md`, `docs/improvement-ideas.md`.
- Terminology shift in progress: a body's "power" is now **gravity (כבידה)** sitewide.

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
