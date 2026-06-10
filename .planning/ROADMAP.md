# Roadmap: Macropolitics

## Overview

The visual + interaction **foundation is built** (Phase 0, complete). The roadmap from here
makes the model *true* and *dynamic*. Phase 1 is the empirical-data backbone — the highest-value,
most GSD-shaped work, and the dependency root for everything analytical. Phase 2 builds the
parametric layout engine on top of real scores, which Phase 3 (time) and Phase 4 (scenarios)
both consume. Phases 5–6 broaden content and harden the platform. Ongoing visual polish stays
*outside* phases — it runs as a fast, ref-driven loop.

## Phases

**Phase Numbering:** integer phases are planned milestones; decimals (e.g. 1.1) are urgent insertions.

- [x] **Phase 0: Foundation** - Home, three lenses, design system, sound, chrome (built pre-GSD)
- [ ] **Phase 1: Empirical Gravity Backbone** - Methodology + sourced data wired to every body
- [ ] **Phase 2: Parametric Layout Engine** - Scores → geometry (size/orbit), eased; one substrate
- [ ] **Phase 3: Time Axis** - Scrubber re-forms the constellation across years (history + forecast)
- [ ] **Phase 4: Scenario Sandbox** - Edit gravity / flip alliances → the system re-equilibrates
- [ ] **Phase 5: Constellations & Forecaster** - 15 ego-network pages + `/experiment`
- [ ] **Phase 6: Platform Hardening** - Mobile/touch + canvas performance tiering

## Phase Details

### Phase 0: Foundation — COMPLETE
**Goal**: A staggering, coherent, fully-navigable experience with placeholder data.
**Requirements**: FND-01…05
**Status**: Done across many pre-GSD sessions. Captured in `docs/` + project memory.

### Phase 1: Empirical Gravity Backbone
**Goal**: Every body's gravity (כבידה) and force components derive from real, sourced data — no hand-tuned knobs.
**Depends on**: Phase 0
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, CONTENT-03
**Success Criteria** (what must be TRUE):
  1. A written methodology defines the gravity score (economic+military+geostrategic indices, weights, normalization).
  2. Each body's `power`/`FORCES` is computed from a sourced dataset committed to the repo.
  3. The UI can show, per body, the sources behind its numbers.
  4. Removing the placeholder constants does not change the rendered scores (they come from data).
**Plans**: TBD

### Phase 2: Parametric Layout Engine
**Goal**: A single function maps scores → geometry (size, orbit radius, ring) with eased transitions.
**Depends on**: Phase 1
**Requirements**: FEAT-01
**Success Criteria**:
  1. Node size and orbit derive from gravity inputs via one parametric step (not fixed coordinates).
  2. Changing an input value animates the affected geometry smoothly.
  3. Both Forces and Dynamics consume the same engine.
**Plans**: TBD

### Phase 3: Time Axis
**Goal**: A timeline scrubber re-forms the whole constellation across years.
**Depends on**: Phase 2
**Requirements**: FEAT-02
**Success Criteria**:
  1. Data carries a time dimension (sparse keyframes); the scrubber tweens between them.
  2. Bodies grow/shrink, drift between blocs, and appear/dissolve as `t` changes.
  3. Default `t = present` reproduces today's view exactly. Flag-gated, revertable.
**Plans**: TBD

### Phase 4: Scenario Sandbox
**Goal**: A what-if mode where editing inputs re-equilibrates the system live.
**Depends on**: Phase 2
**Requirements**: FEAT-03
**Success Criteria**:
  1. The user can drag a body's gravity or flip an alliance.
  2. The system re-lays-out via the parametric engine; a transparent propagation rule is documented.
  3. "Reset to reality" restores the sourced state. Flag-gated.
**Plans**: TBD

### Phase 5: Constellations & Forecaster
**Goal**: The 15 per-state ego-network pages and the `/experiment` forecaster.
**Depends on**: Phase 1 (data), Phase 3 (forecaster leans on time)
**Requirements**: CONTENT-01, CONTENT-02
**Success Criteria**:
  1. Each of the 15 states has a constellation page with its proxies + brief.
  2. `/experiment` projects a chosen body's constellation N years out.
**Plans**: TBD

### Phase 6: Platform Hardening
**Goal**: The experience holds on mobile and weak hardware.
**Depends on**: Phases 1–4 (stabilized surfaces)
**Requirements**: PLATFORM-01, PLATFORM-02
**Success Criteria**:
  1. All screens are usable and legible at 375px with touch interactions.
  2. The orrery tiers particle/label counts by device capability without melting weak GPUs.
**Plans**: TBD

## Outside the roadmap (fast loop)
Visual / interaction / motion / copy refinement — steered live with references, executed and
verified in tight batches. Tracked in `STATE.md` under "Active polish backlog", not as phases.
