// Content-contract gate — enforces promises empirical.ts already makes about itself, mechanically.
// Run:  node scripts/check-content-contracts.mjs
//
// Born from a content-QA audit (2026-08-31) that found the file's own header comment — "Where the
// data is weak it is FLAGGED honestly (status !== 'sourced' + a note), never silently smoothed
// over" — was unenforced in practice: ~22 non-'sourced' entries had no caveat note, and 9 bodies
// weak on both eco+mil had no `flags` array despite matching entries (Yemen) correctly carrying
// one. A four-voice adversarial review (see the published audit report) rejected a calendar-based
// staleness gate as unenforceable and self-defeating, but kept THIS kind of check: both rules here
// are pure structural facts about the data — no judgment, no clock — so they can't be satisfied by
// editing a date field. Satisfying them requires writing an actual note.
//
// Deliberately does NOT check the editorial layer (relations.ts, forces-descriptions.ts) — no
// invariant here can validate a real-world geopolitical claim. That's the quarterly agent audit's
// job, report-only, never gating a build.

import { DATA } from '../src/data/empirical.ts'

const HE = {
  usa: 'ארה"ב', china: 'סין', russia: 'רוסיה', europe: 'אירופה', india: 'הודו',
  iran: 'איראן', saudi: 'סעודיה', israel: 'ישראל', turkey: 'טורקיה', egypt: 'מצרים',
  pakistan: 'פקיסטן', uae: 'אמירויות', qatar: 'קטאר', iraq: 'עיראק', kuwait: 'כווית',
  oman: 'עומאן', jordan: 'ירדן', bahrain: 'בחריין', syria: 'סוריה', lebanon: 'לבנון',
  hezbollah: 'חיזבאללה', yemen: 'תימן', hamas: 'חמאס', militias: 'מיליציות', sdf: 'SDF',
  fatah: 'פתח', isis: 'דאעש', qaeda: 'אלקעדה', pij: 'גיהאד',
}

const violations = []

for (const [id, body] of Object.entries(DATA)) {
  const name = HE[id] ?? id
  // Rule 1: 'estimate' or 'no-data' requires a non-empty caveat note — SourceStatus's own doc
  // comment marks exactly those two "(flagged)", not 'judgment'. geo is 'judgment' by design for
  // EVERY body (see the geo() constructor: "inherently interpretive... labelled judgment, not a
  // hard dataset") — that's a stated methodology, not a data gap, so it's deliberately exempt here.
  for (const axis of ['eco', 'mil', 'geo']) {
    const prov = body.prov[axis]
    if ((prov.status === 'estimate' || prov.status === 'no-data') && !(prov.note && prov.note.trim())) {
      violations.push(`${name} (${id}).${axis}: status '${prov.status}' has no caveat note`)
    }
  }
  // Rule 2: weak on BOTH eco and mil (the axes with a real dataset to be weak against — geo is
  // interpretive by design, not a data-quality signal) requires a populated `flags` array, the
  // prominent surface the sources viewer reads from.
  const weakBoth = body.prov.eco.status !== 'sourced' && body.prov.mil.status !== 'sourced'
  if (weakBoth && !(body.flags && body.flags.length)) {
    violations.push(`${name} (${id}): weak on both eco+mil but has no 'flags' array`)
  }
}

if (violations.length) {
  console.error(`\n✗ content-contracts FAILED — ${violations.length} violation(s):\n`)
  for (const v of violations) console.error('   ·', v)
  console.error('\nEvery non-\'sourced\' provenance entry needs a note; every body weak on both')
  console.error('eco+mil needs a flags array. Fix the data in src/data/empirical.ts — this gate')
  console.error('exists specifically so that promise can\'t regress silently.\n')
  process.exit(1)
}

console.log(`✓ content-contracts OK — ${Object.keys(DATA).length} bodies, all provenance notes + flags present.`)
