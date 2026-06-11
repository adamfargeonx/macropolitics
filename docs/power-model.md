# The State-Power Model — Critique & Proposed Redesign

A candid assessment of how "כוח משיכה" (gravity) is currently computed, why it isn't yet
solid, and a concrete, sourced model to replace it. This is the blueprint for GSD Phase 1
(the empirical gravity backbone).

---

## Where it stands today

In `src/data/entities.ts`:
- `power` — a hand-set 0–100 per body. Drives **size** and the headline score (`power/10`).
- `FORCES` — `{ eco, mil, geo }`, each 0–10, **also hand-set, separately**.
- The UI asserts *gravity = economic + military + geostrategic*.

## Is it solid? No — it's a credible placeholder, not yet a model. Three structural flaws:

**1. The score isn't computed from its parts.** `power` and `FORCES` are independent numbers.
The claim "gravity = eco + mil + geo" is true in the copy but **false in the code**. USA
(100 / 10·10·10) happens to line up; Israel (58 / 7·9·7 → avg ~7.7 ⇒ 77, not 58) doesn't.
Headline and components silently diverge. This is the most important problem.

**2. Three dimensions are too few — and one is a grab-bag.** "Geostrategic" silently bundles
location, chokepoints, alliances, energy, and soft power. And the model omits the dimensions
that actually explain Middle-East outcomes:
- **Energy leverage** — oil/gas as a weapon and a chokehold (the region's defining lever).
- **State cohesion / capacity** — is the state real or hollow? This single gap explains the
  worst face-validity errors: Egypt (≈110M people) scores *low for its mass*, Syria/Lebanon
  look larger than they function, and Israel (≈10M) punches far above its size.
- **External backing** — a proxy's power *is* its patron. Hezbollah's score is only defensible
  as "Iran's forward projection," but the model never represents that link.

**3. Static, scalar, unsourced.** Power is treated as one number when it's **relational and
domain-specific** (Iran: militarily potent, economically strangled; the Gulf: rich, militarily
dependent). No time axis, no sources. A single 0–100 flattens all of this.

---

## Proposed model — composite, weighted, sourced, tunable

### A. Compute the score *from* weighted components (fixes flaw #1)
`gravity = Σ wᵢ · scoreᵢ`, normalized 0–100. The headline then *is* the profile — internally
consistent by construction. Borrow the poli-sci standard, the **Correlates of War CINC index**
(share-of-system capability across economy, military, energy, demographics), modernized:

| Dimension (wᵢ) | Indicator | Source |
|---|---|---|
| Economic 0.28 | GDP (PPP) + a tech/innovation proxy | World Bank, IMF |
| Military 0.26 | Military expenditure + personnel + a capability adj. | SIPRI, IISS Military Balance |
| Energy 0.16 | Production + reserves + chokepoint control | EIA / BP Statistical Review |
| Cohesion 0.14 | State capacity / stability (inverse fragility) | Fragile States Index, WGI |
| External backing 0.16 | `own + α·patron` for clients/proxies | derived from the alliance graph |

Each indicator is scored as a **share of the regional total**, then weighted — reproducible,
not vibes. Weights are explicit and **tunable** (and tuning them live *is* the Scenario Sandbox).

### B. Add the two missing ME-specific dimensions (fixes the worst face-validity gaps)
- **Cohesion** demotes hollow states (Syria, Lebanon, Yemen) and rewards effective ones
  (Israel, UAE) — the biggest single accuracy win.
- **External backing** makes proxy scores honest: Hezbollah / Hamas / the Houthis derive a
  large share of their weight from Tehran via the existing `LINKS` graph (`own + α·patron`).

### C. Keep a profile vector, not just a scalar
Store `{ economic, military, energy, cohesion, backing }` per body. **Size** uses the composite;
the forces panel already shows a profile — just wire it to these real numbers. This preserves
the truth that power is multidimensional (Iran's spiky profile vs. the UAE's).

### D. Source everything + add a year
Every component traces to a public dataset, surfaced in the המודל / panel ("USA economic 9.4 —
World Bank 2024"). A `year` field lets the constellation evolve over time (the Time Axis).

### E. Stay honest
Even sourced, the **weights are a judgment**. Keep the המודל overlay's honesty note; expose the
weights and sources so the model is transparent and arguable, not authoritative.

---

## If you change one thing
Derive the score from **weighted, sourced components**, and add **cohesion** + **external
backing**. That alone fixes the internal inconsistency and the two biggest "that ranking looks
wrong" problems — turning the map from a handsome assertion into a defensible instrument.
