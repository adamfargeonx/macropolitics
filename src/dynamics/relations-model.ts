// Shared relation model — the single source for how two states' stance toward each other is
// computed and labeled. Extracted out of RelationsView.tsx so the grid overview (RelationsGrid.tsx)
// and the single-reference field (RelationsView.tsx) compute from the exact same formula instead of
// two copies that can silently drift. scripts/dump-relations.ts also loads this module (via Vite's
// SSR loader) rather than keeping its own copy.
import { NODES, LINKS, AXIS, DISPO } from '../data/entities'
import { authoredRelation } from '../data/relations'

export const byId = new Map(NODES.map((n) => [n.id, n]))
// Two different rosters, and the distinction matters everywhere below.
//
// MEMBERS is what gets PLACED IN a constellation — every state plus every non-state actor. The
// relations screen used to show states only, which quietly asserted that Israel's field contains
// Lebanon but not Hezbollah, or that Iraq's contains Iran but not the militias operating inside
// Iraq. For most of this roster the non-state actor IS the relationship.
export const MEMBERS = NODES
// STATES is what a constellation can be drawn FROM — the vantage point. Actors are objects in a
// state's field, not vantages of their own: "the constellation of חמאס" would need an actor↔actor
// reading for all eight others, and the grid that indexes references is a one-fold block tuned to
// exactly 20 cells (29 is prime — see useEvenColumns' own caveat in RelationsGrid.tsx).
export const STATES = NODES.filter((n) => n.kind !== 'nonstate')
export const isActor = (id: string): boolean => byId.get(id)?.kind === 'nonstate'

export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Rel { harmony: number; tension: number; friction: number; why?: string }
export type Pole = 'tension' | 'friction' | 'harmony'

// LABEL SWAP (direct feedback, not a naming preference): the FIELD names below (tension/friction)
// and every formula that fills them are unchanged — only the Hebrew word shown for each was wrong.
// Corrected meaning: מתח (tension) = opposing interests or complicated relations, no direct
// confrontation. חיכוך (friction) = direct clashes, force, open confrontation. The `tension` field
// (opp-bloc + aggressive-disposition bonus below — open hostility, shadow wars, proxies) is what
// "חיכוך" means; the `friction` field (the non-aligned, non-opposed messy middle) is what "מתח"
// means. Every render site reads POLE_HE/VERDICT rather than hardcoding the word, so this is the
// one place that needs to change.
export const POLE_HE: Record<Pole, string> = { tension: 'חיכוך', friction: 'מתח', harmony: 'הרמוניה' }
export const VERDICT: Record<Pole, string> = { tension: 'יחס עוין', friction: 'יחס מורכב', harmony: 'יחס הרמוני' }
export const dominantOf = (r: Rel): Pole =>
  r.tension >= r.friction && r.tension >= r.harmony ? 'tension' : r.harmony >= r.friction ? 'harmony' : 'friction'

// ── Stance ─────────────────────────────────────────────────────────────────────────────────
// A country's overall posture, computed from the MEAN of its own relations rather than read off
// the static DISPO field. Deliberately not `dominantOf(mean)` re-labelled: across the roster the
// חיכוך pole never wins a country's mean (0 of 20), because no state is in open confrontation
// with a majority of the other nineteen — so a dominant-pole mapping would leave אגרסיבית
// permanently empty and collapse a three-way label into two.
//
// Instead: how much of a country's relational mass is confrontational or competitive. חיכוך
// (direct clashes) counts fully, מתח (competing interests, no confrontation) at half, הרמוניה
// not at all.
//
// The cut points are calibrated to the roster's ACTUAL spread, which is now 0.30–0.56: every one
// of the 380 ordered pairs is authored, so this reads the editorial layer, not the derived
// formula. (They were first set against the derived model's wider spread and had to be redone —
// hand-written values are markedly more moderate than the formula's, and the old thresholds
// pushed 12 of 20 countries into זהירה.) Recalibrate again if the authored layer shifts.
//
// Caveat worth knowing when reading the label: this measures how CONTESTED a country's
// relationships are, not how much agency it has in making them so. Lebanon and Syria score high
// largely because they are fought over, not because they are the ones doing the fighting.
export type Stance = 'agg' | 'dom' | 'caut'
export const STANCE_HE: Record<Stance, string> = { agg: 'אגרסיבית', dom: 'אסרטיבית', caut: 'זהירה' }
const postureOf = (mean: Rel): number => mean.tension + mean.friction * 0.5
const STANCE_CUTS = [0.44, 0.38] as const
export function stanceOf(mean: Rel): Stance {
  const p = postureOf(mean)
  if (p >= STANCE_CUTS[0]) return 'agg'
  if (p >= STANCE_CUTS[1]) return 'dom'
  return 'caut'
}
// A posture is a continuum; the label is three buckets cut out of it. Within this much of a cut,
// the country could reasonably have carried either neighbouring label, and printing one of them
// flat — as the grid did — states more confidence than the number supports. Callers mark these so
// the caption can admit it rather than rounding silently.
// 0.012 is ~20% of the narrower band (dom occupies 0.38–0.44), i.e. genuinely near the line, not
// merely "not dead centre".
export const STANCE_EDGE = 0.012
export const stanceIsEdge = (mean: Rel): boolean =>
  STANCE_CUTS.some((cut) => Math.abs(postureOf(mean) - cut) < STANCE_EDGE)

