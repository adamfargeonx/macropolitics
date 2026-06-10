# Project: Macropolitics

## What it is
An interactive, Hebrew-first (RTL) editorial data-visualization of Middle-East power
relations — a from-scratch code migration of a Framer site (macropolitics.framer.website),
owned and extensible. The interface treats geopolitics as an **orrery**: each body's size
encodes its political **gravity** (כבידה), and distance/orbit encodes relationship.

## Stack
Vite + React + TypeScript SPA. Canvas-rendered orrery (the `OrbitalField` engine) for
`/dynamics`; DOM-positioned nodes for `/forces` and `/relations`. Procedural Web-Audio sound.
Fonts: Tel Aviv Brutalist (Hebrew display) + Futurism (Latin/body). Single source of truth
for the visual language in `src/index.css` (`:root` tokens) — see `docs/design-system.md`.

## The experience
- **Loader** → **Home** (one circle: breathing ↔ open; click centre to toggle) →
  three lenses reachable from the ring:
  - **הכוחות / Forces** — each body sized by its gravity score; a four-part gravity profile.
  - **היחסים / Relations** — a tension/friction/harmony triangle relative to a reference state.
  - **יחסי הכוחות / Dynamics** — the live orrery: bodies orbit hubs (USA / Saudi / Iran) on rings.

## Current state (foundation complete)
The visual + interaction foundation is built and iterated across many sessions: opener/home,
all three lenses, custom cursor, procedural sound, the design-system token layer, the
visual-language legend, a collapsible side dock, and a documented improvement roadmap
(`docs/improvement-ideas.md`). **The data is still placeholder** — `power`, `FORCES`, and
`relation()` are hand-tuned knobs awaiting an empirical backbone.

## Why GSD now
The visual polish runs best as a fast, ref-driven loop (kept outside formal phases). GSD is
adopted here to sequence the **next chapter** — making the model *true* (empirical data) and
adding the *temporal* and *what-if* dimensions — where decomposition, success criteria, and
goal-backward verification earn their keep.

## Non-negotiables
- Hebrew-first, RTL. The accent budget is tiny (yellow `#fbff00` only).
- Editorial restraint; the circle/orbit is the recurring motif.
- Every number must eventually trace to a source (the empirical-data principle).
- `prefers-reduced-motion` respected throughout.

## Out of scope (for now)
- CMS / backend. Content lives in `src/data/`.
- Auth, accounts, persistence beyond URL state.
