// Grid composition for the ALTERNATE forces screen (see ForcesGridView) — the counter-proposal to
// the packed force-field. Where the field makes size carry the whole story (bodies packed by bloc,
// radius = power, strong dwarf weak), the grid makes SAMENESS the baseline: every state occupies an
// identical cell at an identical radius, ranked strongest→weakest, and power is revealed only in
// passing — by a travelling wave that swells each body to its true power radius for a beat, then
// lets it settle back into the uniform grid.
//
// The point of the comparison: the field states the hierarchy permanently and spatially; the grid
// states equality-of-presence permanently and reveals hierarchy TEMPORALLY. Same data, opposite
// rhetoric.
//
// Pure math only — no canvas, no React. ForcesSheet consumes both halves (layout + reveal clock).

// ── Layout ───────────────────────────────────────────────────────────────────
// Reading order is RTL (Hebrew): rank 1 lands top-RIGHT, filling leftward, then wrapping down.

// Cell aspect target — columns are chosen so cells land close to square at the canvas's own ratio.
const CELL_ASPECT = 1

/** Column count that keeps cells nearest to square for `n` bodies in a `w × h` box. */
export function gridColumns(n: number, w: number, h: number): number {
  if (n <= 0) return 1
  const ratio = (w / Math.max(1, h)) / CELL_ASPECT
  // start from the ideal continuous solution, then pick the integer neighbour with the squarest cell
  const ideal = Math.sqrt(n * ratio)
  const lo = Math.max(1, Math.floor(ideal))
  const hi = Math.min(n, lo + 1)
  const squareness = (cols: number) => {
    const rows = Math.ceil(n / cols)
    const cw = w / cols, ch = h / rows
    return Math.max(cw, ch) / Math.min(cw, ch) // 1 = perfectly square
  }
  return squareness(lo) <= squareness(hi) ? lo : hi
}

/**
 * Normalized [0,1] cell centres for `n` bodies, in rank order (index 0 = rank 1 = top-right).
 * Returned in the same normalized space the field layout uses, so the canvas projection,
 * hit-testing and tour camera all work unchanged.
 */
export function gridLayout(n: number, w: number, h: number): { nx: number; ny: number }[] {
  const cols = gridColumns(n, w, h)
  const rows = Math.ceil(n / cols)
  const out: { nx: number; ny: number }[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    // count of items in THIS row — the last row is centred rather than left-ragged, so an
    // incomplete final row reads as deliberate composition instead of a truncated table.
    const inRow = Math.min(cols, n - r * cols)
    const rowPad = (cols - inRow) / 2
    // RTL: column 0 sits at the RIGHT edge
    const cx = (cols - 1 - (c + rowPad) + 0.5) / cols
    const cy = (r + 0.5) / rows
    out.push({ nx: cx, ny: cy })
  }
  return out
}

/** Uniform body radius (px) that fits every grid cell with breathing room. */
export function gridRadius(n: number, w: number, h: number): number {
  const cols = gridColumns(n, w, h)
  const rows = Math.ceil(n / cols)
  const cell = Math.min(w / cols, h / rows)
  return cell * 0.34
}

// ── Reveal wave ──────────────────────────────────────────────────────────────
// "Intermittent animations that show their size and power": at rest every body is identical. A wave
// travels down the ranking; as it reaches each body that body swells toward its TRUE power-
// proportional radius and surfaces its score, then eases back to uniform. Continuous but unhurried —
// it re-states the hierarchy every cycle without ever freezing the grid into it.

const STAGGER = 0.16 // s between consecutive bodies entering the wave
const GROW = 0.45    // s to swell out
const HOLD = 0.5     // s at full reveal
const FALL = 0.6     // s to settle back
const REST = 3.2     // s of stillness after the wave clears, before it runs again

const SPAN = GROW + HOLD + FALL

/** Full cycle length (s) for `n` bodies — one pass down the ranking plus the rest beat. */
export function revealCycle(n: number): number {
  return Math.max(1, n - 1) * STAGGER + SPAN + REST
}

/**
 * Reveal amount 0→1 for the body at rank `rank` at cycle-relative time `t` seconds.
 * 0 = uniform grid size; 1 = fully swelled to its true power radius with its score shown.
 */
export function revealAt(rank: number, t: number, n: number): number {
  const cycle = revealCycle(n)
  const local = ((t % cycle) + cycle) % cycle - rank * STAGGER
  if (local <= 0 || local >= SPAN) return 0
  if (local < GROW) return easeOutCubic(local / GROW)
  if (local < GROW + HOLD) return 1
  return 1 - easeInOutSine((local - GROW - HOLD) / FALL)
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
