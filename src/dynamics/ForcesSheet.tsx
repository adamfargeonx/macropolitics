// ForcesSheet — the committed reading of the Forces page: a horizontal FORCE-FIELD. Each state is a
// luminous body whose RADIUS = its live power (mass). Bodies are packed across the full width of the
// field (no centred square, no wireframe mesh) so the strong dwarf the weak — size alone carries the
// story. Hover/select bloom each body with a gentle, premium-eased glow. setGravities() eases each
// body's mass toward the active scenario/year so the field re-forms rather than snapping.
//
// Scrollytelling layer — a GUIDED TOUR down the power ranking, one state at a time. The desktop
// wheel is DISCRETE: each gesture steps a focus index through the states sorted by the active metric
// (step 0 = the whole field, step 1 = the #1 power, step 2 = #2 …), with a cooldown so one continuous
// scroll can't blow through several states. The focused state reads as THE subject (the same bloom +
// solid-yellow-fill treatment a hovered/selected body gets); a real CAMERA (pan + zoom, mirroring
// engine.ts's OrbitalField) eases so that state's true position lands at the canvas centre — the
// FIELD moves, not the body — while every other state simply rides along at its true relative
// position (naturally drifting outward as the camera zooms in) and dims. A per-state editorial
// annotation (rank · score · tier · bloc + a one-line note) rides the focus. Escape or a click on
// empty canvas exits the tour and eases the camera back to the default identity frame.
//
// Architecture mirrors engine.ts: a class drives requestAnimationFrame with devicePixelRatio handling
// via ctx.setTransform, cached rect refreshed on resize/pointerenter, full cleanup on unmount.

import { useEffect, useMemo, useRef, useState } from 'react'
import { NODES, AXIS, type Kind, type Entity } from '../data/entities'
import { type GravityResult } from '../model/gravity'
import { type Order, type Bloc, metricVal } from './forces-model'
import { isInteractive } from '../sound'

// ── Constants (mirroring engine.ts palette) ──────────────────────────────────
const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
// dark ink for in-body text drawn over the LIGHT fill (mirrors engine.ts's DARK constant) —
// the body fill is near-white, so labels drawn on top need a dark colour to stay legible.
const DARK = '11,0,36'
const TAU = Math.PI * 2

// The field's usable fraction of the shorter side — radii scale by this so packing stays isotropic.
const PLAY = 0.92

// ── DRAMATIC scale — size IS the story ────────────────────────────────────────
const R_MIN_F = 0.0075
const R_MAX_F = 0.165
const R_EXP = 1.45
const radiusFrac = (power: number) =>
  R_MIN_F + Math.pow(Math.max(0, power) / 100, R_EXP) * (R_MAX_F - R_MIN_F)

// ── Page-exit cascade — on the `mp-exit` signal (leaving to home) each body plays its OWN
// staggered shrink+fade so the field empties body-by-body instead of the whole rail zooming out.
// EXIT_SPREAD = the window over which bodies BEGIN leaving (count-independent, ranked strong→weak);
// EXIT_BODY_DUR = how long each individual body takes to vanish. Total ≈ SPREAD + DUR, kept in
// sync with App.tsx's EXIT_MS and the Relations CSS cascade so all three read consistently.
const EXIT_SPREAD = 360
const EXIT_BODY_DUR = 300

// ── Scroll tour — how far un-focused states dim (a lens effect; POSITION is now the camera's job,
// not a per-body hack — see the pan/zoom camera below) ──
const RECEDE_DIM = 0.7

// ── Scroll-tour CAMERA — pan + zoom, mirroring engine.ts's OrbitalField camera exactly: bodies keep
// their true layout position; the camera eases so the focused body's position lands at canvas centre.
// A gentle push-in (not a dramatic close-up) so the rest of the field stays legibly in frame.
const CAM_FOCUS_ZOOM = 1.22
const CAM_DUR = 700 // ms — camera pan/zoom tween duration, expo-out (matches engine.ts's CAM_DUR feel)
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

// Mobile only: the filter sheet's tier-focus list picks a Kind; map each tier stage (1..5, matching
// TIER_ANNOTS order) to its Kind so a tier pick focuses that tier's leading (highest-ranked) state.
const STAGE_KIND: Record<number, Kind> = {
  1: 'great', 2: 'regional', 3: 'intermediate', 4: 'edge', 5: 'nonstate',
}

// ── Body layout ──────────────────────────────────────────────────────────────
interface WellBody {
  id: string
  he: string
  power: number
  axis: string
  kind: Kind
  nx: number
  ny: number
}

// ── Composition — a radial POWER DIAL, live to both the bloc filter and the sort metric ─────────
// ANGLE = bloc alignment: the western bloc sweeps a wedge centred due-left, the eastern bloc a
// wedge centred due-right, and the neutral/unaligned bodies fill whatever is left over — split into
// the two symmetric gaps above and below the west/east seam (there is no single "third slot" once
// west and east each own a side, so neutral naturally lands in both). RADIUS = the body's GLOBAL
// rank under the ACTIVE sort metric — strongest nearest the centre, weakest out toward the rim —
// so the dial reads as a literal gravity well regardless of which bloc owns which wedge.
// Both axes are driven by ForcesView's live filter state (see `layoutFor`, called from
// `setLayout()`), not baked in once at import time: picking a bloc widens that bloc's wedge and
// compresses the others; changing the sort metric reshuffles every body's radius. Positions EASE
// toward the new layout (see the class's nx/ny vs nxTarget/nyTarget) rather than snapping.
type Cat = 'west' | 'east' | 'neutral'
const catOf = (id: string): Cat => {
  const a = AXIS[id] ?? 'none'
  return a === 'west' ? 'west' : a === 'east' ? 'east' : 'neutral'
}
const GOLDEN = 2.399963229728653
// Collision margin between any two bodies (normalized units) for the placement search below.
const PACK_MARGIN = 0.018
// Baseline anchor for each bloc when no filter narrows the field — spread well apart (west/east
// each own a side, neutral rides the top) so the three read as distinct zones even at a glance.
const CAT_ANCHOR: Record<Cat, [number, number]> = { west: [0.24, 0.48], east: [0.76, 0.48], neutral: [0.5, 0.16] }
// Where a bloc's neighbourhood sits with a filter ACTIVE: the selected bloc's anchor moves to the
// true centre (so it can spread across the whole canvas, unconstrained by its usual side), while
// the other two retreat into small opposite corners — visibly "sidelined" rather than merely dimmed.
const CAT_CORNER: Record<Cat, [number, number]> = { west: [0.13, 0.86], east: [0.87, 0.86], neutral: [0.5, 0.07] }
function anchorFor(filterBloc: Bloc, cat: Cat): [number, number] {
  if (filterBloc === 'all') return CAT_ANCHOR[cat]
  return cat === filterBloc ? [0.5, 0.5] : CAT_CORNER[cat]
}
// How far each bloc's golden-spiral fill is allowed to reach from its anchor — the SAME spiral
// shape the site's proven collision-safe packer already used (see the retired `powerLayout`), just
// scaled per-bloc: the selected bloc gets a generous reach so it can spread out and dominate the
// canvas; the sidelined blocs get a tight one so they compress into their corner instead of
// spilling back into the centre.
function reachFor(filterBloc: Bloc, cat: Cat): number {
  if (filterBloc === 'all') return 0.3
  return cat === filterBloc ? 0.47 : 0.14
}

