import { useEffect, useMemo, useRef, useState } from 'react'
import { OrbitalField } from './engine'
import { LabelLayer } from './LabelLayer'
import { HoverReadout } from './HoverReadout'
import { Header, SidePanel, PanelDock, TabBar, type EntityDetail, type View } from './Chrome'
import { NODES, LINKS, AXIS, AXIS_LABEL } from '../data/entities'
import { sound } from '../sound'

interface Hover { id: string | null; screen: { x: number; y: number } | null }

const byId = new Map(NODES.map((n) => [n.id, n]))

// Visually-hidden but screen-reader-available (clip technique — not display:none, which AT skips).
const SR_ONLY: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}
// Ranked text equivalent for the canvas constellation — the orrery is otherwise opaque to AT.
const RANKED_NODES = [...NODES].sort((a, b) => b.power - a.power)

function buildDetail(id: string | null): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id)
  if (!e) return null
  const parent = e.parent !== 'C' ? byId.get(e.parent) : null
  const seen = new Set<string>()
  const relations: { id: string; he: string }[] = []
  for (const [a, b] of LINKS) {
    if (a !== id && b !== id) continue
    const oid = a === id ? b : a
    const o = byId.get(oid)
    if (o && !seen.has(oid)) { seen.add(oid); relations.push({ id: oid, he: o.he }) }
  }
  return {
    he: e.he, power: e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: parent?.he ?? null, relations,
  }
}

export default function DynamicsView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [engine, setEngine] = useState<OrbitalField | null>(null)
  const [hover, setHover] = useState<Hover>({ id: null, screen: null })
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.85)

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return
    // floating + cursor-connecting starfield (the engine's own), reverted from the global inward field
    const orbital = new OrbitalField(canvasRef.current, stageRef.current, { noStarfield: false })
    orbital.onHover = (id, screen) => { if (id) sound.play('hover'); document.body.classList.toggle('cursor-grab', !!id); setHover({ id, screen }) }
    orbital.onSelect = (id) => { if (id) sound.play('select'); setSelected(id) }
    orbital.onZoom = (z) => setZoom(z)
    orbital.start_()
    setEngine(orbital)
    // debounce: window resize fires continuously during a drag; one resize at rest is enough
    let t = 0
    const onResize = () => { clearTimeout(t); t = window.setTimeout(() => orbital.resize(), 120) }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
      orbital.destroy()
      document.body.classList.remove('cursor-grab')
    }
  }, [])

  const detail = useMemo(() => buildDetail(selected), [selected])

  return (
    <div className="stage" ref={stageRef} dir="rtl">
      <canvas ref={canvasRef} className="field" role="img" aria-label="מפת כוחות המזרח התיכון — מערך מסלולי של גופים גאופוליטיים לפי כוח" />
      {/* screen-reader equivalent for the canvas: the bodies ranked by power */}
      <div style={SR_ONLY}>
        <h2>דירוג הגופים לפי כוח משיכה</h2>
        <ol>
          {RANKED_NODES.map((n) => (
            <li key={n.id}>{n.he} — {n.power} מתוך 100, {AXIS_LABEL[AXIS[n.id] ?? 'none']}</li>
          ))}
        </ol>
      </div>
      {engine && <LabelLayer engine={engine} />}
      {!selected && <HoverReadout id={hover.id} screen={hover.screen} />}
      <Header onHome={() => onView('home')} />
      <PanelDock>
        <SidePanel detail={detail} onClose={() => engine?.clearSelection()} onRelSelect={(id) => engine?.select(id)} />
      </PanelDock>
      <TabBar view={view} onView={onView} />
      <div className="zoomctl" dir="ltr">
        <button onClick={() => engine?.zoomBy(1.25)} aria-label="התקרבות">+</button>
        <span className="zoomctl__val">{Math.round(zoom * 100)}%</span>
        <button onClick={() => engine?.zoomBy(0.8)} aria-label="התרחקות">−</button>
        <button className="zoomctl__reset" onClick={() => engine?.resetView()} aria-label="איפוס">⟲</button>
      </div>
    </div>
  )
}
