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
  // Two separate layers: home (persistent ring) and page. Each has its own animation class.
  const [pageRail, setPageRail] = useState('')
  const [leavingHome, setLeavingHome] = useState(false) // home layer stays while page fades in
  const [enteringHome, setEnteringHome] = useState(false) // home layer mounts while page fades out
  const [navTarget, setNavTarget] = useState<View | null>(null)
  const viewRef = useRef(view)
  const transRef = useRef<{ to: View; timers: number[] } | null>(null)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => () => { transRef.current?.timers.forEach(clearTimeout) }, [])
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // Navigation: the home orbit ring is the permanent visual axis of the whole experience.
  //  · home → page: ring stays fixed. Home text fades out. Page fades in around/over the ring.
  //  · page → home: page fades out. Home fades in (ring reappears). No zoom or blur.
  //  · page → page: directional slide by bottom-toggle order (RTL: forces=right … dynamics=left).
  const go = useCallback((v: View) => {
    if (v === viewRef.current || transRef.current) return
    const from = viewRef.current
    sound.play(v === 'home' ? 'back' : 'transition')
    if (v !== 'home') setHomeOpen(true)
    if (reduceMotion) { viewRef.current = v; setView(v); return }

    const t: { to: View; timers: number[] } = { to: v, timers: [] }
    transRef.current = t
    setNavTarget(v)

    if (from === 'home') {
      // Ring stays. Text fades fast. Page appears over the ring.
      setLeavingHome(true)
      viewRef.current = v; setView(v)
      setPageRail('nav-rail--page-over-home')
      t.timers.push(window.setTimeout(() => {
        setLeavingHome(false); setPageRail(''); setNavTarget(null); transRef.current = null
      }, 400))
    } else if (v === 'home') {
      // Page fades, home fades in simultaneously.
      setEnteringHome(true)
      setPageRail('nav-rail--page-leaving')
      t.timers.push(window.setTimeout(() => {
        viewRef.current = 'home'; setView('home')
        setPageRail(''); setEnteringHome(false); setNavTarget(null); transRef.current = null
      }, 350))
    } else {
      // Page → page: slide in the order of the bottom toggle (RTL: forces=right … dynamics=left).
      const TAB_ORDER: View[] = ['forces', 'relations', 'dynamics']
      const goingLeft = TAB_ORDER.indexOf(v) > TAB_ORDER.indexOf(from)
      const leaveClass = goingLeft ? 'nav-rail--out-right' : 'nav-rail--out-left'
      const enterClass = goingLeft ? 'nav-rail--in-left' : 'nav-rail--in-right'
      setPageRail(leaveClass)
      t.timers.push(window.setTimeout(() => {
        viewRef.current = v; setView(v); setPageRail(enterClass)
        t.timers.push(window.setTimeout(() => { setPageRail(''); setNavTarget(null); transRef.current = null }, 460))
      }, 420))
    }
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

  const showHomeLayer = view === 'home' || leavingHome || enteringHome
  const showPageLayer = view !== 'home'

  return (
    <>
      {/* GlobalField: keep during home↔page transitions to avoid a flash of raw background */}
      {(view !== 'dynamics' || leavingHome || enteringHome) && (
        <GlobalField view={(leavingHome || enteringHome) ? 'home' : view} />
      )}

      {/* Home layer — the orbit ring is the visual anchor of the whole experience.
          Stays mounted during home→page (ring visible, text fades).
          Mounts during page→home (fades in while page fades out). */}
      {showHomeLayer && (
        <div className={`nav-rail${leavingHome ? ' nav-rail--home-leaving' : enteringHome ? ' nav-rail--home-entering' : ''}`}>
          <HomeView
            open={homeOpen}
            intro={view === 'home' && !leavingHome && !enteringHome ? intro : false}
            lockTo={null}
            onToggle={() => setHomeOpen(o => !o)}
            onView={go}
          />
        </div>
      )}

      {/* Page layer — fades in over the home ring (home→page), or slides page-to-page */}
      {showPageLayer && (
        <div className={`nav-rail${pageRail ? ' ' + pageRail : ''}`}>
          {view === 'forces' ? <ForcesView />
            : view === 'relations' ? <RelationsView />
            : <DynamicsView />}
        </div>
      )}

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
