import { NODES, AXIS, AXIS_LABEL, forceScore } from '../data/entities'

const byId = new Map(NODES.map((n) => [n.id, n]))

// Data readout shown on node hover — name, gravity score, tier/bloc, orbit parent.
// Positioned near the hovered node (screen coords from the engine).
export function HoverReadout({ id, screen }: { id: string | null; screen: { x: number; y: number } | null }) {
  if (!id || !screen) return null
  const e = byId.get(id)
  if (!e) return null
  const parent = e.parent !== 'C' ? byId.get(e.parent) : null
  return (
    <div
      className="readout"
      dir="rtl"
      style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }}
    >
      <span className="readout__name">
        {e.he}
        <b className="readout__g">{forceScore(e.power).toFixed(1)}</b>
      </span>
      <span className="readout__row">{e.tier} · {AXIS_LABEL[AXIS[id] ?? 'none']}</span>
      <span className="readout__row readout__dispo">
        {e.dispo}{parent ? ` · במסלול סביב ${parent.he}` : ''}
      </span>
    </div>
  )
}
