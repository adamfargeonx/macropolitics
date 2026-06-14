import { useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import { CustomCursor } from './dynamics/CustomCursor'
import { GlobalField } from './dynamics/GlobalField'
import { Legend } from './dynamics/Legend'
import { AboutOverlay } from './dynamics/AboutView'
import { AboutToast } from './dynamics/AboutToast'
import { EvidenceOverlay } from './dynamics/EvidenceOverlay'
import { UtilityNav } from './dynamics/Chrome'
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

const VIEW_HASH: Record<View, string> = { home: '', forces: '#/forces', relations: '#/relations', dynamics: '#/dynamics' }
const hashToView = (h: string): View | null =>
  h === '#/forces' ? 'forces' : h === '#/relations' ? 'relations' : h === '#/dynamics' ? 'dynamics' : h === '' || h === '#/' ? 'home' : null

export default function App() {
  // repeat visits (same session) get a quick loader — the moment, without the wait
  const revisit = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mp-visited') === '1'
  const [loaded, setLoaded] = useState(false)
  const initial = hashToView(window.location.hash) ?? 'home'
  const [homeOpen, setHomeOpen] = useState(initial !== 'home') // deep-linked → the circle is already open
  const [view, setView] = useState<View>(initial)
  const prev = useRef<View>(view)

  useEffect(() => {
    if (prev.current !== view) {
      sound.play(view === 'home' ? 'back' : 'transition')
      prev.current = view
      if (view !== 'home') setHomeOpen(true) // returning home lands on the open circle
    }
    // URL ↔ view (replaceState: no history spam while exploring)
    const want = VIEW_HASH[view]
    if (window.location.hash !== want) history.replaceState(null, '', want || window.location.pathname)
  }, [view])

  // back/forward + hand-edited hashes
  useEffect(() => {
    const onHash = () => { const v = hashToView(window.location.hash); if (v) setView(v) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // keyboard: 1/2/3 → lenses, Escape → home (overlays consume their own Escape first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const overlayOpen = !!document.querySelector('.legend, .about')
      if (e.key === '1') setView('forces')
      else if (e.key === '2') setView('relations')
      else if (e.key === '3') setView('dynamics')
      else if (e.key === 'Escape' && !overlayOpen) setView('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onLoaderDone = () => { setLoaded(true); try { sessionStorage.setItem('mp-visited', '1') } catch { /* private mode */ } }

  return (
    <>
      <GlobalField />
      {view === 'home' ? <HomeView open={homeOpen} onToggle={() => setHomeOpen((o) => !o)} onView={setView} />
        : view === 'forces' ? <ForcesView view={view} onView={setView} />
        : view === 'relations' ? <RelationsView view={view} onView={setView} />
        : <DynamicsView view={view} onView={setView} />}
      <CustomCursor />
      <SoundToggle />
      <UtilityNav />
      {view !== 'home' && <ABToggle />}
      <Legend view={view} />
      <AboutOverlay />
      <EvidenceOverlay />
      <AboutToast />
      {!loaded && <LoaderView quick={revisit} onDone={onLoaderDone} />}
    </>
  )
}
