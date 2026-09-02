// Dumps computed relations to public/mockups/relations-data.json so the standalone spatial-encoding
// prototypes run on the REAL editorial + derived data instead of hand-copied numbers.
// The relation()/hash() logic below is lifted verbatim from RelationsView.tsx — if that model
// changes, re-run this so the prototypes don't silently drift from what the live screen shows:
//   node --experimental-strip-types scripts/dump-relations.ts
// Loads the data modules through Vite's SSR loader rather than Node's ESM resolver: the source
// files use extension-less relative imports ('../model/gravity'), which Vite resolves and bare
// Node does not. Vite is already a devDependency — no new package for a one-off script.
import { writeFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })

const { NODES, LINKS, AXIS, DISPO, powerSize } = await vite.ssrLoadModule('/src/data/entities.ts')
const { authoredRelation } = await vite.ssrLoadModule('/src/data/relations.ts')

interface Node { id: string; he: string; kind: string; dispo: string; power: number }
const nodes = NODES as Node[]
const byId = new Map(nodes.map((n) => [n.id, n]))
const STATES = nodes.filter((n) => n.kind !== 'nonstate')
// ALL states, not just the live screen's 8-button REF_CHOICES — the relations-grid prototype
// needs every country as its own reference to test whether coverage now holds up broadly.
const REF_CHOICES = STATES.map((n) => n.id)

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

interface Rel { harmony: number; tension: number; friction: number; why?: string }

function relation(refId: string, tId: string): Rel {
  const authored = authoredRelation(refId, tId)
  if (authored) {
    const s = authored.t + authored.f + authored.h
    return { tension: authored.t / s, friction: authored.f / s, harmony: authored.h / s, why: authored.why }
  }
  const ax = AXIS[refId], at = AXIS[tId]
  const same = ax !== 'none' && ax === at
  const opp = (ax === 'west' && at === 'east') || (ax === 'east' && at === 'west')
  const allied = (LINKS as [string, string][]).some(([a, b]) => (a === refId && b === tId) || (a === tId && b === refId))
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

const out = {
  refs: REF_CHOICES.map((id) => ({ id, he: byId.get(id)!.he })),
  byRef: Object.fromEntries(REF_CHOICES.map((refId) => [
    refId,
    STATES.filter((e) => e.id !== refId).map((e) => {
      const r = relation(refId, e.id)
      return {
        id: e.id, he: e.he, power: e.power, size: powerSize(e.power),
        tension: r.tension, friction: r.friction, harmony: r.harmony, why: r.why ?? null,
      }
    }),
  ])),
}

mkdirSync(new URL('../public/mockups/', import.meta.url), { recursive: true })
const path = new URL('../public/mockups/relations-data.json', import.meta.url)
writeFileSync(path, JSON.stringify(out, null, 1))
console.log(`wrote ${REF_CHOICES.length} reference sets x ${out.byRef.israel.length} bodies -> public/mockups/relations-data.json`)
await vite.close()
