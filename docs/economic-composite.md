# The Multi-Criteria Composite — Economic axis (pilot) + the original rubric

The original macropolitics site scored each of the three power dimensions from a **multi-criterion
rubric** (6 economic · 11 military · 6 geo-strategic). The code model had collapsed each axis to a
single sourced anchor + judgment. This is the spec for restoring the rubric, **sourced** — starting
with the economic axis (live), with military and geo-strategic mapped for later.

---

## The original rubric (preserved verbatim from the source site)

**מדד כלכלי — Economic (6)**
GDP · foreign-currency reserves · trade balance · debt-to-GDP · FDI · credit rating & monetary stability

**מדד צבאי — Military (11)**
military expenditure · manpower · equipment & technology · nuclear capabilities · defense industry ·
logistics & mobility · combat experience · alliances & partnerships · intelligence & surveillance ·
cyber capabilities · training & readiness

**מדד גיאו-אסטרטגי — Geo-strategic (6)**
strategic location · access & control over resources · influence over critical routes ·
size & strategic depth · bordering countries · topography

---

## Economic composite — LIVE (`src/model/economic.ts`)

The single judged `eco` is replaced by a transparent rollup of **seven** sourced criteria — the
original six **plus GDP-per-capita** (added so the rubric captures *sophistication*, not just raw
mass; without it, large-but-developing economies inflate — India ≈ USA — and small-advanced ones
crater — Qatar 3.9). Per-capita is the one addition beyond the original six, made deliberately.

```
spine = 0.7·massScore + 0.3·perCapitaScore          // size, tempered by per-capita
eco   = spine + 2.5 · (health − 6.2)/4               // health redistributes ±, centred so a
                                                     //   typical state gets ~0 (no inflation)
health = weighted avg of the five fiscal-health criteria
```

### Per-criterion sourcing & normalisation

| Criterion | Source (live API) | → 0–10 | In spine/health |
|---|---|---|---|
| GDP-PPP | IMF WEO | log, anchors $20B–$45T | spine (mass) |
| GDP-per-capita PPP | IMF WEO | log, $1.5k–$130k | spine (sophistication) |
| FX reserves | World Bank | log, $1B–$3.5T | health 20% |
| FDI net inflows | World Bank | log; ≤0 → 2 | health 15% |
| Current-account %GDP | World Bank | linear ±30% | health 25% |
| Debt-to-GDP | IMF WEO | inverted, 0–150% | health 20% |
| Credit rating + inflation | S&P 2025–26 + IMF | rating map ×0.65 + inflation ×0.35 | health 20% |

Missing data (Iran reserves/CA/rating; Russia rating; Yemen most) → **neutral 5 + a flag**, never
imputed. The seven sub-scores are surfaced in the evidence overlay.

### Notable sourced shifts vs the old hand-scores
- **Russia eco 6 → 8.0** — low debt (17%), $608B reserves, $50k PPP/capita, energy surplus: the
  macro data shows a fiscally robust economy the old "6" (sanctions-pessimism) didn't reflect.
  ⚠️ Its credit sub-score is inflation-only (S&P withdrew the rating in 2022) and flagged — may
  understate default risk.
- **Israel 6 → 5.5, Qatar 6 → 5.7** — small advanced economies; per-capita keeps them from sinking
  but absolute mass caps them.
- **UAE 6 → 7.1, Egypt 4 → 5.1** — modest, sourced lifts.
- **Lebanon 2 → 0, Yemen 1 → 0** — collapse now lands in the economic axis (stability separately
  discounts fragmentation — no double-count).

### Tunables (exposed, arguable — the Scenario-Sandbox philosophy)
`ECO_WEIGHTS` (the five health weights), `ECO_ADJ` (2.5), `ECO_CENTRE` (6.2), `ECO_MASS_W` (0.7).

---

---

## Military composite — LIVE (`src/model/military.ts`)

The single judged `mil` is replaced by a transparent rollup of **four** sourced/proxy criteria.
Seven of the original 11 rubric criteria remain judgment and are **flagged in the overlay** as NOT
modelled — never silently smoothed.

```
mil = clamp(spendScore + manBonus + nucBonus + cyberBonus, 0–10)

spendScore = logNorm(spend, $1B–$1T)              // dominant spine, always present
manBonus   = max(0, (manRaw − spendScore) × 0.20) // upward-only: large armies > what spend implies
nucBonus   = logNorm(warheads, 10–7000) × 0.12    // log bonus; max ~+1.2 for 6,000+ warheads
cyberBonus = (ncpi / 100) × 0.5                   // max +0.5; Belfer NCPI major-powers only
```

The manpower bonus is **upward-only** (large conscript armies with spend underestimating capability
get a lift; elite small forces like Israel are not penalised twice).

### Per-criterion sourcing

| Criterion | Source | → score | Status |
|---|---|---|---|
| Military expenditure | SIPRI 2025 (updated Apr 2026) | logNorm $1B–$1T | ✓ sourced |
| Active personnel | IISS Military Balance 2024 (thousands) | logNorm 10k–2.5M | ✓ sourced |
| Nuclear stockpile | FAS 2025 (total warheads, all systems) | logNorm 10–7,000 | ✓ sourced |
| Cyber power | Belfer NCPI 2022 (0–100, major powers) | fraction of max +0.5 | ◐ proxy |
| Equipment/tech · logistics · combat experience · defense industry · alliances · intel · training | — | not modelled | ✗ judgment (flagged) |

