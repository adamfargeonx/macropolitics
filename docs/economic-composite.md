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

## Military & Geo — sourceability map (for the next pilots)

**Military (11):** sourceable ✓ expenditure (SIPRI) · manpower (IISS) · nuclear (FAS/SIPRI) —
proxy ◐ equipment counts · defense industry (SIPRI arms) · cyber (Nat'l Cyber Power Index) ·
alliances (from the graph) — judgment ✗ logistics · combat experience · intelligence · training.
→ a hybrid: ~half hard data, half flagged judgment.

**Geo-strategic (6):** objective ✓ size/depth (land area) · bordering countries (count) —
proxy ◐ resource access (reserves) · route influence (chokepoint adjacency) —
judgment ✗ strategic location · topography.
→ mostly interpretive (as the axis is already labelled), with a few objective anchors.
