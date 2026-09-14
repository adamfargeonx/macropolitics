// OrbitalField — /dynamics measured multi-centre orrery with a zoom/pan camera.
// Bodies orbit anchors (C/W/AW/EG) or planets at measured radius + signed angular velocity.
// World space ≈ original px; a camera (zoom default 1.4, pan) maps world → screen.
// The particle starfield lives in SCREEN space (interactive background, unaffected by camera).

import { NODES, LINKS, ANCHORS, RINGS, AXES, AXIS, POWER_NOTES, powerSize, type Entity } from '../data/entities'
import { AUTHORED_RELATIONS } from '../data/relations'
import { isInteractive } from '../sound'

const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
const WHITE = '255,255,255'
const DARK = '11,0,36'
const D2R = Math.PI / 180
const TAU = Math.PI * 2

const DEFAULT_ZOOM = 0.85 // the default framed view
const FOCUS_ZOOM = 1.35 // gentle zoom-in when a body is selected
const CAM_DUR = 600 // ms — camera tween duration (pan + zoom), ease-out-expo
// A beat of stillness before the orrery starts revealing itself — the whole entrance (rings,
// bodies, starfield fade-in) is driven off `t = (now - this.start)/1000`, so simply pushing
// `start` this far into the future holds every one of those at its t<=0 (i.e. zero) state for
// the delay, then lets the existing entrance timing play out exactly as before. Landing on a
// screen that's already mid-motion read as arriving late to something; a short held beat first
// gives the view a moment to be SEEN before it starts moving.
const INTRO_DELAY_MS = 500

// ── Depth / drill-down layer (Tasks 14 + 15) ──
// One coherent "insight" system: when the camera pushes past INSIGHT_ZOOM onto a focused body it
// fades in that body's labelled orbital children + a "what you're looking at" note AND its 1–2
// strongest authored relations as small sidenote captions placed beside the partner bodies — the
// "dynamic ties" reward for drilling into a body. All fade their alpha off the same insight zoom
// gate so the default frame stays clean. (An earlier drift-proximity caption mechanic was removed:
// it gated on zoom-IN *and* on-screen closeness, but zooming in pushes bodies apart on screen, so
// the two conditions were mutually exclusive and it never fired.)
// ── Page-exit cascade — on `mp-exit` (leaving to home) each orbiting body plays its OWN staggered
// shrink+fade so the orrery empties body-by-body rather than the whole rail zooming out. Ranked
// strong→weak. Kept in sync with App.tsx's EXIT_MS and the Forces/Relations cascades.
const EXIT_SPREAD = 360 // ms window over which bodies begin leaving
const EXIT_BODY_DUR = 300 // ms each body takes to vanish

const INSIGHT_ZOOM = 1.7 // zoom at which the focused-body insight layer begins to reveal
const INSIGHT_FADE = 0.55 // zoom span over which it fades fully in (→ 2.25)
// LABEL SWAP (matches RelationsView.tsx's POLE_HE and Chrome.tsx's POLE — direct feedback, not a
// naming preference): `t`/`f` keep their field meaning, only the Hebrew word was wrong. מתח
// (tension) = opposing interests/complicated relations, no direct confrontation. חיכוך (friction)
// = direct clashes, force, open confrontation. `t` is open hostility → חיכוך; `f` is the
// non-confrontational middle → מתח. POLE_COL is unaffected — it's keyed by field, and warm-for-`t`
// (open hostility) still reads correctly under the corrected label.
const POLE_HE: Record<'t' | 'f' | 'h', string> = { t: 'חיכוך', f: 'מתח', h: 'הרמוניה' }
const POLE_COL: Record<'t' | 'f' | 'h', string> = { t: '214,120,96', f: '150,150,160', h: YELLOW }

// ── Tunable visual config (set a flag false / value 0 to revert that piece) ──
// Relations & dynamics are conveyed through orbital placement and proximity ONLY —
// no drawn lines between bodies. There are no zoom tiers; the camera only frames the field
// and eases toward a focused body on selection.
const VISUALS = {
  allegianceRim: true, // whisper-subtle temperature rim by bloc
  rimAlpha: 0.4,
  nonStateHollow: true, // non-state actors render hollow (taxonomy)
  greatCorona: true, // superpowers get a faint corona ring
  speedScale: 0.62, // calm the motion (1 = original measured speeds)
}
// ── Warp streaks — the zoom effect ───────────────────────────────────────────────────────────
// While the camera is MOVING, background stars stretch into radial lines pointing at the zoom
// anchor; when it stops they are points again within a few frames. Deliberately transient: the
// map's structure (bodies, orbit rings, labels, sizes) is never touched, so this cannot reshape
// the orbital concept the way a persistent layer would. The starfield is the only surface here
// that carries no argument — nothing in the model depends on it — which is exactly why it is the
// one place an effect can be loud without costing meaning.
//
// The streak is SYNTHESISED — draw-position only, from scroll intensity (see WARP.deadEnergy) —
// rather than falling out of geometry: the starfield is screen-space and camera-independent by
// design (see the file header), so stars do not actually move when the camera zooms. That is what
// makes this an effect rather than a consequence.
//
// Set `on: false` to revert the feature entirely (same flag idiom as VISUALS above).
const WARP = {
  on: true,
  // Streak MAGNITUDE is driven by `wheelEnergy` (below), NOT by zoom velocity. Measured both:
  // zoomVel spikes to ~5.5 on a single isolated wheel tick and ~3.7 during the smooth 600ms
  // body-focus tween — nearly the SAME range — because it is dominated by how big one tick's
  // jump is, not by how fast the user is actually scrolling. Driving the streak from it made
  // every star peg to maxLen on almost any input, single tick included: no graduation, no "wow".
  // wheelEnergy is what the WHEEL comment already describes as the real speed signal (it
  // accumulates over SUSTAINED input and decays over TIME, regardless of one event's size).
  // Measured: a single tick and a slow, spaced-out scroll both land at energy ≈ 88–93; a real
  // flick lands at 210–550. `deadEnergy` sits in the gap between those two clusters.
  deadEnergy: 120, // wheelEnergy below this reads as "not really scrolling" — draws no streak
  // Response curve applied to the 0..1 energy ramp before it becomes length. LINEAR (the original)
  // meant a merely-moderate scroll already drew most of the effect: at energy 240 — a casual
  // half-speed scroll — a mid-field star measured ~105px of streak, and at full energy nearly
  // every star outside the centre pegged the ceiling, so the field went to hard lines on almost
  // any real input. Reported as too harsh. Squaring it keeps the SAME ceiling for a genuine flick
  // while collapsing the bottom half of the range (0.4 raw → 0.16 applied), so a gentle scroll is
  // a hint and only deliberate speed earns the full effect — which is what makes it read as
  // responding to intensity rather than to merely having scrolled at all.
  curve: 2,
  spread: 0.3, // distance-from-anchor lengthens a streak (perspective feel)
  minLen: 1.2, // px below which a star draws as a dot instead — avoids 1px "dashes" at rest
  // 64, was 150: at 150 the cap was reached by most of the field at once, which flattened the
  // perspective the `spread`/`dep` terms exist to create — every streak the same maximum length
  // reads as a wall, not a dive. Lower ceiling keeps the graduation visible across the field.
  maxLen: 64,
  // zoomVel is still used, but ONLY for its SIGN (streak points outward while zooming in, inward
  // while zooming out) — smoothed so the sign doesn't flicker for one frame at the tail of decay.
  attack: 0.55,
  release: 0.12,
}

