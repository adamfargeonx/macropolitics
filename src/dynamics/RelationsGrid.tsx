import { useMemo, useState } from 'react'
import { powerSize } from '../data/entities'
import { authoredRelation } from '../data/relations'
import { STATES, hash, relation, sharpen, dominantOf, POLE_HE, type Rel, type Pole } from './relations-model'

// Unit-triangle vertices for the mini constellations — the SAME vertex↔field weighting as
// unifiedGeo() in RelationsView.tsx (top = friction field/מתח, bottom-left = tension field/חיכוך,
// bottom-right = harmony), so a thumbnail here is recognizably the same figure the full field
// shows for that country once opened, not a rotated re-derivation of it.
const VT = { x: 50, y: 6 }
const VF = { x: 8, y: 84 }
const VH = { x: 92, y: 84 }

interface MiniPoint { x: number; y: number; d: number }
interface GridRow {
  id: string; he: string; power: number; items: MiniPoint[]
  mean: Rel; dom: Pole; covered: number; total: number
}

type SortKey = 'power' | 'harmony' | 'hostile' | 'coverage'
const SORTS: Record<SortKey, { label: string; fn: (a: GridRow, b: GridRow) => number }> = {
  power: { label: 'לפי עוצמה', fn: (a, b) => b.power - a.power },
  harmony: { label: 'הרמוניה יורדת', fn: (a, b) => b.mean.harmony - a.mean.harmony },
  hostile: { label: 'חיכוך יורד', fn: (a, b) => b.mean.tension - a.mean.tension },
  coverage: { label: 'כיסוי עריכתי', fn: (a, b) => b.covered - a.covered },
}
const POLE_CLASS: Record<Pole, string> = { tension: 't', friction: 'f', harmony: 'h' }

export function RelationsGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>('power')

  // Per-country label is the MEAN of its own 19 relations (raw, pre-sharpen), reduced to a
  // dominant pole — not DISPO, which already feeds INTO relation() and would make the caption
  // circular. This gives the grid a sortable spine no other screen has, in the same vocabulary
  // the live field already uses (POLE_HE).
  const rows = useMemo<GridRow[]>(() => STATES.map((ref) => {
    let mt = 0, mf = 0, mh = 0, covered = 0
    const items = STATES.filter((e) => e.id !== ref.id).map((e) => {
      const raw = relation(ref.id, e.id)
      mt += raw.tension; mf += raw.friction; mh += raw.harmony
      if (authoredRelation(ref.id, e.id)) covered++
      const sr = sharpen(raw)
      // small seeded jitter so two states with identical derived output don't render as one
      // literally-overlapping dot — same idiom as the field's own per-node jitter, scaled down.
      const jx = ((hash(ref.id + e.id) % 1000) / 1000 - 0.5) * 3
      const jy = ((hash(ref.id + e.id + '~') % 1000) / 1000 - 0.5) * 3
      return {
        x: sr.friction * VT.x + sr.tension * VF.x + sr.harmony * VH.x + jx,
        y: sr.friction * VT.y + sr.tension * VF.y + sr.harmony * VH.y + jy,
        d: Math.max(1.1, Math.min(3.1, powerSize(e.power) * 0.018)),
      }
    })
    const n = items.length
    const mean: Rel = { tension: mt / n, friction: mf / n, harmony: mh / n }
    return { id: ref.id, he: ref.he, power: ref.power, items, mean, dom: dominantOf(mean), covered, total: n }
  }), [])

  const sorted = useMemo(() => rows.slice().sort(SORTS[sort].fn), [rows, sort])
  const fullyCovered = rows.filter((r) => r.covered === r.total).length

  return (
    <div className="rel-grid">
      <h1 className="panel__title rel-grid__title">מערכות היחסים</h1>
      <p className="rel-grid__sub">כל מדינה כמדינת ייחוס משלה — לחצו על כרטיס לפתיחת מערכת היחסים המלאה שלה.</p>

      <div className="rel-grid__sortbar">
        <span className="rel-grid__sort-l">מיון</span>
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <button
            key={key}
            className={`rel-grid__sort-btn${sort === key ? ' rel-grid__sort-btn--on' : ''}`}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {SORTS[key].label}
          </button>
        ))}
      </div>

      <div className="rel-grid__cells">
        {sorted.map((row, i) => (
          <button
            key={row.id}
            className="rel-grid__cell"
            style={{ '--cd': `${Math.min(i * 0.02, 0.5)}s` } as React.CSSProperties}
            onClick={() => onSelect(row.id)}
            aria-label={`פתחו את מערכת היחסים של ${row.he} — ${POLE_HE[row.dom]} דומיננטי`}
          >
            <svg viewBox="0 0 100 90" className="rel-grid__svg" aria-hidden="true">
              <polygon className="rel-grid__poly" points={`${VT.x},${VT.y} ${VF.x},${VF.y} ${VH.x},${VH.y}`} />
              {row.items.map((p, pi) => <circle key={pi} className="rel-grid__dot" cx={p.x} cy={p.y} r={p.d} />)}
            </svg>
            <span className="rel-grid__name">{row.he}</span>
            <span className={`rel-grid__pole rel-grid__pole--${POLE_CLASS[row.dom]}`}>{POLE_HE[row.dom]}</span>
            <span className="rel-grid__cov">{row.covered}/{row.total} מאופיין עריכתית</span>
          </button>
        ))}
      </div>

      <p className="rel-grid__note">{fullyCovered}/{rows.length} מדינות בכיסוי עריכתי מלא — השאר נשענות על המודל הנגזר (שיוך גוש, בריתות, אופי).</p>
    </div>
  )
}
