// Military axis — a SOURCED multi-criterion composite (second pilot after the economic axis).
// The single hand-judged mil score is replaced by a transparent rollup of four
// sourced/proxy criteria: expenditure (dominant spine), manpower, nuclear stockpile, cyber.
//
//   mil = clamp(spendScore + manBonus + nucBonus + cyberBonus, 0–10)
//
// Criterion coverage vs the original 11-criterion rubric:
//   ✓  Military expenditure — SIPRI 2025 ($B)
//   ✓  Manpower            — IISS Military Balance 2024 (thousands active)
//   ✓  Nuclear capability  — FAS 2025 (total warhead stockpile)
//   ◐  Cyber power         — Belfer NCPI 2022 (major powers only; 0–100)
//
//   ✗  Logistics · combat experience · defense industry · equipment/tech ·
//      alliances · intelligence · training                  — JUDGMENT; not modelled
//
// The ethos: judgment criteria are flagged in the overlay, NOT fabricated as numbers.
// Consequence: combat-experienced but low-spend states (Israel, Pakistan) score lower
// than their hand judgment implied. The overlay surfaces this gap explicitly.

export interface MilCriteria {
  spend: number      // SIPRI military expenditure, $B current — primary proxy
  manpower?: number  // IISS active personnel, thousands (approximate)
  warheads?: number  // FAS total stockpile; 0 = known non-nuclear; null = unknown
  cyber?: number     // Belfer NCPI score, 0–100 (major powers only)
}

export interface MilSub {
  spend: number     // logNorm(spend) 0–10 — the spine (always present)
  manpower: number  // logNorm(manpower) 0–10, raw score; 0 if missing/unknown
  nuclear: number   // logNorm(warheads) 0–10, raw score; 0 if non-nuclear
  cyber: number     // (ncpi/100)×10 0–10; 0 if not in index
}

export interface MilResult {
  mil: number        // composite 0–10 (1-decimal) — the axis value
  spendScore: number // raw spend score (dominant spine, for the footer)
  manBonus: number   // actual manpower upward adjustment applied
  nucBonus: number   // actual nuclear bonus applied
  cyberBonus: number // actual cyber bonus applied
  sub: MilSub        // raw 0–10 per criterion (for bars in the overlay)
  missing: string[]  // criteria with no datum ('manpower' | 'nuclear' | 'cyber')
}

// Fixed log-normalisation anchors — stable across cohort changes:
const SPEND_LO = 1,   SPEND_HI = 1000  // $B  (~$1B → 0, $1T → 10)
const MAN_LO   = 10,  MAN_HI  = 2500   // thousands active
const NUC_LO   = 10,  NUC_HI  = 7000   // total warheads

// Tunable parameters (exposed for the Scenario-Sandbox philosophy):
export const MIL_MAN_W    = 0.20  // manpower upward-adjustment weight (only lifts when man > spend)
export const MIL_NUC_RATE = 0.12  // nuclear raw score → bonus (max ~1.2 for 6k+ warheads)
export const MIL_CYBER_MAX = 0.5  // max cyber bonus (NCPI 100 → +0.5)

const clamp  = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round1 = (n: number) => Math.round(n * 10) / 10
const logNorm = (x: number, lo: number, hi: number) =>
  clamp((10 * (Math.log(x) - Math.log(lo))) / (Math.log(hi) - Math.log(lo)), 0, 10)

export function militaryScore(c: MilCriteria): MilResult {
  const missing: string[] = []

  // ── SPINE: expenditure (dominant) ────────────────────────────────────────
  const spendScore = logNorm(c.spend, SPEND_LO, SPEND_HI)

  // ── MANPOWER: upward adjustment only (large armies > what spend implies) ─
  let manBonus = 0
  let manRaw = 0
  if (c.manpower != null) {
    manRaw = logNorm(c.manpower, MAN_LO, MAN_HI)
    manBonus = Math.max(0, (manRaw - spendScore) * MIL_MAN_W)
  } else {
    missing.push('manpower')
  }

  // ── NUCLEAR: logarithmic bonus (discriminates at high warhead counts) ─────
  let nucBonus = 0
  let nucRaw = 0
  if (c.warheads != null && c.warheads > 0) {
    nucRaw = logNorm(c.warheads, NUC_LO, NUC_HI)
    nucBonus = nucRaw * MIL_NUC_RATE
  } else if (c.warheads == null) {
    missing.push('nuclear') // unknown — not assumed 0
  }
  // warheads === 0 explicitly → known non-nuclear, no bonus, not missing

  // ── CYBER: fraction of max bonus (Belfer NCPI 0–100) ─────────────────────
  let cyberBonus = 0
  let cyberRaw = 0
  if (c.cyber != null) {
    cyberRaw = (c.cyber / 100) * 10 // normalise to 0–10 for the bar
    cyberBonus = (c.cyber / 100) * MIL_CYBER_MAX
  } else {
    missing.push('cyber')
  }

  const mil = clamp(spendScore + manBonus + nucBonus + cyberBonus, 0, 10)

  const sub: MilSub = {
    spend:    round1(spendScore),
    manpower: round1(manRaw),
    nuclear:  round1(nucRaw),
    cyber:    round1(cyberRaw),
  }

  return {
    mil: round1(mil),
    spendScore: round1(spendScore),
    manBonus: round1(manBonus),
    nucBonus: round1(nucBonus),
    cyberBonus: round1(cyberBonus),
    sub,
    missing,
  }
}