// Every body's target (nx, ny) under the current (filterBloc, orderBy, grav) — a pure function of
// live state, recomputed whenever any of the three changes (see GravityWell.setLayout). Places
// bodies bloc-by-bloc with the SAME collision-safe golden-spiral search the field has always used
// (fits/clear/spiral) rather than a closed-form formula — a formula-only approach (tried first)
// couldn't reliably keep the biggest disks from overlapping near a shared centre point without an
// aggressive relax pass afterwards, and that relax pass ended up scrambling the very bloc
// separation this composition exists to show. Search-based placement guarantees zero overlap by
// construction, and — because each bloc's list is already sorted strongest-first — the biggest
// body of each bloc naturally lands nearest ITS OWN anchor with weaker ones spiralling outward, so
// "distance from a bloc's own centre" still reads as that bloc's internal power hierarchy.
function layoutFor(filterBloc: Bloc, order: Order, grav: Map<string, GravityResult>): Map<string, { nx: number; ny: number }> {
  const rankOf = (n: Entity) => (grav.size ? metricVal(n, order, grav) : n.power)
  const ranked = [...NODES].sort((a, b) => rankOf(b) - rankOf(a))
  const byCat: Record<Cat, Entity[]> = { west: [], east: [], neutral: [] }
  for (const n of ranked) byCat[catOf(n.id)].push(n) // already rank-sorted (stable partition)

  const placedXY: { nx: number; ny: number }[] = []
  const placedR: number[] = []
  const fits = (x: number, y: number, r: number) => x - r >= 0.02 && x + r <= 0.98 && y - r >= 0.02 && y + r <= 0.98
  const clear = (x: number, y: number, r: number) => {
    for (let j = 0; j < placedXY.length; j++) {
      if (Math.hypot(x - placedXY[j].nx, y - placedXY[j].ny) < r + placedR[j] + PACK_MARGIN) return false
    }
    return true
  }

  const out = new Map<string, { nx: number; ny: number }>()
  const CATS: Cat[] = ['west', 'east', 'neutral']
  for (const cat of CATS) {
    const [acx, acy] = anchorFor(filterBloc, cat)
    const spiralK = 0.017 * (reachFor(filterBloc, cat) / 0.3)
    byCat[cat].forEach((n) => {
      const r = radiusFrac(n.power)
      let nx = acx, ny = acy
      for (let s = 0; s < 4000; s++) {
        const ang = s * GOLDEN
        const rad = spiralK * Math.sqrt(s)
        const x = acx + Math.cos(ang) * rad
        const y = acy + Math.sin(ang) * rad
        if (!fits(x, y, r) || !clear(x, y, r)) continue
        nx = x; ny = y; break
      }
      placedXY.push({ nx, ny }); placedR.push(r)
      out.set(n.id, { nx, ny })
    })
  }
  return out
}

// Identity-only — every body's static fields (position now lives on the class instance, since it
// must ease toward a live-recomputed target rather than stay fixed after import).
const BODIES: WellBody[] = (() => {
  const initial = layoutFor('all', 'total', new Map())
  return NODES.map((n) => {
    const p = initial.get(n.id)!
    return { id: n.id, he: n.he, power: n.power, axis: AXIS[n.id] ?? 'none', kind: n.kind, nx: p.nx, ny: p.ny }
  })
})()
// id → canvas body index — translates the metric-ranked tour order into canvas indices for the
// well's scroll focus.
const BODY_INDEX = new Map(BODIES.map((b, i) => [b.id, i]))

// ── ForceField engine class ────────────────────────────────────────────────────
class GravityWell {
  private ctx: CanvasRenderingContext2D
  private w = 0; private h = 0; private dpr = 1
  private raf = 0
  private start = 0
  private reduced: boolean
  private canvas: HTMLCanvasElement
  private container: HTMLElement

  private mouse = { x: -9999, y: -9999 }
  private hoveredIdx: number | null = null
  private selectedIdx: number | null = null

  private bodyScreenX: Float32Array
  private bodyScreenY: Float32Array
  // live (eased) world position, [0,1] normalized — recomputed targets arrive from setLayout()
  // (bloc filter / sort metric change) and nx/ny glide toward nxTarget/nyTarget every frame,
  // exactly like `mass`/`massTarget` already do, so a filter change re-forms the dial rather than
  // snapping the field into its new shape.
  private nx: Float32Array
  private ny: Float32Array
  private nxTarget: Float32Array
  private nyTarget: Float32Array
  private bodyAppear: Float32Array
  private bloom: Float32Array
  private breathPhase: Float32Array
  private mass: Float32Array
  private massTarget: Float32Array
  private metricAlpha: Float32Array
  // live 0–10 eco/mil/geo axis scores per body — feeds the in-circle axis graph on the focused
  // body (setField() populates these from the same `grav` map the component already has).
  private axisEco: Float32Array
  private axisMil: Float32Array
  private axisGeo: Float32Array
  // scroll-tour recede: 0 (in place) → 1 for every state that is NOT the current focus — a LENS
  // effect only now (dims via RECEDE_DIM in the draw loop). Position/centring is the camera's job
  // (see camPan/camZoom below), not a per-body pull hack.
  private recede: Float32Array
  // hoverProg: per-body 0→1 reveal value, eased in the draw loop (NOT a CSS transition).
  // Drives ONLY the grow-to-readable-floor on the hovered/selected body (the fill turns solid
  // yellow immediately via isFocus — no hollowing, no abstract signature any more).
  private hoverProg: Float32Array
  // shared fade-in curve for in-circle name labels (set once per frame, read per body)
  private labelIntro = 0
  // indices that carry an on-canvas name label this frame (top-N by active metric + focus)
  private labelSet = new Set<number>()

  // ── Scroll-tour camera (pan + zoom) — mirrors engine.ts's OrbitalField camera. Bodies are laid
  // out at fixed (nx,ny) positions; camPan/camZoom is a SEPARATE transform applied on top when
  // projecting to screen, so centring the focused body moves the FRAME, never the body's own
  // world position. `cam` is the in-flight tween (null once settled).
  private camZoom = 1
  private camPan = { x: 0, y: 0 }
  private cam: { fromZoom: number; toZoom: number; fromPan: { x: number; y: number }; toPan: { x: number; y: number }; t0: number; dur: number } | null = null
  onTourExit?: () => void

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

