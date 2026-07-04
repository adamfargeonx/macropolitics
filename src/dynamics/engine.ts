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

// ── Depth / drill-down layer (Tasks 14 + 15) ──
// One coherent "insight" system: when the camera pushes past INSIGHT_ZOOM onto a focused body it
// fades in that body's labelled orbital children + a "what you're looking at" note; independently,
// any authored relation whose two bodies drift within a proximity band fades in a caption at their
// midpoint. Both ease their alpha off geometry so the default frame stays clean.
// ── Page-exit cascade — on `mp-exit` (leaving to home) each orbiting body plays its OWN staggered
// shrink+fade so the orrery empties body-by-body rather than the whole rail zooming out. Ranked
// strong→weak. Kept in sync with App.tsx's EXIT_MS and the Forces/Relations cascades.
const EXIT_SPREAD = 360 // ms window over which bodies begin leaving
const EXIT_BODY_DUR = 300 // ms each body takes to vanish

const INSIGHT_ZOOM = 1.7 // zoom at which the focused-body insight layer begins to reveal
const INSIGHT_FADE = 0.55 // zoom span over which it fades fully in (→ 2.25)
const PROX_BASE = 128 // proximity caption base threshold (screen px, before the two radii)
const PROX_FADE = 78 // caption eases fully in over the last PROX_FADE px of approach
const POLE_HE: Record<'t' | 'f' | 'h', string> = { t: 'מתח', f: 'חיכוך', h: 'הרמוניה' }
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
  zoomGatedLabels: true, // hide minor labels until zoomed past gate
  labelGate: 0.95,
  speedScale: 0.62, // calm the motion (1 = original measured speeds)
}
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
interface NodeState { e: Entity; wx: number; wy: number; sx: number; sy: number; sr: number; appear: number; pulse: number; power: number; powerTarget: number; exitDelay: number; exitP: number }