// ── Scroll-speed sensitivity ─────────────────────────────────────────────────────────────────
// A deliberate fast scroll should punch through zoom levels; a single considered tick should stay
// precise. `wheelEnergy` is a time-decayed accumulator of recent |deltaY| rather than an
// instantaneous deltaY/dt: instantaneous rate is hopeless across devices (a mouse wheel emits one
// ~100-unit notch with long gaps, a trackpad emits a stream of small deltas), whereas accumulated
// scroll over a short window means the same thing on both.
const WHEEL = {
  // Retuned after measuring the FIRST attempt against a realistic sustained scroll (not just one
  // isolated tick, which is what got tuned/verified the first time round): base 0.0014 / maxGain
  // 2.4 let a normal ~10-notch, ~300ms scroll — a casual "give it a spin", not a deliberate flick
  // — rocket target zoom from 0.4 straight to the 4.0 ceiling. ZOOM_EASE's per-tick damping was
  // real (verified: a consistent 0.1–0.6 lag between zoom and target throughout that scroll) but
  // completely invisible against a target racing the ENTIRE range in 300ms — the acceleration
  // feature (added earlier for scroll-speed sensitivity) was dominating the weighted-feel fix
  // added after it. Lower base slows the WHOLE system, not just fast scrolling, so a single tick
  // is also gentler now (was ~15% zoom change per notch, now ~6%). Lower maxGain keeps fast-vs-
  // slow scrolling meaningfully different without letting a casual scroll outrun the damping
  // again. Simulated before shipping (not re-guessed blind a second time): single tick 1.0→1.01,
  // 10-tick/300ms scroll 1.0→1.5, 20-tick/600ms sustained scroll 1.0→3.1 — gentle by default,
  // still reaches full zoom on a genuinely sustained scroll, just not inside one casual flick.
  base: 0.0005,
  maxGain: 1.5, // multiplier at full energy
  ref: 420, // accumulated |deltaY| that counts as "full speed"
  tau: 120, // ms decay constant for the accumulator
}
// Per-frame catch-up rate for `zoom`/`pan` toward `targetZoom`/`targetPan` (see the fields'
// own comment for why this exists at all). Same flat, non-dt-corrected per-frame idiom already
// used throughout this file (particle drift 0.035, focused-pan-follow 0.12) — assumes ~60fps.
// Lowered alongside WHEEL (see its comment): 0.08 settles a jump in ~440ms, meaningfully heavier
// than the first attempt's 0.22 (~200ms) — needed to actually read as weighted once WHEEL itself
// stopped drowning it out. Raise toward 0.04 for heavier still, toward 0.22+ for snappier.
const ZOOM_EASE = 0.08

// ── Zoom-driven label LOD — at DEFAULT_ZOOM the field reads as pure shape/scale; names ease in
// as the camera pushes in, biggest bodies first so the reveal feels like a cartographic zoom
// rather than a light switch. Each kind gets its own start point + fade span over `this.zoom`.
const LABEL_ZOOM_LOD: Record<Entity['kind'], { start: number; span: number }> = {
  great: { start: DEFAULT_ZOOM, span: 0.22 },
  regional: { start: DEFAULT_ZOOM + 0.06, span: 0.24 },
  intermediate: { start: DEFAULT_ZOOM + 0.14, span: 0.26 },
  edge: { start: DEFAULT_ZOOM + 0.14, span: 0.26 },
  nonstate: { start: DEFAULT_ZOOM + 0.24, span: 0.3 },
}
// ── Zoom-driven orbit prominence — rings are near-invisible at the default frame and gain
// opacity + weight as the camera pushes in, so depth reads as "coming into focus" not a toggle.
const ORBIT_ZOOM_RANGE = 0.5 // zoom span (from DEFAULT_ZOOM) over which prominence ramps to full
const ORBIT_ZOOM_BOOST = 0.65 // extra opacity multiplier at full ramp
const ORBIT_ZOOM_WIDTH_BOOST = 0.6 // extra stroke width (px) at full ramp
// Muted bloc temperatures — read as warm/cool, not "team colors"
const AXIS_COLOR: Record<string, string> = {
  west: '132,160,196', // cool steel
  east: '198,134,98', // warm terracotta
  neutral: '150,150,160', // grey
  none: '120,120,128', // faint grey
}

// `power` is the body's CURRENT (animated) gravity; `powerTarget` is where it's headed. Keeping
// them separate from `sr` (the per-frame screen radius, which also depends on zoom) lets the score
// ease between scenarios/years while the radius still recomputes against the live camera each frame.
interface NodeState { e: Entity; wx: number; wy: number; sx: number; sy: number; sr: number; appear: number; pulse: number; power: number; powerTarget: number; exitDelay: number; exitP: number; bloom: number }

const idIndex = new Map(NODES.map((n, i) => [n.id, i]))
// Authored relations indexed BY BODY, precomputed once. Drives the drill-down relation sidenotes
// ("dynamic ties", Task 15): when a body is focused and the camera is zoomed in, we look up that
// body's relations, rank by dominant-pole strength, and caption its 1–2 strongest beside the
// partner. Each entry: the partner's node index, the dominant pole, its `why` line, and the pole
// strength used for ranking. Both directions of every authored pair are registered.
const RELATIONS_BY_BODY = (() => {
  const m = new Map<string, { ib: number; dom: 't' | 'f' | 'h'; why: string; strength: number }[]>()
  for (const r of AUTHORED_RELATIONS) {
    if (!idIndex.has(r.pair[0]) || !idIndex.has(r.pair[1])) continue
    const dom: 't' | 'f' | 'h' = r.t >= r.f && r.t >= r.h ? 't' : r.f >= r.h ? 'f' : 'h'
    const strength = Math.max(r.t, r.f, r.h)
    const push = (self: string, other: string) => {
      const arr = m.get(self) ?? []
      arr.push({ ib: idIndex.get(other)!, dom, why: r.why, strength })
      m.set(self, arr)
    }
    push(r.pair[0], r.pair[1]); push(r.pair[1], r.pair[0])
  }
  for (const arr of m.values()) arr.sort((a, b) => b.strength - a.strength)
  return m
})()
const neighbors = (() => {
  const m = new Map<string, Set<string>>(NODES.map((n) => [n.id, new Set<string>()]))
  for (const [a, b] of LINKS) { m.get(a)?.add(b); m.get(b)?.add(a) }
  return m
})()
const ORDER = (() => {
  const order: number[] = []; const done = new Set(Object.keys(ANCHORS))
  const left = NODES.map((_, i) => i); let guard = 0
  while (left.length && guard++ < 12) {
    for (let i = left.length - 1; i >= 0; i--) {
      if (done.has(NODES[left[i]].parent)) { order.push(left[i]); done.add(NODES[left[i]].id); left.splice(i, 1) }
    }
  }
  return order.concat(left)
})()
const PRI: Record<string, number> = { great: 0, regional: 1, intermediate: 2, edge: 3, nonstate: 4 }

