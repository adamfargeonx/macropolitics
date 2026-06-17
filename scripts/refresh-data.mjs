// refresh-data.mjs — self-sustaining, fail-safe macro-figure refresh for the gravity model.
//
// WHAT IT DOES (every 2 months, via .github/workflows/refresh-data.yml)
//   Pulls two deterministic, keyless, WAF-free figures per body from the World Bank API:
//     • GDP (PPP, current intl $)   NY.GDP.MKTP.PP.CD   → the economic axis driver
//     • Military expenditure ($)    MS.MIL.XPND.CD      → the military axis driver
//   Validates hard, then writes them into src/data/figures.generated.ts. The model
//   (src/data/empirical.ts) rides a BOUNDED, no-op-seeded log-ratio overlay off these so the
//   grades/dynamics track real data — while the authored multi-criterion composites + all
//   geo/stability/editorial judgment stay human-owned.
//
// WHY THE WORLD BANK (not IMF): IMF's DataMapper WAF 403s a plain fetch; the World Bank API is
// clean JSON, no key, and serves BOTH indicators. One source = no scramble risk, least friction.
//
// FAIL-SAFE CONTRACT (this is the whole point — it must never need checking):
//   • A value is used only if finite, > 0, AND within a plausible band of the last-known value.
//   • A rejected/missing value CARRIES FORWARD the last-known-good — never fabricated, never zeroed.
//   • If the cross-checks that catch source-wide corruption fail (e.g. China's PPP < USA's, or USA
//     no longer the top military spender), the ENTIRE run aborts and writes nothing.
//   • If not a single fresh value is obtained, the run aborts (exit 1) — last-good state stands.
//   • The CI gate (tsc + check-model + build) runs AFTER this and only commits on green, so even a
//     value that passes here but breaks a model invariant can never ship.
//
// Dependency-free (Node ≥ 20 built-in fetch). Flags: --dry (fetch+validate+print, write nothing).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'src', 'data', 'figures.generated.ts')
const DRY = process.argv.includes('--dry')

// Bodies with a sourced composite score AND a World Bank ISO3. Aggregates (europe) and non-state
// actors (Hezbollah, ISIS, …) have no national figure → no overlay → their authored score holds.
const ISO3 = {
  usa: 'USA', china: 'CHN', russia: 'RUS', india: 'IND', europe: null,
  saudi: 'SAU', israel: 'ISR', turkey: 'TUR', iran: 'IRN', pakistan: 'PAK',
  egypt: 'EGY', uae: 'ARE', iraq: 'IRQ', qatar: 'QAT', kuwait: 'KWT',
  oman: 'OMN', jordan: 'JOR', lebanon: 'LBN', bahrain: 'BHR', yemen: 'YEM', syria: 'SYR',
}
const IND = { eco: 'NY.GDP.MKTP.PP.CD', mil: 'MS.MIL.XPND.CD' }
const SOURCE = 'World Bank: NY.GDP.MKTP.PP.CD (GDP PPP, current intl $) · MS.MIL.XPND.CD (military expenditure, current US$)'

// A real 2-month macro swing is small; anything beyond 2× (either way) vs the last value is almost
// certainly bad data (units flip, scrambled JSON, a placeholder) → reject, carry the last-good.
const DRIFT_LO = 0.5
const DRIFT_HI = 2.0

const MARK_START = '/* @generated-json-start */'
const MARK_END = '/* @generated-json-end */'

