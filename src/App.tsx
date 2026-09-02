import { useCallback, useEffect, useRef, useState } from 'react'
import LoaderView from './dynamics/LoaderView'
import HomeView from './dynamics/HomeView'
import DynamicsView from './dynamics/DynamicsView'
import ForcesGridView from './dynamics/ForcesGridView'
import RelationsView from './dynamics/RelationsView'
import { CustomCursor } from './dynamics/CustomCursor'
import { GlobalField } from './dynamics/GlobalField'
import { AboutOverlay } from './dynamics/AboutView'
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
// The forces screen IS the ranked grid composition (ForcesGridView). It and the packed force-field
// (ForcesView) ran side by side as a two-composition comparison; the grid was chosen, so the field
// is no longer routed to and the `#/forces-grid` variant hash is retired — `#/forces` resolves
// straight to the grid. ForcesView.tsx is deliberately left in the tree rather than deleted: the
// pick is "for now", and it still carries the only mobile sheet/filter chrome — restoring it is a
// one-line change at the render branch below.
const hashToView = (h: string): View | null =>
  h === '#/forces' ? 'forces' : h === '#/relations' ? 'relations' : h === '#/dynamics' ? 'dynamics' : h === '' || h === '#/' ? 'home' : null

// The orbit dot's dramatic lock-sweep (HomeView's `lockTo`/`LOCK_SWEEP_MS`) rotates all the way to
// the chosen page title before the page transition proceeds — mirrors HomeView's own constant.
const LOCK_SWEEP_MS = 900

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
  // Every navigation that UNMOUNTS the current view's <PanelDock> (page→home, and page→page tab
  // switches) needs the side panel to visibly leave first, matching whatever the rest of the
  // screen is doing — it must never just vanish the instant `view` flips underneath it, since
  // React unmounts it in the same tick `setView` fires with zero warning. `panelExit` is the one
  // signal that drives that: 'home' when leaving to home (chrome fades with it — see chrome-exit
  // below), 'right' when leaving page→page — ALWAYS right, independent of which way the canvas
  // itself is swiping (see the comment at its use site below), since the panel is anchored at the
  // screen's own right edge and retreating that way is its own short, natural motion. It's read by
  // #panel-root's className (panel-root--exiting / panel-root--out-right in views.css) and cleared
  // the instant the new view actually swaps in, so the freshly-mounted panel never inherits a stale
  // exit transform.
  // (page → home specifically: the chrome (header/utility nav/tab bar/sound toggle) and the
  // side-panel content sit OUTSIDE .nav-rail, so they never got caught by the per-body canvas
  // cascade or the nav-rail--mask bloom — they held at full brightness the whole EXIT_MS window,
  // then hard-cut to nothing the instant `view` flipped to 'home'. That abrupt one-frame
  // disappearance (verified via captured video: chrome fully lit one frame, gone the next) was the
  // "crazy jump" — not the ring/canvas motion itself. Sliding + fading them out over the SAME
  // window the per-body cascade uses closes that gap so nothing hard-cuts at the swap instant.)
  const [panelExit, setPanelExit] = useState<'home' | 'right' | null>(null)
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
    // Was: panel + rail both set in the SAME tick, so they always started moving at the same
    // instant — even with the panel's own animation being shorter, starting together is what read
    // as "the whole screen moving as one," not the panel finishing a beat sooner. Genuinely
    // sequencing it means the rail must not even RECEIVE its leave class until the panel's own
    // exit has actually finished: delay → panel exits alone (canvas fully static) → THEN the page
    // swipe begins. PANEL_EXIT_DELAY is the held beat before anything moves; PANEL_EXIT_MS must
    // match .panel-root--out-left/right's own animation-duration in views.css exactly, or this
    // timer fires before (rail starts while panel's still visibly sliding) or after (a dead pause
    // with nothing happening) the panel has actually finished.
    // The panel ALWAYS exits right, regardless of goingLeft — it lives anchored at the screen's
    // right edge (.pdock--closed .pdock__panel already parks further right when closed, forces.css)
    // and retreating that way is its own natural, short motion. Tying it to the canvas's swipe
    // direction instead sent it left on backward navigation (dynamics → relations/forces), dragging
    // it the long way across the whole screen — reported live as "pushed hard to the left... opposite".
    const PANEL_EXIT_DELAY = 80
    const PANEL_EXIT_MS = 600
    t.timers.push(window.setTimeout(() => {
      setPanelExit('right')
      t.timers.push(window.setTimeout(() => {
        setRail(leaveClass)
        t.timers.push(window.setTimeout(() => {
          viewRef.current = v; setView(v); setRail(enterClass); setPanelExit(null)
          t.timers.push(window.setTimeout(() => { setRail(''); setNavTarget(null); transRef.current = null }, enterMs))
        }, leaveMs))
      }, PANEL_EXIT_MS))
    }, PANEL_EXIT_DELAY))
  }, [reduceMotion])

  useEffect(() => {
    const want = VIEW_HASH[view]
    if (window.location.hash !== want) history.replaceState(null, '', want || window.location.pathname)
  }, [view])

  useEffect(() => {
    const onHash = () => {
      const v = hashToView(window.location.hash)
      if (!v) return
      go(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const overlayOpen = !!document.querySelector('.about, .evid')
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
  // Stable identity (useCallback, no deps — setLoaded/setIntro are guaranteed stable by React):
  // LoaderView's own effect depends on `onDone` in its dependency array, so a fresh function
  // reference every App render was resetting that effect's timers (fade/unmount) on every render
  // instead of only once at mount.
  const onLoaderDone = useCallback(() => { setLoaded(true); setIntro(true) }, [])

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
          : view === 'forces' ? <ForcesGridView />
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
      <AboutOverlay />
      {!loaded && <LoaderView onDone={onLoaderDone} />}
    </>
  )
}