// Each node's ring index (0–5 matching RINGS order; RINGS.length = orphan, appears last).
// Nodes sharing a ring appear together; rings reveal sequentially (per-orbit staggered entrance).
const NODE_RING: Map<string, number> = new Map()
for (const n of NODES) {
  if (n.parent === 'C') {
    const ri = RINGS.findIndex(r => r.around === 'C' && r.r === n.R)
    NODE_RING.set(n.id, ri >= 0 ? ri : RINGS.length)
  } else {
    const ri = RINGS.findIndex(r => r.around === n.parent)
    NODE_RING.set(n.id, ri >= 0 ? ri : RINGS.length)
  }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (t: number) => clamp(t, 0, 1)

// Greedy word-wrap for canvas Hebrew captions — splits on spaces to fit within maxW.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

export class OrbitalField {
  private ctx: CanvasRenderingContext2D
  private w = 0; private h = 0; private dpr = 1
  // The canvas's OWN buffer/CSS box — only ever changes inside resizeBuffer, and only THIS pair
  // (never w/h above) is safe to clear against every frame. See resize's own comment for why the
  // two are no longer the same thing during a panel-open/close transition.
  private bufW = 0; private bufH = 0
  private nodes: NodeState[]
  private labelOrder: NodeState[]
  private nearBuf: OrbitalField['particles'] = [] // reused scratch for mouse-proximate particles (no per-frame alloc)
  private placedBuf: { x: number; y: number; w: number; h: number }[] = [] // reused scratch for label de-collision
  private world = new Map<string, { x: number; y: number }>()
  // camera — pan + wheel adjust the framed system; selecting a body eases the camera to centre it
  zoom = DEFAULT_ZOOM
  private pan = { x: 0, y: 0 }
  // ── Weighted wheel/pinch zoom — `zoom`/`pan` above are what's ACTUALLY applied and drawn every
  // frame; `targetZoom`/`targetPan` are where a direct setZoom() call (wheel or pinch) wants to
  // end up. stepCamera() eases the former toward the latter every frame instead of setZoom writing
  // `zoom`/`pan` directly. This exists because mouse and trackpad feel completely different for a
  // reason that has nothing to do with intent: a mouse wheel emits a FEW LARGE discrete notches
  // (~100-120 deltaY each, one per physical click), a trackpad emits MANY SMALL continuous ones —
  // so trackpad's "heavy" feel was never deliberate easing, it was just fine-grained input landing
  // across many frames. Applying every notch instantly (the old behaviour) made mouse read as an
  // abrupt snap. Damping the CATCH-UP, not the input, fixes both at once: a single big mouse jump
  // now visibly travels over several frames like a real camera move, while trackpad's already-
  // gradual target barely changes this — the eased-follow was already keeping up with it.
  private targetZoom = DEFAULT_ZOOM
  private targetPan = { x: 0, y: 0 }
  // camera tween (pan + zoom) — recenters on a focused body, or eases back to the default frame
  private cam: { fromZoom: number; toZoom: number; fromPan: { x: number; y: number }; toPan: { x: number; y: number }; t0: number; dur: number } | null = null
  private focusedBody: string | null = null
  // ── Warp-streak state — see the WARP config for what this is. `zoomVel` is a SMOOTHED rate of
  // change of `zoom` (units/sec), not the raw per-frame delta: raw delta is spiky (several wheel
  // events can land in one animation frame) and would make the streak length flicker frame to
  // frame instead of reading as one continuous burst. Attack is fast (a flick must tear
  // immediately) and release is slow (~250ms) so it relaxes rather than snapping off.
  // `zoomAnchor` is null between zooms and falls back to the field centre in drawStars — wheel/
  // pinch zoom set it to the cursor/midpoint (setZoom's towardX/Y); a body-focus or reset-view
  // tween never calls setZoom directly, so those radiate from centre, which is the correct default
  // for a camera move the user didn't point anywhere.
  private prevZoom = DEFAULT_ZOOM
  private zoomVel = 0
  private zoomAnchor: { x: number; y: number } | null = null
  private lastFrameT = 0
  // Time-decayed accumulator of recent |deltaY| — see the WHEEL config for why accumulated energy,
  // not instantaneous deltaY/dt, is what "scroll speed" has to mean across a mouse wheel (one
  // ~100-unit notch, long gaps) and a trackpad (a stream of small deltas) alike.
  private wheelEnergy = 0
  // particles (screen space) — `dep` is a per-star depth/parallax factor for the warp streak
  // length (closer stars tear further), unrelated to and never influenced by any body's mass —
  // see the flatness contract in the WARP comment for why that distinction matters here.
  private particles: { x: number; y: number; vx: number; vy: number; dx: number; dy: number; size: number; b: number; dep: number }[] = []
  private click: { x: number; y: number; t: number } | null = null
  private readonly linkDist = 104
  private readonly mouseR = 160
  // interaction
  private labels = new Map<string, HTMLElement>()
  private mouse = { x: -9999, y: -9999 }
  private down: { x: number; y: number } | null = null
  private dragging = false
  // touch: track active pointers for two-finger pinch-zoom
  private pointers = new Map<number, { x: number; y: number }>()
  private pinch: { dist: number; zoom: number } | null = null
  private hovered: string | null = null
  private selected: string | null = null
  // ids the canvas insight layer is currently labelling — updateLabels() hides their DOM label so
  // the drilled-in canvas name is the single source (no double labels while zoomed in).
  private insightChildren = new Set<string>()
  private hoverSince = 0
  private connected = new Set<string>()
  private start = 0; private raf = 0; private now = 0
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private reduced: boolean
  private noStarfield: boolean
  onHover?: (id: string | null, screen: { x: number; y: number } | null) => void
  onSelect?: (id: string | null) => void
  onZoom?: (z: number) => void

  constructor(canvas: HTMLCanvasElement, container: HTMLElement, opts: { noStarfield?: boolean } = {}) {
    this.canvas = canvas
    this.container = container
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('OrbitalField: 2D canvas context unavailable')
    this.ctx = ctx
    this.noStarfield = opts.noStarfield ?? false
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.nodes = NODES.map((e, i) => ({ e, wx: 0, wy: 0, sx: 0, sy: 0, sr: 0, appear: 0, pulse: (i * 1.7) % TAU, power: e.power, powerTarget: e.power, exitDelay: 0, exitP: 0, bloom: 1 }))
    this.labelOrder = [...this.nodes].sort((a, b) => PRI[a.e.kind] - PRI[b.e.kind])
    // The initial sizing runs the real buffer rebuild directly, not the debounced `resize` below —
    // there's no previously-drawn bitmap yet for the CSS-stretch tier to fall back on, so going
    // through the 120ms debounce would leave the canvas at its default (near-zero) size that long.
    this.resizeBuffer()
    // Re-measure when the CONTAINER changes width, not only the window: the field yields the side
    // dock's column while the panel is open (body:has(.pdock--open), forces.css). Without this the
    // canvas keeps its full-width backing store and the composition stays centred behind the panel.
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.container)
    this.container.addEventListener('pointermove', this.onMove)
    this.container.addEventListener('pointerleave', this.onLeave)
    this.container.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
  }

  registerLabel(id: string, el: HTMLElement | null) { if (el) this.labels.set(id, el); else this.labels.delete(id) }

  // Push live gravity in — the Scenario Sandbox (weights) and the Time Axis (year) drive this.
  // Only the target moves; resolve() eases each body's `power` toward it, so the constellation
  // re-equilibrates (bodies grow/shrink, proxies follow their patron's backing) rather than snapping.
  setGravities(grav: Map<string, { power: number }>) {
    for (const ns of this.nodes) {
      const p = grav.get(ns.e.id)?.power
      if (p != null) ns.powerTarget = p
    }
  }

  // The orrery is composed against the FULL canvas, with the side panel floating over it. It used
  // to reserve a ~400px right gutter and centre on whatever was left, which pushed the whole system
  // off-centre and left a dead column on the right whenever the dock was closed.
  private get cx() { return this.w / 2 }
  private get cy() { return this.h / 2 }
  private get maxR() { return Math.min(this.w, this.h) * 0.5 }
  // Bodies may pass under the panel — they still read as shapes through the scrim. CAPTIONS can't:
  // text under the panel is simply lost. So text placement, and ONLY text placement, still keeps
  // clear of the panel's column. This is never the composition's centre.
  private get captionW() { return this.w > 760 ? Math.max(this.w - Math.min(400, this.w * 0.3), this.w * 0.6) : this.w }
  private get viewScale() { return this.maxR / 520 } // world px → screen px at zoom 1

  // Reassigning canvas.width/height (inside resizeBuffer below) always wipes the canvas to fully
  // transparent — that's how the element works, not a bug in this file. The side dock's slide
  // (forces.css: `transition: right 0.66s`) means the ResizeObserver below fires on every
  // intermediate frame of that transition, not once at the end — measured live, 13 separate
  // firings over one 660ms panel-open. Rebuilding the actual buffer on every one of those blanked
  // the whole scene (stars, orbiting bodies) repeatedly until the next drawn frame caught up,
  // reported as "the screen blacking out" every time the side panel opens.
  //
  // Two things went wrong chasing that fix before landing here:
  //  1. Updating the canvas's own CSS box size on every tick (while debouncing the buffer
  //     rebuild) made the browser continuously STRETCH the still-old-resolution bitmap to fit a
  //     new box every tick — reported live as the scene "morphing and stretching".
  //  2. Freezing EVERYTHING (this.w/this.h included) until the debounced settle avoided both the
  //     wipe and the stretch, but the composition doesn't read from anything BUT this.w/this.h —
  //     the constructor's own comment even documents why live tracking exists ("the field yields
  //     the side dock's column... without this the composition stays centred behind the panel"),
  //     so freezing it meant the whole scene sat static for the full ~0.66s and then SNAPPED to
  //     its new layout in one frame the instant the debounce fired — reported as still stretching
  //     (a sudden resize/reposition of every body at once reads the same as a stretch would).
  //
  // The actual fix: keep this.w/this.h tracking the container LIVE, every tick — that's what
  // cx/cy/viewScale/every body's screen position derive from, so the composition keeps recentring
  // smoothly in step with the panel's own slide, exactly as intended. What must NOT happen on
  // every tick is touching the canvas ELEMENT itself (its buffer resolution or CSS box) — that's
  // the only thing that actually wipes drawn content or stretches a bitmap, and it's debounced
  // below same as before. The one thing that changes: clearRect (frame(), below) must clear
  // against the BUFFER's own still-fixed size (bufW/bufH), not the live-shrinking this.w/this.h —
  // otherwise each frame only wipes the CURRENT (shrinking) rect, leaving a stale, never-cleared
  // strip of old pixels in the region the composition has already recentred away from.
  private resizeTimer = 0
  resize = () => {
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
    window.clearTimeout(this.resizeTimer)
    this.resizeTimer = window.setTimeout(this.resizeBuffer, 120)
  }

  private resizeBuffer = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    // clientWidth/Height are LAYOUT metrics — immune to the .stage entrance transform (scale),
    // unlike getBoundingClientRect(). Reading the rect during stageIn was giving stale, shrunken
    // dims for the whole session → the "offset / can't hover" bug. This reads true size always.
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
    this.bufW = this.w; this.bufH = this.h
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.seedStars()
  }

  // camera transforms
  private toScreen(wx: number, wy: number) {
    const s = this.viewScale * this.zoom
    return { x: this.cx + this.pan.x + wx * s, y: this.cy + this.pan.y + wy * s }
  }
  private toWorld(sx: number, sy: number) {
    const s = this.viewScale * this.zoom
    return { x: (sx - this.cx - this.pan.x) / s, y: (sy - this.cy - this.pan.y) / s }
  }

  setZoom(z: number, towardX?: number, towardY?: number) {
    // Guard: a container that is mounted but not yet laid out has w/h 0, so maxR and viewScale are
    // 0 too. toWorld() then divides by zero → ±Infinity, and `wbefore.x * s` is Infinity×0 = NaN,
    // which lands in `pan`. That corruption is PERMANENT and total: every later toScreen() returns
    // NaN, so no body or ring ever projects again and the field stays blank until a reload. Since
    // pan starts finite and setZoom is the only writer that can introduce a non-finite value (every
    // other camera path multiplies by `s` — at 0 that is a harmless pan of 0), this one check is
    // what keeps `pan` finite for the whole lifetime of the engine.
    // Placed before `cam = null` so a zoom that never happened cannot cancel an in-flight tween,
    // and written `!(x > 0)` rather than `x <= 0` so a NaN viewScale is caught rather than passed.
    if (!(this.viewScale > 0)) return
    this.cam = null // a direct zoom (wheel) cancels any in-flight camera tween
    const tx = towardX ?? this.cx, ty = towardY ?? this.cy
    // an explicit toward-point (wheel/pinch) becomes the warp streak's radiating point; an
    // implicit centre zoom (zoomBy with no anchor) leaves it untouched rather than re-centring it.
    if (towardX != null && towardY != null) this.zoomAnchor = { x: towardX, y: towardY }
    // anchor against the CURRENT (actual, possibly still mid-catch-up) camera — "the world point
    // under the cursor right now", which is what a user pointing at something on screen means,
    // not wherever a previous target was heading.
    const wbefore = this.toWorld(tx, ty)
    this.targetZoom = clamp(z, 0.4, 4)
    const s = this.viewScale * this.targetZoom
    this.targetPan.x = tx - this.cx - wbefore.x * s
    this.targetPan.y = ty - this.cy - wbefore.y * s
    // NOT this.onZoom?.(this.zoom) here — `zoom` hasn't moved yet at this point (only the target
    // has); stepCamera's catch-up step below fires it every frame with the real, current value.
  }
  zoomBy(f: number) { this.setZoom(this.zoom * f) }

  // Start a smooth pan+zoom tween toward a target camera state (ease-out-expo, ~600ms).
  private tweenCamera(toZoom: number, toPan: { x: number; y: number }) {
    this.cam = {
      fromZoom: this.zoom, toZoom: clamp(toZoom, 0.4, 4),
      fromPan: { x: this.pan.x, y: this.pan.y }, toPan,
      t0: this.now || performance.now(), dur: this.reduced ? 0 : CAM_DUR,
    }
    // keep the wheel-eased target in sync with the tween's destination — otherwise the INSTANT
    // this tween finishes, stepCamera's catch-up step would see a STALE wheel target (wherever it
    // was before this tween started) and yank the camera straight back toward it next frame.
    this.targetZoom = this.cam.toZoom
    this.targetPan = { ...toPan }
  }

  // Recenter the clicked body to the viewport centre with a gentle zoom-in. Computes the pan that
  // places the body's world position at the field centre at FOCUS_ZOOM, then tweens there.
  focusOn(id: string) {
    const idx = idIndex.get(id); if (idx == null) return
    this.focusedBody = id
    const ns = this.nodes[idx]
    const s = this.viewScale * FOCUS_ZOOM
    this.tweenCamera(FOCUS_ZOOM, { x: -ns.wx * s, y: -ns.wy * s })
  }

  // Ease back to the default framed view (centred, default zoom).
  resetView() { this.focusedBody = null; this.tweenCamera(DEFAULT_ZOOM, { x: 0, y: 0 }) }

  // Advance the camera tween, if any. Tracks a focused body so its drift keeps it centred.
  private stepCamera() {
    if (this.focusedBody) {
      // keep the orbiting body centred as it moves: retarget the pan toward its live world position
      const idx = idIndex.get(this.focusedBody)
      if (idx != null && (!this.cam || this.cam.toZoom === FOCUS_ZOOM)) {
        const ns = this.nodes[idx]
        // keep the body centred at the CURRENT zoom — so wheel-zooming into a focused body (the
        // drill-down of Task 14) is honoured instead of being snapped back to FOCUS_ZOOM each frame.
        const s = this.viewScale * this.zoom
        const targetPan = { x: -ns.wx * s, y: -ns.wy * s }
        if (this.cam) { this.cam.toPan = targetPan }
        else { this.pan.x += (targetPan.x - this.pan.x) * 0.12; this.pan.y += (targetPan.y - this.pan.y) * 0.12 }
      }
    }
    if (this.cam) {
      const c = this.cam
      const k = c.dur <= 0 ? 1 : clamp01((this.now - c.t0) / c.dur)
      const e = easeOutExpo(k)
      this.zoom = c.fromZoom + (c.toZoom - c.fromZoom) * e
      this.pan.x = c.fromPan.x + (c.toPan.x - c.fromPan.x) * e
      this.pan.y = c.fromPan.y + (c.toPan.y - c.fromPan.y) * e
      this.onZoom?.(this.zoom)
      if (k >= 1) this.cam = null
      return
    }
    // no tween in flight — ease the applied camera toward wherever the last wheel/pinch call
    // targeted (see ZOOM_EASE). Pan is skipped here while a body is focused: the branch above
    // already owns pan in that case (re-centring on the focused body's live position), and easing
    // it toward `targetPan` too would fight that every frame.
    if (this.reduced) { this.zoom = this.targetZoom; this.pan.x = this.targetPan.x; this.pan.y = this.targetPan.y; return }
    this.zoom += (this.targetZoom - this.zoom) * ZOOM_EASE
    if (!this.focusedBody) {
      this.pan.x += (this.targetPan.x - this.pan.x) * ZOOM_EASE
      this.pan.y += (this.targetPan.y - this.pan.y) * ZOOM_EASE
    }
    this.onZoom?.(this.zoom)
  }

  private seedStars() {
    const count = this.noStarfield ? 0 : this.reduced ? 70 : Math.min(190, Math.round((this.w * this.h) / 8200))
    this.particles = Array.from({ length: count }, () => {
      const dx = (Math.random() - 0.5) * 0.1, dy = (Math.random() - 0.5) * 0.1
      return {
        x: Math.random() * this.w, y: Math.random() * this.h, vx: dx, vy: dy, dx, dy,
        size: 0.6 + Math.random() * 1.3, b: 0.16 + Math.random() * 0.42, dep: 0.35 + Math.random() * 0.65,
      }
    })
  }

  // ── Page-exit cascade state ──
  private exiting = false
  private exitStart = 0
  // Structural rings (+ their axis/ring labels in drawCenters) fade out over the SAME cascade
  // window the bodies use (spread + one body's travel time), so by the time App.tsx swaps to
  // home the canvas has fully emptied — no lingering ring lines or orphaned label text (Task 6).
  // Reduced-motion drops them instantly, matching the per-body exitP behaviour below.
  private ringExitAlpha(): number {
    if (!this.exiting) return 1
    if (this.reduced) return 0
    return 1 - clamp01((this.now - this.exitStart) / (EXIT_SPREAD + EXIT_BODY_DUR))
  }
  // Play the per-body exit (leaving to home): each body leaves individually, offset by a per-body
  // delay spread over EXIT_SPREAD in RANK order (strongest first). Unfreezes first — the header logo
  // hover freezes the field, and a frozen frame loop would never advance the cascade otherwise.
  playExit() {
    if (this.exiting) return
    this.setFrozen(false)
    this.exiting = true
    this.exitStart = performance.now()
    const order = [...this.nodes].sort((a, b) => b.power - a.power)
    const N = order.length
    order.forEach((ns, pos) => { ns.exitDelay = (N <= 1 ? 0 : pos / (N - 1)) * EXIT_SPREAD })
  }

  frozen = false
  private frozenAt = 0
  setFrozen(v: boolean) {
    if (v && !this.frozen) {
      this.frozen = true
      this.frozenAt = performance.now()
    } else if (!v && this.frozen) {
      const frozenDuration = performance.now() - this.frozenAt
      this.start += frozenDuration
      this.frozenAt = 0
      this.frozen = false
    }
  }

  start_() { this.start = performance.now() + (this.reduced ? 0 : INTRO_DELAY_MS); this.raf = requestAnimationFrame(this.frame) }
  private ro: ResizeObserver | null = null
  destroy() {
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect(); this.ro = null
    window.clearTimeout(this.resizeTimer)
    this.container.removeEventListener('pointermove', this.onMove)
    this.container.removeEventListener('pointerleave', this.onLeave)
    this.container.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    this.container.removeEventListener('wheel', this.onWheel)
  }

  private onMove = (ev: PointerEvent) => {
    const rect = this.container.getBoundingClientRect()
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top
    if (this.pointers.has(ev.pointerId)) this.pointers.set(ev.pointerId, { x: mx, y: my })
    // two-finger pinch-zoom (touch): scale toward the midpoint, suppress pan/hover
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      this.setZoom(this.pinch.zoom * (dist / this.pinch.dist), (a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }
    if (this.down) {
      const dx = mx - this.mouse.x, dy = my - this.mouse.y
      if (this.dragging || Math.hypot(mx - this.down.x, my - this.down.y) > 4) {
        // ONLY the drag TARGET moves by the raw delta — the applied `pan` is left for stepCamera's
        // per-frame catch-up (`pan += (targetPan - pan) * ZOOM_EASE`) to chase, same damped rate
        // already used for wheel-zoom's "heavy" feel. This used to move both together 1:1 (the
        // fix for a real "panning is locked" bug: with pan alone moving, the untouched targetPan
        // stayed stale and every frame's catch-up dragged the view straight back to it the instant
        // the pointer stopped). That bug is why `targetPan` must still move — omitting it reintroduces
        // the rubber-band. But moving `pan` in lockstep made the catch-up a permanent no-op, so drag
        // always tracked the cursor exactly — zero damping, unlike every other camera motion here.
        // Leaving `pan` for the easing step to chase gives drag the same weighted, lagging feel as
        // wheel-zoom, and still can't rubber-band: targetPan already IS the live drag position.
        this.dragging = true
        this.targetPan.x += dx; this.targetPan.y += dy
      }
    }
    this.mouse.x = mx; this.mouse.y = my
    if (!this.dragging) this.hitTest()
  }
  private onLeave = () => { this.mouse.x = -9999; this.mouse.y = -9999; this.setHovered(null) }
  private onDown = (ev: PointerEvent) => {
    // ignore presses that start on chrome (controls, panels, tabs) — they bubble to the stage
    // container but must not scatter the field or clear the selection
    if (isInteractive(ev.target)) return
    const rect = this.container.getBoundingClientRect()
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top
    this.pointers.set(ev.pointerId, { x, y })
    if (this.pointers.size === 2) {
      // second finger down → begin pinch; cancel any single-press tap/pan intent
      this.down = null; this.dragging = false
      const [a, b] = [...this.pointers.values()]
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom }
      return
    }
    this.down = { x, y }
    this.mouse.x = x; this.mouse.y = y; this.dragging = false
    // harden tap hit-testing: a still touch tap may emit no pointermove before up,
    // so hit-test at the press point now rather than relying on a prior move.
    this.hitTest()
  }
  private onUp = (ev: PointerEvent) => {
    this.pointers.delete(ev.pointerId)
    if (this.pointers.size < 2) this.pinch = null
    if (this.pointers.size > 0) { this.down = null; this.dragging = false; return } // fingers remain
    if (this.down && !this.dragging) {
      if (this.hovered) {
        // click/tap on a body → pin/unpin it
        this.setSelected(this.selected === this.hovered ? null : this.hovered)
      } else {
        // click on empty space → deselect + scatter particles
        if (this.selected) this.setSelected(null)
        const R = 180
        for (const p of this.particles) { const dx = p.x - this.down.x, dy = p.y - this.down.y, d = Math.hypot(dx, dy) || 1; if (d < R) { const f = (1 - d / R) * 7; p.vx += (dx / d) * f; p.vy += (dy / d) * f } }
        if (!this.noStarfield) this.click = { x: this.down.x, y: this.down.y, t: this.now } // global field handles the ripple
      }
    }
    this.down = null; this.dragging = false
    // touch has no pointerleave — clear the transient hover so no stale readout sticks
    if (ev.pointerType === 'touch') { this.mouse.x = -9999; this.mouse.y = -9999; this.setHovered(null) }
  }
  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault()
    // scroll-speed sensitivity — see WHEEL: accumulate energy so a deliberate fast flick punches
    // through zoom levels, while a single considered tick stays at the original, precise rate.
    // Capped at 1.5× ref so an unbroken long scroll saturates the gain rather than growing forever
    // (clamp01 below already saturates the GAIN at ref; this caps the ACCUMULATOR itself, which
    // matters once the decay in frame() is factored in — without it, energy could climb across
    // many small ticks faster than it decays and stay pinned far above what "full speed" means).
    this.wheelEnergy = Math.min(WHEEL.ref * 1.5, this.wheelEnergy + Math.abs(ev.deltaY))
    const gain = 1 + (WHEEL.maxGain - 1) * clamp01(this.wheelEnergy / WHEEL.ref)
    const rect = this.container.getBoundingClientRect()
    this.setZoom(this.zoom * (1 - ev.deltaY * WHEEL.base * gain), ev.clientX - rect.left, ev.clientY - rect.top)
  }

  private hitTest() {
    let best: string | null = null; let bestD = Infinity
    for (const ns of this.nodes) {
      const d = Math.hypot(ns.sx - this.mouse.x, ns.sy - this.mouse.y)
      const pad = Math.max(ns.sr + 12, 16)
      if (d < pad && d < bestD) { bestD = d; best = ns.e.id }
    }
    this.setHovered(best)
  }
  private get focusId() { return this.selected ?? this.hovered }
  private refreshConnected() {
    const id = this.focusId
    this.connected = new Set(id ? [id, ...(neighbors.get(id) ?? [])] : [])
  }
  private setHovered(id: string | null) {
    if (id === this.hovered) return
    this.hovered = id; this.hoverSince = this.now
    this.refreshConnected()
    let screen: { x: number; y: number } | null = null
    if (id) { const idx = idIndex.get(id); if (idx != null) { const ns = this.nodes[idx]; screen = { x: ns.sx, y: ns.sy } } }
    this.onHover?.(id, screen)
  }
  private setSelected(id: string | null) {
    if (id === this.selected) return
    this.selected = id; this.hoverSince = this.now
    this.refreshConnected()
    // recenter the field on the chosen body (gentle zoom-in); empty/close eases back to the frame
    if (id) this.focusOn(id); else this.resetView()
    this.onSelect?.(id)
  }
  clearSelection() { this.setSelected(null) }
  select(id: string | null) { this.setSelected(id) }

  private resolve(t: number) {
    const W = this.world
    for (const k in ANCHORS) W.set(k, { x: ANCHORS[k].x, y: ANCHORS[k].y })
    for (const i of ORDER) {
      const ns = this.nodes[i]; const e = ns.e
      const par = W.get(e.parent) ?? { x: 0, y: 0 }
      const ang = (e.ang0 + (this.reduced ? 0 : e.omega * VISUALS.speedScale * t)) * D2R
      ns.wx = par.x + Math.cos(ang) * e.R
      ns.wy = par.y + Math.sin(ang) * e.R
      W.set(e.id, { x: ns.wx, y: ns.wy })
      const s = this.toScreen(ns.wx, ns.wy)
      ns.sx = s.x; ns.sy = s.y
      // ease current power toward its target (snap when reduced-motion); same smoothing idiom as the field
      ns.power += this.reduced ? (ns.powerTarget - ns.power) : (ns.powerTarget - ns.power) * 0.12
      ns.sr = clamp((powerSize(ns.power) / 2) * this.viewScale * this.zoom, 2, 88)
      // hover/select bloom — was applied as an instant ternary at draw time (r * (isFocus ? 1.18 : 1)),
      // which jump-cut the radius the exact frame focus changed: no ramp in, no settle out, just a
      // pop. Eased here instead, same lerp-toward-target idiom as `power` above, and asymmetric
      // (slower in than out) the same way ForcesSheet's own hover bloom already reads — a "dramatic"
      // grow with a quicker release so the body doesn't feel sluggish to let go of.
      {
        const bloomTarget = this.reduced ? 1 : e.id === this.focusId ? 1.18 : 1
        if (this.reduced) ns.bloom = bloomTarget
        else ns.bloom += (bloomTarget - ns.bloom) * (ns.bloom < bloomTarget ? 0.07 : 0.1)
      }
      // appear factor computed here (was: recomputed later in frame()'s draw loop) so it's fresh
      // for separateBodies() below — entering/barely-visible bodies should exert/absorb near-zero
      // separation force instead of shoving fully-grown neighbours on their very first frame.
      const ri = NODE_RING.get(e.id) ?? RINGS.length
      ns.appear = clamp01((t - ri * 0.65) / 0.75)
    }
    this.separateBodies()
  }

  // Pure orbital placement (angle, radius around a parent anchor) has no awareness of a body's
  // on-screen SIZE, so differently-sized bodies — or bodies on separate orbits whose paths cross
  // in projection — can visually overlap even though their underlying physics never "collide".
  // A few iterations of pairwise circle-circle separation nudges overlapping pairs apart every
  // frame, mass-weighted by radius (the bigger body gives way less) so it reads as gentle crowding
  // rather than a jitter fight. Runs in screen space, post-zoom, since that's what has to visually
  // not-overlap — world-space separation would fight the zoom level for no reason.
  private separateBodies() {
    const nodes = this.nodes
    const PAD = 3 // small breathing gap so touching circles don't read as fused
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        const ra = a.sr * easeOutCubic(a.appear)
        if (ra <= 0) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const rb = b.sr * easeOutCubic(b.appear)
          if (rb <= 0) continue
          const dx = b.sx - a.sx, dy = b.sy - a.sy
          const dist = Math.hypot(dx, dy) || 0.0001
          const minDist = ra + rb + PAD
          if (dist >= minDist) continue
          const overlap = minDist - dist
          const nx = dx / dist, ny = dy / dist
          const totalR = ra + rb
          const pushA = overlap * (rb / totalR)
          const pushB = overlap * (ra / totalR)
          a.sx -= nx * pushA; a.sy -= ny * pushA
          b.sx += nx * pushB; b.sy += ny * pushB
        }
      }
    }
  }

  private frame = (now: number) => {
    if (this.frozen) { this.raf = requestAnimationFrame(this.frame); return }
    this.now = now
    const t = (now - this.start) / 1000
    const intro = clamp01(t / 4.0)
    const ctx = this.ctx
    // bufW/bufH, not this.w/this.h — see resize's own comment. The buffer can be LARGER than the
    // live-tracking this.w/h mid-transition; clearing only the (shrinking) live rect would leave
    // a stale, never-wiped strip of old pixels behind as the composition recentres away from it.
    ctx.clearRect(0, 0, this.bufW, this.bufH)
    ;(window as unknown as { __nodes?: unknown }).__nodes = this.nodes.map((n) => ({ id: n.e.id, sx: n.sx, sy: n.sy }))
    ;(window as unknown as { __rect?: unknown }).__rect = this.container.getBoundingClientRect()

    // real (not simulation-clock) delta time — used only to smooth zoomVel and decay wheelEnergy,
    // both of which have to track wall-clock speed regardless of `this.reduced`/`speedScale`.
    const dt = this.lastFrameT ? Math.min(0.05, (now - this.lastFrameT) / 1000) : 0
    this.lastFrameT = now

    this.stepCamera() // advance pan/zoom tween (recenter on focus) before projecting bodies

    // warp-streak velocity — see the field comments for why this is smoothed rather than raw, and
    // why it has to run AFTER stepCamera (needs this frame's already-advanced `this.zoom`).
    const rawVel = dt > 0 ? (this.zoom - this.prevZoom) / dt : 0
    this.prevZoom = this.zoom
    const smK = Math.abs(rawVel) > Math.abs(this.zoomVel) ? WARP.attack : WARP.release
    this.zoomVel += (rawVel - this.zoomVel) * smK
    this.wheelEnergy *= Math.exp((-dt * 1000) / WHEEL.tau)

    this.drawStars(t, intro)
    this.resolve(t)
    this.drawOrbits(t)
    this.drawCenters(intro)
    // orbit-only: no connector links / backing-flow reveal — relations read via orbit + proximity.
    // per-orbit staggered entrance kept from the live sequencing (rings reveal in order).
    // page-exit cascade (leaving to home): ease each body's exitP toward 1, staggered by rank.
    if (this.exiting) {
      const ee = now - this.exitStart
      for (const ns of this.nodes) ns.exitP = this.reduced ? 1 : clamp01((ee - ns.exitDelay) / EXIT_BODY_DUR)
    }
    // .appear is now computed once in resolve() (above, before drawOrbits/drawCenters also read
    // it) — this loop just draws with the already-current value.
    for (let k = 0; k < this.nodes.length; k++) {
      this.drawNode(this.nodes[k], t)
    }
    this.drawDepthLayer() // insight labels + proximity captions — populates insightChildren for updateLabels
    this.updateLabels()
    this.raf = requestAnimationFrame(this.frame)
  }

  private drawStars(t: number, intro: number) {
    const ctx = this.ctx
    // Streak magnitude for THIS frame — a scalar 0..1, computed once rather than per star. Below
    // WARP.minLen every star just falls through to the ordinary dot-draw at the bottom of the
    // loop, so a still (or merely-ticked) camera costs exactly what it always did. See WARP for
    // why this reads wheelEnergy rather than zoomVel.
    const mag = this.reduced || !WARP.on
      ? 0
      : Math.pow(clamp01((this.wheelEnergy - WARP.deadEnergy) / (WHEEL.ref - WARP.deadEnergy)), WARP.curve)
    const ax = this.zoomAnchor?.x ?? this.cx, ay = this.zoomAnchor?.y ?? this.cy
    const sign = this.zoomVel >= 0 ? 1 : -1

    for (const p of this.particles) {
      p.vx += (p.dx - p.vx) * 0.035; p.vy += (p.dy - p.vy) * 0.035
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x += this.w; else if (p.x > this.w) p.x -= this.w
      if (p.y < 0) p.y += this.h; else if (p.y > this.h) p.y -= this.h
      if (mag > 0) {
        // ── the warp streak: a LINE, not a displaced dot — nothing here moves the star's actual
        // position (p.x/p.y are untouched), so this is pure draw-time embellishment, gone the
        // instant the camera stops. Length grows with distance from the zoom anchor (perspective:
        // things at the edge of a dive appear to move faster than things near its centre) and with
        // the star's own depth factor, so the field reads as layered rather than flat.
        const dx = p.x - ax, dy = p.y - ay, d = Math.sqrt(dx * dx + dy * dy) || 1
        const len = Math.min(WARP.maxLen, mag * WARP.spread * d * p.dep)
        if (len > WARP.minLen) {
          const ux = dx / d, uy = dy / d
          ctx.strokeStyle = `rgba(${WHITE},${p.b * intro})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + ux * len * sign, p.y + uy * len * sign)
          ctx.stroke()
          continue
        }
      }
      const tw = 0.6 + 0.4 * Math.sin(t * 1.1 + p.x * 0.04)
      ctx.fillStyle = `rgba(${WHITE},${p.b * tw * intro})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill()
    }
    const mx = this.mouse.x, my = this.mouse.y
    if (mx > -1000 && !this.dragging) {
      const near = this.nearBuf; near.length = 0 // reuse scratch — no per-frame array allocation
      for (const p of this.particles) { if (Math.hypot(p.x - mx, p.y - my) < this.mouseR) near.push(p) }
      for (let i = 0; i < near.length; i++) {
        const a = near[i], dmc = Math.hypot(a.x - mx, a.y - my)
        ctx.strokeStyle = `rgba(${YELLOW},${(1 - dmc / this.mouseR) * 0.3 * intro})`; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke()
        for (let j = i + 1; j < near.length; j++) { const b = near[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < this.linkDist) { ctx.strokeStyle = `rgba(${WHITE},${(1 - d / this.linkDist) * 0.22 * intro})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() } }
      }
    }
    if (this.click) { const age = (this.now - this.click.t) / 1000; if (age < 0.6) { ctx.strokeStyle = `rgba(${YELLOW},${(1 - age / 0.6) * 0.4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.click.x, this.click.y, age * 200, 0, TAU); ctx.stroke() } else this.click = null }
  }

  // structural rings — each ring fades in as a full circle (no arc-drawing); staggered by index.
  // Ring i appears 0.2s before its node group (i * 0.65) so the stage is set before actors arrive.
  private drawOrbits(t: number) {
    const ringFade = this.ringExitAlpha()
    if (ringFade <= 0.001) return
    const ctx = this.ctx
    const s = this.viewScale * this.zoom
    const zoomP = clamp01((this.zoom - DEFAULT_ZOOM) / ORBIT_ZOOM_RANGE)
    for (let ri = 0; ri < RINGS.length; ri++) {
      const ring = RINGS[ri]
      const ringIntro = clamp01((t - (ri * 0.65 - 0.2)) / 0.7)
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      const lit = this.focusId && (ring.around === this.focusId || this.connected.has(ring.around))
      const dim = this.focusId && !lit
      const base = ring.he ? 0.3 : 0.16
      ctx.beginPath(); ctx.arc(c.x, c.y, ring.r * s, 0, TAU)
      ctx.strokeStyle = `rgba(${YELLOW},${(lit ? 0.55 : dim ? 0.05 : base) * ringIntro * ringFade * (1 + zoomP * ORBIT_ZOOM_BOOST)})`
      ctx.lineWidth = 1 + zoomP * ORBIT_ZOOM_WIDTH_BOOST
      if (ring.dash) ctx.setLineDash([2, 7])
      ctx.stroke(); ctx.setLineDash([])
    }
  }

  private drawCenters(intro: number) {
    const ringFade = this.ringExitAlpha()
    if (ringFade <= 0.001) return
    const ctx = this.ctx
    const s = this.viewScale * this.zoom
    ctx.save(); ctx.textAlign = 'center'
    // axis labels near their hub — fade with the rings (Task 6) so no orphaned text outlives them
    ctx.font = "700 14px 'Tel Aviv Brutalist', sans-serif"
    for (const ax of AXES) {
      const hub = this.world.get(ax.around); if (!hub) continue
      const c = this.toScreen(hub.x, hub.y)
      ctx.fillStyle = `rgba(${WHITE},${0.42 * intro * ringFade})`
      // 175 → 260: at the default frame Iran's "הציר המזרחי" (dy=1, offset 175*s) and its own
      // "טבעת האש" ring label (offset ring.r*s+14 = 160*s+14 ≈ 174*s) landed within a couple of
      // px of each other — two DIFFERENT labels for the same hub reading as one doubled string.
      // usa has no named ring at all, so it never collided; iran does, which is what made the
      // report specific to that side. 260 clears the fire ring's ~174 comfortably in both dy
      // directions, kept symmetric rather than a one-off exception for iran alone.
      ctx.fillText(ax.he, c.x, c.y + ax.dy * 260 * s)
    }
    // Named ring labels. These used to be pinned to one spot — straight down from the ring's own
    // centre, at its bottom edge — which is a fixed point on a field whose BODIES move: whenever
    // one drifted to that spot the label was drawn through its disc. The label now walks the ring
    // until it finds a seat that isn't on top of anything.
    ctx.font = "400 12px 'Tel Aviv Brutalist', sans-serif"
    for (const ring of RINGS) {
      if (!ring.he) continue
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      const rad = ring.r * s
      const halfW = ctx.measureText(ring.he).width / 2
      // Candidates in preference order: bottom first (where it has always sat, and where it reads
      // most naturally under the ring), then progressively further round. Angles are canvas
      // convention — 90° is straight down.
      const SEATS = [90, 106, 74, 122, 58, 138, 42, 270]
      let px = c.x, py = c.y + rad + 14
      for (const deg of SEATS) {
        const a = (deg * Math.PI) / 180
        const x = c.x + Math.cos(a) * (rad + 14)
        const y = c.y + Math.sin(a) * (rad + 14)
        // clear of every body? a label's box is roughly its measured width by 12px of cap height,
        // padded a little so text doesn't merely graze a disc's rim either.
        const clear = this.nodes.every((ns) => {
          if (ns.sr <= 0) return true
          const dx = Math.abs(ns.sx - x) - halfW - 4
          const dy = Math.abs(ns.sy - y) - 8
          return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) > ns.sr
        })
        if (clear) { px = x; py = y; break }
      }
      ctx.fillStyle = `rgba(${YELLOW},${0.4 * intro * ringFade})`
      ctx.fillText(ring.he, px, py)
    }
    ctx.restore()
  }

  private glow(x: number, y: number, radius: number, alpha: number) {
    const ctx = this.ctx
    // Cap the glow radius to the nearest canvas edge. A radial gradient reaches alpha 0 exactly at
    // its outer radius, so keeping that radius inside the canvas means the glow fully fades before
    // the boundary — no hard straight-line clip when a bloomed body sits near an edge.
    const rad = Math.min(radius, x, y, this.w - x, this.h - y)
    if (rad <= 0) return
    const grd = ctx.createRadialGradient(x, y, 0, x, y, rad)
    grd.addColorStop(0, `rgba(${WHITE},${alpha})`); grd.addColorStop(1, `rgba(${WHITE},0)`)
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
  }

  private drawNode(ns: NodeState, t: number) {
    const ctx = this.ctx; const e = ns.e
    const a = easeOutCubic(ns.appear); if (a <= 0) return
    // page-exit cascade: shrink (easeIn), fade, and drift slightly up as this body leaves; skip once gone
    const exit = this.exiting ? ns.exitP : 0
    if (exit >= 0.999) return
    const exitScale = 1 - exit * exit
    const sx = ns.sx, sy = ns.sy - exit * 16
    const focus = this.focusId
    const isFocus = e.id === focus
    const inWeb = !focus || isFocus || this.connected.has(e.id)
    const pulse = this.reduced ? 1 : 1 + 0.04 * Math.sin(t * 1.6 + ns.pulse)
    const r = ns.sr * a * ns.bloom * pulse * exitScale
    const nonstate = e.kind === 'nonstate'
    const axisCol = AXIS_COLOR[AXIS[e.id] ?? 'none']
    ctx.save(); ctx.globalAlpha = a * (inWeb ? 1 : 0.2) * exitScale

    // soft glow / corona — states only (great powers a touch stronger)
    if (inWeb && !nonstate) this.glow(sx, sy, r * (isFocus ? 2.4 : e.kind === 'great' ? 2.0 : 1.55), e.kind === 'great' ? 0.12 : 0.07)
    // focus pulse rings
    if (isFocus) {
      // single gentle expanding ripple — unified with the Forces hover pulse
      // (ForcesSheet: t*0.5 speed, 0.32 opacity, r+8+pp*40), not the old fast/intense double.
      const since = (this.now - this.hoverSince) / 1000
      const pp = (since * 0.5) % 1
      ctx.strokeStyle = `rgba(${YELLOW},${(1 - pp) * 0.32})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(sx, sy, r + 8 + pp * 40, 0, TAU); ctx.stroke()
    }

    if (nonstate && VISUALS.nonStateHollow) {
      // hollow body → reads as a non-state actor; ring carries the bloc colour
      const rr = Math.max(2.6, r)
      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.fillStyle = `rgba(${DARK},0.55)`; ctx.fill()
      ctx.strokeStyle = `rgba(${axisCol},${isFocus ? 1 : 0.82})`; ctx.lineWidth = 1.3; ctx.stroke()
    } else {
      // filled state disk
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = `rgb(${LIGHT})`; ctx.fill()
      if (VISUALS.allegianceRim) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.strokeStyle = `rgba(${axisCol},${VISUALS.rimAlpha})`; ctx.lineWidth = 1.5; ctx.stroke() }
      if (e.kind === 'great' && VISUALS.greatCorona) { ctx.beginPath(); ctx.arc(sx, sy, r + 4, 0, TAU); ctx.strokeStyle = `rgba(${WHITE},0.2)`; ctx.lineWidth = 1; ctx.stroke() }
    }
    ctx.restore()
  }

  private updateLabels() {
    const placed = this.placedBuf; placed.length = 0 // reuse scratch — no per-frame array allocation
    for (const ns of this.labelOrder) {
      const el = this.labels.get(ns.e.id); if (!el) continue
      // the drill-in canvas layer is labelling this body — suppress its DOM label to avoid doubling
      if (this.insightChildren.has(ns.e.id)) { el.style.opacity = '0'; continue }
      const a = easeOutCubic(ns.appear)
      const x = ns.sx, y = ns.sy + ns.sr * a + 12
      el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`
      const fs = ns.e.kind === 'great' || ns.e.kind === 'regional' ? 15 : ns.e.kind === 'nonstate' ? 11 : 12
      const w = ns.e.he.length * fs * 0.58, hh = fs * 1.3
      const forced = !!this.focusId && this.connected.has(ns.e.id)
      const lod = LABEL_ZOOM_LOD[ns.e.kind]
      const zoomAlpha = forced ? 1 : clamp01((this.zoom - lod.start) / lod.span)
      let hide = ns.sx < -40 || ns.sx > this.w + 40 || ns.sy < -40 || ns.sy > this.h + 40
      if (zoomAlpha <= 0.01) hide = true
      if (!hide && !forced) for (const p of placed) { if (Math.abs(x - p.x) < (w + p.w) / 2 - 4 && Math.abs(y - p.y) < (hh + p.h) / 2 - 1) { hide = true; break } }
      const dim = this.focusId && !this.connected.has(ns.e.id) ? 0.14 : 1
      // fade each label out together with its body during the page-exit cascade
      const exitFade = this.exiting ? 1 - ns.exitP : 1
      el.style.opacity = String(hide ? 0 : a * dim * exitFade * zoomAlpha)
      if (!hide) placed.push({ x, y, w, h: hh })
    }
  }

  // ── Depth / drill-down layer ─────────────────────────────────────────────────
  // Task 14: once zoomed past INSIGHT_ZOOM onto a focused body, label its orbital children (even the
  // ones the normal zoom-gate would hide) and fade in a "what you're looking at" note.
  // Task 15: fade in a relation caption at the midpoint of any authored pair drifting close on screen.
  private drawDepthLayer() {
    this.insightChildren.clear()
    const focus = this.focusedBody
    const insightAlpha = focus ? clamp01((this.zoom - INSIGHT_ZOOM) / INSIGHT_FADE) : 0
    if (focus && insightAlpha > 0.01) {
      const fi = idIndex.get(focus)
      if (fi != null) {
        const ctx = this.ctx
        ctx.save(); ctx.textAlign = 'center'; ctx.direction = 'rtl'
        // label the focused body's orbital children
        for (const ns of this.nodes) {
          if (ns.e.parent !== focus) continue
          const a = easeOutCubic(ns.appear); if (a <= 0) continue
          this.insightChildren.add(ns.e.id)
          const al = insightAlpha * a
          const fs = ns.e.kind === 'nonstate' ? 11 : 12
          // country/entity names are never bold anywhere on the site (house rule)
          ctx.font = `400 ${fs}px 'Tel Aviv Brutalist', sans-serif`
          const top = ns.sy + ns.sr * a + 2
          const ly = ns.sy + ns.sr * a + 13
          ctx.strokeStyle = `rgba(${YELLOW},${0.22 * al})`; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(ns.sx, top); ctx.lineTo(ns.sx, ly - fs + 2); ctx.stroke()
          ctx.fillStyle = `rgba(${YELLOW},${0.92 * al})`
          ctx.fillText(ns.e.he, ns.sx, ly)
        }
        // "what you're looking at" note, above the focused body
        const note = POWER_NOTES[focus]?.general
        if (note) this.drawAnnotation(this.nodes[fi], note, insightAlpha)
        ctx.restore()
        // dynamic ties — the focused body's 1–2 strongest authored relations, captioned beside the
        // partner bodies. Same insight zoom gate as the children/note, so drilling in reliably reveals
        // them (the old drift-proximity path never fired — see the header comment).
        this.drawRelationTies(focus, insightAlpha)
      }
    }
  }

  // Short interpretive note stacked above the focused body — the reward for drilling in.
  private drawAnnotation(fns: NodeState, text: string, alpha: number) {
    const ctx = this.ctx
    const fs = 12.5
    ctx.font = `400 ${fs}px 'Tel Aviv Brutalist', sans-serif`
    const maxW = Math.min(248, this.captionW * 0.62)
    const lines = wrapText(ctx, text, maxW)
    const lh = fs * 1.5
    const x = fns.sx
    let y = fns.sy - fns.sr - 20 - (lines.length - 1) * lh
    for (const line of lines) {
      ctx.fillStyle = `rgba(${LIGHT},${0.85 * alpha})`
      ctx.fillText(line, x, y)
      y += lh
    }
  }

  // Dynamic ties (Task 15, redesigned). The focused body's 1–2 strongest authored relations, drawn
  // as small de-emphasized sidenotes beside the PARTNER body so each reads "this is your relationship
  // with X". `alpha` is the insight zoom gate (drawDepthLayer), so ties only appear once the user has
  // drilled in on a body — a reliable reward, not the old contradictory zoom-vs-proximity gate that
  // never fired. Futurism (the body face), not the display face, so they never rival the name labels.
  private drawRelationTies(focus: string, alpha: number) {
    const rels = RELATIONS_BY_BODY.get(focus)
    if (!rels || !rels.length) return
    const ctx = this.ctx
    const pad = 14
    const headFs = 11.5, descFs = 10.5
    const maxW = Math.min(196, this.captionW * 0.5)
    const lineH = descFs * 1.4
    // captions placed this call — the second tie de-collides against the first as well as against
    // last frame's body-name labels (placedBuf, one frame stale — imperceptible at this drift speed).
    const localPlaced: { x: number; y: number; w: number; h: number }[] = []
    // keep captions inside the VISIBLE field: on wide screens the right gutter is reserved for the
    // DOM readout panel, so a partner that drifts under the panel would otherwise hide its caption.
    const loX = pad + maxW / 2
    const hiX = Math.max(loX, this.captionW - pad - maxW / 2)
    ctx.save(); ctx.textAlign = 'center'; ctx.direction = 'rtl'
    for (const rel of rels.slice(0, 2)) {
      const nb = this.nodes[rel.ib]
      if (easeOutCubic(nb.appear) < 0.4) continue
      ctx.font = `400 ${descFs}px 'Futurism', 'Tel Aviv Brutalist', sans-serif`
      const lines = wrapText(ctx, rel.why, maxW)
      const boxH = headFs + 14 + lines.length * lineH
      // Anchor BESIDE the partner body (above it on the dark sky by default, below if it sits near
      // the top edge) rather than on top of it — the near-white body fill would otherwise swallow the
      // light `why` text. Clamped into the visible field so it stays legible and never hides behind
      // the panel, while still sitting in the partner's direction — reading as "your relationship with X".
      const ax = clamp(nb.sx, loX, hiX)
      const gap = 10
      const above = nb.sy - nb.sr - gap - boxH
      let topY = above >= pad ? above : nb.sy + nb.sr + gap + 16
      topY = clamp(topY, pad, this.h - pad - boxH)
      const collides = (ty: number) => {
        const cyy = ty + boxH / 2
        const hit = (p: { x: number; y: number; w: number; h: number }) =>
          Math.abs(ax - p.x) < (maxW + p.w) / 2 - 4 && Math.abs(cyy - p.y) < (boxH + p.h) / 2 - 1
        return this.placedBuf.some(hit) || localPlaced.some(hit)
      }
      // nudge up to twice to dodge a label, else skip — a sidenote never fights for the pixel
      let tries = 0
      while (collides(topY) && tries < 2) { topY = Math.max(pad, topY - (boxH + 8)); tries++ }
      if (collides(topY)) continue
      // heading — pole word + partner name, coloured by the dominant pole ("חיכוך עם איראן")
      ctx.font = `700 ${headFs}px 'Futurism', 'Tel Aviv Brutalist', sans-serif`
      ctx.fillStyle = `rgba(${POLE_COL[rel.dom]},${0.9 * alpha})`
      ctx.fillText(`${POLE_HE[rel.dom]} עם ${nb.e.he}`, ax, topY + headFs)
      // why — dim, small, wrapped
      ctx.font = `400 ${descFs}px 'Futurism', 'Tel Aviv Brutalist', sans-serif`
      let y = topY + headFs + 14
      for (const line of lines) {
        ctx.fillStyle = `rgba(${LIGHT},${0.62 * alpha})`
        ctx.fillText(line, ax, y)
        y += lineH
      }
      localPlaced.push({ x: ax, y: topY + boxH / 2, w: maxW, h: boxH })
    }
    ctx.restore()
  }
}
