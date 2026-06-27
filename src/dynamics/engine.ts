// OrbitalField — /dynamics measured multi-centre orrery with a zoom/pan camera.
// Bodies orbit anchors (C/W/AW/EG) or planets at measured radius + signed angular velocity.
// World space ≈ original px; a camera (zoom default 1.4, pan) maps world → screen.
// The particle starfield lives in SCREEN space (interactive background, unaffected by camera).

import { NODES, LINKS, ANCHORS, RINGS, AXES, AXIS, backingOf, powerSize, type Entity } from '../data/entities'
import { authoredRelation } from '../data/relations'
import { isInteractive } from '../sound'

const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
const WHITE = '255,255,255'
const DARK = '11,0,36'
const D2R = Math.PI / 180
const TAU = Math.PI * 2

// ── Tunable visual config (set a flag false / value 0 to revert that piece) ──
const VISUALS = {
  allegianceRim: true, // whisper-subtle temperature rim by bloc
  rimAlpha: 0.4,
  nonStateHollow: true, // non-state actors render hollow (taxonomy)
  greatCorona: true, // superpowers get a faint corona ring
  zoomGatedLabels: true, // hide minor labels until zoomed past gate
  labelGate: 0.95,
  speedScale: 0.62, // calm the motion (1 = original measured speeds)
  allianceWeb: true, // the alliance web stays faintly visible at rest (informative layer)
  allianceWebAlpha: 0.1,
  // ── Zoom-tier reveals (additive layers gated on the camera's zoom) ──
  // ZOOM-OUT → SIMPLIFY: minor bodies fade toward the bloc skeleton; the web strengthens.
  simplifyStart: 0.8, // at/above this zoom minors are at full strength
  simplifyEnd: 0.5, // at/below this zoom minors reach their floor
  minorFadeFloor: 0.16, // residual alpha for faded minor bodies
  webBoostMax: 0.16, // extra alliance-web alpha added at full zoom-out
  // ZOOM-IN → REVEAL DETAIL: backing flows + authored hairlines ease in past the gate.
  detailStart: 1.5, // backing/relation layers begin appearing here
  detailEnd: 2.4, // …and reach full strength here
  backingFlowAlpha: 0.34, // peak alpha for patron→proxy flows (yellow)
  authoredEdgeAlpha: 0.3, // peak alpha for pole-tinted authored hairlines
}
const MINOR_KINDS = new Set<string>(['intermediate', 'edge', 'nonstate'])
// Pole tints for authored hairlines — dominant relation valence by colour (token-aligned).
const POLE_WARN = '255,157,110' // --warn  → tension dominant
const POLE_OK = '143,227,136' // --ok    → harmony dominant
const POLE_YELLOW = YELLOW // friction / mixed → neutral accent
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
interface NodeState { e: Entity; wx: number; wy: number; sx: number; sy: number; sr: number; appear: number; pulse: number; power: number; powerTarget: number }

const idIndex = new Map(NODES.map((n, i) => [n.id, i]))
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

// Great powers + regional hubs — kept prominent when the view simplifies to the bloc skeleton.
const HUBS = new Set<string>(['usa', 'iran', 'saudi', 'russia', 'china', 'turkey', 'israel'])

// Patron → proxy backing edges, precomputed once (graph-derived via backingOf → {patronId}).
// e.g. iran → hezbollah/hamas/pij/militias/yemen, usa → sdf, saudi → fatah.
const BACKING_FLOWS: { patron: string; proxy: string }[] = (() => {
  const flows: { patron: string; proxy: string }[] = []
  for (const n of NODES) {
    const b = backingOf(n.id)
    if (b && idIndex.has(b.patronId)) flows.push({ patron: b.patronId, proxy: n.id })
  }
  return flows
})()