  // ── Scroll tour focus ─────────────────────────────────────────────────────
  // scrollFocusIdx: the canvas body index the tour currently focuses (-1 = whole field, no focus).
  // Set from the component (wheel step on desktop, tier pick on mobile). The recede/pull easing +
  // the shared focus treatment (bloom / yellow fill / ring) do the rest — no spring value needed.
  private scrollFocusIdx = -1

  // ── Page-exit cascade state ─────────────────────────────────────────────────
  // exiting: once true (playExit), each body's exitProg eases 0→1 (0 = present, 1 = gone) offset by
  // a per-body delay so they leave in a ranked cascade. Real-time driven (exitStart), independent of
  // the freeze-adjusted animation clock, so a logo-hover freeze doesn't stall the exit.
  private exiting = false
  private exitStart = 0
  private exitDelay: Float32Array
  private exitProg: Float32Array

  onHover?: (idx: number | null) => void
  onSelect?: (idx: number | null) => void

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas
    this.container = container
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('ForceField: 2D context unavailable')
    this.ctx = ctx
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const n = BODIES.length
    this.bodyScreenX = new Float32Array(n)
    this.bodyScreenY = new Float32Array(n)
    this.bodyAppear = new Float32Array(n).fill(0)
    this.bloom = new Float32Array(n).fill(1)
    this.breathPhase = new Float32Array(n).map((_, i) => (i * 2.39) % TAU)
    this.mass = new Float32Array(n).map((_, i) => BODIES[i].power)
    this.massTarget = new Float32Array(n).map((_, i) => BODIES[i].power)
    this.nx = new Float32Array(n).map((_, i) => BODIES[i].nx)
    this.ny = new Float32Array(n).map((_, i) => BODIES[i].ny)
    this.nxTarget = new Float32Array(n).map((_, i) => BODIES[i].nx)
    this.nyTarget = new Float32Array(n).map((_, i) => BODIES[i].ny)
    this.metricAlpha = new Float32Array(n).fill(1)
    this.axisEco = new Float32Array(n)
    this.axisMil = new Float32Array(n)
    this.axisGeo = new Float32Array(n)
    this.hoverProg = new Float32Array(n)
    this.recede = new Float32Array(n)
    this.exitDelay = new Float32Array(n)
    this.exitProg = new Float32Array(n)

