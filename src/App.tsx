import { useCallback, useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesView from './dynamics/ForcesView'
import ForcesGridView from './dynamics/ForcesGridView'
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
  // muted by default — matches SoundEngine's own default (sound.ts) so the UI state and the
  // engine's actual gain agree from the first render, before any user interaction.
  const [muted, setMuted] = useState(true)
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
// `#/forces-grid` is a VARIANT of the forces route, not a fourth tab: the alternate grid
// composition (ForcesGridView) kept alongside the packed field so the two can be compared
// head-to-head. It deliberately stays out of the `View` union — the tab bar, keyboard shortcuts,
// home nav and tab order all keep treating it as "הכוחות", and nothing but the composition changes.
// Drop this constant + FORCES_GRID_HASH's two call sites to retire the experiment.
const FORCES_GRID_HASH = '#/forces-grid'
const hashToView = (h: string): View | null =>
  h === '#/forces' || h === FORCES_GRID_HASH ? 'forces' : h === '#/relations' ? 'relations' : h === '#/dynamics' ? 'dynamics' : h === '' || h === '#/' ? 'home' : null

// The orbit dot's dramatic lock-sweep (HomeView's `lockTo`/`LOCK_SWEEP_MS`) rotates all the way to
// the chosen page title before the page transition proceeds — mirrors HomeView's own constant.
const LOCK_SWEEP_MS = 900

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [intro, setIntro] = useState(false)
  const initial = hashToView(window.location.hash) ?? 'home'
  // which forces composition the '#/forces…' route resolves to — see FORCES_GRID_HASH above
  const [forcesGrid, setForcesGrid] = useState(() => window.location.hash === FORCES_GRID_HASH)
  const [homeOpen, setHomeOpen] = useState(initial !== 'home')
  const [view, setView] = useState<View>(initial)
  const [rail, setRail] = useState('')
  const [navTarget, setNavTarget] = useState<View | null>(null)
  // the choreographed pre-phase of leaving home: wordmark dissolves letter-by-letter, then nav
  // labels fade — BEFORE the ring itself zooms into the void (see HomeView's `leaving` prop).
  const [homeLeaving, setHomeLeaving] = useState(false)
  // Every navigation that UNMOUNTS the current view's <PanelDock> (page→home, and page→page tab
  // switches) needs the side panel to visibly leave first, matching whatever the rest of the
  // screen is doing — it must never just vanish the instant `view` flips underneath it, since
  // React unmounts it in the same tick `setView` fires with zero warning. `panelExit` is the one
  // signal that drives that: 'home' when leaving to home (chrome fades with it — see chrome-exit
  // below), 'left'/'right' when sliding page→page in sync with the rail's own out-left/out-right
  // direction. It's read by #panel-root's className (panel-root--exiting / panel-root--out-left /
  // panel-root--out-right in views.css) and cleared the instant the new view actually swaps in, so
  // the freshly-mounted panel never inherits a stale exit transform.
  // (page → home specifically: the chrome (header/utility nav/tab bar/sound toggle) and the
  // side-panel content sit OUTSIDE .nav-rail, so they never got caught by the per-body canvas
  // cascade or the nav-rail--mask bloom — they held at full brightness the whole EXIT_MS window,
  // then hard-cut to nothing the instant `view` flipped to 'home'. That abrupt one-frame
  // disappearance (verified via captured video: chrome fully lit one frame, gone the next) was the
  // "crazy jump" — not the ring/canvas motion itself. Sliding + fading them out over the SAME
  // window the per-body cascade uses closes that gap so nothing hard-cuts at the swap instant.)
  const [panelExit, setPanelExit] = useState<'home' | 'left' | 'right' | null>(null)
  // home → page: the destination view the orbit dot is sweeping to (see HomeView's `lockTo`) —
  // set the instant `go()` fires so the dot starts its 900ms rotation right away, before any of
  // the wordmark/ring choreography below begins. Cleared once the page has actually swapped in.
  const [lockView, setLockView] = useState<View | null>(null)
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
      // Four beats now: (0) the orbit dot sweeps all the way round to the destination title first
      // (~900ms, `lockView` → HomeView's `lockTo`) — the "rotate to the chosen page title before
      // transitioning to it" behaviour the user asked to bring back. Only once that sweep has
      // visibly landed do the original three beats run: (1) wordmark exits letter-by-letter + nav
      // labels fade (~680ms, driven by `home--leaving`), (2) the ring zooms into the void (~530ms),
      // (3) the page blooms in. Sequential rather than concurrent — a concurrent 900ms sweep would
      // still be mid-flight while the ring is already zoomed/blurred away (the zoom-up phase starts
      // at 680ms), so the landing would never actually be seen; running it first means the dot is
      // the whole show for its own beat, exactly as it used to read.
      // NOTE: `home--leaving` is held on THROUGH the zoom (cleared only at setView, when HomeView
      // unmounts) — releasing it earlier while HomeView is still mounted in its open state would
      // re-arm the wordmark's entrance-reveal on the already-shattered letters, flashing them back.
      setLockView(v)
      t.timers.push(window.setTimeout(() => {
        setHomeLeaving(true)
        t.timers.push(window.setTimeout(() => {
          setRail('nav-rail--zoom-up')
          t.timers.push(window.setTimeout(() => {
            viewRef.current = v; setView(v); setRail('nav-rail--bloom'); setHomeLeaving(false); setLockView(null)
            t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, 580))
          }, 530))
        }, 680))
      }, LOCK_SWEEP_MS))
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
      setPanelExit('home')
      t.timers.push(window.setTimeout(() => {
        viewRef.current = v; setView(v); setRail('nav-rail--mask'); setPanelExit(null)
        // wait out the full railMask tween (0.66s) before clearing the class, so it isn't pulled
        // mid-motion (which would snap the rail off its transform before it has settled to scale 1)
        t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, 700))
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
    // the side panel slides off in lockstep with the rail — same direction, same leaveMs window —
    // so it reads as one coordinated exit instead of the canvas sliding away while the panel just
    // pops out of existence underneath it.
    setPanelExit(goingLeft ? 'right' : 'left')
    t.timers.push(window.setTimeout(() => {
      viewRef.current = v; setView(v); setRail(enterClass); setPanelExit(null)
      t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, enterMs))
    }, leaveMs))
  }, [reduceMotion])

  useEffect(() => {
    // the grid variant keeps its own hash so the comparison URL survives a reload / can be shared
    const want = view === 'forces' && forcesGrid ? FORCES_GRID_HASH : VIEW_HASH[view]
    if (window.location.hash !== want) history.replaceState(null, '', want || window.location.pathname)
  }, [view, forcesGrid])

  useEffect(() => {
    const onHash = () => {
      const v = hashToView(window.location.hash)
      if (!v) return
      setForcesGrid(window.location.hash === FORCES_GRID_HASH)
      go(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [go])

  // A/B toggle between the two forces compositions (see FORCES_GRID_HASH) — fired from the index
  // panel's control row on either screen.
  useEffect(() => {
    const onSwap = () => setForcesGrid((g) => !g)
    window.addEventListener('mp-forces-composition', onSwap)
    return () => window.removeEventListener('mp-forces-composition', onSwap)
  }, [])

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
              lockTo={lockView}
              leaving={homeLeaving}
              onToggle={() => setHomeOpen(o => !o)}
              onView={go}
            />
          : view === 'forces' ? (forcesGrid ? <ForcesGridView /> : <ForcesView />)
          : view === 'relations' ? <RelationsView />
          : <DynamicsView />}
      </div>

      {/* The selected-entity / index side panel lives here — a sibling of .nav-rail, NOT a
          descendant of it, so it is never caught in the page-transition zoom/bloom/collapse/mask
          transforms above. Each view's <PanelDock> portals its content into this node (see
          Chrome.tsx) — it animates in/out on its own terms (slide/fade), independent of the
          page-transition choreography. `panelExit` slides + fades this whole portal container out
          over the same window as whatever the rest of the screen is doing (see its declaration
          above) so it never hard-cuts at the swap instant — for EVERY navigation that unmounts the
          current view, not just the page→home case. */}
      <div id="panel-root" className={`panel-root${panelExit === 'home' ? ' panel-root--exiting' : panelExit ? ` panel-root--out-${panelExit}` : ''}`} />

      {/* chrome (header/utility nav/tab bar/sound toggle) — wrapped so leaving home can fade it
          out together with the panel above, instead of it holding full-bright then hard-cutting
          the instant `view` flips to 'home' (see the comment by `panelExit`'s declaration). Only
          the home-exit case touches chrome — it stays static (no transform) through page→page
          slides, since the header/tabs are persistent chrome across tabs, not part of the canvas. */}
      {view !== 'home' && (
        <div className={`chrome-exit${panelExit === 'home' ? ' chrome-exit--out' : ''}`}>
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
