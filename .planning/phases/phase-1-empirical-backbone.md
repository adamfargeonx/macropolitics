# Phase 1 — Empirical Gravity Backbone

**Status:** all 3 axes SOURCED & verified (2026-06-13) — eco (IMF), mil (SIPRI), geo (geo/EIA),
with per-axis provenance + flags + an evidence overlay (sources + calculation) + forces arrangements.
Remaining for the milestone: Scenario Sandbox (live weights) + Time Axis. See STATE.md session notes.
**Branch:** `empirical-backbone`
**Spec:** `docs/power-model.md` (the blueprint this phase implements)

## Why this phase
The visuals assert a worldview the data hasn't earned. Today `power` (0–100) and
`FORCES.{eco,mil,geo}` are set **independently** — `forceScore(power) = power/10`, so the
headline "gravity = economic + military + geo-strategic" is true in the copy and false in the
code (Israel's `power:58` would compute to ~77 from its own axes `(7,9,7)`). This phase makes
gravity **computed from its parts, sourced, and tunable** — turning a handsome assertion into a
defensible instrument, and laying the substrate the Scenario Sandbox + Time Axis need.

## The model (implements docs/power-model.md)
```
intrinsic_i = ( w_eco·Eco_i + w_mil·Mil_i + w_geo·Geo_i ) × Stability_i
backing_i   = α_i · intrinsic_patron(i)          // graph-derived, patron's projected power
gravity_i   = intrinsic_i + backing_i            // → scaled to the 0–100 `power` the UI uses
```
- **Axes are *effective*** (0–10, quality-adjusted) — no separate competence multiplier (no double-count).
- **Stability** is a narrow *integrity discount* ∈ [0,1]: ≈1 for functioning states, <1 only for
  the genuinely fragmented (Syria, Lebanon, Yemen, partly Iraq).
- **Backing** uses the patron's **intrinsic** (not gravity) → no proxy-of-proxy chains; α = dependence.
- **Weights explicit** (one const) so the Sandbox can later make them stateful.

## Scope — vertical slice (DATA-01 + economic axis end-to-end)
Prove the architecture with one fully-sourced axis before sourcing all three.
1. Pure engine `src/model/gravity.ts` — types, `WEIGHTS`, `computeGravities(inputs)`. No React.
2. Inputs `src/data/empirical.ts` — 29 bodies: effective `{eco,mil,geo}`, `stability`,
   backing (`patron` + `alpha`), and `SOURCES` provenance. **Economic axis sourced properly**
   (GDP-PPP + per-capita/sophistication, World Bank/IMF, 2024); mil/geo carried from the prior
   hand-tuned FORCES **with provenance flagged as interim** (next sub-phase sources them).
3. `entities.ts` wired: `power` is now **derived**; `FORCES` reflects the effective axes;
   `forceScore`/`powerSize`/`POWER_NOTES` APIs preserved → every consumer keeps working, now consistent.
4. Provenance surfaced: forces panel shows a source line per axis + backing shown relationally
   ("+N ⟵ איראן"). The honesty note stays — weights/sources are arguable, not authoritative.

## Success criteria
- [x] `gravity` is computed from axes × stability + backing for all 29 bodies (no hand-set `power`).
- [x] Ranking is defensible: USA top; proxies (Hezbollah/Hamas/PIJ) backing-driven and small;
      hollow states (Syria) discounted by stability; Israel rises to its capability (the fix).
- [x] Economic axis traces to a public dataset, surfaced on inspection.
- [x] `tsc` clean; all 4 views render error-free (Playwright DOM); forces index reflects computed order.
- [x] Weights live in one place (`WEIGHTS` in `src/model/gravity.ts`), ready for the Sandbox.

## Verified ranking (computed power, 2026-06-12)
USA 100 · China 90 · Russia 76 · Europe 74 · **Israel 67** · Saudi 63 · Iran 62 · Turkey 60 ·
India 57 · Egypt 53 · UAE 47 · Pakistan 46 · Qatar 40 · Iraq 39 · **Hezbollah 29 (+16 ⟵ Iran)** ·
Kuwait/Oman 27 · Jordan 26 · Syria 21 (×0.45 stability) · Bahrain/Yemen 20 · Hamas 19 ·
Militias/SDF/ISIS 16 · Fatah/PIJ 14 · Qaeda 13 · Lebanon 12 (×0.50).
Deltas vs the old hand values are deliberate corrections (Israel/Turkey/UAE were undercounted;
Iran's raw drops but its influence now shows via the backing it lends its proxies).

## Out of scope (next sub-phases)
Fully source military (SIPRI/IISS) + geo-strategic; the Scenario Sandbox (live weight sliders);
the Time Axis (`Eco_i[year]` keyframes). This slice makes all three cheap.

## Verification
`scripts/check-model.mjs` prints each body's `eco/mil/geo · stability · intrinsic · +backing = gravity`
and the full ranking, for calibration + regression. Playwright samples the forces gindex order.
