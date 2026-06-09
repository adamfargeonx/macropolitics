import { useEffect, useRef, useState } from 'react'
import { OrbitalField } from './engine'
import { LabelLayer } from './LabelLayer'
import { CustomCursor } from './CustomCursor'
import { HoverReadout } from './HoverReadout'
import { Header, SidePanel, RightRail, TabBar } from './Chrome'

interface Hover { id: string | null; screen: { x: number; y: number } | null }

export default function DynamicsView() {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<OrbitalField | null>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<Hover>({ id: null, screen: null })
  const [zoom, setZoom] = useState(0.85)

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return
    const engine = new OrbitalField(canvasRef.current, stageRef.current)
    engine.onHover = (id, screen) => setHover({ id, screen })
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

  return (
    <div className="stage" ref={stageRef} dir="rtl">
      <canvas ref={canvasRef} className="field" />
      {ready && <LabelLayer engine={engineRef.current} />}
      <HoverReadout id={hover.id} screen={hover.screen} />
      <Header />
      <SidePanel />
      <RightRail />
      <TabBar />
      <div className="zoomctl" dir="ltr">
        <button onClick={() => engineRef.current?.zoomBy(1.25)} aria-label="התקרבות">+</button>
        <span className="zoomctl__val">{Math.round(zoom * 100)}%</span>
        <button onClick={() => engineRef.current?.zoomBy(0.8)} aria-label="התרחקות">−</button>
        <button className="zoomctl__reset" onClick={() => engineRef.current?.resetView()} aria-label="איפוס">⟲</button>
      </div>
      <CustomCursor active={!!hover.id} />
    </div>
  )
}