States included in MIL_CRITERIA (11): USA, China, Russia, India, Saudi, Israel, Turkey, Iran,
Pakistan, Egypt, Iraq. Non-state actors, Europe, UAE, Syria, Lebanon, Yemen are excluded (no clean
SIPRI/IISS figures) and retain hand mil scores.

### Notable sourced shifts vs the old hand-scores

- **Iran mil 6 → 3.8** — SIPRI official spend is $7.4B (IRGC off-budget missile/proxy funding
  excluded). The composite scores what's publicly counted. ⚠️ Flagged: effective capability further
  degraded after June 2025 / Feb 2026 strikes on nuclear/missile infrastructure.
- **Israel mil 8 → 6.3** — the gap reflects unmodelled judgment criteria: combat experience, elite
  doctrine, intelligence (Iron Dome/Beam, SIGINT). ⚠️ Note: demonstrated 2024-2025 multi-front
  operational record suggests effective capability above the sourced composite score.
- **Pakistan mil 4.9** — nuclear uplift ($11.9B spend alone would score ~4.5; 170 warheads add
  +0.4). Correctly above Egypt (3.0) which lacks nuclear capability.
- **Russia mil 9.3** — $190B spend + 6,200 warheads + Belfer cyber 74. Reflects sourced inputs;
  Ukraine attrition losses (equipment, trained personnel) are a judgment-layer concern flagged in
  provenance but not captured by the spend figure.
- **Egypt mil 3.0** — SIPRI does not publish Egypt data; $4.0B is an IISS estimate. US-funded
  equipment quality not modelled. Large manpower (438k) gives small upward lift.

### Tunables
`MIL_MAN_W` (0.20, manpower weight), `MIL_NUC_RATE` (0.12, nuclear bonus rate),
`MIL_CYBER_MAX` (0.5, cyber bonus cap).

---

## Geo-strategic composite — LIVE (`src/model/geo.ts`)

The single judged `geo` is replaced (for 9 regional actors) by a transparent rollup of **four**
sourced/proxy criteria. Two of the original six rubric criteria remain judgment and are **flagged
in the overlay** as NOT modelled.

The composite is **regional only**: USA, Russia, China, Europe, India are excluded — their
geo-strategic relevance depends on carrier groups, overseas bases, and diplomatic reach that
cannot be captured by physical geography data. For states not in `GEO_CRITERIA`, the editorial
hand score is used as-is.

```
spine      = 0.40×sizeScore + 0.30×borderScore
resBonus   = logNorm(oil_Bboe + gas_Bboe, 1–350) × 0.10   // max +1.0
chokeBonus = primary×0.80 + secondary×0.40
geo        = clamp(spine + resBonus + chokeBonus, 0–10)
```

### Per-criterion sourcing & normalisation

| Criterion | Source | → 0–10 | Role |
|---|---|---|---|
| Land area km² | CIA World Factbook 2024 | logNorm 1k–2.5M km² | spine ×0.40 |
| Land borders (count) | sovereign borders | logNorm 1–8 | spine ×0.30 |
| Oil+gas reserves (Bboe combined) | OPEC ASB 2024 + BP SR 2024 | logNorm 1–350 Bboe × 0.10 | +bonus (max +1.0) |
| Chokepoint adjacency | EIA chokepoints 2024 | primary=+0.80 / secondary shore=+0.40 | +bonus |
| Strategic location · topography | — | not modelled | ✗ judgment (flagged) |

States included in GEO_CRITERIA (9): Saudi Arabia, Turkey, Egypt, Iraq, Oman, Syria, Pakistan,
Jordan, Kuwait. States not in GEO_CRITERIA retain editorial hand scores.

### Notable composite outputs vs old hand-scores

| Actor | Old hand score | Composite | Driver |
|---|---|---|---|
| Turkey | 6.0 | **7.5** | 8 borders (Saudi-tier max) + Bosphorus (primary choke) + large area |
| Saudi Arabia | 7.5 | **7.9** | 8 borders + 324 Bboe reserves |
| Egypt | — | **6.8** | Suez Canal (primary choke) + 1M km² area |
| Iraq | — | **6.6** | 145 Bboe oil reserves + 6 borders |
| Oman | — | **5.3** | Secondary shore on Hormuz + modest area |
| Syria | — | **5.2** | 5 borders + residual reserves (infrastructure destroyed — flagged) |
| Pakistan | — | **5.6** | Large area + modest reserves |
| Iran (editorial) | 7.0 → | **5.5** | Reduced 2025-2026: 2 strikes on nuclear/missile infrastructure, proxy network attrited |
| UAE (editorial) | 4.0 → | **5.5** | Raised: Jebel Ali hub, Fujairah Persian Gulf bypass, Abraham Accords reach |
| Yemen (editorial) | 3.0 → | **4.5** | Raised: Bab el-Mandeb disruption proven 2023-2025 |

### Judgment gaps flagged (not silently smoothed)

- **Strategic location** — diplomatic relevance, positioning in great-power competition: interpretive, no objective source
- **Topography** — terrain as military or access barrier: requires GIS analysis, not capturable from a single numeric field

Both appear explicitly in the overlay as: "2 קריטריונים נוספים — שיפוט; לא ממודלים"

### Tunables (exposed, arguable)

`GEO_AREA_W` (0.40), `GEO_BORDER_W` (0.30), `GEO_RES_RATE` (0.10, resource bonus rate),
`GEO_CHOKE_PRIMARY` (0.80), `GEO_CHOKE_SECONDARY` (0.40).
`AREA_HI` / `BORDER_HI` / `RES_HI` are regional anchors — recalibrate if scope expands beyond MENA.
