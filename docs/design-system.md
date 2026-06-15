# Macropolitics — Design System

The single source of truth for the visual language. All tokens live in `:root` in
`src/index.css`; this document explains intent and usage. **Components consume tokens —
they never hardcode raw values.**

---

## 1. Principles

- **One accent.** The interface is near-monochrome (deep indigo-black + warm off-white);
  **yellow `#fbff00` is the only chromatic note** and is spent sparingly — accents, the
  active state, the tagline. Glows are avoided; light reads through contrast, not bloom.
- **The circle is the motif.** A thin ring with a single travelling dot recurs from the
  opener through the homepage. Orbits, rings and centres of gravity are the visual grammar.
- **Editorial restraint.** Generous negative space, quiet type, motion that communicates
  rather than decorates. Hebrew-first, RTL.
- **Size = power.** Across the data views, a body's diameter encodes its political gravity.

---

## 2. Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#06030f` | base canvas |
| `--bg-2` | `#0a0618` | raised surface base |
| `--yellow` | `#fbff00` | accent — active state, tagline, key data |
| `--white` | `#ffffff` | states / emphasis |
| `--light` | `#f4f2ec` | primary ink (warm off-white) |
| `--ink-dim` | `rgba(244,242,236,.55)` | secondary ink |
| `--ink-faint` | `rgba(244,242,236,.3)` | tertiary ink / hints |
| `--surface-1` | `rgba(255,255,255,.03)` | faint chip / cell |
| `--surface-2` | `rgba(10,6,22,.96)` | panel / overlay |
| `--line`, `--line-2` | white @ .08 / .06 | hairline dividers |
| `--line-yellow`, `--yellow-06`, `--yellow-08`, `--yellow-12`, `--yellow-30` | yellow @ .16 / .06 / .08 / .12 / .3 | accent lines & fills |

**Panel surfaces:** `--panel-surface` = `linear-gradient(180deg, rgba(14,9,28,.97), rgba(8,4,18,.97))`.
Used by every overlay and toast; replace the gradient inline whenever adding a new panel.

**Rail:** `--rail-w: 380px` — the right-edge field offset for the forces/relations fields.
Set to `0px` at `max-width: 768px` via media query override.

**Data-status colors** (deliberate palette exception — data-quality semantics only; NOT chromatic accents):

| Token | Value | Use |
|---|---|---|
| `--ok` | `#8fe388` | sourced / verified badge |
| `--warn` | `#ff9d6e` | no-data, flagged, estimated |
| `--ok-border` | `rgba(143,227,136,.4)` | badge border |
| `--warn-border` | `rgba(255,157,110,.5)` | badge border / flag stripe |
| `--warn-bg` | `rgba(255,157,110,.06)` | flag block background |

These exist because data-quality states cannot be communicated with yellow alone. They are
confined to evidence overlays and flag callouts — never used for decorative UI chrome.

**Allegiance rims** (bloc temperature, used as `rgb()` triplets):
`--rim-west` 132,160,196 · `--rim-east` 198,134,98 · `--rim-neutral` 150,150,160 ·
`--rim-none` 120,120,128.

---

## 3. Type

Two families, a clear display/body split:

- **Display — `--display`** = *Tel Aviv Brutalist* (Hebrew). Headlines, the wordmark, labels.
- **Body — `--body`** = *Futurism* → falls back per-glyph to Tel Aviv. Paragraphs, UI text,
  numerals (Futurism renders Latin/figures; Hebrew uses Tel Aviv).

**Weights:** `--fw-light: 300` · `--fw-regular: 400` · `--fw-bold: 700` · `--fw-black: 900`.
The hero wordmark is **Light**; data labels are Bold/Black.

**Scale:** `--text-xs 11` · `--text-sm 12` · `--text-base 13` · `--text-md 14` ·
`--text-lg 15` · `--text-xl 17` · `--text-2xl 20` · `--text-3xl 30` · `--text-4xl 32` · `--display-md 46px`.
Note: `--display-hero` (the old clamp token) was removed — it was never consumed by any component.