// Relationship of target toward reference. Authored pairs first (the editorial layer);
// otherwise derived from bloc alignment + alliances + the target's disposition.
export function relation(refId: string, tId: string): Rel {
  const authored = authoredRelation(refId, tId)
  if (authored) {
    const s = authored.t + authored.f + authored.h
    return { tension: authored.t / s, friction: authored.f / s, harmony: authored.h / s, why: authored.why }
  }
  // `?? 'none'` matches all eleven other AXIS call sites. AXIS is Record<string, Axis>, so TS hands
  // back a non-optional Axis for a key that may not exist — an entity added without an AXIS entry
  // would silently compute same/opp as false for every pair it touches, with no crash and no type
  // error. This was the only unguarded lookup, and it sits in the formula every reading flows through.
  const ax = AXIS[refId] ?? 'none', at = AXIS[tId] ?? 'none'
  // Sharing a bloc means sharing an ACTUAL allegiance — west with west, east with east. It used
  // to be `ax !== 'none' && ax === at`, which counted two 'neutral' states as bloc partners even
  // though neutral is the ABSENCE of alignment: india↔pakistan drew a full same-bloc harmony
  // bonus for both being unaligned, and the seven neutrals (turkey, qatar, oman, syria, lebanon,
  // india, pakistan) formed a phantom third bloc of 42 mutually-harmonious pairs.
  const same = ax === at && (ax === 'west' || ax === 'east')
  const opp = (ax === 'west' && at === 'east') || (ax === 'east' && at === 'west')
  const allied = LINKS.some(([a, b]) => (a === refId && b === tId) || (a === tId && b === refId))
  const t = byId.get(tId)!
  // Equal bases. `friction` previously started at 0.32 against 0.28 for the other two AND took the
  // whole +0.28 "neither aligned nor opposed" bonus, which put that category at f=0.517 — a
  // landslide. Since 120 of the 234 non-authored pairs fall there (every neutral-vs-bloc pairing),
  // מתח became the default answer whenever the model had no signal, and 16 of 20 countries
  // labelled מתח. Absence of evidence shouldn't read as a finding.
  //
  // Now all three poles start level and each bonus has to be earned by an actual signal. "Neither"
  // still leans friction (+0.14 → f≈0.42 vs 0.29/0.29), because "complicated / competing
  // interests" genuinely is the honest reading of an unaligned pair — but it leans, it no longer
  // dictates. Measured across the roster this moves the country labels from 4 הרמוניה / 16 מתח to
  // 9 / 11, and near-tie labels (<0.03 margin) from 7 to 4.
  let harmony = 0.30 + (same ? 0.42 : 0) + (allied ? 0.40 : 0)
  let tension = 0.30 + (opp ? 0.46 : 0) + (t.dispo === DISPO.agg ? 0.20 : 0)
  let friction = 0.30 + (!same && !opp ? 0.14 : 0) + (t.dispo === DISPO.assert ? 0.16 : 0)
  const j = hash(`${refId}|${tId}`)
  harmony += ((j % 9) - 4) * 0.018
  tension += (((j >> 3) % 9) - 4) * 0.018
  friction += (((j >> 6) % 9) - 4) * 0.018
  harmony = Math.max(0.06, harmony); tension = Math.max(0.06, tension); friction = Math.max(0.06, friction)
  const s = harmony + tension + friction
  return { harmony: harmony / s, tension: tension / s, friction: friction / s }
}

// Sharpen barycentric coords toward the dominant vertex so points use the whole
// triangle instead of clustering at its centre (display only — panel shows raw values).
export function sharpen(r: Rel, k = 1.45): Rel {
  const t = Math.pow(r.tension, k), f = Math.pow(r.friction, k), h = Math.pow(r.harmony, k)
  const s = t + f + h
  return { tension: t / s, friction: f / s, harmony: h / s, why: r.why }
}
