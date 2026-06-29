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
  const [intro, setIntro] = useState(false) // first-load thesis reveal on the home (set at loader handoff)
  const initial = hashToView(window.location.hash) ?? 'home'
  const [homeOpen, setHomeOpen] = useState(initial !== 'home') // deep-linked → the circle is already open
  const [view, setView] = useState<View>(initial)
  const [rail, setRail] = useState('')                 // nav-rail transition class (zoom-up/collapse/bloom/mask)
  const [navTarget, setNavTarget] = useState<View | null>(null) // light the destination tab during a transition
  const [lockTo] = useState<View | null>(null)                   // kept for HomeView interface compat (smart animate replaced the orbit sweep)
  const viewRef = useRef(view)
  const transRef = useRef<{ to: View; timers: number[] } | null>(null) // in-flight transition (also the re-entry lock)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => () => { transRef.current?.timers.forEach(clearTimeout) }, [])
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // Single navigation entry point. The home core is the hub — every view nests inside it:
  //  · home → page: the orbit dot sweeps to the chosen title and locks, then the home zooms up
  //    THROUGH the core (we pass inside) and the page blooms out from the centre.
  //  · page → home: the page collapses into the core, then home is revealed through an expanding
  //    circle-mask (the core opening).
  //  · page → page: the current page collapses to the core, the next blooms out of it.
  const go = useCallback((v: View) => {
    if (v === viewRef.current || transRef.current) return // ignore no-ops + mid-transition clicks
    const from = viewRef.current
    sound.play(v === 'home' ? 'back' : 'transition')
    if (v !== 'home') setHomeOpen(true) // returning home lands on the open circle; leaving stages it
    if (reduceMotion) { viewRef.current = v; setView(v); return }

    const t: { to: View; timers: number[] } = { to: v, timers: [] }
    transRef.current = t
    setNavTarget(v)
    // home → page: smart animate — each destination gets its own visual transition metaphor.
    //   dynamics: portal through the orbital core (scale up from center).
    //   forces:   contract toward the forces focal point (lower-left, where USA's orbit sits).
    //   relations: mirror of forces toward lower-right.
    // page → home: collapse into core, home zooms back in from large scale.
    // page → page: directional slide by bottom-toggle order (RTL: forces=right … dynamics=left).
    const TAB_ORDER: View[] = ['forces', 'relations', 'dynamics']
    let leaveClass: string, enterClass: string, leaveMs: number, enterMs: number
    if (from === 'home') {
      if (v === 'dynamics') {
        leaveClass = 'nav-rail--portal-out';       enterClass = 'nav-rail--portal-in';       leaveMs = 450; enterMs = 600
      } else if (v === 'forces') {
        leaveClass = 'nav-rail--contract-forces';  enterClass = 'nav-rail--bloom-forces';    leaveMs = 480; enterMs = 580
      } else {
        leaveClass = 'nav-rail--contract-relations'; enterClass = 'nav-rail--bloom-relations'; leaveMs = 480; enterMs = 580
      }
    } else if (v === 'home') {
      leaveClass = 'nav-rail--collapse'; enterClass = 'nav-rail--mask'; leaveMs = 460; enterMs = 500
    } else {
      const goingLeft = TAB_ORDER.indexOf(v) > TAB_ORDER.indexOf(from) // target sits further left (RTL)
      leaveClass = goingLeft ? 'nav-rail--out-right' : 'nav-rail--out-left'
      enterClass = goingLeft ? 'nav-rail--in-left'  : 'nav-rail--in-right'
      leaveMs = 420; enterMs = 460
    }

    setRail(leaveClass)
    t.timers.push(window.setTimeout(() => {
      viewRef.current = v; setView(v)
      setRail(enterClass)
      t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, enterMs))
    }, leaveMs))
  }, [reduceMotion])

  useEffect(() => {
    // URL ↔ view (replaceState: no history spam while exploring)
    const want = VIEW_HASH[view]
    if (window.location.hash !== want) history.replaceState(null, '', want || window.location.pathname)
  }, [view])

  // back/forward + hand-edited hashes
  useEffect(() => {
    const onHash = () => { const v = hashToView(window.location.hash); if (v) go(v) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [go])

  // keyboard: 1/2/3 → lenses, Escape → home (overlays consume their own Escape first)
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

  // hand off from the contracting loader to the home — and play the thesis reveal if we land closed
  const onLoaderDone = () => { setLoaded(true); if (!homeOpen) setIntro(true) }

  return (
    <>
      {/* dynamics runs its own floating+connecting starfield in the engine canvas — suppress the
          global field there so the two don't overlap */}
      {view !== 'dynamics' && <GlobalField view={view} />}
      {/* the active view lives in the rail — App animates it through the core on every nav */}
      <div className={`nav-rail${rail ? ' ' + rail : ''}`}>
        {view === 'home' ? <HomeView open={homeOpen} intro={intro} lockTo={lockTo} onToggle={() => setHomeOpen((o) => !o)} onView={go} />
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
