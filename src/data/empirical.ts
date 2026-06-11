// Empirical inputs for the gravity model (src/model/gravity.ts).
// Each body has EFFECTIVE axis scores (0–10, already quality-adjusted — see docs/power-model.md),
// an integrity-discount `stability` (≈1, lower only for fragmented states), and optional graph
// `backing` (patron + dependence α) for genuine proxies/clients.
//
// PROVENANCE NOTE (vertical slice): the **economic** axis is sourced — anchored on GDP (PPP) +
// per-capita/sophistication, IMF/World Bank ~2024 (ECO_SOURCE below). Military + geo-strategic are
// carried from the prior hand-tuned model as an INTERIM and flagged as such (AXIS_SOURCE) — the next
// sub-phase sources them (SIPRI/IISS, geographic/threat data). Backing is reserved for real
// dependence (Iran's arms, the SDF, the PA) — allies' own strength stays in their axes.

import type { BodyInput } from '../model/gravity'

// id → effective axes + stability + optional backing edge.
// `axes`: eco = economic mass × sophistication · mil = effective force · geo = positional leverage.
export const AXES_DATA: Record<string, Omit<BodyInput, 'id'>> = {
  // ── great powers / outer ──
  usa: { axes: { eco: 10, mil: 10, geo: 10 }, stability: 1 },
  china: { axes: { eco: 10, mil: 8, geo: 9 }, stability: 1 },
  russia: { axes: { eco: 6, mil: 9, geo: 8 }, stability: 1 },
  europe: { axes: { eco: 9, mil: 6, geo: 7 }, stability: 1 },
  india: { axes: { eco: 7, mil: 5, geo: 5 }, stability: 1 },

  // ── regional powers ──
  iran: { axes: { eco: 4, mil: 7, geo: 8 }, stability: 1 }, // sanctioned but unitary (controls its territory)
  saudi: { axes: { eco: 7, mil: 5, geo: 7 }, stability: 1 },
  israel: { axes: { eco: 6, mil: 8, geo: 6 }, stability: 1 }, // strong across the board → rises vs the old hand value
  turkey: { axes: { eco: 6, mil: 6, geo: 6 }, stability: 1 },
  egypt: { axes: { eco: 4, mil: 6, geo: 6 }, stability: 1 }, // failure is ECONOMIC (low eco), not fragmentation
  pakistan: { axes: { eco: 3, mil: 6, geo: 5 }, stability: 1 },

  // ── Gulf + intermediates ──
  uae: { axes: { eco: 6, mil: 4, geo: 4 }, stability: 1 }, // punches above its size (capital, logistics)
  qatar: { axes: { eco: 6, mil: 2, geo: 4 }, stability: 1 }, // LNG wealth + diplomacy
  iraq: { axes: { eco: 4, mil: 3, geo: 5 }, stability: 0.75, patron: 'iran', alpha: 0.15 }, // partial sovereignty
  kuwait: { axes: { eco: 3, mil: 2, geo: 3 }, stability: 1 },
  oman: { axes: { eco: 3, mil: 2, geo: 3 }, stability: 1 },
  jordan: { axes: { eco: 2, mil: 3, geo: 3 }, stability: 1 },
  bahrain: { axes: { eco: 2, mil: 1, geo: 3 }, stability: 1 },

  // ── fragmented states (stability bites: a real economy/army no single government commands) ──
  syria: { axes: { eco: 2, mil: 3, geo: 4 }, stability: 0.45, patron: 'iran', alpha: 0.12 },
  lebanon: { axes: { eco: 2, mil: 2, geo: 3 }, stability: 0.5 }, // collapsed; Hezbollah ≠ the state

  // ── non-state actors (OWN indigenous axes are small; the supplied weight is BACKING) ──
  // mil here is *indigenous* force only — Hezbollah's precision arsenal is Iranian, so it lands
  // in backing, not own. Result: the flagship proxies read as mostly-borrowed power.
  hezbollah: { axes: { eco: 1, mil: 1, geo: 2 }, stability: 1, patron: 'iran', alpha: 0.25 }, // crown-jewel proxy
  yemen: { axes: { eco: 1, mil: 2, geo: 3 }, stability: 0.6, patron: 'iran', alpha: 0.12 }, // Houthis; Bab-el-Mandeb
  hamas: { axes: { eco: 1, mil: 1, geo: 2 }, stability: 1, patron: 'iran', alpha: 0.1 },
  militias: { axes: { eco: 1, mil: 1, geo: 1 }, stability: 1, patron: 'iran', alpha: 0.1 },
  sdf: { axes: { eco: 1, mil: 2, geo: 2 }, stability: 0.7, patron: 'usa', alpha: 0.05 },
  fatah: { axes: { eco: 1, mil: 1, geo: 2 }, stability: 0.8, patron: 'saudi', alpha: 0.05 }, // PA: power without sovereignty
  isis: { axes: { eco: 1, mil: 2, geo: 2 }, stability: 1 }, // no patron, no territory
  qaeda: { axes: { eco: 1, mil: 1, geo: 2 }, stability: 1 },
  pij: { axes: { eco: 0, mil: 1, geo: 1 }, stability: 1, patron: 'iran', alpha: 0.12 }, // near-total Iranian client
}