const idIndex = new Map(NODES.map((n, i) => [n.id, i]))
// Authored relations resolved to node indices + a dominant pole, precomputed once. Drives the
// proximity captions (Task 15): each frame we test screen distance and fade a caption at the midpoint.
const AUTH_PAIRS = AUTHORED_RELATIONS
  .filter((r) => idIndex.has(r.pair[0]) && idIndex.has(r.pair[1]))
  // drop parent↔child pairs (e.g. iran↔hezbollah, saudi↔uae): a satellite is PERMANENTLY beside its
  // hub, so its caption would sit static in a dense cluster. Keep only independent bodies whose orbits
  // genuinely drift them together — the "iran drifts close to turkey" reveal the feature is about.
  .filter((r) => {
    const a = NODES[idIndex.get(r.pair[0])!], b = NODES[idIndex.get(r.pair[1])!]
    return a.parent !== b.id && b.parent !== a.id
  })
  .map((r) => {
    const dom: 't' | 'f' | 'h' = r.t >= r.f && r.t >= r.h ? 't' : r.f >= r.h ? 'f' : 'h'
    return { ia: idIndex.get(r.pair[0])!, ib: idIndex.get(r.pair[1])!, aId: r.pair[0], bId: r.pair[1], dom, why: r.why }
  })
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
  private nodes: NodeState[]
  private labelOrder: NodeState[]
  private nearBuf: OrbitalField['particles'] = [] // reused scratch for mouse-proximate particles (no per-frame alloc)
  private placedBuf: { x: number; y: number; w: number; h: number }[] = [] // reused scratch for label de-collision
  private world = new Map<string, { x: number; y: number }>()
  // camera — pan + wheel adjust the framed system; selecting a body eases the camera to centre it
  zoom = DEFAULT_ZOOM
  private pan = { x: 0, y: 0 }
  // camera tween (pan + zoom) — recenters on a focused body, or eases back to the default frame
  private cam: { fromZoom: number; toZoom: number; fromPan: { x: number; y: number }; toPan: { x: number; y: number }; t0: number; dur: number } | null = null
  private focusedBody: string | null = null
  // particles (screen space)
  private particles: { x: number; y: number; vx: number; vy: number; dx: number; dy: number; size: number; b: number }[] = []
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
    this.nodes = NODES.map((e, i) => ({ e, wx: 0, wy: 0, sx: 0, sy: 0, sr: 0, appear: 0, pulse: (i * 1.7) % TAU, power: e.power, powerTarget: e.power, exitDelay: 0, exitP: 0 }))
    this.labelOrder = [...this.nodes].sort((a, b) => PRI[a.e.kind] - PRI[b.e.kind])
    this.resize()
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

  private get gutter() { return this.w > 760 ? Math.min(400, this.w * 0.3) : 0 }
  private get fieldW() { return Math.max(this.w - this.gutter, this.w * 0.6) }
  private get cx() { return this.fieldW / 2 }
  private get cy() { return this.h / 2 }
  private get maxR() { return Math.min(this.fieldW, this.h) * 0.5 }
  private get viewScale() { return this.maxR / 520 } // world px → screen px at zoom 1

  resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    // clientWidth/Height are LAYOUT metrics — immune to the .stage entrance transform (scale),
    // unlike getBoundingClientRect(). Reading the rect during stageIn was giving stale, shrunken
    // dims for the whole session → the "offset / can't hover" bug. This reads true size always.
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
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
    this.cam = null // a direct zoom (wheel) cancels any in-flight camera tween
    const tx = towardX ?? this.cx, ty = towardY ?? this.cy
    const wbefore = this.toWorld(tx, ty)
    this.zoom = clamp(z, 0.4, 4)
    const s = this.viewScale * this.zoom
    this.pan.x = tx - this.cx - wbefore.x * s
    this.pan.y = ty - this.cy - wbefore.y * s
    this.onZoom?.(this.zoom)
  }
  zoomBy(f: number) { this.setZoom(this.zoom * f) }

  // Start a smooth pan+zoom tween toward a target camera state (ease-out-expo, ~600ms).
  private tweenCamera(toZoom: number, toPan: { x: number; y: number }) {
    this.cam = {
      fromZoom: this.zoom, toZoom: clamp(toZoom, 0.4, 4),
      fromPan: { x: this.pan.x, y: this.pan.y }, toPan,
      t0: this.now || performance.now(), dur: this.reduced ? 0 : CAM_DUR,
    }
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
    if (!this.cam) return
    const c = this.cam
    const k = c.dur <= 0 ? 1 : clamp01((this.now - c.t0) / c.dur)
    const e = easeOutExpo(k)
    this.zoom = c.fromZoom + (c.toZoom - c.fromZoom) * e
    this.pan.x = c.fromPan.x + (c.toPan.x - c.fromPan.x) * e
    this.pan.y = c.fromPan.y + (c.toPan.y - c.fromPan.y) * e
    this.onZoom?.(this.zoom)
    if (k >= 1) this.cam = null
  }

  private seedStars() {
    const count = this.noStarfield ? 0 : this.reduced ? 70 : Math.min(190, Math.round((this.w * this.h) / 8200))
    this.particles = Array.from({ length: count }, () => {
      const dx = (Math.random() - 0.5) * 0.1, dy = (Math.random() - 0.5) * 0.1
      return { x: Math.random() * this.w, y: Math.random() * this.h, vx: dx, vy: dy, dx, dy, size: 0.6 + Math.random() * 1.3, b: 0.16 + Math.random() * 0.42 }
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

  start_() { this.start = performance.now(); this.raf = requestAnimationFrame(this.frame) }
  destroy() {
    cancelAnimationFrame(this.raf)
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
        this.dragging = true; this.pan.x += dx; this.pan.y += dy
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
    const rect = this.container.getBoundingClientRect()
    this.setZoom(this.zoom * (1 - ev.deltaY * 0.0014), ev.clientX - rect.left, ev.clientY - rect.top)
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
    }
  }

  private frame = (now: number) => {
    if (this.frozen) { this.raf = requestAnimationFrame(this.frame); return }
    this.now = now
    const t = (now - this.start) / 1000
    const intro = clamp01(t / 4.0)
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)

    this.stepCamera() // advance pan/zoom tween (recenter on focus) before projecting bodies
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
    for (let k = 0; k < this.nodes.length; k++) {
      const ri = NODE_RING.get(this.nodes[k].e.id) ?? RINGS.length
      this.nodes[k].appear = clamp01((t - ri * 0.65) / 0.75)
      this.drawNode(this.nodes[k], t)
    }
    this.drawDepthLayer() // insight labels + proximity captions — populates insightChildren for updateLabels
    this.updateLabels()
    this.raf = requestAnimationFrame(this.frame)
  }

  private drawStars(t: number, intro: number) {
    const ctx = this.ctx
    for (const p of this.particles) {
      p.vx += (p.dx - p.vx) * 0.035; p.vy += (p.dy - p.vy) * 0.035
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x += this.w; else if (p.x > this.w) p.x -= this.w
      if (p.y < 0) p.y += this.h; else if (p.y > this.h) p.y -= this.h
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
    for (let ri = 0; ri < RINGS.length; ri++) {
      const ring = RINGS[ri]
      const ringIntro = clamp01((t - (ri * 0.65 - 0.2)) / 0.7)
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      const lit = this.focusId && (ring.around === this.focusId || this.connected.has(ring.around))
      const dim = this.focusId && !lit
      const base = ring.he ? 0.3 : 0.16
      ctx.beginPath(); ctx.arc(c.x, c.y, ring.r * s, 0, TAU)
      ctx.strokeStyle = `rgba(${YELLOW},${(lit ? 0.55 : dim ? 0.05 : base) * ringIntro * ringFade})`
      ctx.lineWidth = 1
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
      ctx.fillText(ax.he, c.x, c.y + ax.dy * 175 * s)
    }
    // named ring labels
    ctx.font = "400 12px 'Tel Aviv Brutalist', sans-serif"
    for (const ring of RINGS) {
      if (!ring.he) continue
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      ctx.fillStyle = `rgba(${YELLOW},${0.4 * intro * ringFade})`
      ctx.fillText(ring.he, c.x, c.y + ring.r * s + 14)
    }
    ctx.restore()
  }

  private glow(x: number, y: number, radius: number, alpha: number) {
    const ctx = this.ctx
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)
    grd.addColorStop(0, `rgba(${WHITE},${alpha})`); grd.addColorStop(1, `rgba(${WHITE},0)`)
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill()
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
    const r = ns.sr * a * (isFocus ? 1.18 : 1) * pulse * exitScale
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
    const showMinor = !VISUALS.zoomGatedLabels || this.zoom >= VISUALS.labelGate
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
      const minor = ns.e.kind === 'intermediate' || ns.e.kind === 'edge' || ns.e.kind === 'nonstate'
      let hide = ns.sx < -40 || ns.sx > this.w + 40 || ns.sy < -40 || ns.sy > this.h + 40
      if (!forced && minor && !showMinor) hide = true
      if (!hide && !forced) for (const p of placed) { if (Math.abs(x - p.x) < (w + p.w) / 2 - 4 && Math.abs(y - p.y) < (hh + p.h) / 2 - 1) { hide = true; break } }
      const dim = this.focusId && !this.connected.has(ns.e.id) ? 0.14 : 1
      // fade each label out together with its body during the page-exit cascade
      const exitFade = this.exiting ? 1 - ns.exitP : 1
      el.style.opacity = String(hide ? 0 : a * dim * exitFade)
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
          ctx.font = `600 ${fs}px 'Tel Aviv Brutalist', sans-serif`
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
      }
    }
    // proximity captions and the insight layer are two facets of one depth system: they hand off, so
    // deep-zoom reads as pure insight (children + note) and moderate/default framing shows drift
    // captions — never both piled on the focused body at once.
    this.drawProximity(1 - insightAlpha)
  }

  // Short interpretive note stacked above the focused body — the reward for drilling in.
  private drawAnnotation(fns: NodeState, text: string, alpha: number) {
    const ctx = this.ctx
    const fs = 12.5
    ctx.font = `400 ${fs}px 'Tel Aviv Brutalist', sans-serif`
    const maxW = Math.min(248, this.fieldW * 0.62)
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

  // Proximity relation captions (Task 15). When a body is focused only its own relations qualify;
  // otherwise the single globally-closest related pair shows — so the default frame stays calm.
  private drawProximity(gain: number) {
    if (gain <= 0.02) return
    const focus = this.focusId
    type Cand = { dom: 't' | 'f' | 'h'; why: string; mx: number; my: number; alpha: number; d: number }
    const cands: Cand[] = []
    for (const p of AUTH_PAIRS) {
      if (focus && focus !== p.aId && focus !== p.bId) continue
      const na = this.nodes[p.ia], nb = this.nodes[p.ib]
      if (easeOutCubic(na.appear) < 0.6 || easeOutCubic(nb.appear) < 0.6) continue
      const d = Math.hypot(na.sx - nb.sx, na.sy - nb.sy)
      const thresh = PROX_BASE + na.sr + nb.sr
      if (d > thresh) continue
      const alpha = clamp01((thresh - d) / PROX_FADE) * gain
      if (alpha <= 0.02) continue
      cands.push({ dom: p.dom, why: p.why, mx: (na.sx + nb.sx) / 2, my: (na.sy + nb.sy) / 2, alpha, d })
    }
    if (!cands.length) return
    cands.sort((a, b) => a.d - b.d)
    // only the single closest drifting pair — one caption keeps the field calm and never stacks text,
    // whether ambient (nothing focused) or reading a focused body's own relations.
    const max = 1
    const ctx = this.ctx
    ctx.save(); ctx.textAlign = 'center'; ctx.direction = 'rtl'
    for (let i = 0; i < Math.min(max, cands.length); i++) {
      const c = cands[i]
      ctx.font = "700 11px 'Tel Aviv Brutalist', sans-serif"
      ctx.fillStyle = `rgba(${POLE_COL[c.dom]},${0.95 * c.alpha})`
      ctx.fillText(POLE_HE[c.dom], c.mx, c.my - 9)
      ctx.font = "400 12px 'Tel Aviv Brutalist', sans-serif"
      const lines = wrapText(ctx, c.why, Math.min(232, this.fieldW * 0.56))
      let y = c.my + 8
      for (const line of lines) {
        ctx.fillStyle = `rgba(${LIGHT},${0.86 * c.alpha})`
        ctx.fillText(line, c.mx, y)
        y += 12 * 1.42
      }
    }
    ctx.restore()
  }
}