    this.resize()
    this.container.addEventListener('pointermove', this.onMove)
    this.container.addEventListener('pointerleave', this.onLeave)
    this.container.addEventListener('pointerdown', this.onDown)
  }

  // narrow (phone) field: lift the tap-target floor so the smallest bodies stay reliably
  // tappable — the packing/radius formula itself is unchanged, only the tappable minimum.
  private narrow = false

  resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
    this.narrow = this.w < 480
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    // the canvas centre + every body's base screen position depend on w/h — if a tour focus is
    // active, snap (no animation) the camera to the recomputed target rather than let it drift
    // from stale geometry until the next focus change re-tweens it.
    if (this.scrollFocusIdx >= 0) {
      const t = this.cameraTargetFor(this.scrollFocusIdx)
      this.camZoom = t.zoom; this.camPan = t.pan; this.cam = null
    }
  }

  start_() { this.start = performance.now(); this.raf = requestAnimationFrame(this.frame) }

  // Size (and gently dim) every body to the SELECTED metric — the whole field re-forms to the lens.
  // total = live gravity power; eco/mil/geo = that axis score (0–10 → 0–100, comparable to power).
  setField(order: Order, grav: Map<string, GravityResult>) {
    for (let i = 0; i < BODIES.length; i++) {
      const g = grav.get(BODIES[i].id)
      const metric = order === 'total'
        ? (g?.power ?? BODIES[i].power)
        : (g ? (order === 'eco' ? g.eco : order === 'mil' ? g.mil : g.geo) : 0) * 10
      this.massTarget[i] = metric
      // size carries the story; alpha is a gentle assist so weak-in-this-lens bodies recede
      this.metricAlpha[i] = order === 'total' ? 1 : Math.max(0.45, metric / 100)
      this.axisEco[i] = g?.eco ?? 0
      this.axisMil[i] = g?.mil ?? 0
      this.axisGeo[i] = g?.geo ?? 0
    }
  }

  // Re-form the dial for the current (bloc filter, sort metric) — sets new EASE TARGETS only;
  // the frame loop glides nx/ny toward them (see the position-ease block in `frame`), so a filter
  // or sort change visibly reshuffles the field rather than snapping it into its new shape.
  setLayout(filterBloc: Bloc, order: Order, grav: Map<string, GravityResult>) {
    const next = layoutFor(filterBloc, order, grav)
    for (let i = 0; i < BODIES.length; i++) {
      const p = next.get(BODIES[i].id)
      if (!p) continue
      this.nxTarget[i] = p.nx
      this.nyTarget[i] = p.ny
    }
  }

  // Set the tour focus (called from the wheel step / mobile tier pick in the component). -1 clears
  // the focus (whole field visible). Eases the CAMERA (pan+zoom) toward centring the focused body —
  // bodies themselves never move; the recede easing in the frame loop still drives the dim-lens.
  setScrollFocus(idx: number) {
    if (idx === this.scrollFocusIdx) return
    this.scrollFocusIdx = idx
    const t = this.cameraTargetFor(idx)
    this.tweenCamera(t.zoom, t.pan)
  }

  // Whole-field screen position a body would sit at with NO camera applied — the camera transform
  // (camPan/camZoom, applied in the frame loop) is a separate layer on top of this base layout.
  private cameraTargetFor(idx: number): { zoom: number; pan: { x: number; y: number } } {
    const [ccx, ccy] = this.bodyToScreen(0.5, 0.5)
    if (idx < 0 || !BODIES[idx]) return { zoom: 1, pan: { x: 0, y: 0 } }
    const [rawX, rawY] = this.bodyToScreen(this.nx[idx], this.ny[idx])
    const z = CAM_FOCUS_ZOOM
    return { zoom: z, pan: { x: -(rawX - ccx) * z, y: -(rawY - ccy) * z } }
  }

  // Start a smooth pan+zoom tween toward a target camera state (expo-out, ~700ms) — same shape as
  // engine.ts's OrbitalField.tweenCamera.
  private tweenCamera(toZoom: number, toPan: { x: number; y: number }) {
    this.cam = {
      fromZoom: this.camZoom, toZoom,
      fromPan: { x: this.camPan.x, y: this.camPan.y }, toPan,
      t0: performance.now(), dur: this.reduced ? 0 : CAM_DUR,
    }
  }

  // Advance the in-flight camera tween, if any.
  private stepCamera(now: number) {
    if (!this.cam) return
    const c = this.cam
    const k = c.dur <= 0 ? 1 : Math.max(0, Math.min(1, (now - c.t0) / c.dur))
    const e = easeOutExpo(k)
    this.camZoom = c.fromZoom + (c.toZoom - c.fromZoom) * e
    this.camPan.x = c.fromPan.x + (c.toPan.x - c.fromPan.x) * e
    this.camPan.y = c.fromPan.y + (c.toPan.y - c.fromPan.y) * e
    if (k >= 1) this.cam = null
  }

  isTourActive(): boolean { return this.scrollFocusIdx >= 0 }

  // ── Play the page-exit cascade (leaving to home) ────────────────────────────
  // Each body leaves individually, offset by a per-body delay spread over EXIT_SPREAD in RANK order
  // (strongest first → the cascade reads down the power hierarchy). Unfreezes first: the header logo
  // hover freezes the field, and a frozen frame loop would otherwise never advance the exit.
  playExit() {
    if (this.exiting) return
    this.setFrozen(false)
    this.exiting = true
    this.exitStart = performance.now()
    const order = Array.from({ length: BODIES.length }, (_, i) => i).sort((a, b) => this.mass[b] - this.mass[a])
    const N = order.length
    order.forEach((bi, pos) => { this.exitDelay[bi] = (N <= 1 ? 0 : pos / (N - 1)) * EXIT_SPREAD })
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.container.removeEventListener('pointermove', this.onMove)
    this.container.removeEventListener('pointerleave', this.onLeave)
    this.container.removeEventListener('pointerdown', this.onDown)
  }

  private onMove = (ev: PointerEvent) => {
    // ignore moves originating on real controls (the tier chip bar lives inside this same
    // container) — otherwise hovering a button previews whatever body sits behind it
    if (isInteractive(ev.target)) return
    const r = this.container.getBoundingClientRect()
    this.mouse.x = ev.clientX - r.left
    this.mouse.y = ev.clientY - r.top
    this.hitTest()
  }
  private onLeave = () => {
    this.mouse.x = -9999; this.mouse.y = -9999
    if (this.hoveredIdx !== null) { this.hoveredIdx = null; this.onHover?.(null) }
  }
  private onDown = (ev?: PointerEvent) => {
    // ignore presses that start on real controls (tier chips) — they're DOM descendants of
    // this same container, so their pointerdown bubbles here too; without this guard, tapping
    // a chip also hit-tests and can select whatever body happens to sit behind it
    if (ev && isInteractive(ev.target)) return
    // harden tap hit-testing: a still touch tap may emit no pointermove first, so resolve the
    // body at the press point now instead of trusting a prior hover.
    if (ev) {
      const r = this.container.getBoundingClientRect()
      this.mouse.x = ev.clientX - r.left
      this.mouse.y = ev.clientY - r.top
      this.hitTest()
    }
    if (this.hoveredIdx !== null) {
      const next = this.selectedIdx === this.hoveredIdx ? null : this.hoveredIdx
      this.selectedIdx = next
      this.onSelect?.(next)
    } else {
      if (this.selectedIdx !== null) {
        this.selectedIdx = null
        this.onSelect?.(null)
      }
      // click/tap on EMPTY canvas space (no body hit) while the scroll tour has an active focus →
      // exit the tour (the component clears the focus index; the resulting setScrollFocus(-1)
      // eases the camera back to the default frame).
      if (this.scrollFocusIdx >= 0) this.onTourExit?.()
    }
    // touch has no pointerleave — clear the transient hover so no stale hover treatment sticks to
    // a non-selected body (the selected body's own focus fill/graph is driven by selectedIdx now)
    if (ev?.pointerType === 'touch') {
      this.mouse.x = -9999; this.mouse.y = -9999
      if (this.hoveredIdx !== null) { this.hoveredIdx = null; this.onHover?.(null) }
    }
  }

  private hitTest() {
    let best: number | null = null
    let bestD = Infinity
    const padFloor = this.narrow ? 22 : 18
    for (let i = 0; i < BODIES.length; i++) {
      const d = Math.hypot(this.bodyScreenX[i] - this.mouse.x, this.bodyScreenY[i] - this.mouse.y)
      // pad scales with the camera zoom so hit-testing matches what's actually drawn on screen
      // while the tour camera is pushed in on a focused body.
      const pad = Math.max(this.bodyR(this.mass[i]) * this.camZoom + 10, padFloor)
      if (d < pad && d < bestD) { bestD = d; best = i }
    }
    if (best !== this.hoveredIdx) { this.hoveredIdx = best; this.onHover?.(best) }
  }

  private get playSize() { return Math.min(this.w, this.h) * PLAY }
  // on a phone, lift the floor so the smallest bodies (edge/nonstate powers) render a bit
  // larger — reads less like a scatter of specks, easier to tap
  private bodyR(power: number) {
    const r = radiusFrac(power) * this.playSize
    return this.narrow ? Math.max(r, 9) : r
  }

  private bodyToScreen(nx: number, ny: number): [number, number] {
    const padX = this.w * 0.06
    const padY = this.h * 0.08
    return [padX + nx * (this.w - padX * 2), padY + ny * (this.h - padY * 2)]
  }

  private frame = (now: number) => {
    if (this.frozen) { this.raf = requestAnimationFrame(this.frame); return }
    const t = (now - this.start) / 1000
    const labelIntro = Math.max(0, Math.min(1, t / 2.5))
    for (let i = 0; i < BODIES.length; i++) {
      this.bodyAppear[i] = Math.max(0, Math.min(1, (t - i * 0.12) / 0.6))
    }
    const ctx = this.ctx

    ctx.clearRect(0, 0, this.w, this.h)

    const scrollFocus = this.scrollFocusIdx
    const tourActive = scrollFocus >= 0

    // Advance the camera tween (pan+zoom), THEN project every body's true base position through
    // it — this is what makes the tour "the camera moves, not the body": every body (including the
    // focused one) keeps its real (nx,ny)-derived layout position; camPan/camZoom is one shared
    // transform applied uniformly, so un-focused bodies drift outward as a natural side-effect of
    // the camera pushing in on the focused one, exactly like a real lens.
    this.stepCamera(now)
    const [ccx, ccy] = this.bodyToScreen(0.5, 0.5)
    for (let i = 0; i < BODIES.length; i++) {
      const isTourFocus = i === scrollFocus
      const recTarget = tourActive && !isTourFocus ? 1 : 0
      if (this.reduced) {
        this.recede[i] = recTarget
      } else {
        this.recede[i] += (recTarget - this.recede[i]) * (recTarget > this.recede[i] ? 0.08 : 0.06)
      }

      // ease the world position toward its live layout target (bloc filter / sort metric) — same
      // exponential-lerp shape as `mass`/`massTarget` above, so a filter change re-forms the dial
      // smoothly instead of the field jumping into its new shape.
      if (this.reduced) {
        this.nx[i] = this.nxTarget[i]; this.ny[i] = this.nyTarget[i]
      } else {
        this.nx[i] += (this.nxTarget[i] - this.nx[i]) * 0.06
        this.ny[i] += (this.nyTarget[i] - this.ny[i]) * 0.06
      }
      const [rawX, rawY] = this.bodyToScreen(this.nx[i], this.ny[i])
      this.bodyScreenX[i] = ccx + this.camPan.x + (rawX - ccx) * this.camZoom
      this.bodyScreenY[i] = ccy + this.camPan.y + (rawY - ccy) * this.camZoom
    }
    // Re-resolve hover against the JUST-updated positions — while the tour camera is panning/
    // zooming, bodies drift under a mouse that hasn't itself moved; without this a stale hover
    // can keep pointing at whatever body happened to be under the cursor before the camera moved
    // it away, showing two "focused" bodies at once (the tour's real focus + a stale hover ghost).
    if (this.mouse.x > -9000) this.hitTest()

    // ── Ease focus bloom + live mass ──────────────────────────────────────────
    for (let i = 0; i < BODIES.length; i++) {
      const isHov = i === this.hoveredIdx
      const isSel = i === this.selectedIdx
      const isScroll = i === scrollFocus
      // scroll-focused state reads as the primary subject → full bloom, like a selection
      const target = (isSel || isScroll) ? 2.2 : isHov ? 1.7 : 1.0
      const rate = this.bloom[i] < target ? 0.1 : 0.07
      this.bloom[i] += (target - this.bloom[i]) * rate
      this.mass[i] += this.reduced ? (this.massTarget[i] - this.mass[i]) : (this.massTarget[i] - this.mass[i]) * 0.12

      // ── Hover reveal progress (0→1) ───────────────────────────────────────
      // Expo-out feel: a per-frame lerp toward the hover state. Asymmetric rates —
      // a touch quicker in than out — land the ~280–360ms "fast then settle" curve.
      // reduced-motion: snap to the end state (no tween).
      // grow-to-readable-floor on hover OR selection (tap) — touch has no hover, so a
      // tapped/selected body must open the same way a hovered one does. (Fill goes solid
      // yellow immediately via isFocus; this only drives the size floor.)
      const hoverTarget = (isHov || isSel || isScroll) ? 1 : 0
      if (this.reduced) {
        this.hoverProg[i] = hoverTarget
      } else {
        const hrate = hoverTarget > this.hoverProg[i] ? 0.09 : 0.07
        this.hoverProg[i] += (hoverTarget - this.hoverProg[i]) * hrate
      }
    }

    // ── Which bodies carry an on-canvas name label ────────────────────────────
    // Same "always-legible ledger" set as before (top-N by the live/active metric, plus
    // whichever body is focused) — only the POSITION moved (in-circle instead of below),
    // and the rank NUMBER is gone. fewer labels on a narrow phone field so they don't pile up.
    const focus = this.selectedIdx ?? this.hoveredIdx ?? (scrollFocus >= 0 ? scrollFocus : null)
    const order = Array.from({ length: BODIES.length }, (_, i) => i)
      .sort((a, b) => this.massTarget[b] - this.massTarget[a])
    const TOP_N = this.narrow ? 5 : 8
    this.labelSet.clear()
    order.slice(0, TOP_N).forEach((idx) => this.labelSet.add(idx))
    if (focus !== null) this.labelSet.add(focus)

    // ── Page-exit cascade progress (0 = present → 1 = gone), per-body staggered ─
    if (this.exiting) {
      const ee = now - this.exitStart
      for (let i = 0; i < BODIES.length; i++) {
        this.exitProg[i] = this.reduced ? 1 : Math.max(0, Math.min(1, (ee - this.exitDelay[i]) / EXIT_BODY_DUR))
      }
    }

    // ── Draw bodies (in-circle name labels fade in with the same intro curve) ───
    this.labelIntro = labelIntro
    for (let i = 0; i < BODIES.length; i++) {
      this.drawBody(i, t)
    }

    this.raf = requestAnimationFrame(this.frame)
  }

  private drawBody(i: number, t: number) {
    const bodyA = this.bodyAppear[i]
    // Page-exit cascade: shrink (easeIn, accelerating into nothing), fade, and drift slightly up as
    // this body leaves. exit 1 → fully gone, skip entirely.
    const exit = this.exiting ? this.exitProg[i] : 0
    if (exit >= 0.999) return
    const exitScale = 1 - exit * exit
    const sx = this.bodyScreenX[i]
    const sy = this.bodyScreenY[i] - exit * 16
    // A body reads as "the subject" (yellow fill, warm ring, ripple) when hovered, selected, OR the
    // current scroll-tour focus — all three share the exact same focus treatment.
    const isFocus = i === this.hoveredIdx || i === this.selectedIdx || i === this.scrollFocusIdx
    const bloom = this.bloom[i]
    // Non-state actors (militias/factions, kind 'nonstate') read as a DIFFERENT kind of body than a
    // sovereign state: a dashed/broken rim (vs. a state's clean solid ring) + a hollow, low-alpha
    // "diffuse presence" fill at rest (vs. a state's opaque "solid mass" disk). The dashed rim is a
    // stable identity marker — it persists even while focused — but the fill still converts to the
    // same solid-yellow "this is the subject" convention on hover/select/tour-focus, so the shared
    // focus language never forks.
    const isNonstate = BODIES[i].kind === 'nonstate'
    const hollow = isNonstate && !isFocus

    const r = this.bodyR(this.mass[i])
    const pulse = this.reduced ? 1 : 1 + 0.035 * Math.sin(t * 1.3 + this.breathPhase[i])
    const scale = (1 + (bloom - 1) * 0.18) * pulse
    let rr = r * scale * bodyA
    // Hovered/selected body grows to a readable floor so its in-circle gauge is legible
    // (and so even small states open into a real readout). Eased by hoverProg → smooth grow
    // AND smooth shrink: gated on hoverProg itself (not isFocus), so leaving a body continues
    // to ease the radius back down in step with the fading glow/signature instead of the size
    // snapping to its base value the instant focus moves elsewhere while hoverProg is still > 0.
    if (this.hoverProg[i] > 0.001) {
      const floor = Math.max(48, this.playSize * 0.09) * bodyA
      if (rr < floor) rr += (floor - rr) * this.hoverProg[i]
    }
    // fold in the per-body exit shrink last, after any hover-floor grow
    rr *= exitScale
    // the tour camera's zoom scales apparent size too (a real lens push-in enlarges everything it
    // frames, not just position) — applied uniformly so every body stays proportionally consistent
    rr *= this.camZoom

    // Alpha = the lens (metric) filter, dimmed further as this body recedes in the scroll tour so
    // the focused state stands alone. The focused body itself is always fully opaque.
    const tAlpha = isFocus ? 1.0 : this.metricAlpha[i] * (1 - this.recede[i] * RECEDE_DIM)
    const glowCol = isFocus ? YELLOW : LIGHT

    ctx_save_restore(this.ctx, () => {
      const ctx = this.ctx
      ctx.globalAlpha = bodyA * tAlpha * exitScale

      // Cap the glow radius to the nearest canvas edge. A radial gradient reaches alpha 0 exactly
      // at its outer radius, so keeping that radius inside the canvas guarantees the glow has faded
      // to fully transparent BEFORE it meets the boundary — no more hard straight-line clip when a
      // bloomed body (hover/select/tour-focus) sits against the top/left/bottom/right edge.
      const edgeDist = Math.min(sx, sy, this.w - sx, this.h - sy)
      const glowR = Math.min(rr * (2.0 + (bloom - 1) * 1.1), edgeDist)
      if (glowR > 0) {
        // a hollow non-state body casts a softer, more diffuse glow — no solid mass behind it
        const glowMul = hollow ? 0.55 : 1
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
        grd.addColorStop(0, `rgba(${glowCol},${(0.1 + (bloom - 1) * 0.14) * glowMul})`)
        grd.addColorStop(1, `rgba(${glowCol},0)`)
        ctx.fillStyle = grd
        ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, TAU); ctx.fill()
      }

      if (isFocus && !this.reduced && bloom > 1.04) {
        const age = (bloom - 1) / 1.2
        const pp = (t * 0.5) % 1
        ctx.strokeStyle = `rgba(${YELLOW},${(1 - pp) * 0.32 * age})`
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.arc(sx, sy, rr + 8 + pp * 40, 0, TAU); ctx.stroke()
      }

      // Solid disk for a state (the "solid mass" reading); a hollow, near-transparent disk for an
      // unfocused non-state actor (the "diffuse presence" reading — a militia/faction is not a
      // sovereign territorial mass). The hovered/selected/tour-focused body — state OR non-state —
      // always fills SOLID YELLOW (the accent = "this is the subject"), so the shared focus
      // convention never forks; only the AT-REST fill differs by kind.
      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU)
      ctx.fillStyle = isFocus ? `rgb(${YELLOW})` : hollow ? `rgba(${LIGHT},0.16)` : `rgb(${LIGHT})`
      ctx.fill()

      // In-circle axis graph — reveals on the focused (solid yellow) body: three concentric value-
      // arcs in dark ink, legible on the yellow fill exactly like the name label below. Gated on
      // hoverProg (the same eased 0→1 value that grows the body's radius) rather than the hard
      // isFocus boolean, so it sweeps/fades in and back out smoothly instead of popping instantly —
      // hoverProg already accounts for all three focus conditions (hover, select, tour-focus).
      if (this.hoverProg[i] > 0.001) this.drawAxisGraph(sx, sy, rr, i, bodyA * tAlpha, this.hoverProg[i])

      // In-circle name label — dark ink, legible on both the light and the yellow fill. Only the
      // "ledger" set (top-N by active metric + whatever's focused) attempts a label. Every body's
      // OWN label stays visible regardless of what else is hovered/focused (no hover-hide hack).
      if (this.labelSet.has(i)) this.drawInCircleLabel(sx, sy, rr, i, bodyA * tAlpha, hollow)

      // Ring stroke: the focused body's rim warms to yellow; others stay a faint light. A non-state
      // actor's rim is DASHED rather than solid — the one identity cue that persists regardless of
      // focus state, reading as "irregular/non-sovereign" at a glance, at any zoom level.
      const ringCol = isFocus ? YELLOW : LIGHT
      const ringA = isFocus ? 0.92 : 0.3
      ctx.strokeStyle = `rgba(${ringCol},${ringA})`
      ctx.lineWidth = 1.5
      if (isNonstate) {
        const dash = Math.max(3, rr * 0.2)
        ctx.setLineDash([dash, dash * 0.85])
      }
      ctx.stroke()
    })
  }

  // In-circle name label — the state name centred INSIDE the body, like a real map/bubble-chart
  // label, instead of floating text below it. Font scales to the body radius; if the name still
  // doesn't fit at the minimum legible size, skip it rather than let it overflow the rim. Always
  // shown (subject to its own fade-in intro) regardless of which body is hovered/focused elsewhere.
  // `hollow`: true for an unfocused non-state body — its disk is a low-alpha wash over the dark
  // page background rather than an opaque light fill, so dark ink would vanish; use light ink instead.
  private drawInCircleLabel(sx: number, sy: number, rr: number, i: number, alpha: number, hollow = false) {
    if (alpha <= 0.01) return
    const b = BODIES[i]
    const ctx = this.ctx
    const MIN_PX = 9
    // font-size scales with radius; cap so it never dwarfs small circles
    let fontPx = Math.min(15, Math.max(MIN_PX, rr * 0.34))
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `400 ${fontPx}px 'Tel Aviv Brutalist', sans-serif`
    // the usable chord width inside the circle at label height — shrink font until it fits,
    // bail out (no label) rather than overflow past the rim
    const maxWidth = rr * 1.7
    let width = ctx.measureText(b.he).width
    while (width > maxWidth && fontPx > MIN_PX) {
      fontPx -= 1
      ctx.font = `400 ${fontPx}px 'Tel Aviv Brutalist', sans-serif`
      width = ctx.measureText(b.he).width
    }
    if (width > maxWidth || rr < 16) { ctx.restore(); return }
    ctx.globalAlpha = alpha * this.labelIntro
    ctx.fillStyle = hollow ? `rgba(${LIGHT},0.92)` : `rgb(${DARK})`
    ctx.fillText(b.he, sx, sy)
    ctx.restore()
  }

  // ── In-circle axis graph (Task: "bring back the inner circular graphs, but clear this time") ──
  // Three concentric value-arcs — eco (outer) · mil (middle) · geo (inner), each 0–10 — drawn in
  // dark ink on top of the focused body's solid yellow fill (same legibility trick as the name
  // label). Designed to be self-evidently readable WITHOUT the tooltip:
  //   · a faint full-circle TRACK marks each ring's 0–10 range;
  //   · the VALUE ARC sweeps clockwise from 12 o'clock, so more sweep = more score, at a glance;
  //   · a tiny fixed one-letter tick (כ/צ/ג) sits just outside each ring's own 12-o'clock start —
  //     baked-in legend that ties a specific ring to a specific axis, not a floating key elsewhere;
  //   · a small dot marks the arc's live tip, with the exact numeral sitting just OUTSIDE the ring
  //     at that same angle (not on top of the stroke itself — an earlier pass drew the numeral
  //     right on the arc's rounded tip and it visually fused into an unreadable blob; sitting
  //     clear of the ring reads as a clean value flag instead).
  // Skipped below a legibility floor (rr), same spirit as the name label's own gate.
  // `prog` (0→1) is the body's eased hoverProg — the SAME value that eases the radius to its
  // hover floor — so the graph reveals in lockstep with the grow/shrink instead of on the hard
  // isFocus gate. It drives two things at once: (1) the whole graph's alpha, so it fades in/out,
  // and (2) each ring's live fraction, so the value arcs visibly SWEEP from nothing up to their
  // true reading as focus arrives, and sweep back down symmetrically on the way out.
  private drawAxisGraph(sx: number, sy: number, rr: number, i: number, alpha: number, prog: number) {
    if (rr < 34 || alpha <= 0.01 || prog <= 0.001) return
    const ctx = this.ctx
    const AX: { v: number; k: string }[] = [
      { v: this.axisEco[i], k: 'כ' },
      { v: this.axisMil[i], k: 'צ' },
      { v: this.axisGeo[i], k: 'ג' },
    ]
    const FRACS = [0.72, 0.55, 0.38]
    const a = alpha * prog
    ctx.save()
    ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.clip()
    const tickFont = Math.max(7, Math.min(11, rr * 0.13))
    const numFont = Math.max(8, Math.min(12, rr * 0.13))
    const start = -Math.PI / 2
    AX.forEach((ax, k) => {
      const ringR = rr * FRACS[k]
      const lw = Math.max(1.2, Math.min(3, rr * 0.045))
      // sweep-in: the live fraction itself scales by `prog`, so the value arc sweeps from zero
      // up to its true reading as the reveal eases in (and sweeps back to zero on the way out) —
      // an intentional animated reveal, not just a fade.
      const frac = Math.max(0, Math.min(1, ax.v / 10)) * prog
      const end = start + frac * TAU
      // track — the ring's full 0–10 range, faint (fades in/out with the same reveal)
      ctx.strokeStyle = `rgba(${DARK},${0.16 * a})`
      ctx.lineWidth = lw
      ctx.beginPath(); ctx.arc(sx, sy, ringR, 0, TAU); ctx.stroke()
      // value arc — sweeps clockwise from 12 o'clock. Flat (butt) caps — a clean line whose tip
      // doesn't balloon into a blob the numeral would otherwise have to sit on top of.
      if (frac > 0.003) {
        ctx.strokeStyle = `rgba(${DARK},${0.88 * a})`
        ctx.lineWidth = lw
        ctx.lineCap = 'butt'
        ctx.beginPath(); ctx.arc(sx, sy, ringR, start, end); ctx.stroke()
        // small tip dot — a clear "you are here" marker at the arc's live end
        ctx.fillStyle = `rgba(${DARK},${0.92 * a})`
        ctx.beginPath(); ctx.arc(sx + Math.cos(end) * ringR, sy + Math.sin(end) * ringR, lw * 0.62, 0, TAU); ctx.fill()
      }
      // fixed one-letter tick — baked-in "which ring is which axis" legend
      if (rr >= 40) {
        ctx.font = `700 ${tickFont}px 'Tel Aviv Brutalist', sans-serif`
        ctx.fillStyle = `rgba(${DARK},${0.72 * a})`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(ax.k, sx, sy - ringR - tickFont * 0.9)
      }
      // live numeral — just OUTSIDE the ring at the arc's tip angle, clear of the stroke/dot.
      // Skipped for a near-zero value (its tip sits right at the tick's own position).
      if (rr >= 50 && frac > 0.05) {
        const numR = ringR + lw + numFont * 0.62
        const nx = sx + Math.cos(end) * numR
        const ny = sy + Math.sin(end) * numR
        ctx.font = `700 ${numFont}px 'Tel Aviv Brutalist', sans-serif`
        ctx.fillStyle = `rgba(${DARK},${0.95 * a})`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(Math.round(ax.v)), nx, ny)
      }
    })
    ctx.restore()
  }

  getBodyAt(idx: number): WellBody | null { return BODIES[idx] ?? null }
  selectById(id: string | null) {
    this.selectedIdx = id == null ? null : (BODIES.findIndex((b) => b.id === id) ?? -1)
    if (this.selectedIdx === -1) this.selectedIdx = null
  }
}

