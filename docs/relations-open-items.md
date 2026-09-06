# Relations screen — open items

Tracking list for the relations grid + field work. Checked items are done and verified in the
running app; unchecked ones are outstanding.

## Done

- [x] Relations grid as the screen's entry point (all 20 states as thumbnail constellations)
- [x] Shared `relations-model.ts` so grid, field and the dump script compute from one formula
- [x] Grid → field cross-fade, and grid → home per-cell exit cascade (fits App's 680ms `EXIT_MS`)
- [x] Entrance re-timed to be perceptible (container rise + 420ms hold + 40ms/cell cascade)
- [x] Dots snapped to a triangular lattice, calibrated against the original site's own geometry
      (10 rows, 21% centroid inset, dot size scaled to slot spacing)
- [x] Grid always fills every row — column count snaps to a divisor of the item count
- [x] Back button moved clear of the side panel and the utility nav, given a chip background
- [x] Hover: triangle stroke + name light up; dots matching the country's dominant pole go yellow
- [x] Removed the per-cell editorial-coverage caption
- [x] Removed the yellow tint overlay on cell hover
- [x] Country name in the default panel title un-bolded (house rule: entity names are never bold)

## Open

### ~~1. The relation model reads מתח almost everywhere~~ — DONE

Two structural defects fixed in `src/dynamics/relations-model.ts`:

1. **`friction` had an unearned head start.** Base 0.32 against 0.28 for the other two, *plus* the
   entire +0.28 "neither aligned nor opposed" bonus — putting that category at f=0.517, a
   landslide. Since 120 of the 234 non-authored pairs fall there, מתח was the default answer
   whenever the model had no signal. All three poles now start level at 0.30 and "neither" leans
   +0.14 (f≈0.42 vs 0.29/0.29) — a lean, not a verdict.
2. **Neutral↔neutral counted as a shared bloc.** `same` was `ax !== 'none' && ax === at`, so the
   seven neutrals (turkey, qatar, oman, syria, lebanon, india, pakistan) formed a phantom third
   bloc — **india↔pakistan drew a full same-bloc harmony bonus for both being unaligned.** `same`
   is now real allegiance only (west↔west, east↔east).

Measured effect on the roster:

| | before | after |
|---|---|---|
| country labels | הרמוניה 4 / **מתח 16** | הרמוניה 9 / מתח 11 |
| near-tie labels (<0.03 margin) | 7/20 | 4/20 |
| "neither" category friction | 0.517 | 0.423 |

Note the four countries at 19/19 authored coverage (ישראל, ארה״ב, איראן, סעודיה) are unchanged by
this — their values never touched the formula. Still open: `public/mockups/relations-data.json`
has been regenerated, but see item 4.

### 2. The dominant-pole label flips on noise

The label is the mean of a country's 19 relations, and a mean is a weak statistic to hang a
one-word verdict on. The rebalance cut this from 7 near-ties to 4, but they remain:

| country | חיכוך | מתח | הרמוניה | label | margin | authored |
|---|---|---|---|---|---|---|
| סין | 0.341 | **0.350** | 0.310 | מתח | 0.009 | 4/19 |
| רוסיה | 0.334 | 0.317 | **0.349** | הרמוניה | 0.015 | 6/19 |
| עיראק | 0.319 | **0.348** | 0.333 | מתח | 0.015 | 4/19 |
| הודו | 0.199 | **0.414** | 0.387 | מתח | 0.027 | 4/19 |

סין sits 0.009 from flipping to חיכוך. Worth deciding whether a near-tie should print a verdict at
all, or say something honest like "מעורב" / show the split instead.

### 3. Russia reads הרמוניה — and Saudi / USA harmony is an editorial claim

**רוסיה** now labels הרמוניה on a 0.015 margin, which will read wrong. Its east-bloc partners
(china, iran, iraq) pull harmony up while its nine west-bloc opposites pull חיכוך — the two nearly
cancel. Its 6/19 authored rows decide the outcome, so this is a data question, not a formula one.

**סעודיה and ארה״ב** are at 19/19 authored coverage — their הרמוניה comes entirely from
hand-written rows and was untouched by the rebalance. If "Saudi Arabia, dominant harmony" reads
wrong, the fix is the authored `h` values in `src/data/relations.ts`, not the model.

### 4. Mock is out of sync with the live screen

`public/mockups/relations-grid.html` uses the OLD reversed vertex mapping (tension→top). The live
`RelationsGrid.tsx` uses friction→top, matching `unifiedGeo` in `RelationsView.tsx`. The two are
rotated relative to each other. Either bring the mock in line or retire it now that the lattice
has shipped.
