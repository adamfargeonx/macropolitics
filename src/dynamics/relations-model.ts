// Shared relation model — the single source for how two states' stance toward each other is
// computed and labeled. Extracted out of RelationsView.tsx so the grid overview (RelationsGrid.tsx)
// and the single-reference field (RelationsView.tsx) compute from the exact same formula instead of
// two copies that can silently drift. scripts/dump-relations.ts also loads this module (via Vite's
// SSR loader) rather than keeping its own copy.
import { NODES, LINKS, AXIS, DISPO } from '../data/entities'
import { authoredRelation } from '../data/relations'

export const byId = new Map(NODES.map((n) => [n.id, n]))
export const STATES = NODES.filter((n) => n.kind !== 'nonstate')

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

// Relationship of target toward reference. Authored pairs first (the editorial layer);
// otherwise derived from bloc alignment + alliances + the target's disposition.
export function relation(refId: string, tId: string): Rel {
  const authored = authoredRelation(refId, tId)
  if (authored) {
    const s = authored.t + authored.f + authored.h
    return { tension: authored.t / s, friction: authored.f / s, harmony: authored.h / s, why: authored.why }
  }
  const ax = AXIS[refId], at = AXIS[tId]
  const same = ax !== 'none' && ax === at
  const opp = (ax === 'west' && at === 'east') || (ax === 'east' && at === 'west')
  const allied = LINKS.some(([a, b]) => (a === refId && b === tId) || (a === tId && b === refId))
  const t = byId.get(tId)!
  let harmony = 0.28 + (same ? 0.5 : 0) + (allied ? 0.4 : 0)
  let tension = 0.28 + (opp ? 0.5 : 0) + (t.dispo === DISPO.agg ? 0.22 : 0)
  let friction = 0.32 + (!same && !opp ? 0.28 : 0.05) + (t.dispo === DISPO.assert ? 0.18 : 0)
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
