// Economic axis — a SOURCED multi-criterion composite (the first pilot of the original site's
// richer rubric). The single hand-judged eco score is replaced by a transparent rollup of seven
// public-dataset criteria: a two-part SPINE (economic mass + sophistication) adjusted by five
// fiscal-health signals.
//
//   spine = 0.7·massScore + 0.3·perCapitaScore           (size, tempered by per-capita)
//   eco   = spine + ADJ · (health − CENTRE)/4            (clamped 0–10)
//
// `health` is a weighted average of the five secondary criteria, centred at CENTRE so a typical
// functioning state gets ~0 adjustment (the composite redistributes, it doesn't inflate). Each
// criterion traces to a named source; missing data → neutral 5 + a flag, never imputed. Pure:
// values in, scores out. Sub-scores are surfaced in the evidence overlay.

export interface EcoCriteria {
  gdp: number // GDP-PPP, $B international — IMF WEO
  pc?: number // GDP per capita, PPP, international $ — IMF WEO (sophistication)
  reserves?: number // total reserves incl. gold, $B — World Bank
  fdi?: number // FDI net inflows, $B — World Bank
  cab?: number // current-account balance, % of GDP — World Bank
  debt?: number // general-government gross debt, % of GDP — IMF WEO
  sp?: string // S&P long-term sovereign rating
  infl?: number // inflation, avg consumer prices, % — IMF WEO
}

export interface EcoSub {
  mass: number
  percap: number
  reserves: number
  fdi: number
  cab: number
  debt: number
  credit: number
}

export interface EcoResult {
  eco: number // composite 0–10 (1-decimal) — the axis value
  spine: number // mass + per-capita, 0–10
  health: number // weighted secondary average, 0–10
  sub: EcoSub // each criterion's 0–10 sub-score (for the overlay)
  missing: string[] // criteria with no datum (neutral-filled + flagged)
}

// Weights of the five SECONDARY (health) criteria — they average into `health`.
// The spine (mass + per-capita) is dominant by construction (see formula).
export const ECO_WEIGHTS = { reserves: 0.2, fdi: 0.15, cab: 0.25, debt: 0.2, credit: 0.2 }
export const ECO_ADJ = 2.5 // max points the health average can move the spine
export const ECO_CENTRE = 6.2 // health value that yields zero adjustment (typical functioning state)
export const ECO_MASS_W = 0.7 // spine = MASS_W·mass + (1−MASS_W)·perCapita

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round1 = (n: number) => Math.round(n * 10) / 10
// log-normalise x ∈ [lo,hi] → 0–10 on fixed anchors (stable as data updates, not cohort-relative)
const logNorm = (x: number, lo: number, hi: number) =>
  clamp((10 * (Math.log(x) - Math.log(lo))) / (Math.log(hi) - Math.log(lo)), 0, 10)

// S&P long-term sovereign rating → 0–10 (source: S&P Global Ratings, 2025–26).
const SP_SCALE: Record<string, number> = {
  AAA: 10, 'AA+': 9.5, AA: 9, 'AA-': 8.5, 'A+': 8, A: 7.5, 'A-': 7,
  'BBB+': 6.5, BBB: 6, 'BBB-': 5.5, 'BB+': 5, BB: 4.5, 'BB-': 4,
  'B+': 3.5, B: 3, 'B-': 2.5, 'CCC+': 2, CCC: 1.5, 'CCC-': 1, CC: 0.5, SD: 0.3, D: 0,
}

const NEUTRAL = 5

export function economicScore(c: EcoCriteria): EcoResult {
  const missing: string[] = []
  const mass = logNorm(c.gdp, 20, 45000) // ~$45T → 10, ~$20B → 0
  const percap = c.pc != null ? logNorm(c.pc, 1500, 130000) : (missing.push('percap'), mass) // fallback to mass
  const spine = ECO_MASS_W * mass + (1 - ECO_MASS_W) * percap

  const reserves = c.reserves != null ? logNorm(c.reserves, 1, 3500) : (missing.push('reserves'), NEUTRAL)
  // FDI can be negative (net outflow / disinvestment) → a poor signal, floored low
  const fdi = c.fdi == null ? (missing.push('fdi'), NEUTRAL) : c.fdi <= 0 ? 2 : logNorm(c.fdi, 0.5, 300)
  const cab = c.cab != null ? clamp(5 + c.cab / 6, 0, 10) : (missing.push('cab'), NEUTRAL) // ±30% → 0/10
  const debt = c.debt != null ? clamp(10 - c.debt / 15, 0, 10) : (missing.push('debt'), NEUTRAL) // 0%→10, 150%→0

  // credit = S&P rating (0.65) blended with an inflation-stability score (0.35).
  const inflScore = c.infl != null ? clamp(10 - Math.max(0, c.infl - 2) / 4, 0, 10) : NEUTRAL // 2%→10, 50%→0
  const rating = c.sp ? SP_SCALE[c.sp] : undefined
  if (!c.sp) missing.push('rating')
  if (c.infl == null) missing.push('inflation')
  const credit = rating != null ? 0.65 * rating + 0.35 * inflScore : inflScore

  const w = ECO_WEIGHTS
  const health = w.reserves * reserves + w.fdi * fdi + w.cab * cab + w.debt * debt + w.credit * credit
  const eco = clamp(spine + ECO_ADJ * ((health - ECO_CENTRE) / 4), 0, 10)
  const sub: EcoSub = {
    mass: round1(mass), percap: round1(percap), reserves: round1(reserves),
    fdi: round1(fdi), cab: round1(cab), debt: round1(debt), credit: round1(credit),
  }
  return { eco: round1(eco), spine: round1(spine), health: round1(health), sub, missing }
}
