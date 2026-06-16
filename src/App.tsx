import { useCallback, useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import RelationsView from './dynamics/RelationsView'
import ForcesWellView from './dynamics/ForcesWellView'
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
      aria-pressed={muted}
      onClick={() => { sound.start(); setMuted(sound.toggle()) }}
    >
      <span className={`soundtoggle__bars${muted ? ' soundtoggle__bars--off' : ''}`}>
        <i /><i /><i /><i />
      </span>
    </button>
  )
}

const VIEW_HASH: Record<View, string> = { home: '', forces: '#/forces', relations: '#/relations', dynamics: '#/dynamics', well: '#/well' }
const hashToView = (h: string): View | null =>
  h === '#/forces' ? 'forces' : h === '#/relations' ? 'relations' : h === '#/dynamics' ? 'dynamics' : h === '#/well' ? 'well' : h === '' || h === '#/' ? 'home' : null

export default function App() {
  // repeat visits (same session) get a quick loader — the moment, without the wait
  const revisit = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mp-visited') === '1'
  const [loaded, setLoaded] = useState(false)
  const initial = hashToView(window.location.hash) ?? 'home'
  const [homeOpen, setHomeOpen] = useState(initial !== 'home') // deep-linked → the circle is already open
  const [view, setView] = useState<View>(initial)
  const [pending, setPending] = useState<View | null>(null) // target while a page transition runs
  const [revealing, setRevealing] = useState(false)         // overlay crossfading out (reveal phase)
  const viewRef = useRef(view)
  const pendingRef = useRef<View | null>(null)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { pendingRef.current = pending }, [pending])
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // Single navigation entry point. A page change plays a coordinated transition: an iris-collapse
  // overlay covers the swap, the view changes while covered, then the overlay crossfades out as the
  // new view blooms in (its own stageIn). homeOpen is staged here (event path, not an effect).
  const go = useCallback((v: View) => {
    if (v === viewRef.current || pendingRef.current) return // ignore no-ops + mid-transition clicks
    if (v !== 'home') setHomeOpen(true) // so returning home lands on the open circle
    sound.play(v === 'home' ? 'back' : 'transition')
    if (reduceMotion) { setView(v); return }
    setPending(v)
  }, [reduceMotion])

  // transition timeline: cover (collapse) → swap under cover → reveal (crossfade out + bloom)
  useEffect(() => {
    if (pending == null) return
    const COVER = 380, REVEAL = 320
    const swap = window.setTimeout(() => { setView(pending); setRevealing(true) }, COVER)
    const done = window.setTimeout(() => { setPending(null); setRevealing(false) }, COVER + REVEAL)
    return () => { clearTimeout(swap); clearTimeout(done) }
  }, [pending])

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
      else if (e.key === '4') go('well')
      else if (e.key === 'Escape' && !overlayOpen) go('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onLoaderDone = () => { setLoaded(true); try { sessionStorage.setItem('mp-visited', '1') } catch { /* private mode */ } }

  return (
    <>
      <GlobalField view={view} />
      {view === 'home' ? <HomeView open={homeOpen} onToggle={() => setHomeOpen((o) => !o)} onView={go} />
        : view === 'forces' ? <ForcesView view={view} onView={go} />
        : view === 'relations' ? <RelationsView view={view} onView={go} />
        : view === 'well' ? <ForcesWellView view={view} onView={go} />
        : <DynamicsView view={view} onView={go} />}
      {pending != null && <div className={`page-transition${revealing ? ' page-transition--reveal' : ''}`} aria-hidden />}
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
