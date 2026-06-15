// Geo-strategic composite (third axis pilot).
// Converts sourced physical-geography criteria into a transparent 0–10 score.
// Four of the original six geo-strategic rubric criteria:
//   ✓ size / strategic depth (land area, log-normalised — CIA World Factbook 2024)
//   ✓ bordering countries (count, log-normalised)
//   ◐ resource access (proven oil + gas reserves, proxy for energy leverage)
//   ◐ route influence (chokepoint adjacency: primary control vs. secondary shore)
// Two criteria remain judgment and are flagged as NOT modelled:
//   ✗ strategic location (diplomatic / positional relevance — inherently interpretive)
//   ✗ topography (terrain as military or access barrier)
//
// This model is REGIONAL — anchors are calibrated to the actors in the dataset, not
// global extremes. The great powers (USA, Russia, China) are NOT composited here:
// their geo-strategic relevance depends on carrier groups, overseas bases, and diplomatic
// reach — judgment criteria that are not capturable from physical geography data alone.

const AREA_LO = 1_000           // km² lower anchor (Lebanon ~10k; Bahrain ~760 → floor)
const AREA_HI = 2_500_000       // km² upper anchor (Saudi Arabia ~2.15M, largest regional actor)
const BORDER_LO = 1
const BORDER_HI = 8             // max land borders among regional actors (Saudi Arabia / Turkey)
const RES_LO = 1                // Bboe lower anchor (below 1 Bboe → negligible energy leverage)
const RES_HI = 350              // Bboe upper anchor (Saudi combined ≈ 324; set so typical resource-
                                //   rich states land in the 8–9 range rather than saturating at 10)
const TCM_TO_BBOE = 6.1         // 1 tcm natural gas ≈ 6.1 billion barrels oil-equivalent (energy)

const GEO_AREA_W         = 0.40 // territory / strategic depth — dominant structural input
const GEO_BORDER_W       = 0.30 // regional connectivity — how many neighbours you touch
const GEO_RES_RATE       = 0.10 // resource raw score (0–10) × rate → bonus (max +1.0)
const GEO_CHOKE_PRIMARY  = 0.80 // primary chokepoint — sovereign / dominant control
const GEO_CHOKE_SECONDARY = 0.40 // secondary shore / adjacent position (Oman ⟵ Hormuz south)

export interface GeoCriteria {
  area_km2: number              // land area in km² — CIA World Factbook 2024
  borders: number               // land borders with sovereign states (not maritime)
  oil_bbl?: number              // proven oil reserves, billion barrels — OPEC ASB 2024
  gas_tcm?: number              // proven gas reserves, tcm — BP Statistical Review 2024
  chokepointsPrimary?: number   // count of major chokepoints under sovereign / dominant control
  chokeSecondary?: number       // count of chokepoints with secondary shore / adjacency
}

export interface GeoSub {
  area: number        // 0–10 raw area score (for overlay bar)
  borders: number     // 0–10 raw border-count score
  resources: number   // 0–10 raw combined-reserves score (oil + gas oil-equivalent)
  chokepoints: number // 0–10 normalised chokepoint contribution (for bar display)
}

export interface GeoResult {
  geo: number           // composite 0–10 (1-decimal precision)
  sizeScore: number     // area logNorm → spine input
  borderScore: number   // border logNorm → spine input
  resRaw: number        // reserves logNorm (0–10, before × GEO_RES_RATE)
  resBonus: number      // resource bonus applied to geo
  chokeBonus: number    // chokepoint bonus applied to geo
  sub: GeoSub           // sub-criterion scores for bar visualisation
  missing: string[]     // sourced fields absent ('oil', 'gas')
}

function logNorm(v: number, lo: number, hi: number): number {
  if (v <= lo) return 0
  if (v >= hi) return 10
  return (10 * Math.log(v / lo)) / Math.log(hi / lo)
}

const clamp = (v: number, lo = 0, hi = 10): number => Math.min(hi, Math.max(lo, v))

export function geoScore(c: GeoCriteria): GeoResult {
  const missing: string[] = []

  // structural spine ────────────────────────────────────────────────────────
  const sizeScore   = clamp(logNorm(c.area_km2, AREA_LO, AREA_HI))
  const borderScore = clamp(logNorm(c.borders,   BORDER_LO, BORDER_HI))
  const spine = GEO_AREA_W * sizeScore + GEO_BORDER_W * borderScore

  // resource bonus ──────────────────────────────────────────────────────────
  if (!c.oil_bbl) missing.push('oil')
  if (!c.gas_tcm) missing.push('gas')
  const oilBboe  = c.oil_bbl  ?? 0
  const gasBboe  = (c.gas_tcm ?? 0) * TCM_TO_BBOE
  const totalBboe = oilBboe + gasBboe
  const resRaw   = totalBboe > 0 ? clamp(logNorm(totalBboe, RES_LO, RES_HI)) : 0
  const resBonus = resRaw * GEO_RES_RATE

  // chokepoint bonus ────────────────────────────────────────────────────────
  const chokeBonus =
    (c.chokepointsPrimary  ?? 0) * GEO_CHOKE_PRIMARY +
    (c.chokeSecondary      ?? 0) * GEO_CHOKE_SECONDARY

  const geo = parseFloat(clamp(spine + resBonus + chokeBonus).toFixed(1))

  return {
    geo,
    sizeScore,
    borderScore,
    resRaw,
    resBonus,
    chokeBonus,
    sub: {
      area:       sizeScore,
      borders:    borderScore,
      resources:  resRaw,
      // normalise to 0–10 for bar display: GEO_CHOKE_PRIMARY is the single-unit max
      chokepoints: clamp(chokeBonus > 0 ? (chokeBonus / GEO_CHOKE_PRIMARY) * 10 : 0),
    },
    missing,
  }
}
