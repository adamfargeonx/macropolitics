import { DATA, type SourceStatus } from '../data/empirical'
import type { IconName } from './Icon'

// Shared data/logic behind both evidence panels — the combined 3-axis overlay (EvidenceOverlay)
// and the in-panel per-axis drill-down (ForcesAxisPanel). Pure data/constants only — no JSX — so it stays
// out of the way of the two Trend/*Overlay component files' own Fast Refresh boundaries.

export type Axis = 'eco' | 'mil' | 'geo'

// Noun form ('כלכלה' not 'כלכלי') — these stand alone as a title (the axis drill-down's own
// .axp__axis heading), not modifying another noun in a sentence, where the house rule calls for
// the noun rather than the adjective. Compound phrases elsewhere ("כוח כלכלי" = economic power)
// stay adjectival on purpose — see the note beside ORDER_LABEL in forces-model.ts for the same call.
export const HE_AXIS = { eco: 'כלכלה', mil: 'צבא', geo: 'גאו-אסטרטגיה' } as const
export const AXIS_ICON: Record<Axis, IconName> = { eco: 'eco', mil: 'mil', geo: 'geo' }

const MIL_ROWS = [
  { k: 'spend', he: 'הוצאה צבאית' }, { k: 'manpower', he: 'כוח אדם' },
  { k: 'nuclear', he: 'ארסנל גרעיני' }, { k: 'cyber', he: 'עוצמת סייבר' },
] as const
const GEO_ROWS = [
  { k: 'area', he: 'שטח' }, { k: 'borders', he: 'גבולות' },
  { k: 'resources', he: 'נפט+גז' }, { k: 'chokepoints', he: 'צוואר בקבוק' },
] as const
const ECO_ROWS = [
  { k: 'mass', he: 'מסה (PPP)' }, { k: 'percap', he: 'לנפש' }, { k: 'reserves', he: 'יתרות' },
  { k: 'fdi', he: 'FDI' }, { k: 'cab', he: 'חשבון שוטף' }, { k: 'debt', he: 'חוב/תוצר' }, { k: 'credit', he: 'אשראי' },
] as const
export const AXIS_ROWS = { eco: ECO_ROWS, mil: MIL_ROWS, geo: GEO_ROWS } as const

// Criteria from each axis's original rubric that are deliberately NOT scored — not hidden data,
// just real factors the model's authors chose not to fabricate numbers for (see military.ts/geo.ts
// "JUDGMENT; not modelled" comments). Surfaced as a small hover-hint tag rather than a paragraph so
// the panel stays scannable while staying honest that these 4-7 rows aren't the whole picture.
export const UNMODELED = {
  eco: [],
  mil: ['לוגיסטיקה', 'ניסיון קרבי', 'תעשייה ביטחונית', 'ציוד וטכנולוגיה', 'בריתות', 'מודיעין', 'אימונים'],
  geo: ['מיקום אסטרטגי', 'טופוגרפיה'],
} as const

const milMissing = (k: string, m: string[]) => m.includes(k)
const geoMissing = (k: string, m: string[]) => (k === 'resources' ? m.includes('oil') || m.includes('gas') : false)
const ecoMissing = (k: string, m: string[]) => (k === 'credit' ? m.includes('rating') || m.includes('inflation') : m.includes(k))
export const AXIS_MISS = { eco: ecoMissing, mil: milMissing, geo: geoMissing } as const

export const STATUS_LABEL: Record<SourceStatus, string> = {
  sourced: 'מקור ראשי', estimate: 'אומדן', judgment: 'שיפוט', 'no-data': 'אין נתונים',
}
// Inline status glyphs for the per-parameter evidence bars: every parameter — sourced or assessed
// — is a bar row carrying its provenance status, so the evidence layer reads as complete.
export const STATUS_GLYPH: Record<SourceStatus, string> = {
  sourced: '✓', estimate: '~', judgment: '⊙', 'no-data': '✕',
}

// Per-parameter provenance status: missing → no-data; the geo axis is inherently interpretive
// (judgment/assessment); economic & military figures rest on primary datasets (sourced).
export function paramStatus(axis: Axis, miss: boolean): SourceStatus {
  if (miss) return 'no-data'
  if (axis === 'geo') return 'judgment'
  return 'sourced'
}

// ── Axis drill-down support ───────────────────────────────────────────────────────────────────
// Only bodies with SOURCED inputs get a composite (see empirical.ts: ecoBreakdown/milBreakdown/
// geoBreakdown are built per-body from real criteria, and the great powers are deliberately left
// out of the geo model — see geo.ts's header). Everything else carries a hand-judged axis value
// with no criteria behind it, so its value row must NOT offer a drill-down into an empty panel.
export function axisBreakdown(id: string | undefined, axis: Axis) {
  if (!id) return undefined
  const d = DATA[id]
  if (!d) return undefined
  return axis === 'eco' ? d.ecoBreakdown : axis === 'mil' ? d.milBreakdown : d.geoBreakdown
}

