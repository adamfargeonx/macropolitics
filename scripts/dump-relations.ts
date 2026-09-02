// Dumps computed relations to public/mockups/relations-data.json so the standalone spatial-encoding
// prototypes run on the REAL editorial + derived data instead of hand-copied numbers.
// relation()/hash() are loaded from src/dynamics/relations-model.ts (the same module RelationsView
// and RelationsGrid use) rather than a copy — re-run this if that model changes, so the prototypes
// don't silently drift from what the live screen shows:
//   node --experimental-strip-types scripts/dump-relations.ts
// Loads the data modules through Vite's SSR loader rather than Node's ESM resolver: the source
// files use extension-less relative imports ('../model/gravity'), which Vite resolves and bare
// Node does not. Vite is already a devDependency — no new package for a one-off script.
import { writeFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })

const { NODES, powerSize } = await vite.ssrLoadModule('/src/data/entities.ts')
const { relation } = await vite.ssrLoadModule('/src/dynamics/relations-model.ts')

interface Node { id: string; he: string; kind: string; dispo: string; power: number }
const nodes = NODES as Node[]
const byId = new Map(nodes.map((n) => [n.id, n]))
const STATES = nodes.filter((n) => n.kind !== 'nonstate')
// ALL states, not just the live screen's 8-button REF_CHOICES — the relations-grid prototype
// needs every country as its own reference to test whether coverage now holds up broadly.
const REF_CHOICES = STATES.map((n) => n.id)

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
