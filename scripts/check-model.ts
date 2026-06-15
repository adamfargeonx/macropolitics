// Calibration + regression check for the gravity model.
// Run:  node --experimental-strip-types scripts/check-model.ts
// Prints each body's decomposition (eco/mil/geo · stability · intrinsic · +backing = power)
// and the full ranking, so the inputs can be tuned and the order sanity-checked.
import { computeGravities } from '../src/model/gravity.ts'
import { BODY_INPUTS } from '../src/data/empirical.ts'

const HE: Record<string, string> = {
  usa: 'ארהב', china: 'סין', russia: 'רוסיה', europe: 'אירופה', india: 'הודו',
  iran: 'איראן', saudi: 'סעודיה', israel: 'ישראל', turkey: 'טורקיה', egypt: 'מצרים',
  pakistan: 'פקיסטן', uae: 'אמירויות', qatar: 'קטאר', iraq: 'עיראק', kuwait: 'כווית',
  oman: 'עומאן', jordan: 'ירדן', bahrain: 'בחריין', syria: 'סוריה', lebanon: 'לבנון',
  hezbollah: 'חיזבאללה', yemen: 'תימן', hamas: 'חמאס', militias: 'מיליציות', sdf: 'SDF',
  fatah: 'פתח', isis: 'דאעש', qaeda: 'אלקעדה', pij: 'גיהאד',
}

const res = computeGravities(BODY_INPUTS)
const rows = [...res.values()].sort((a, b) => b.power - a.power)

console.log('\nrank  power  body         eco mil geo  stab  intrins  +back  patron')
console.log('────────────────────────────────────────────────────────────────────')
rows.forEach((r, i) => {
  const rank = String(i + 1).padStart(2, ' ')
  const pow = String(r.power).padStart(3, ' ')
  const name = (HE[r.id] || r.id).padEnd(11, ' ')
  const stab = r.stability.toFixed(2)
  const intr = r.intrinsic.toFixed(2).padStart(5, ' ')
  const back = r.backing > 0 ? `+${(r.backing * 10).toFixed(0)}`.padStart(4, ' ') : '   ·'
  const pat = r.patron ? `⟵ ${HE[r.patron] || r.patron}` : ''
  console.log(`  ${rank}   ${pow}   ${name}  ${r.eco}   ${r.mil}   ${r.geo}   ${stab}   ${intr}  ${back}  ${pat}`)
})

// sanity assertions — fail loudly if the model goes sideways
const power = (id: string) => res.get(id)!.power
const checks: [string, boolean][] = [
  ['USA is the maximum', power('usa') === Math.max(...rows.map((r) => r.power))],
  ['economic composite live (per-capita lifts Qatar above mass-heavy Pakistan)', res.get('qatar')!.eco > res.get('pakistan')!.eco],
  ['military composite live — nuclear states above equal-spend peers (Pakistan mil > Egypt mil)', res.get('pakistan')!.mil > res.get('egypt')!.mil],
  ['great powers > regionals', power('china') > power('iran') && power('russia') > power('turkey')],
  ['Israel reads as a strong regional power (> 55)', power('israel') > 55],
  ['fragmented Syria is discounted (< functioning Iraq)', power('syria') < power('iraq')],
  ['proxies stay small (PIJ < 15, Hamas < 25)', power('pij') < 15 && power('hamas') < 25],
  ['Hezbollah degraded post-2024 (power < 25)', power('hezbollah') < 25],
  ['Syria cut from the Iran axis (no backing)', res.get('syria')!.backing === 0],
  ['PIJ is a near-total client (backing ≥ its own intrinsic)', res.get('pij')!.backing >= res.get('pij')!.intrinsic],
  ['every body in 0–100', rows.every((r) => r.power >= 0 && r.power <= 100)],
  ['count = 29', rows.length === 29],
  ['geo composite live — Turkey geo ≥ 7 from physical geography composite', res.get('turkey')!.geo >= 7.0],
  ['Iran geo reflects axis collapse (≤ 6)', res.get('iran')!.geo <= 6],
  ['Yemen geo reflects Bab el-Mandeb leverage (≥ 4)', res.get('yemen')!.geo >= 4],
  ['UAE geo elevated to hub-power level (≥ 5)', res.get('uae')!.geo >= 5],
]
console.log('\nchecks:')
let ok = true
for (const [label, pass] of checks) {
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${label}`)
  if (!pass) ok = false
}
console.log(ok ? '\nALL CHECKS PASS\n' : '\n*** CHECKS FAILED ***\n')
process.exit(ok ? 0 : 1)
