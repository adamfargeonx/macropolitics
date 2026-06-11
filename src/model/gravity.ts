// The gravity model — the single source of truth for political "weight" (כוח משיכה).
// Implements docs/power-model.md:
//
//   intrinsic = ( w_eco·Eco + w_mil·Mil + w_geo·Geo ) × Stability
//   backing   = α · intrinsic(patron)        // graph-derived; the patron's *projected* power
//   gravity   = intrinsic + backing           // → scaled to the 0–100 `power` the UI/size system uses
//
// Pure: inputs in, results out. No React, no module-level surprises. The score is now *computed
// from its parts*, fixing the old inconsistency (a hand-set `power` divorced from its eco/mil/geo).
// Weights live here in one place so the Scenario Sandbox can later make them stateful.

export interface AxisScores {
  eco: number // economic mass + sophistication, effective 0–10
  mil: number // effective force, quality-adjusted, 0–10
  geo: number // geo-strategic / positional leverage, 0–10
}

export interface BodyInput {
  id: string
  axes: AxisScores
  stability: number // integrity discount ∈ [0,1]: ≈1 functioning, <1 fragmented (no double-count)
  patron?: string // who lends backing (an alliance-graph edge)
  alpha?: number // dependence — share of the patron's intrinsic that is lent (≈0–0.2)
}

export interface Weights {
  eco: number
  mil: number
  geo: number
} // sum ≈ 1

// Explicit + tunable. Tuning these live *is* the Scenario Sandbox feature.
export const WEIGHTS: Weights = { eco: 0.36, mil: 0.34, geo: 0.3 }

// intrinsic/gravity live on a 0–10 scale; the UI's size system expects 0–100.
export const GRAVITY_TO_POWER = 10

export interface GravityResult {
  id: string
  eco: number
  mil: number
  geo: number
  stability: number
  base: number // weighted axes, 0–10 (pre-stability)
  intrinsic: number // base × stability, 0–10 (what the body commands itself)
  patron?: string
  backing: number // 0–10 lent by the patron
  gravity: number // intrinsic + backing, 0–10
  power: number // gravity × 10, clamped 0–100 (drives node size + ranking)
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export const baseOf = (axes: AxisScores, w: Weights = WEIGHTS) =>
  w.eco * axes.eco + w.mil * axes.mil + w.geo * axes.geo

/**
 * Compute gravity for every body. Two passes so backing reads the patron's *intrinsic*
 * (not its gravity) — that prevents proxy-of-proxy chains and runaway inflation.
 */
export function computeGravities(bodies: BodyInput[], weights: Weights = WEIGHTS): Map<string, GravityResult> {
  const byId = new Map(bodies.map((b) => [b.id, b]))

  // pass 1 — intrinsic (no backing yet)
  const intrinsicOf = new Map<string, { base: number; intrinsic: number }>()
  for (const b of bodies) {
    const base = baseOf(b.axes, weights)
    intrinsicOf.set(b.id, { base, intrinsic: base * b.stability })
  }

  // pass 2 — add graph backing, then scale to `power`
  const out = new Map<string, GravityResult>()
  for (const b of bodies) {
    const { base, intrinsic } = intrinsicOf.get(b.id)!
    let backing = 0
    if (b.patron && b.alpha && byId.has(b.patron)) {
      backing = b.alpha * intrinsicOf.get(b.patron)!.intrinsic
    }
    const gravity = intrinsic + backing
    out.set(b.id, {
      id: b.id,
      eco: b.axes.eco,
      mil: b.axes.mil,
      geo: b.axes.geo,
      stability: b.stability,
      base,
      intrinsic,
      patron: b.patron,
      backing,
      gravity,
      power: clamp(Math.round(gravity * GRAVITY_TO_POWER), 0, 100),
    })
  }
  return out
}