export const hasAxisEvidence = (id: string | undefined, axis: Axis) => !!axisBreakdown(id, axis)

// The spine value BEFORE adjustment — derived from each model's own additive formula rather than
// re-implementing it, so this can never drift from model/*.ts. eco exposes `spine` directly; mil's
// spine is the spend score alone (manpower/nuclear/cyber are pure additions); geo has no stored
// spine field, but geo = spine + resBonus + chokeBonus (additive, see geo.ts), so it's recoverable.
export function axisSpine(id: string | undefined, axis: Axis): number | null {
  const b = axisBreakdown(id, axis)
  if (!b) return null
  if (axis === 'eco') return (b as { spine: number }).spine
  if (axis === 'mil') return (b as { spendScore: number }).spendScore
  const g = b as { geo: number; resBonus: number; chokeBonus: number }
  return Math.round((g.geo - g.resBonus - g.chokeBonus) * 10) / 10
}

// Which sub-criteria form each axis's SPINE (the dominant, near-always-present base) vs. its
// ADJUSTMENT (secondary criteria that move the score — up for mil/geo, either way for eco).
// Mirrors the formulas in model/economic.ts, military.ts, geo.ts exactly.
export const SPINE_KEYS: Record<Axis, readonly string[]> = {
  eco: ['mass', 'percap'], mil: ['spend'], geo: ['area', 'borders'],
}

// The generic "why this axis matters" line — same text the score view already used as each value
// row's hover tooltip (ForceAxisRow's `hint` prop). Shared here rather than duplicated so the two
// surfaces (a quick hover on the score view, the lead sentence in the axis drill-down) can never
// drift apart.
// These state the axis's CAUSAL role in power, not its ingredients: the criteria rows directly
// below already enumerate what goes into the score, so a blurb that just re-listed them ("תמ״ג,
// סחר, פיננסים…") told the reader nothing the panel wasn't about to tell them anyway. What was
// missing is why the axis moves power at all — so each line names the leverage it buys.
export const AXIS_BLURB: Record<Axis, string> = {
  eco: 'הכלכלה מממנת את כל השאר — וקובעת מי תלוי במי.',
  mil: 'הכוח הצבאי קובע מה אפשר לכפות — ומה אפשר למנוע.',
  geo: 'מיקום ובריתות קובעים מי חייב לעבור דרכך — ומי יכול לעקוף.',
}

// Coarse read on a raw axis score (0–10, the same externally-calibrated scale everywhere —
// USA anchors at 10 — so fixed bands, not a per-body relative ranking). Bands follow the real
// distribution rather than an even split: most tracked entities (small states, non-state actors)
// score low on eco/mil/geo, so a straight 3-way cut would put roughly half of them in one bucket.
const SCORE_TIERS = [
  { slug: 'marginal', he: 'שולי', min: 0 },
  { slug: 'limited', he: 'מוגבל', min: 3 },
  { slug: 'significant', he: 'משמעותי', min: 6 },
  { slug: 'dominant', he: 'דומיננטי', min: 8 },
] as const

type ScoreTierSlug = (typeof SCORE_TIERS)[number]['slug']

export function scoreTier(value: number): { slug: ScoreTierSlug; he: string } {
  const tier = [...SCORE_TIERS].reverse().find((t) => value >= t.min) ?? SCORE_TIERS[0]
  return { slug: tier.slug, he: tier.he }
}

// The one-line methodology note behind each group's hover-revealed "קרא עוד".
export const GROUP_NOTE: Record<Axis, { spine: string; bonus: string; unmodeled?: string }> = {
  eco: {
    spine: 'מסה כלכלית ורמת פיתוח לנפש — קובעות את רוב הציון.',
    bonus: 'בריאות פיסקלית: יתרות, השקעות, חוב ואשראי. מעלה או מורידה את הבסיס.',
  },
  mil: {
    spine: 'הוצאה צבאית שנתית — הפרוקסי הדומיננטי לעוצמה.',
    bonus: 'כוח אדם, ארסנל גרעיני וסייבר — מוסיפים מעל להוצאה בלבד.',
    unmodeled: 'קריטריונים מהרוביק המקורי שלא כומתו למספר — שיקול דעת, לא נתון חסר.',
  },
  geo: {
    spine: 'שטח וגבולות יבשתיים — עומק אסטרטגי גיאוגרפי.',
    bonus: 'משאבי אנרגיה ושליטה בצווארי בקבוק ימיים.',
    unmodeled: 'מיקום וטופוגרפיה נותרו שיקול דעת — לא כומתו למספר.',
  },
}