// Strongest authored relation per body, tinted by its dominant valence (tension/friction/harmony).
// Deduped to one undirected edge per pair, precomputed once.
const AUTHORED_EDGES: { a: string; b: string; pole: string }[] = (() => {
  const seen = new Set<string>()
  const edges: { a: string; b: string; pole: string }[] = []
  for (const n of NODES) {
    let best: { other: string; t: number; f: number; h: number } | null = null
    let bestMag = -1
    for (const m of NODES) {
      if (m.id === n.id) continue
      const rel = authoredRelation(n.id, m.id)
      if (!rel) continue
      const mag = Math.max(rel.t, rel.f, rel.h)
      if (mag > bestMag) { bestMag = mag; best = { other: m.id, t: rel.t, f: rel.f, h: rel.h } }
    }
    if (!best) continue
    const key = n.id < best.other ? `${n.id}|${best.other}` : `${best.other}|${n.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const pole = best.t >= best.f && best.t >= best.h ? POLE_WARN : best.h >= best.f ? POLE_OK : POLE_YELLOW
    edges.push({ a: n.id, b: best.other, pole })
  }
  return edges
})()

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const clamp01 = (t: number) => clamp(t, 0, 1)

export class OrbitalField {
  private ctx: CanvasRenderingContext2D
  private w = 0; private h = 0; private dpr = 1
  private nodes: NodeState[]
  private labelOrder: NodeState[]
  private nearBuf: OrbitalField['particles'] = [] // reused scratch for mouse-proximate particles (no per-frame alloc)
  private placedBuf: { x: number; y: number; w: number; h: number }[] = [] // reused scratch for label de-collision
  private world = new Map<string, { x: number; y: number }>()
  // camera — default zoomed-in; pan + wheel + buttons adjust the bigger/wider system
  zoom = 0.85
  private pan = { x: 0, y: 0 }
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
  private hovered: string | null = null
  private selected: string | null = null
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
    this.nodes = NODES.map((e, i) => ({ e, wx: 0, wy: 0, sx: 0, sy: 0, sr: 0, appear: 0, pulse: (i * 1.7) % TAU, power: e.power, powerTarget: e.power }))
    this.labelOrder = [...this.nodes].sort((a, b) => PRI[a.e.kind] - PRI[b.e.kind])
    this.resize()
    this.container.addEventListener('pointermove', this.onMove)
    this.container.addEventListener('pointerleave', this.onLeave)
    this.container.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointerup', this.onUp)
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

  // ── Zoom-tier ramps (0…1). simplify rises as we zoom OUT; detail rises as we zoom IN. ──
  // smoothstep over the gap so layers ease in/out — no hard pop at the threshold.
  private get simplifyT() {
    const { simplifyStart: a, simplifyEnd: b } = VISUALS
    const t = clamp01((a - this.zoom) / (a - b))
    return t * t * (3 - 2 * t)
  }
  private get detailT() {
    const { detailStart: a, detailEnd: b } = VISUALS
    const t = clamp01((this.zoom - a) / (b - a))
    return t * t * (3 - 2 * t)
  }

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
    const tx = towardX ?? this.cx, ty = towardY ?? this.cy
    const wbefore = this.toWorld(tx, ty)
    this.zoom = clamp(z, 0.4, 4)
    const s = this.viewScale * this.zoom
    this.pan.x = tx - this.cx - wbefore.x * s
    this.pan.y = ty - this.cy - wbefore.y * s
    this.onZoom?.(this.zoom)
  }
  zoomBy(f: number) { this.setZoom(this.zoom * f) }
  resetView() { this.zoom = 0.85; this.pan = { x: 0, y: 0 }; this.onZoom?.(this.zoom) }

  private seedStars() {
    const count = this.noStarfield ? 0 : this.reduced ? 70 : Math.min(190, Math.round((this.w * this.h) / 8200))
    this.particles = Array.from({ length: count }, () => {
      const dx = (Math.random() - 0.5) * 0.1, dy = (Math.random() - 0.5) * 0.1
      return { x: Math.random() * this.w, y: Math.random() * this.h, vx: dx, vy: dy, dx, dy, size: 0.6 + Math.random() * 1.3, b: 0.16 + Math.random() * 0.42 }
    })
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
    this.container.removeEventListener('wheel', this.onWheel)
  }

  private onMove = (ev: PointerEvent) => {
    const rect = this.container.getBoundingClientRect()
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top
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
    this.down = { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
    this.mouse.x = this.down.x; this.mouse.y = this.down.y; this.dragging = false
  }
  private onUp = () => {
    if (this.down && !this.dragging) {
      if (this.hovered) {
        // click on a body → pin/unpin it
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

    this.drawStars(t, intro)
    this.resolve(t)
    this.drawOrbits(t)
    this.drawCenters(intro)
    this.drawLinks(t, intro)
    this.drawReveal(t, intro)
    for (let k = 0; k < this.nodes.length; k++) { this.nodes[k].appear = clamp01((t - k * 0.06) / 1.5); this.drawNode(this.nodes[k], t) }
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

  // structural rings (around C or a hub) per the ring spec — each ring staggers in separately
  private drawOrbits(t: number) {
    const ctx = this.ctx
    const s = this.viewScale * this.zoom
    for (let ri = 0; ri < RINGS.length; ri++) {
      const ring = RINGS[ri]
      const ringIntro = clamp01((t - ri * 0.3) / 3.5)
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      const lit = this.focusId && (ring.around === this.focusId || this.connected.has(ring.around))
      const dim = this.focusId && !lit
      const base = ring.he ? 0.3 : 0.16
      ctx.beginPath(); ctx.arc(c.x, c.y, ring.r * s, 0, TAU * easeOutCubic(ringIntro))
      ctx.strokeStyle = `rgba(${YELLOW},${(lit ? 0.55 : dim ? 0.05 : base) * ringIntro})`
      ctx.lineWidth = 1
      if (ring.dash) ctx.setLineDash([2, 7])
      ctx.stroke(); ctx.setLineDash([])
    }
  }

  private drawCenters(intro: number) {
    const ctx = this.ctx
    const s = this.viewScale * this.zoom
    ctx.save(); ctx.textAlign = 'center'
    // axis labels near their hub
    ctx.font = "700 14px 'Tel Aviv Brutalist', sans-serif"
    for (const ax of AXES) {
      const hub = this.world.get(ax.around); if (!hub) continue
      const c = this.toScreen(hub.x, hub.y)
      ctx.fillStyle = `rgba(${WHITE},${0.42 * intro})`
      ctx.fillText(ax.he, c.x, c.y + ax.dy * 175 * s)
    }
    // named ring labels
    ctx.font = "400 12px 'Tel Aviv Brutalist', sans-serif"
    for (const ring of RINGS) {
      if (!ring.he) continue
      const anc = this.world.get(ring.around); if (!anc) continue
      const c = this.toScreen(anc.x, anc.y)
      ctx.fillStyle = `rgba(${YELLOW},${0.4 * intro})`
      ctx.fillText(ring.he, c.x, c.y + ring.r * s + 14)
    }
    ctx.restore()
  }

  private drawLinks(t: number, intro: number) {
    const ctx = this.ctx
    // zoom-out → the bloc skeleton: strengthen the faint alliance web
    const webAlpha = VISUALS.allianceWebAlpha + VISUALS.webBoostMax * this.simplifyT
    for (let li = 0; li < LINKS.length; li++) {
      const [a, b] = LINKS[li]
      const na = this.nodes[idIndex.get(a)!], nb = this.nodes[idIndex.get(b)!]
      if (!na || !nb) continue
      const lit = this.focusId ? this.connected.has(a) && this.connected.has(b) : false
      if (!lit && this.focusId) continue
      if (!lit && !VISUALS.allianceWeb) continue
      const dx = nb.sx - na.sx, dy = nb.sy - na.sy
      const cx = (na.sx + nb.sx) / 2 - dy * 0.1, cy = (na.sy + nb.sy) / 2 + dx * 0.1
      ctx.beginPath(); ctx.moveTo(na.sx, na.sy); ctx.quadraticCurveTo(cx, cy, nb.sx, nb.sy)
      ctx.strokeStyle = `rgba(${YELLOW},${(lit ? 0.85 : webAlpha) * intro})`; ctx.lineWidth = lit ? 1.4 : 1; ctx.stroke()
      if (lit) { const p = (t * 0.45 + li * 0.13) % 1, q = 1 - p; const lx = q * q * na.sx + 2 * q * p * cx + p * p * nb.sx, ly = q * q * na.sy + 2 * q * p * cy + p * p * nb.sy; ctx.fillStyle = `rgba(${YELLOW},0.95)`; ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, TAU); ctx.fill() }
    }
  }

  // ZOOM-IN reveal: the wiring underneath. Thin curved patron→proxy backing flows (yellow) plus
  // optional pole-tinted authored hairlines, all easing in past the detail gate. Additive only.
  private drawReveal(t: number, intro: number) {
    const dt = this.detailT
    if (dt <= 0) return
    const ctx = this.ctx
    const focus = this.focusId
    ctx.save()
    // pole-tinted authored hairlines — the strongest authored relation per visible body
    ctx.lineWidth = 1
    for (const ed of AUTHORED_EDGES) {
      if (focus && ed.a !== focus && ed.b !== focus && !this.connected.has(ed.a) && !this.connected.has(ed.b)) continue
      const na = this.nodes[idIndex.get(ed.a)!], nb = this.nodes[idIndex.get(ed.b)!]
      if (!na || !nb) continue
      const dx = nb.sx - na.sx, dy = nb.sy - na.sy
      const cx = (na.sx + nb.sx) / 2 + dy * 0.06, cy = (na.sy + nb.sy) / 2 - dx * 0.06
      ctx.beginPath(); ctx.moveTo(na.sx, na.sy); ctx.quadraticCurveTo(cx, cy, nb.sx, nb.sy)
      ctx.strokeStyle = `rgba(${ed.pole},${VISUALS.authoredEdgeAlpha * dt * intro})`
      ctx.stroke()
    }
    // backing flows — patron → proxy, subtle yellow, a travelling dot reads direction of support
    ctx.lineWidth = 1
    for (let i = 0; i < BACKING_FLOWS.length; i++) {
      const f = BACKING_FLOWS[i]
      if (focus && f.patron !== focus && f.proxy !== focus && !this.connected.has(f.patron) && !this.connected.has(f.proxy)) continue
      const np = this.nodes[idIndex.get(f.patron)!], nx = this.nodes[idIndex.get(f.proxy)!]
      if (!np || !nx) continue
      const dx = nx.sx - np.sx, dy = nx.sy - np.sy
      const cx = (np.sx + nx.sx) / 2 - dy * 0.16, cy = (np.sy + nx.sy) / 2 + dx * 0.16
      ctx.beginPath(); ctx.moveTo(np.sx, np.sy); ctx.quadraticCurveTo(cx, cy, nx.sx, nx.sy)
      ctx.strokeStyle = `rgba(${YELLOW},${VISUALS.backingFlowAlpha * dt * intro})`
      ctx.stroke()
      if (!this.reduced) {
        const p = (t * 0.35 + i * 0.17) % 1, q = 1 - p
        const lx = q * q * np.sx + 2 * q * p * cx + p * p * nx.sx
        const ly = q * q * np.sy + 2 * q * p * cy + p * p * nx.sy
        ctx.fillStyle = `rgba(${YELLOW},${0.8 * dt * intro})`
        ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, TAU); ctx.fill()
      }
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
    const focus = this.focusId
    const isFocus = e.id === focus
    const inWeb = !focus || isFocus || this.connected.has(e.id)
    const pulse = this.reduced ? 1 : 1 + 0.04 * Math.sin(t * 1.6 + ns.pulse)
    const r = ns.sr * a * (isFocus ? 1.18 : 1) * pulse
    const nonstate = e.kind === 'nonstate'
    const axisCol = AXIS_COLOR[AXIS[e.id] ?? 'none']
    // zoom-out simplify: fade minor, non-hub bodies toward the floor (keep focus/connected lit)
    const exempt = isFocus || this.connected.has(e.id) || HUBS.has(e.id) || !MINOR_KINDS.has(e.kind)
    const simplify = exempt ? 1 : 1 - (1 - VISUALS.minorFadeFloor) * this.simplifyT
    ctx.save(); ctx.globalAlpha = a * (inWeb ? 1 : 0.2) * simplify

    // soft glow / corona — states only (great powers a touch stronger)
    if (inWeb && !nonstate) this.glow(ns.sx, ns.sy, r * (isFocus ? 2.4 : e.kind === 'great' ? 2.0 : 1.55), e.kind === 'great' ? 0.12 : 0.07)
    // focus pulse rings
    if (isFocus) {
      const since = (this.now - this.hoverSince) / 1000
      for (let k = 0; k < 2; k++) { const pp = (since * 0.9 + k * 0.5) % 1; ctx.strokeStyle = `rgba(${YELLOW},${(1 - pp) * 0.5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ns.sx, ns.sy, r + 6 + pp * 42, 0, TAU); ctx.stroke() }
    }

    if (nonstate && VISUALS.nonStateHollow) {
      // hollow body → reads as a non-state actor; ring carries the bloc colour
      const rr = Math.max(2.6, r)
      ctx.beginPath(); ctx.arc(ns.sx, ns.sy, rr, 0, TAU); ctx.fillStyle = `rgba(${DARK},0.55)`; ctx.fill()
      ctx.strokeStyle = `rgba(${axisCol},${isFocus ? 1 : 0.82})`; ctx.lineWidth = 1.3; ctx.stroke()
    } else {
      // filled state disk
      ctx.beginPath(); ctx.arc(ns.sx, ns.sy, r, 0, TAU); ctx.fillStyle = `rgb(${LIGHT})`; ctx.fill()
      if (VISUALS.allegianceRim) { ctx.beginPath(); ctx.arc(ns.sx, ns.sy, r, 0, TAU); ctx.strokeStyle = `rgba(${axisCol},${VISUALS.rimAlpha})`; ctx.lineWidth = 1.5; ctx.stroke() }
      if (e.kind === 'great' && VISUALS.greatCorona) { ctx.beginPath(); ctx.arc(ns.sx, ns.sy, r + 4, 0, TAU); ctx.strokeStyle = `rgba(${WHITE},0.2)`; ctx.lineWidth = 1; ctx.stroke() }
    }
    ctx.restore()
  }

  private updateLabels() {
    const placed = this.placedBuf; placed.length = 0 // reuse scratch — no per-frame array allocation
    const showMinor = !VISUALS.zoomGatedLabels || this.zoom >= VISUALS.labelGate
    for (const ns of this.labelOrder) {
      const el = this.labels.get(ns.e.id); if (!el) continue
      const a = easeOutCubic(ns.appear)
      const x = ns.sx, y = ns.sy + ns.sr * a + 12
      el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`
      const fs = ns.e.kind === 'great' || ns.e.kind === 'regional' ? 15 : ns.e.kind === 'nonstate' ? 11 : 12
      const w = ns.e.he.length * fs * 0.58, hh = fs * 1.3
      const forced = !!this.focusId && this.connected.has(ns.e.id)
      const minor = ns.e.kind === 'intermediate' || ns.e.kind === 'edge' || ns.e.kind === 'nonstate'
      let hide = ns.sx < -40 || ns.sx > this.w + 40 || ns.sy < -40 || ns.sy > this.h + 40
      if (!forced && minor && !showMinor) hide = true
      // zoom-out skeleton: drop minor, non-hub labels once the simplify ramp engages
      if (!forced && minor && !HUBS.has(ns.e.id) && this.simplifyT > 0.5) hide = true
      if (!hide && !forced) for (const p of placed) { if (Math.abs(x - p.x) < (w + p.w) / 2 - 4 && Math.abs(y - p.y) < (hh + p.h) / 2 - 1) { hide = true; break } }
      const dim = this.focusId && !this.connected.has(ns.e.id) ? 0.14 : 1
      el.style.opacity = String(hide ? 0 : a * dim)
      if (!hide) placed.push({ x, y, w, h: hh })
    }
  }
}
