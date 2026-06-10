import { useEffect, useRef, useState } from 'react'
import OpenerView from './dynamics/OpenerView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import { CustomCursor } from './dynamics/CustomCursor'
import { Legend } from './dynamics/Legend'
import type { View } from './dynamics/Chrome'
import { sound } from './sound'

function SoundToggle({ home = false }: { home?: boolean }) {
  const [muted, setMuted] = useState(false)
  return (
    <button
      className={`soundtoggle${home ? ' soundtoggle--home' : ''}`}
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
  const [entered, setEntered] = useState(false)
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
      {!entered ? <OpenerView onEnter={() => setEntered(true)} />
        : view === 'home' ? <HomeView onView={setView} />
        : view === 'forces' ? <ForcesView view={view} onView={setView} />
        : view === 'relations' ? <RelationsView view={view} onView={setView} />
        : <DynamicsView view={view} onView={setView} />}
      <CustomCursor />
      {entered && <SoundToggle home={view === 'home'} />}
      <Legend view={view} />
    </>
  )
}