function ctx_save_restore(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save(); fn(); ctx.restore()
}

// ── Component ────────────────────────────────────────────────────────────────
// tierFocus: controlled — 0=all visible, 1–5=tier focus. Set from the mobile filter sheet's
// tier-focus list (touch) or driven internally by wheel/drag (desktop mouse, see below).
export function ForcesSheet({ grav, orderBy, filterBloc, selected, onSelect, onHover, tierFocus }: {
  grav: Map<string, GravityResult>
  tierFocus?: number
  orderBy: Order
  filterBloc: Bloc
  selected: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wellRef = useRef<GravityWell | null>(null)
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onHoverRef.current = onHover; onSelectRef.current = onSelect })

  const [interacted, setInteracted] = useState(false)
  // The tour step: 0 = the whole field (no focus); 1..N = the Nth-ranked state (by the active metric)
  // is the tour's current subject. TOUR_MAX = every state, so the tour reads the full hierarchy.
  // Two input sources feed it: the desktop wheel/drag (wheelStep) and — on mobile — the filter
  // sheet's tier pick (tierFocus, derived to tierStep below). tourStep picks whichever is active.
  const TOUR_MAX = BODIES.length
  const [wheelStep, setWheelStep] = useState(0)
  const wheelStepRef = useRef(0)
  // touch has no hover — a coarse pointer gets tap-appropriate copy instead of the hidden wheel
  // gesture (mouse keeps the scroll tour as-is)
  const [coarse] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)

  // States ranked by the active metric (highest power first) — the tour order. rankedIds drives the
  // per-state annotation; rankedIndices maps each rank to its canvas body index for the well focus.
  const rankedIds = useMemo(
    () => [...NODES].sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav)).map((n) => n.id),
    [orderBy, grav],
  )
  const rankedIndices = useMemo(() => rankedIds.map((id) => BODY_INDEX.get(id) ?? -1), [rankedIds])

  // Mobile tier pick → a tour step: focus the LEADING (highest-ranked) state of the picked tier, so
  // the tour surfaces a meaningful subject + its annotation. Pure derivation (no effect/setState),
  // so no cascading renders. tierFocus is undefined on desktop; 0 clears the focus on mobile.
  const tierStep = useMemo(() => {
    if (!tierFocus) return 0
    const kind = STAGE_KIND[tierFocus]
    const pos = kind ? rankedIndices.findIndex((ci) => ci >= 0 && BODIES[ci].kind === kind) : -1
    return pos < 0 ? 0 : pos + 1
  }, [tierFocus, rankedIndices])
  // The effective tour step: the mobile prop wins when present, else the desktop wheel/drag state.
  const tourStep = tierFocus != null ? tierStep : wheelStep

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const well = new GravityWell(canvas, stage)
    wellRef.current = well

    well.onHover = (idx) => {
      onHoverRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
    }
    well.onSelect = (idx) => {
      onSelectRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
      setInteracted(true)
    }
    const onFreeze = () => well.setFrozen(true)
    const onUnfreeze = () => well.setFrozen(false)
    // leaving to home → play the per-body exit cascade before App swaps in the homepage
    const onExit = () => well.playExit()
    window.addEventListener('mp-freeze', onFreeze)
    window.addEventListener('mp-unfreeze', onUnfreeze)
    window.addEventListener('mp-exit', onExit)

    // ── Escape from the tour ─────────────────────────────────────────────────────────────────
    // exitTour(): the one place that clears the tour step back to 0 (wellRef's setScrollFocus(-1)
    // effect then eases the camera back to the default identity frame — see the tourStep effect
    // below). Shared by both exits: clicking empty canvas (well.onTourExit, wired below) and Escape.
    const exitTour = () => {
      if (wheelStepRef.current === 0) return
      wheelStepRef.current = 0
      setWheelStep(0)
    }
    well.onTourExit = exitTour
    // Escape is ALSO handled at the App level (closes to the homepage) — App.tsx's listener is a
    // plain bubble-phase `window.addEventListener('keydown', …)`. Registering ours with capture:true
    // means ours runs FIRST; when a tour focus is active we stopPropagation so only the tour exits
    // (App's handler never sees the event). When no tour is active we do nothing and let it bubble
    // through to App as normal (Escape → home still works everywhere else).
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !well.isTourActive()) return
      ev.stopPropagation()
      exitTour()
    }
    window.addEventListener('keydown', onKeyDown, true)
    well.start_()

    // ── Wheel scroll: a DISCRETE stepped tour down the ranking, not continuous free-scroll ──────
    // Each deliberate wheel "gesture" advances/retreats the focus by exactly ONE state (0..TOUR_MAX).
    // A small accumulator absorbs light trackpad ticks below THRESHOLD so a single feather-touch
    // doesn't fire a step; once THRESHOLD is crossed the step fires immediately and a COOLDOWN blocks
    // further steps so one continuous scroll can't blow through several states. stepTour() only moves
    // tourStep — the well focus + annotation are synced from the tourStep effect below (always using
    // the freshest ranking, so a metric change re-targets the same rank slot).
    const stepTour = (dir: number) => {
      const next = Math.max(0, Math.min(TOUR_MAX, wheelStepRef.current + dir))
      if (next === wheelStepRef.current) return
      wheelStepRef.current = next
      setWheelStep(next)
      setInteracted(true)
    }
    const WHEEL_THRESHOLD = 48
    const WHEEL_COOLDOWN_MS = 620
    let wheelAccum = 0
    let wheelCooldownUntil = 0
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const now = performance.now()
      if (now < wheelCooldownUntil) return
      let dy = ev.deltaY
      if (ev.deltaMode === 1) dy *= 20    // Firefox line mode
      if (ev.deltaMode === 2) dy *= 480   // page mode
      wheelAccum += dy
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return
      const dir = Math.sign(wheelAccum)
      wheelAccum = 0
      wheelCooldownUntil = now + WHEEL_COOLDOWN_MS
      stepTour(dir)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })

    // ── Touch drag → the same discrete stepping (hybrid mouse+touch devices only). Coarse-only
    // touch devices drive the focus from the mobile filter sheet's tier list (tierFocus prop) — a
    // competing hidden drag gesture would fight it — so the drag listeners attach only when !coarse.
    const TOUCH_STEP_PX = 60
    let touchY = 0
    let touchAccum = 0
    const onTouchStart = (ev: TouchEvent) => { touchY = ev.touches[0].clientY; touchAccum = 0 }
    const onTouchMove = (ev: TouchEvent) => {
      const dy = touchY - ev.touches[0].clientY
      touchY = ev.touches[0].clientY
      touchAccum += dy
      while (Math.abs(touchAccum) >= TOUCH_STEP_PX) {
        const dir = Math.sign(touchAccum)
        touchAccum -= dir * TOUCH_STEP_PX
        stepTour(dir)
      }
      ev.preventDefault()
    }
    if (!coarse) {
      stage.addEventListener('touchstart', onTouchStart, { passive: true })
      stage.addEventListener('touchmove', onTouchMove, { passive: false })
    }

    let resizeTimer = 0
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => well.resize(), 120) }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mp-freeze', onFreeze)
      window.removeEventListener('mp-unfreeze', onUnfreeze)
      window.removeEventListener('mp-exit', onExit)
      window.removeEventListener('keydown', onKeyDown, true)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      well.destroy()
      wellRef.current = null
    }
    // mount-once by design (constructs the canvas engine + its listeners exactly once);
    // `coarse` is captured from a lazy useState initializer and never changes post-mount,
    // so it's intentionally excluded rather than a dependency this effect should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { wellRef.current?.setField(orderBy, grav) }, [orderBy, grav])
  useEffect(() => { wellRef.current?.setLayout(filterBloc, orderBy, grav) }, [filterBloc, orderBy, grav])
  useEffect(() => { wellRef.current?.selectById(selected) }, [selected])
  // Sync the canvas focus to the effective tour step (updating an external system — the well —
  // with the latest React state). Runs on tourStep AND rankedIndices (metric change), so switching
  // the sort lens keeps the tour on the SAME rank slot, now pointing at whichever state holds it.
  useEffect(() => {
    const idx = tourStep > 0 ? (rankedIndices[tourStep - 1] ?? -1) : -1
    wellRef.current?.setScrollFocus(idx)
  }, [tourStep, rankedIndices])
  // Drive the REAL side panel from the tour too — each scroll step now opens/updates the actual
  // detail panel exactly as if that state had been clicked (replacing the old floating .forces-annot
  // card). Only fires while actively touring (tourStep > 0); stepping back to 0 does NOT force a
  // deselect — the last-toured state stays selected, the same way a click leaves its target
  // selected until something else clears it (clicking empty canvas, or a new tour step).
  useEffect(() => {
    if (tourStep <= 0) return
    const id = rankedIds[tourStep - 1]
    if (id) onSelectRef.current(id)
  }, [tourStep, rankedIds])

  return (
    <div className="sheet-embed" ref={stageRef} dir="rtl" onClick={(e) => e.stopPropagation()}>
      <canvas
        ref={canvasRef}
        className="field"
        role="img"
        aria-label="שדה כוח — כל גוף הוא מדינה; ככל שהיא חזקה יותר, הגוף גדול יותר. ממוין מהחזק לחלש."
      />

      {/* ── Hint (before first interaction) — copy matches the input: tap vs. hover ────── */}
      {!interacted && tourStep === 0 && (
        <div className="sheet-hint" dir="rtl">
          {coarse ? 'הקישו על גוף לבחירה · הגודל = הכוח' : 'רחפו על גוף · הגודל = הכוח · ממוין מהחזק לחלש'}
        </div>
      )}

    </div>
  )
}