**Tracking:** `--tracking-tight -.01em` · `--tracking-wide .08em` · `--tracking-wider .18em`.

**Kerning rule (weight-coupled):**
- **Bold/black titles → tight** (low kerning): `-0.01em` to `-0.02em` (panel titles, logo, legend title).
- **Light titles → wide** (high kerning): `0.1em` to `0.4em` (the home wordmark is `0.38em`).
- **Body text → slightly open**: `~0.02em` for readability.

---

## 4. Space · Radius

4px base scale: `--sp-1 4` · `-2 8` · `-3 12` · `-4 16` · `-5 20` · `-6 26` · `-7 32` ·
`-8 40` · `-9 48`. Radius: `--r-sm 4` · `--r-pill 999`.

---

## 5. Motion

- **Durations:** `--dur-fast .2s` (UI feedback) · `--dur-base .4s` (transitions) · `--dur-slow .8s` (entrances).
- **Easing:** `--ease-out-expo` `cubic-bezier(.16,1,.3,1)` for entrances; `--ease-in-out-quart`
  `cubic-bezier(.76,0,.24,1)` for breathing/exits.
- **Patterns:** staggered appear (≈0.05s/item) for data nodes; one orchestrated entrance per
  view; the orbit/breathing loops are the only indefinite animations (the motif), and all are
  gated by `prefers-reduced-motion`.

---

## 6. Elevation (z-index)

`--z-field 2` (canvas) · `--z-content 3` (titles/nav) · `--z-scrim 4` · `--z-panel 5` ·
`--z-chrome 6` (header/tabs/zoom) · `--z-readout 50` · `--z-legend 40` · `--z-toggle 60` ·
`--z-cursor 2147483646` (custom cursor, always on top).

---

## 7. Screens

1. **Opener** (`OpenerView`) — post-loader. Particles stream **inward** to a breathing
   core (ring + dot). Click anywhere → the ring **opens** (expands) and crossfades to home.
2. **Home** (`HomeView`) — warp starfield, the orbiting ring, the **Light** wordmark
   "מאקרופוליטיקה", the tagline top-centre, and nav anchored around the ring
   (dynamics top · forces bottom-left · relations bottom-right).
3. **Forces / Relations / Dynamics** — the three analytical lenses; shared chrome
   (`Header`, `SidePanel`, `TabBar`, `Legend`).

---

## 8. Components (shared)

- **Custom cursor** — dot + ring, tracks the pointer with no lag; grows over interactive
  targets (`isInteractive` in `sound.ts`). Hidden on coarse pointers.
- **Side panel** — top-right, `--surface`/`--line` framed; the forces panel shows the
  four-part **power profile** (general · economic · military · geostrategic).
- **Legend** (`ⓘ`) — the visual-language key: size, fill (state vs non-state), rim hue (bloc).
- **Sound** — procedural Web Audio (ambient bed + per-interaction voices); muteable.

---

## 9. Responsive

| Breakpoint | Behaviour |
|---|---|
| ≥1281px | Desktop default. Side dock at `right: 0`, field `right: --rail-w (380px)`. |
| 768–1280px | Intermediate. Scrim hidden (via existing `@media max-width:900px`). |
| ≤768px | Mobile. `--rail-w` overridden to `0px` (field full-width). Side dock becomes a bottom sheet (max-height 50vh, position bottom). Handle moves to the top edge of the sheet. Scrim removed. |

**REVIEW NOTE (FIX 7):** the bottom-sheet panel layout at ≤768px should be verified visually.
The handle tab positioning and 50vh max-height may need tuning for specific device sizes.

---

## 10. Extending

Add a token before adding a value. If a new color/size/timing is needed more than once, it
belongs in `:root`. Keep the accent budget tiny — when in doubt, reach for ink, not yellow.
