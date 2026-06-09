import { NODES } from '../data/entities'

// Data readout shown on node hover — the entity's power tier + disposition.
// Positioned near the hovered node (screen coords from the engine).
export function HoverReadout({ id, screen }: { id: string | null; screen: { x: number; y: number } | null }) {
  if (!id || !screen) return null
  const e = NODES.find((n) => n.id === id)
  if (!e) return null
  return (
    <div
      className="readout"
      dir="rtl"
      style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }}
    >
      <span className="readout__name">{e.he}</span>
      <span className="readout__row">{e.tier}</span>
      <span className="readout__row readout__dispo">{e.dispo}</span>
    </div>
  )
}