// Build the model's input list from the table above.
export const BODY_INPUTS: BodyInput[] = Object.entries(AXES_DATA).map(([id, v]) => ({ id, ...v }))

// ── Provenance (surfaced on inspection in the forces panel) ──────────────────────────────
// Axis-level sourcing. Economic is real; mil/geo are interim (flagged) until the next sub-phase.
export const AXIS_SOURCE: Record<'eco' | 'mil' | 'geo', string> = {
  eco: 'תמ״ג (PPP) + תוצר לנפש · IMF / World Bank 2024',
  mil: 'הערכת עוצמה אפקטיבית · ביניים (SIPRI/IISS — בהמשך)',
  geo: 'מנוף גאו-אסטרטגי · שיפוט מבני (מיקום, עומק, שכנות)',
}

// Economic anchor per body — the underlying figure behind the effective `eco` score.
// GDP (PPP), approximate, IMF/World Bank ~2024. Non-state actors have no sovereign economy.
export const ECO_SOURCE: Record<string, string> = {
  usa: 'תמ״ג PPP ~$29 טריליון · IMF 2024',
  china: 'תמ״ג PPP ~$39 טריליון · IMF 2024',
  russia: 'תמ״ג PPP ~$6.9 טריליון · IMF 2024',
  europe: 'תמ״ג PPP ~$28 טריליון (האיחוד) · IMF 2024',
  india: 'תמ״ג PPP ~$17 טריליון · IMF 2024',
  iran: 'תמ״ג PPP ~$1.9 טריליון · תחת סנקציות · IMF 2024',
  saudi: 'תמ״ג PPP ~$2.1 טריליון · קרן ריבונית · IMF 2024',
  israel: 'תמ״ג PPP ~$0.57 טריליון · תוצר לנפש גבוה · IMF 2024',
  turkey: 'תמ״ג PPP ~$3.9 טריליון · תנודתי · IMF 2024',
  egypt: 'תמ״ג PPP ~$2.2 טריליון · חוב וגירעון כבדים · IMF 2024',
  pakistan: 'תמ״ג PPP ~$1.6 טריליון · תלוי הלוואות · IMF 2024',
  uae: 'תמ״ג PPP ~$0.95 טריליון · תוצר לנפש גבוה מאוד · IMF 2024',
  qatar: 'תמ״ג PPP ~$0.33 טריליון · התוצר לנפש הגבוה באזור · IMF 2024',
  iraq: 'תמ״ג PPP ~$0.59 טריליון · תלוי נפט · IMF 2024',
  kuwait: 'תמ״ג PPP ~$0.26 טריליון · עתודות נפט · IMF 2024',
  oman: 'תמ״ג PPP ~$0.20 טריליון · IMF 2024',
  jordan: 'תמ״ג PPP ~$0.13 טריליון · תלוי סיוע · IMF 2024',
  bahrain: 'תמ״ג PPP ~$0.10 טריליון · IMF 2024',
  syria: 'תמ״ג PPP ~$0.06 טריליון (אומדן) · כלכלה שקרסה',
  lebanon: 'תמ״ג PPP ~$0.08 טריליון · קריסה פיננסית · IMF 2024',
}
