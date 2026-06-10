import { useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import { CustomCursor } from './dynamics/CustomCursor'
import { Legend } from './dynamics/Legend'
import { AboutOverlay } from './dynamics/AboutView'
import { panelAB, usePanelVariant } from './dynamics/panelAB'
import type { View } from './dynamics/Chrome'
import { sound } from './sound'

// Live A/B toggle for the side-panel design (top-left; data views only).
function ABToggle() {
  const v = usePanelVariant()
  return (
    <button className="abtoggle" onClick={() => { sound.play('tab'); panelAB.toggle() }} aria-label="החלפת עיצוב הפאנל" title="A/B — עיצוב הפאנל">
      <span className="abtoggle__lbl">פאנל</span>
      <span className={`abtoggle__opt${v === 'a' ? ' is-on' : ''}`}>A</span>
      <span className={`abtoggle__opt${v === 'b' ? ' is-on' : ''}`}>B</span>
    </button>
  )
}

function SoundToggle() {
  const [muted, setMuted] = useState(false)
  return (
    <button
      className="soundtoggle"
      aria-label={muted ? 'הפעלת קול' : 'השתקה'}
      onClick={() => { sound.start(); setMuted(sound.toggle()) }}
    >
      <span className={`soundtoggle__bars${muted ? ' soundtoggle__bars--off' : ''}`}>
        <i /><i /><i /><i />
      </span>
    </button>
  )
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [homeOpen, setHomeOpen] = useState(false)
  const [view, setView] = useState<View>('home')
  const prev = useRef<View>(view)
  useEffect(() => {
    if (prev.current !== view) {
      sound.play(view === 'home' ? 'back' : 'transition')
      prev.current = view
    }
  }, [view])

  return (
    <>
      {view === 'home' ? <HomeView open={homeOpen} onToggle={() => setHomeOpen((o) => !o)} onView={setView} />
        : view === 'forces' ? <ForcesView view={view} onView={setView} />
        : view === 'relations' ? <RelationsView view={view} onView={setView} />
        : <DynamicsView view={view} onView={setView} />}
      <CustomCursor />
      <SoundToggle />
      {view !== 'home' && <ABToggle />}
      <Legend view={view} />
      <AboutOverlay />
      {!loaded && <LoaderView onDone={() => setLoaded(true)} />}
    </>
  )
}
