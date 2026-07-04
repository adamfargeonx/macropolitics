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
  // the choreographed pre-phase of leaving home: wordmark dissolves letter-by-letter, then nav
  // labels fade — BEFORE the ring itself zooms into the void (see HomeView's `leaving` prop).
  const [homeLeaving, setHomeLeaving] = useState(false)
  // page → home: the chrome (header/utility nav/tab bar/sound toggle) and the side-panel content
  // (portaled into #panel-root) sit OUTSIDE .nav-rail, so they never got caught by the per-body
  // canvas cascade or the nav-rail--mask bloom — they held at full brightness the whole EXIT_MS
  // window, then hard-cut to nothing the instant `view` flipped to 'home'. That abrupt one-frame
  // disappearance (verified via captured video: chrome fully lit one frame, gone the next) was the
  // "crazy jump" — not the ring/canvas motion itself. Fading them out over the SAME window the
  // per-body cascade uses closes that gap so nothing hard-cuts at the swap instant.
  const [homeExiting, setHomeExiting] = useState(false)
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

    if (from === 'home') {
      // Three beats: (1) wordmark exits letter-by-letter + nav labels fade (~680ms, driven by
      // `home--leaving`), (2) the ring zooms into the void (~530ms), (3) the page blooms in.
      // NOTE: `home--leaving` is held on THROUGH the zoom (cleared only at setView, when HomeView
      // unmounts) — releasing it earlier while HomeView is still mounted in its open state would
      // re-arm the wordmark's entrance-reveal on the already-shattered letters, flashing them back.
      setHomeLeaving(true)
      t.timers.push(window.setTimeout(() => {
        setRail('nav-rail--zoom-up')
        t.timers.push(window.setTimeout(() => {
          viewRef.current = v; setView(v); setRail('nav-rail--bloom'); setHomeLeaving(false)
          t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, 580))
        }, 530))
      }, 680))
      return
    }

    if (v === 'home') {
      // Page → home: a STAGGERED per-body exit, not the old whole-rail collective zoom-out.
      // We signal the live view (Forces field / Relations web / Dynamics orrery) to play its own
      // cascade — each state/body shrinks + fades out individually, one after another — via the
      // `mp-exit` window event (mirroring the established `mp-freeze`/`mp-unfreeze` pattern the
      // engines already listen for). The rail itself holds still (no transform) through the
      // cascade so the per-body motion reads clearly; only once it has played out do we swap to
      // home and let it bloom in (nav-rail--mask, the same gentle arrival as before). EXIT_MS is
      // tuned to match the cascade window in the engines/CSS (SPREAD ~360 + per-body ~300).
      // NOTE: clicking the header logo fires `mp-freeze` on hover first, so the canvas engines are
      // frozen at this point — each engine's playExit() unfreezes itself so the cascade can run.
      const EXIT_MS = 680
      window.dispatchEvent(new Event('mp-exit'))
      setHomeExiting(true)
      t.timers.push(window.setTimeout(() => {
        viewRef.current = v; setView(v); setRail('nav-rail--mask'); setHomeExiting(false)
        t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, 520))
      }, EXIT_MS))
      return
    }

    // page → page: directional slide
    const TAB_ORDER: View[] = ['forces', 'relations', 'dynamics']
    const goingLeft = TAB_ORDER.indexOf(v) > TAB_ORDER.indexOf(from)
    const leaveClass = goingLeft ? 'nav-rail--out-right' : 'nav-rail--out-left'
    const enterClass = goingLeft ? 'nav-rail--in-left' : 'nav-rail--in-right'
    const leaveMs = 420, enterMs = 460
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

  // The thesis is a permanent fixture of the CLOSED home state, not a one-time load flag — set it
  // once the loader finishes regardless of which route the session started on. (Previously this
  // was gated by `!homeOpen`, so a session that started on a page — homeOpen initializes true —
  // never armed it; returning to a cold, closed home later then showed no thesis at all.)
  // HomeView's own `showThesis = intro && !open` already decides visibility from the ring's state.
  const onLoaderDone = () => { setLoaded(true); setIntro(true) }

  return (
    <>
      {view !== 'dynamics' && <GlobalField view={view} />}

      <div className={`nav-rail${rail ? ' ' + rail : ''}`}>
        {view === 'home'
          ? <HomeView
              open={homeOpen}
              intro={view === 'home' ? intro : false}
              lockTo={null}
              leaving={homeLeaving}
              onToggle={() => setHomeOpen(o => !o)}
              onView={go}
            />
          : view === 'forces' ? <ForcesView />
          : view === 'relations' ? <RelationsView />
          : <DynamicsView />}
      </div>

      {/* The selected-entity / index side panel lives here — a sibling of .nav-rail, NOT a
          descendant of it, so it is never caught in the page-transition zoom/bloom/collapse/mask
          transforms above. Each view's <PanelDock> portals its content into this node (see
          Chrome.tsx) — it animates in/out on its own terms (slide/fade), independent of the
          page-transition choreography. `homeExiting` fades its portaled content out over the same
          window as the canvas cascade (see the comment by its declaration above) so it doesn't
          hard-cut at the swap instant. */}
      <div id="panel-root" className={`panel-root${homeExiting ? ' panel-root--exiting' : ''}`} />

      {/* chrome (header/utility nav/tab bar/sound toggle) — wrapped so `homeExiting` can fade it
          out together with the panel above, instead of it holding full-bright then hard-cutting
          the instant `view` flips to 'home' (see the comment by `homeExiting`'s declaration). */}
      {view !== 'home' && (
        <div className={`chrome-exit${homeExiting ? ' chrome-exit--out' : ''}`}>
          <Header onHome={() => go('home')} />
          <UtilityNav />
          <TabBar view={navTarget ?? view} onView={go} />
          <SoundToggle />
        </div>
      )}
      <CustomCursor />
      <Legend view={view} />
      <AboutOverlay />
      <EvidenceOverlay />
      {!loaded && <LoaderView onDone={onLoaderDone} />}
    </>
  )
}
