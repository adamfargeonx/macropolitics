# Macropolitics — Improvement Ideas

*Four ideas: two major (system / concept), two smaller. One of the smaller ones is already built.*

> **Status (2026-06-18).** Both majors are now **built** and live in the Dynamics synthesis view (and
> Forces): a shared parametric model (`gravity.ts` + `weights-store.ts` + `year-store.ts` /
> `bodyInputsForYear`) feeds the engine, which eases body sizes toward the recomputed scores. The
> **Time Axis** ships its three sourced keyframes (2000/2020/2025); widening toward 2010→2030 is the
> remaining editorial work. The **Scenario Sandbox** ships as live axis-weight sliders (no propagation
> rule needed — re-weighting is deterministic and backing cascades through the alliance graph).
> Separately, the gravity-well is now a reading toggle inside Dynamics, not a fourth peer lens.

---

## Major 1 — ציר הזמן · The Time Axis: from snapshot to story

**What.** A timeline scrubber along the bottom edge. Drag through years — 2010 → 2026 → a
projected 2030 — and the whole constellation re-forms: bodies grow and shrink as their power
changes, drift between orbits as allegiances shift, appear and dissolve (ISIS rises in 2014 and
collapses by 2019; the Abraham Accords redraw Israel's neighborhood in 2020). The orrery stops
being "the Middle East now" and becomes "how the Middle East got here — and where it's heading."

**Why it matters here.** The entire premise is that position and size *mean* something. Time is
the dimension where meaning turns into narrative: you don't just see that the US is large — you
see it *receding*, ring by ring, as China enters from the cold edge. It also reclaims the forecast
idea the original site gestured at ("how will X's constellation look in N years"), but as a
first-class, continuous control rather than a separate page.

**How.** The data model gains a time axis — `power[year]`, `axis[year]`, `links[year]` as sparse
keyframes. The engine already derives each node's radius and size from inputs every frame; make
those inputs a function of a `t` the scrubber drives, and tween between keyframes (eased). Bodies
that don't exist yet sit at scale 0. The engine work is ~1–2 sessions; the bulk is curating the
historical keyframes — which is editorial, and pairs naturally with the empirical-data pass you
already plan.

**Risk / revert.** Purely additive: default `t = present` reproduces today's view exactly. Gate it
behind a `VISUALS.timeline` flag, like the other reversible features.

---

## Major 2 — מצב תרחיש · Scenario Sandbox: a model you can push

**What.** A "what-if" mode. Grab a body and drag its power up or down; flip an alliance from the
panel (Saudi ↔ Iran détente; a US withdrawal; Iran goes nuclear) — and the system re-equilibrates
in front of you: orbits widen and tighten, rims warm and cool, proxies regroup around their new
center of gravity. A "reset to reality" button snaps it back.

**Why it matters here.** This is the line between a *diagram* and a *model*. Today the map asserts a
state; a sandbox lets the reader interrogate it — "what actually happens to Hezbollah if Iran
weakens?" — and feel the interdependence the orbital metaphor promises but a static snapshot can't
deliver. For a geopolitical publication it's a genuinely novel interactive: the kind of thing that
gets shared and cited.

**How.** It shares a substrate with Major 1 — both need a layout that recomputes from changeable
inputs instead of fixed coordinates. Build that parametric step once (inputs → positions/sizes,
eased) and time-scrubbing and scenario-editing become two front-ends onto the same engine. The
honest hard part isn't the interaction — it's the *propagation rule*: when the US's power drops,
what moves, and by how much? Start transparent and simple (a client's orbit scales with its
patron's power; a body's ring follows its own power tier) and refine toward the empirical model
later. ~2 sessions on top of the parametric engine.

**Risk / revert.** A mode you enter; the reality view stays default and untouched. Flag-gated.

> **The two majors share one investment: a parametric layout engine** (inputs → geometry, tweened).
> Build it once and both time and scenarios are unlocked — and it's the natural home for the
> empirical scoring you already plan, since the scores simply become the inputs.

---

## Minor 1 — מקרא · Visual-language legend  ✅ *built tonight*

The ⓘ control now opens a key explaining the encodings — size = power, filled = state /
hollow ring = non-state actor, rim hue = bloc (cool blue west / warm brown east / grey neutral) —
with a hint tailored to the current lens. It activated a previously-dead control and closes the
"what am I looking at?" gap a first-time visitor hits in the first five seconds. Shipped.

---

## Minor 2 — קישור-עומק וכרטיס-מערך · Deep-link + shareable "constellation card"

**What.** Encode the current state in the URL — selected body, reference state, view, zoom — so a
specific configuration is linkable (`?view=relations&ref=israel`). Add an export action that renders
a clean PNG of the current constellation ("Israel's relationships, 2026") with the title and legend
baked in, for social and embeds.

**Why it matters here.** It's a publication asset. An analyst links straight to "Iran's proxy
network"; a reader shares a card; an article embeds the exact frame it's discussing. Distribution at
near-zero ongoing cost — and it makes every view a potential entry point, instead of everyone
landing on the same cold home screen.

**How.** URL ↔ state sync (the views already hold all of this in React state — serialize on change,
hydrate on load). The card is a second canvas pass: dynamics already renders to canvas, so a clean
off-screen render at 2× with title + legend is mostly compositing. ~1 session.

**Risk / revert.** Additive; with no query params the default behavior is unchanged.
