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
//
// Rows, not columns, are the fixed structural unit — 29 (BODIES.length) is PRIME, so no column
// count above 1 ever divides it evenly, and the old approach (one shared column count, last row
// centred with empty margin on both sides when it came up short) left visible dead space in that
// last row. Reported live as "grid; always full in each row, no empty spaces/slots". Rows are
// still chosen for a near-square overall composition, same as columns used to be, but the ITEM
// COUNT per row is redistributed as evenly as possible across those rows instead — some rows get
// one more item than others, but every row is genuinely full at whatever column count it has, so
// nothing is ever centred against a gap.

// Cell aspect target — the row count is chosen so cells land close to square at the canvas's own
// ratio (kept as a ratio comparison, not a fixed aspect number, so it still adapts to width/height).
const CELL_ASPECT = 1

/** Row count that keeps cells nearest to square for `n` bodies in a `w × h` box. */
function idealRows(n: number, w: number, h: number): number {
  if (n <= 0) return 1
  const ratio = (w / Math.max(1, h)) / CELL_ASPECT
  const idealCols = Math.sqrt(n * ratio)
  const lo = Math.max(1, Math.floor(n / idealCols))
  const hi = Math.min(n, lo + 1)
  const squareness = (rows: number) => {
    const cols = Math.ceil(n / rows)
    const cw = w / cols, ch = h / rows
    return Math.max(cw, ch) / Math.min(cw, ch) // 1 = perfectly square
  }
  return squareness(lo) <= squareness(hi) ? lo : hi
}

/**
 * How many items land in each of `rows` rows for `n` total items — as equal as possible, e.g.
 * 29 across 4 rows is [8, 7, 7, 7], never [8, 8, 8, 5]. Every entry is a real, full row; there is
 * no "leftover" row by construction.
 */
function rowCounts(n: number, rows: number): number[] {
  const base = Math.floor(n / rows)
  const extra = n % rows
  return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0))
}

/**
 * Normalized [0,1] cell centres for `n` bodies, in rank order (index 0 = rank 1 = top-right).
 * Returned in the same normalized space the field layout uses, so the canvas projection,
 * hit-testing and tour camera all work unchanged.
 */
export function gridLayout(n: number, w: number, h: number): { nx: number; ny: number }[] {
  const rows = idealRows(n, w, h)
  const counts = rowCounts(n, rows)
  const out: { nx: number; ny: number }[] = []
  counts.forEach((cols, r) => {
    for (let c = 0; c < cols; c++) {
      // RTL: column 0 sits at the RIGHT edge. No centring offset — every row spans the FULL
      // width at its own column count, which is exactly what makes it full rather than short.
      const cx = (cols - 1 - c + 0.5) / cols
      const cy = (r + 0.5) / rows
      out.push({ nx: cx, ny: cy })
    }
  })
  return out
}

/** Uniform body radius (px) that fits every grid cell with breathing room. */
export function gridRadius(n: number, w: number, h: number): number {
  const rows = idealRows(n, w, h)
  const counts = rowCounts(n, rows)
  // the WIDEST row (most columns, per rowCounts' "extra" rows) sets the ceiling — every row
  // shares one radius, so it has to be small enough that even the tightest row's cells fit.
  const maxCols = Math.max(...counts)
  const cell = Math.min(w / maxCols, h / rows)
  return cell * 0.34
}

// ── Reveal wave ──────────────────────────────────────────────────────────────
// "Intermittent animations that show their size and power": at rest every body is identical. A wave
// travels down the ranking ONCE — as it reaches each body that body swells toward its TRUE power-
// proportional radius and surfaces its score, then eases back to uniform and stays there. Was a
// repeating cycle (wave, rest, wave again, forever); the operator flagged the perpetual looping
// itself as the problem, independent of the wave's own shape — a state that never stops replaying
// reads as restless rather than "revealed", however unhurried any single pass is. `t` is now used
// directly (no modulo), so once a body's pass completes it simply never fires again.

const STAGGER = 0.16 // s between consecutive bodies entering the wave
const GROW = 0.45    // s to swell out
const HOLD = 0.5     // s at full reveal
const FALL = 0.6     // s to settle back

const SPAN = GROW + HOLD + FALL

/**
 * Reveal amount 0→1 for the body at rank `rank` at time `t` seconds since mount. Fires exactly
 * once per body (when the wave reaches its rank) and returns 0 forever before and after.
 * 0 = uniform grid size; 1 = fully swelled to its true power radius with its score shown.
 */
export function revealAt(rank: number, t: number): number {
  const local = t - rank * STAGGER
  if (local <= 0 || local >= SPAN) return 0
  if (local < GROW) return easeOutCubic(local / GROW)
  if (local < GROW + HOLD) return 1
  return 1 - easeInOutSine((local - GROW - HOLD) / FALL)
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
