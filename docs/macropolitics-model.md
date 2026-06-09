# Macropolitics — full site model (deep sweep, 2026-06-08)

The site is one coherent **empirical model** of Middle-East power, shown through three lenses
plus a forecasting tool. Everything (size, position, distance, orbit) encodes data.

## Routes
- `/main` — home: intro + audio narration, entry to the three lenses.
- `/forces` (כוחות המשיכה) — each state's **attraction power**.
- `/relations/countries` (מערכות היחסים) — relationship **triangle** overview.
- `/relations/constellations/{country}` — 15 per-country ego-networks (country = reference).
- `/dynamics` (יחסי הכוחות) — **synthesis**: rotating two-pole orbital map (size=power, distance=relationship).
- `/experiment`, `/experiment-2` — interactive **forecast**: "how will X's constellation look in N years?" (~20 controls/sliders).
- Per-entity **audio players** appear on every row (forces/relations/constellations) → likely per-entity narration.

## Lens 1 — FORCES (כוחות)
Power = **economic + military + geo-strategic** → political power ("כוח משיכה", a numeric score).
Tiers:
- כוח אזורי (regional): סעודיה, ישראל, איראן, טורקיה
- כוח ביניים (intermediate): כווית, בחריין, עיראק, עומאן
- כוח קצה (edge): תימן, ירדן
Scores observed (כוח משיכה, 0–10ish): 6.45, 6.39, 5.53 (regional), 3.42, 3.17 (lower). FULL per-state scores TBD.
Node size on the map = the score.

## Lens 2 — RELATIONS (יחסים)
A **triangle** of three axes; a country's position = its relationship type toward a *reference state*:
- מתח (Tension) — top vertex
- חיכוך (Friction) — bottom-left
- הרמוניה (Harmony) — bottom-right
Each entity also has a **disposition**:
- אגרסיבית (aggressive): ישראל, ארה״ב, איראן, תימן
- אסרטיבית (assertive): סעודיה, האמירויות, עיראק, סוריה, לבנון, רוסיה, אירופה, טורקיה
- זהירה (cautious): מצרים, עומאן, כווית, קטאר, בחריין, ירדן, סין, הודו
**Constellations** (15): each country as the reference — `saudi-arabia, israel, egypt, oman, uae,
kuwait, qatar, iraq, syria, lebanon, bahrain, yemen, jordan, turkey, iran`. Each page = a descriptive
geopolitical brief + the triangle plotted with that country's relationships, **including proxies not on
the main map** (e.g. Iran: Houthis/תימן, קטאיב חיזבאללה, עיראק PMF, מיליציות עיראקיות, SDF/הסוריים
הדמוקרטיים, חמאס, ג׳יהאד אסלאמי).

## Lens 3 — DYNAMICS (יחסי הכוחות) — the synthesis
Rotating two-pole orbital map. Size = power (Forces), distance/orbit = relationship (Relations).
- Whole constellation revolves slowly CCW (~2 min/turn, orrery). Outer fast, center slow.
- Node sizes (px diameter, ONE snapshot — these ARE the power encoding):
  סין 93, אירופה 64, הודו 56, ישראל 44, מצרים 38, טורקיה 33, האמירויות 32, קטאר 27,
  עומאן 18, ירדן 17, כווית 16, בחריין 15 … (USA/Russia/Iran/Saudi = anchors, sizes TBD).
  → NOTE: external great powers (China/Europe/India) are the LARGEST here.
- Hover is canvas-rendered (no DOM tooltip): highlights the entity's relationship links; likely
  shows its data (tier/score/disposition). Exact hover content still to capture.
- Some entities **orbit other entities** (proxies around patrons), not just the poles.

## Visual tokens / fonts (confirmed)
bg `#06030F` · accent `#FBFF00` · anchor disk `#F4F2EC`.
Tel Aviv Brutalist (Hebrew display) + Futurism (Latin). RTL.

## What true 1:1 needs (data still to source)
1. Every state's exact כוח משיכה score + its 3 sub-components.
2. Every entity's exact triangle coordinates — for the overview AND each of 15 reference frames (a relationship matrix).
3. Dynamics: exact node sizes (all), orbital radius + which center/patron each orbits, rotation rate.
4. Per-entity descriptive briefs + dispositions (have dispositions; briefs partially).
5. Proxy lists per patron. 6. Experiment forecast logic + per-entity audio assets.

→ This is authored empirical data. Pixel-extracting it from rotating canvases across ~20 pages is lossy.
The source dataset (spreadsheet / Framer CMS / docs) is the authoritative path to 1:1.
