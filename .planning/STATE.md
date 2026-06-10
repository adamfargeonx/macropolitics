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
- [ ] 10% kerning on body + light titles (evaluate)
- [ ] Home particle field visibility (inward gravity, subtle trails, click-reactive)
- [ ] Home section-on-ring positioning + full optical-alignment pass
- [ ] Home section hover transitions (brief explainer, fluid)
- [ ] Remove the disruptive fixed sidebar divider line
- [ ] Text-reveal animations sitewide (mimic original)
- [ ] Page transition → circle-mask with slight zoom-in
- [ ] Fix jumpy open/close on the side dock
- [ ] "Gravity" (כבידה) terminology pass sitewide
- [ ] Side-panel redesign with an A/B compare toggle
- [ ] New screens: concept-driven loader (~4.5s) + relations zoom-out overview
- [ ] Sound: remove annoying ambient (default off); distinct, satisfying click; licensed drop-in kept

## Next GSD step
When the polish settles, run `plan-phase` on **Phase 1** (empirical gravity backbone): start
with the methodology (DATA-01), then source + wire the dataset (DATA-02…04).

## Decision log
- Adopted GSD for the analytical chapter only; visual polish stays a live ref-driven loop.
- Ambient music: a licensed track drops into `public/audio/ambient.mp3` (not bundled — copyright).
