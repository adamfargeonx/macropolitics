# The State-Power Model — Spec for the Empirical Phase

How "כוח משיכה" (gravity) should be computed: credible, sourceable, and as simple as it can be
without lying. This is the blueprint for GSD Phase 1 (the empirical gravity backbone), and it
supersedes the hand-tuned `power` / `FORCES` placeholders in `src/data/entities.ts`.

---

## What's wrong with the current numbers

- **The score isn't computed from its parts.** `power` (0–100) and `FORCES.{eco,mil,geo}` are
  set independently, so "gravity = economic + military + geostrategic" is true in the copy and
  false in the code (Israel's 58 doesn't equal its 7·9·7).
- **"Geo-strategic" is a grab-bag** — silently bundles location, depth, resources, neighbours →
  a 7 means nothing you can source or defend.
- **Static, scalar, unsourced** — power is relational and domain-specific, flattened to one number.

---

## The model

> **gravity = ( Economic + Military + Geo-strategic ) × Stability + Backing**

Three **capability axes** (the visible profile), one **stability** discount (a multiplier that is
≈1 for functioning states and only bites for fragmented ones), and a **backing** term derived
from the alliance graph. Each is normalized; weights are explicit and tunable.

### Design decisions that keep it honest

**1. Axes are *effective*, not raw.** Each capability axis is already quality-adjusted, the way
real-world data naturally is (GDP embeds institutional quality; "military effectiveness" embeds
doctrine and readiness). We deliberately do **not** strip quality out and add it back via a
pervasive multiplier — that would double-count competence.

**2. Stability is a narrow *integrity discount*, not a general cohesion multiplier.** It answers
one question — *"is this a single functioning state that commands its own resources?"* — and
nothing else. For ~25 of the 29 bodies it is ≈1 and invisible. It bites only for the handful
that are genuinely shattered (Syria, Lebanon, Yemen, partly Iraq), where it represents something
the axes truly can't: a productive-on-paper economy and a real army that **no one government
controls.** Because it does nothing for functioning states, it cannot double-count their
competence (which already lives in the axes). Named **יציבות** for the empirical read; anchored
on fragility/stability indices, not vibes.

**3. Backing is derived from the relations graph, not hand-set.** A proxy's weight is mostly its
patron's projected power. Compute `effective = own + α · patron_gravity` along the existing
`LINKS` edges (α = strength of dependence). It falls out of the alliances for free and is shown
relationally ("+12 ⟵ איראן"), not as a static per-state parameter.

**4. No double-counting — each pathology gets exactly one home:**

| Body | Why it's low | Captured by |
|---|---|---|
| **Egypt** | poor per-capita, debt, aid-dependent (not fragmenting) | **Economic** axis |
| **Syria** | competent-on-paper but shattered, no unitary control | **Stability** discount |
| **Hezbollah** | tiny intrinsic base; an Iranian forward arm | **Backing** (graph) |
| **Israel** | genuinely strong across the board, high integrity | high **effective axes** |

Egypt's failure is *economic*, so a low economic score handles it and stability stays ≈1 — proof
the partition holds: different failures, different mechanisms, no overlap.

---

## The three axes (each a *structured* sub-index, not a grab-bag)

One bar in the UI; underneath, an explicit, named, sourceable rollup. The boundary rule: each
axis counts only **its** facet of a shared fact (oil's *dollars* are economic; oil's *cutoff
leverage* is geo-strategic; territory as *farmland/people* is economic, as *room to manoeuvre*
is geo-strategic).

### Economic — כלכלי
Economic mass and sophistication. Sub-factors: GDP (PPP) + per-capita; trade/financial weight;
technology & innovation base. *Source:* World Bank, IMF, WIPO.

### Military — צבאי
Effective force, quality-adjusted. Sub-factors: military expenditure; active personnel; a
capability/readiness adjustment (incl. nuclear/strategic where relevant). *Source:* SIPRI,
IISS Military Balance.

### Geo-strategic — גאו-אסטרטגי
Structural & positional endowment (the *leverage*, not the dollars). Sub-factors:
- **Location & access** — centrality, chokepoint control, sea/land routes (Hormuz, Suez, Bab-el-Mandeb).
- **Strategic depth** — territory, buffer, defensibility.
- **Neighbourhood** — threat environment, quality of borders/neighbours.
- **Resource leverage** — energy/minerals as a *weapon* (supply, not GDP).
*Source:* EIA/BP (energy), geographic data, threat-environment judgment.

### Stability (the integrity discount) — יציבות
*"One government, holding its territory, functioning?"* 0–1, ≈1 for normal states, low for
fragmented ones. *Source:* Fragile States Index, World Bank political-stability/WGI.

### Backing — גיבוי (derived)
`own + α · patron_gravity` over `LINKS`. Not authored per state; shown as a relational line.

---

## How the panel reads

Decomposed, the forces panel tells a story instead of showing five abstract bars:

> **What it has:** ▮▮▮ כלכלי · ▮▮ צבאי · ▮ גאו-אסטרטגי
> **× how intact the state is:** יציבות 0.8
> **+ what's lent to it:** +12 ⟵ איראן
> **= כוח משיכה 26**

You can read *why* Hezbollah is 26 (almost all borrowed) or why Egypt underperforms its mass
(low economic axis, not low stability).

---

## Weights, sourcing, time, honesty

- **Weights are explicit and tunable** (e.g. economic .38 · military .34 · geo-strategic .28,
  pre-stability). Tuning them live *is* the Scenario Sandbox feature.
- **Every sub-factor traces to a public dataset**, surfaced on inspection
  ("USA economic 9.4 — World Bank 2024").
- **Add a `year`** so the constellation can evolve (the Time Axis feature).
- **Stay honest:** even sourced, the weights and the geo-strategic judgments are interpretive.
  Keep the המודל overlay's honesty note; expose weights + sources so the model is arguable,
  not authoritative.

## If you change one thing first
Compute the score **from weighted, effective axes** and add the **stability discount** + the
**graph-derived backing**. That fixes the internal inconsistency and the two biggest
face-validity gaps (hollow states scored too high, proxies scored without their patron) — turning
the map from a handsome assertion into a defensible instrument.
