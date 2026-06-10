# Requirements: Macropolitics

Grouped by area. IDs are referenced by roadmap phases. Foundation requirements (FND-*) are
largely met; the roadmap focuses on DATA-*, FEAT-*, CONTENT-*, and PLATFORM-*.

## Foundation (FND) — built
- **FND-01** One circle home: breathing (closed) ↔ open, click-centre toggle, fluid expand.
- **FND-02** Three lenses (Forces, Relations, Dynamics) reachable from the ring; shared chrome.
- **FND-03** Design-system token layer (color/type/space/motion/z) as the single source of truth.
- **FND-04** Custom cursor, procedural sound (muteable), legend, collapsible side dock.
- **FND-05** RTL Hebrew throughout; `prefers-reduced-motion` honored.

## Data backbone (DATA) — the next priority
- **DATA-01** A documented scoring methodology for **gravity** (כבידה): economic + military +
  geostrategic indices, normalized 0–100, with weights.
- **DATA-02** Real sourced datasets (GDP, military expenditure, energy, alliances, conflict)
  feeding each body's gravity and force components.
- **DATA-03** Sourcing transparency: every number inspectable to its source in the UI.
- **DATA-04** `power`/`FORCES`/`relation()` wired to the dataset (no hand-tuned knobs).

## Features (FEAT)
- **FEAT-01** Parametric layout engine: inputs (scores) → geometry (size/orbit), eased — the
  substrate both temporal and scenario modes consume.
- **FEAT-02** Time axis: a scrubber re-forms the constellation across years (history + forecast).
- **FEAT-03** Scenario sandbox: edit a body's gravity / flip an alliance → the system re-equilibrates.
- **FEAT-04** Deep-link + shareable "constellation card" export.

## Content (CONTENT)
- **CONTENT-01** 15 constellation ego-network pages (per-state proxy maps + briefs).
- **CONTENT-02** `/experiment` forecaster view.
- **CONTENT-03** Gravity profiles (4 paragraphs) extended to all bodies, sourced.

## Platform (PLATFORM)
- **PLATFORM-01** Mobile / touch pass across all screens.
- **PLATFORM-02** Performance tiering for the canvas orrery on weak hardware.
- **PLATFORM-03** Optional licensed ambient-audio drop-in (`public/audio/ambient.mp3`).
