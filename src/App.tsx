import { useCallback, useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import { CustomCursor } from './dynamics/CustomCursor'
import { GlobalField } from './dynamics/GlobalField'
import { Legend } from './dynamics/Legend'
import { AboutOverlay } from './dynamics/AboutView'
import { EvidenceOverlay } from './dynamics/EvidenceOverlay'
import { Header, UtilityNav, TabBar } from './dynamics/Chrome'
import type { View } from './dynamics/Chrome'
import { sound } from './sound'

function SoundToggle() {
  const [muted, setMuted] = useState(false)
  return (
    <button
      className="soundtoggle"
      aria-label={muted ? 'הפעלת קול' : 'השתקה'}
      aria-pressed={muted}
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
  const [loaded, setLoaded] = useState(false)
  const [intro, setIntro] = useState(false)
  const initial = hashToView(window.location.hash) ?? 'home'
  const [homeOpen, setHomeOpen] = useState(initial !== 'home')
  const [view, setView] = useState<View>(initial)
  const [rail, setRail] = useState('')
  const [navTarget, setNavTarget] = useState<View | null>(null)
  const viewRef = useRef(view)
  const transRef = useRef<{ to: View; timers: number[] } | null>(null)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => () => { transRef.current?.timers.forEach(clearTimeout) }, [])
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const go = useCallback((v: View) => {
    if (v === viewRef.current || transRef.current) return
    const from = viewRef.current
    sound.play(v === 'home' ? 'back' : 'transition')
    if (v !== 'home') setHomeOpen(true)
    if (reduceMotion) { viewRef.current = v; setView(v); return }

    const t: { to: View; timers: number[] } = { to: v, timers: [] }
    transRef.current = t
    setNavTarget(v)

    let leaveClass = '', enterClass = '', leaveMs = 420, enterMs = 460
    if (from === 'home') {
      leaveClass = 'nav-rail--zoom-up'; enterClass = 'nav-rail--bloom'; leaveMs = 520; enterMs = 480
    } else if (v === 'home') {
      leaveClass = 'nav-rail--collapse'; enterClass = 'nav-rail--mask'; leaveMs = 460; enterMs = 500
    } else {
      const TAB_ORDER: View[] = ['forces', 'relations', 'dynamics']
      const goingLeft = TAB_ORDER.indexOf(v) > TAB_ORDER.indexOf(from)
      leaveClass = goingLeft ? 'nav-rail--out-right' : 'nav-rail--out-left'
      enterClass = goingLeft ? 'nav-rail--in-left' : 'nav-rail--in-right'
    }
    setRail(leaveClass)
    t.timers.push(window.setTimeout(() => {
      viewRef.current = v; setView(v); setRail(enterClass)
      t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, enterMs))
    }, leaveMs))
  }, [reduceMotion])

  useEffect(() => {
    const want = VIEW_HASH[view]
    if (window.location.hash !== want) history.replaceState(null, '', want || window.location.pathname)
  }, [view])

  useEffect(() => {
    const onHash = () => { const v = hashToView(window.location.hash); if (v) go(v) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const overlayOpen = !!document.querySelector('.legend, .about, .evid')
      if (e.key === '1') go('forces')
      else if (e.key === '2') go('relations')
      else if (e.key === '3') go('dynamics')
      else if (e.key === 'Escape' && !overlayOpen) go('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onLoaderDone = () => { setLoaded(true); if (!homeOpen) setIntro(true) }

  return (
    <>
      {view !== 'dynamics' && <GlobalField view={view} />}

      <div className={`nav-rail${rail ? ' ' + rail : ''}`}>
        {view === 'home'
          ? <HomeView
              open={homeOpen}
              intro={view === 'home' ? intro : false}
              lockTo={null}
              onToggle={() => setHomeOpen(o => !o)}
              onView={go}
            />
          : view === 'forces' ? <ForcesView />
          : view === 'relations' ? <RelationsView />
          : <DynamicsView />}
      </div>

      {view !== 'home' && <Header onHome={() => go('home')} />}
      {view !== 'home' && <UtilityNav />}
      {view !== 'home' && <TabBar view={navTarget ?? view} onView={go} />}
      <CustomCursor />
      {view !== 'home' && <SoundToggle />}
      <Legend view={view} />
      <AboutOverlay />
      <EvidenceOverlay />
      {!loaded && <LoaderView onDone={onLoaderDone} />}
    </>
  )
}
