import { NODES } from '../data/entities'
import type { OrbitalField } from './engine'

// DOM labels layered over the canvas. The engine writes each label's transform
// and opacity every frame via the registered ref — React renders them only once.
export function LabelLayer({ engine }: { engine: OrbitalField | null }) {
  return (
    <div className="labels" aria-hidden={false}>
      {NODES.map((n) => (
        <span
          key={n.id}
          className={`lbl lbl--${n.kind}`}
          ref={(el) => engine?.registerLabel(n.id, el)}
        >
          {n.he}
        </span>
      ))}
    </div>
  )
}
