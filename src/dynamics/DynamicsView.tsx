import { useEffect, useMemo, useRef, useState } from 'react'
import { OrbitalField } from './engine'
import { LabelLayer } from './LabelLayer'
import { HoverReadout } from './HoverReadout'
import { Header, SidePanel, RightRail, TabBar, type EntityDetail, type View } from './Chrome'
import { NODES, LINKS, AXIS, AXIS_LABEL } from '../data/entities'
import { sound } from '../sound'

interface Hover { id: string | null; screen: { x: number; y: number } | null }

const byId = new Map(NODES.map((n) => [n.id, n]))

function buildDetail(id: string | null): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id)
  if (!e) return null
  const parent = e.parent !== 'C' ? byId.get(e.parent) : null
  const relations = LINKS
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => byId.get(a === id ? b : a)?.he)
    .filter((x): x is string => !!x)
  return {
    he: e.he, power: e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: parent?.he ?? null,
    relations: [...new Set(relations)],
  }
}

export default function DynamicsView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<OrbitalField | null>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<Hover>({ id: null, screen: null })
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.85)

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return
    const engine = new OrbitalField(canvasRef.current, stageRef.current)
    engine.onHover = (id, screen) => { if (id) sound.play('hover'); setHover({ id, screen }) }
    engine.onSelect = (id) => { if (id) sound.play('select'); setSelected(id) }
    engine.onZoom = (z) => setZoom(z)
    engineRef.current = engine
    engine.start_()
    setReady(true)
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const detail = useMemo(() => buildDetail(selected), [selected])

  return (
    <div className="stage" ref={stageRef} dir="rtl">
      <canvas ref={canvasRef} className="field" />
      {ready && <LabelLayer engine={engineRef.current} />}
      {!selected && <HoverReadout id={hover.id} screen={hover.screen} />}
      <Header onHome={() => onView('home')} />
      <SidePanel detail={detail} onClose={() => engineRef.current?.clearSelection()} />
      <RightRail />
      <TabBar view={view} onView={onView} />
      <div className="zoomctl" dir="ltr">
        <button onClick={() => engineRef.current?.zoomBy(1.25)} aria-label="התקרבות">+</button>
        <span className="zoomctl__val">{Math.round(zoom * 100)}%</span>
        <button onClick={() => engineRef.current?.zoomBy(0.8)} aria-label="התרחקות">−</button>
        <button className="zoomctl__reset" onClick={() => engineRef.current?.resetView()} aria-label="איפוס">⟲</button>
      </div>
    </div>
  )
}