async function fetchWB(iso, indicator) {
  if (!iso) return null
  const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${indicator}?format=json&mrv=8`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 20000)
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'macropolitics-refresh' } })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`http ${res.status}`)
      const json = await res.json()
      const rows = Array.isArray(json) ? json[1] : null
      if (!Array.isArray(rows)) throw new Error('shape')
      const withVal = rows
        .filter((r) => r && r.value != null && Number.isFinite(Number(r.value)))
        .sort((a, b) => Number(b.date) - Number(a.date))
      if (!withVal.length) return null
      const top = withVal[0]
      return { v: Number(top.value), year: Number(top.date) }
    } catch {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  return null
}

// Read the previous generated file's embedded JSON (anchors + last-good latest). null if first run.
function readPrev() {
  if (!existsSync(OUT)) return null
  try {
    const txt = readFileSync(OUT, 'utf8')
    const a = txt.indexOf(MARK_START)
    const b = txt.indexOf(MARK_END)
    if (a < 0 || b < 0) return null
    return JSON.parse(txt.slice(a + MARK_START.length, b).trim())
  } catch {
    return null
  }
}

function plausible(v) {
  return Number.isFinite(v) && v > 0
}
// Drift guard against the last-known value. No previous → accept (seed/first sighting).
function withinDrift(next, prev) {
  if (!prev || !plausible(prev.v)) return true
  const ratio = next.v / prev.v
  return ratio >= DRIFT_LO && ratio <= DRIFT_HI
}

function logLine(...a) { console.log('[refresh]', ...a) }

async function main() {
  const prev = readPrev()
  const prevAnchors = prev?.anchors ?? {}
  const prevLatest = prev?.latest ?? {}
  const seeding = !prev
  logLine(seeding ? 'first run — seeding anchors from World Bank' : 'refreshing latest figures')

  // 1) fetch
  const fetched = {} // id -> { eco?, mil? }
  let freshCount = 0
  for (const [id, iso] of Object.entries(ISO3)) {
    if (!iso) continue
    const eco = await fetchWB(iso, IND.eco)
    const mil = await fetchWB(iso, IND.mil)
    fetched[id] = { eco, mil }
    if (eco) freshCount++
    if (mil) freshCount++
  }
  // Test seam (only when MP_REFRESH_FAULT is set) — lets the fail-safe be re-verified forever, not
  // just at build time. Injects a fault into the fetched data before validation runs.
  const fault = process.env.MP_REFRESH_FAULT
  if (fault === 'corrupt-cross-check' && fetched.china?.eco) { fetched.china.eco.v = 1; logLine('TEST: injected China PPP = 1 (must trip the cross-check abort)') }
  if (fault === 'drift' && fetched.bahrain?.eco) { fetched.bahrain.eco.v *= 5; logLine('TEST: injected Bahrain PPP ×5 (not in cross-checks → must be rejected as drift, carry last-good)') }
  if (fault === 'empty') { for (const k of Object.keys(fetched)) fetched[k] = { eco: null, mil: null }; freshCount = 0; logLine('TEST: dropped all fetched values (must abort)') }

  if (freshCount === 0) {
    logLine('FATAL: no fresh values from the World Bank — aborting, last-good state stands.')
    process.exit(1)
  }
  logLine(`fetched ${freshCount} fresh values across ${Object.values(ISO3).filter(Boolean).length} bodies`)

  // 2) source-wide corruption cross-checks (only assert when both sides were freshly fetched)
  const ge = (id) => fetched[id]?.eco?.v
  const gm = (id) => fetched[id]?.mil?.v
  const checks = []
  if (ge('china') && ge('usa')) checks.push(['China PPP ≥ USA PPP', ge('china') >= ge('usa')])
  if (ge('usa') && ge('russia')) checks.push(['USA PPP ≥ Russia PPP', ge('usa') >= ge('russia')])
  if (ge('india') && ge('russia')) checks.push(['India PPP ≥ Russia PPP', ge('india') >= ge('russia')])
  if (gm('usa')) {
    const maxMil = Math.max(...Object.keys(ISO3).map((id) => gm(id) ?? 0))
    checks.push(['USA is the top military spender', gm('usa') >= maxMil])
  }
  const failed = checks.filter(([, ok]) => !ok)
  if (failed.length) {
    logLine('FATAL: source-integrity cross-checks failed — likely bad data. Aborting, writing nothing.')
    failed.forEach(([name]) => logLine('   ✗', name))
    process.exit(1)
  }
  checks.forEach(([name]) => logLine('   ✓', name))

  // 3) merge: validated fresh value wins; otherwise carry the last-good. anchors freeze at seed.
  const anchors = { ...prevAnchors }
  const latest = {}
  let updated = 0, carried = 0, rejected = 0
  for (const id of Object.keys(ISO3)) {
    if (!ISO3[id]) continue
    latest[id] = {}
    anchors[id] = anchors[id] ?? {}
    for (const axis of ['eco', 'mil']) {
      const next = fetched[id]?.[axis]
      const prevL = prevLatest[id]?.[axis]
      let chosen = prevL // default: carry forward
      if (next && plausible(next.v)) {
        if (withinDrift(next, prevL)) { chosen = next; if (!prevL || prevL.v !== next.v || prevL.year !== next.year) updated++ }
        else { rejected++; logLine(`   ⚠ ${id}.${axis}: ${next.v} rejected (drift vs ${prevL?.v}); carrying last-good`) }
      } else if (prevL) {
        carried++
      }
      if (chosen) {
        latest[id][axis] = chosen
        // seed the anchor the first time we ever see a good value for this axis
        if (!anchors[id][axis]) anchors[id][axis] = chosen
      }
      if (!Object.keys(latest[id]).length) delete latest[id]
    }
  }
  logLine(`merge: ${updated} updated · ${carried} carried (no fresh) · ${rejected} rejected (drift)`)

  // 4) write the typed module (machine-parseable JSON between markers)
  const payload = { generatedAt: new Date().toISOString(), source: SOURCE, anchors, latest }
  const json = JSON.stringify(payload, null, 2)
  const file = `// AUTO-GENERATED by scripts/refresh-data.mjs — do not edit by hand.
// Latest sourced macro figures (World Bank) + the calibration anchors the model's live overlay
// rides off. \`anchors\` freeze at seed (the figure paired with the authored composite score);
// \`latest\` refreshes every cycle and carries forward the last-good value on any rejected fetch.
// The overlay (src/data/empirical.ts) is a no-op while latest === anchors.

export interface LiveFigure { v: number; year: number }
export interface FigureRecord { eco?: LiveFigure; mil?: LiveFigure }
export interface FiguresFile {
  generatedAt: string
  source: string
  anchors: Record<string, FigureRecord>
  latest: Record<string, FigureRecord>
}

export const FIGURES: FiguresFile = ${MARK_START} ${json} ${MARK_END}
`

  if (DRY) {
    logLine('--dry: not writing. Preview of latest:')
    console.log(JSON.stringify(latest, null, 2))
    return
  }
  writeFileSync(OUT, file)
  logLine(`wrote ${OUT}`)
  logLine(seeding ? 'SEEDED — today this is a no-op (latest === anchors); future cycles drift with real data.' : 'refreshed.')
}

main().catch((e) => { console.error('[refresh] FATAL', e); process.exit(1) })
