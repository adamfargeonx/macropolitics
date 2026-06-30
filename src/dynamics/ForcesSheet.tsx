// ForcesSheet — the committed reading of the Forces page: a horizontal FORCE-FIELD. Each state is a
// luminous body whose RADIUS = its live power (mass). Bodies are packed across the full width of the
// field (no centred square, no wireframe mesh) so the strong dwarf the weak — size alone carries the
// story. Hover/select bloom each body with a gentle, premium-eased glow. setGravities() eases each
// body's mass toward the active scenario/year so the field re-forms rather than snapping.
//
// Scrollytelling layer: wheel/touch accumulates a virtual scrollProgress (0–5.5). Spring physics
// (mass-spring-damper) follow the target. At progress 1–5, each tier sweeps into focus while others
// dim via an exponential alpha falloff. An editorial annotation overlay rides the scroll stage.
//
// Architecture mirrors engine.ts: a class drives requestAnimationFrame with devicePixelRatio handling
// via ctx.setTransform, cached rect refreshed on resize/pointerenter, full cleanup on unmount.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NODES, AXIS, type Kind } from '../data/entities'
import { type GravityResult } from '../model/gravity'
import { type Order } from './forces-model'

// ── Constants (mirroring engine.ts palette) ──────────────────────────────────
const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
const TAU = Math.PI * 2

// The field's usable fraction of the shorter side — radii scale by this so packing stays isotropic.
const PLAY = 0.92

// ── DRAMATIC scale — size IS the story ────────────────────────────────────────
const R_MIN_F = 0.0075
const R_MAX_F = 0.165
const R_EXP = 1.45
const radiusFrac = (power: number) =>
  R_MIN_F + Math.pow(Math.max(0, power) / 100, R_EXP) * (R_MAX_F - R_MIN_F)

// ── Scroll narrative — tier stage mapping ────────────────────────────────────
// progress 0 = all visible  /  1=great  2=regional  3=intermediate  4=edge  5=nonstate
const TIER_STAGE: Record<Kind, number> = {
  great: 1, regional: 2, intermediate: 3, edge: 4, nonstate: 5,
}
const TIER_SPREAD = 0.5 // how far out-of-focus tiers disperse outward from centre (scroll narrative)

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

const GOLDEN = 2.399963229728653

function powerLayout(): WellBody[] {
  const sorted = [...NODES].sort((a, b) => b.power - a.power)
  const placed: WellBody[] = []
  const radii: number[] = []
  const cx = 0.5, cy = 0.5
  for (const n of sorted) {
    const r = radiusFrac(n.power)
    let nx = cx, ny = cy
    for (let s = 0; s < 5000; s++) {
      const ang = s * GOLDEN
      const rad = 0.017 * Math.sqrt(s)
      const x = cx + Math.cos(ang) * rad
      const y = cy + Math.sin(ang) * rad
      if (x - r < 0.01 || x + r > 0.99 || y - r < 0.01 || y + r > 0.99) continue
      let ok = true
      for (let j = 0; j < placed.length; j++) {
        if (Math.hypot(x - placed[j].nx, y - placed[j].ny) < r + radii[j] + 0.04) { ok = false; break }
      }
      if (ok) { nx = x; ny = y; break }
    }
    placed.push({ id: n.id, he: n.he, power: n.power, axis: AXIS[n.id] ?? 'none', kind: n.kind, nx, ny })
    radii.push(r)
  }
  return placed
}

const BODIES: WellBody[] = powerLayout()

// Precompute per-tier counts for the annotation
const TIER_COUNTS: Record<Kind, number> = { great: 0, regional: 0, intermediate: 0, edge: 0, nonstate: 0 }
for (const b of BODIES) TIER_COUNTS[b.kind]++

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
  private bodyAppear: Float32Array
  private bloom: Float32Array
  private breathPhase: Float32Array
  private mass: Float32Array
  private massTarget: Float32Array
  private metricAlpha: Float32Array
  // hoverProg: per-body 0→1 reveal value, eased in the draw loop (NOT a CSS transition).
  // Drives the fill fade-out + force-signature bloom on the hovered body only.
  private hoverProg: Float32Array
  // Live eco/mil/geo (each 0–10) per body — the at-a-glance force signature around the hovered ring.
  private eco: Float32Array
  private mil: Float32Array
  private geo: Float32Array

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

  // ── Scroll narrative spring ───────────────────────────────────────────────
  // scrollTarget: where wheel/touch wants to go (0–5.5)
  // scrollProgress: spring-tracked value (same range, smoothed)
  // scrollVel: current velocity for the spring integrator
  private scrollTarget = 0
  private scrollProgress = 0
  private scrollVel = 0
  // last discrete stage (0-5) — used to throttle React callback
  private scrollStage = 0

  onHover?: (idx: number | null) => void
  onSelect?: (idx: number | null) => void
  onScrollChange?: (stage: number, progress: number) => void

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
    this.metricAlpha = new Float32Array(n).fill(1)
    this.hoverProg = new Float32Array(n)
    this.eco = new Float32Array(n)
    this.mil = new Float32Array(n)
    this.geo = new Float32Array(n)

    this.resize()
    this.container.addEventListener('pointermove', this.onMove)
    this.container.addEventListener('pointerleave', this.onLeave)
    this.container.addEventListener('pointerdown', this.onDown)
  }

  resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
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
      // Keep the live sub-metrics (each 0–10) for the hover force-signature.
      this.eco[i] = g?.eco ?? 0
      this.mil[i] = g?.mil ?? 0
      this.geo[i] = g?.geo ?? 0
    }
  }

  // Set the narrative scroll target (called from wheel/touch handler in the component).
  // k=0.09 spring / d=0.78 damping → premium weighted feel, slight overshoot near tiers.
  setScrollTarget(v: number) { this.scrollTarget = Math.max(0, Math.min(5.5, v)) }

  getScrollProgress() { return this.scrollProgress }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.container.removeEventListener('pointermove', this.onMove)
    this.container.removeEventListener('pointerleave', this.onLeave)
    this.container.removeEventListener('pointerdown', this.onDown)
  }

  private onMove = (ev: PointerEvent) => {
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
    } else if (this.selectedIdx !== null) {
      this.selectedIdx = null
      this.onSelect?.(null)
    }
    // touch has no pointerleave — clear the transient hover so no stale chip sticks to a
    // non-selected body (the selected body's chip/gauge is driven by selectedIdx now)
    if (ev?.pointerType === 'touch') {
      this.mouse.x = -9999; this.mouse.y = -9999
      if (this.hoveredIdx !== null) { this.hoveredIdx = null; this.onHover?.(null) }
    }
  }

  private hitTest() {
    let best: number | null = null
    let bestD = Infinity
    for (let i = 0; i < BODIES.length; i++) {
      const d = Math.hypot(this.bodyScreenX[i] - this.mouse.x, this.bodyScreenY[i] - this.mouse.y)
      const pad = Math.max(this.bodyR(this.mass[i]) + 10, 18)
      if (d < pad && d < bestD) { bestD = d; best = i }
    }
    if (best !== this.hoveredIdx) { this.hoveredIdx = best; this.onHover?.(best) }
  }

  private get playSize() { return Math.min(this.w, this.h) * PLAY }
  private bodyR(power: number) { return radiusFrac(power) * this.playSize }

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

    // ── Spring step for scroll narrative ──────────────────────────────────────
    // Mass-spring-damper: k=0.09, d=0.78 → weighted, delightful, slight overshoot.
    // reduced-motion: snap directly (no spring)
    if (this.reduced) {
      this.scrollProgress = this.scrollTarget
    } else {
      const k = 0.09, d = 0.78
      this.scrollVel = this.scrollVel * d + (this.scrollTarget - this.scrollProgress) * k
      this.scrollProgress += this.scrollVel
    }

    // Emit stage change (0=all, 1–5=tier) only when discrete stage transitions
    const newStage = this.scrollProgress < 0.3 ? 0 : Math.min(5, Math.round(this.scrollProgress))
    if (newStage !== this.scrollStage) {
      this.scrollStage = newStage
      this.onScrollChange?.(newStage, this.scrollProgress)
    }

    // ── Update body screen positions ──────────────────────────────────────────
    // Scroll narrative: disperse out-of-focus tiers OUTWARD (position, not opacity). The focused
    // tier holds near the centre; the rest ease toward the periphery as you scroll through stages.
    const [ccx, ccy] = this.bodyToScreen(0.5, 0.5)
    for (let i = 0; i < BODIES.length; i++) {
      let [sx, sy] = this.bodyToScreen(BODIES[i].nx, BODIES[i].ny)
      const isFocus = i === this.hoveredIdx || i === this.selectedIdx
      const push = isFocus ? 0 : this.tierPush(BODIES[i].kind)
      if (push > 0) {
        const spread = 1 + push * TIER_SPREAD
        sx = ccx + (sx - ccx) * spread
        sy = ccy + (sy - ccy) * spread
      }
      this.bodyScreenX[i] = sx
      this.bodyScreenY[i] = sy
    }

    // ── Ease focus bloom + live mass ──────────────────────────────────────────
    for (let i = 0; i < BODIES.length; i++) {
      const isHov = i === this.hoveredIdx
      const isSel = i === this.selectedIdx
      const target = isSel ? 2.2 : isHov ? 1.7 : 1.0
      const rate = this.bloom[i] < target ? 0.1 : 0.07
      this.bloom[i] += (target - this.bloom[i]) * rate
      this.mass[i] += this.reduced ? (this.massTarget[i] - this.mass[i]) : (this.massTarget[i] - this.mass[i]) * 0.12

      // ── Hover reveal progress (0→1) ───────────────────────────────────────
      // Expo-out feel: a per-frame lerp toward the hover state. Asymmetric rates —
      // a touch quicker in than out — land the ~280–360ms "fast then settle" curve.
      // reduced-motion: snap to the end state (no tween).
      // reveal the in-circle gauge + grow on hover OR selection (tap) — touch has no hover,
      // so a tapped/selected body must open its readout the same way a hovered one does
      const hoverTarget = (isHov || isSel) ? 1 : 0
      if (this.reduced) {
        this.hoverProg[i] = hoverTarget
      } else {
        const hrate = hoverTarget > this.hoverProg[i] ? 0.09 : 0.07
        this.hoverProg[i] += (hoverTarget - this.hoverProg[i]) * hrate
      }
    }

    // ── Draw bodies ───────────────────────────────────────────────────────────
    for (let i = 0; i < BODIES.length; i++) {
      this.drawBody(i, t)
    }

    // ── Draw labels ───────────────────────────────────────────────────────────
    this.drawLabels(labelIntro)

    this.raf = requestAnimationFrame(this.frame)
  }

  // Tier PUSH for the scroll narrative — drives a radial dispersion (position), not opacity.
  // 0 = in focus / scroll idle; →1 = fully dispersed outward. Same falloff shape as before,
  // inverted: the tier matching scrollProgress stays put, others push toward the periphery.
  private tierPush(kind: Kind): number {
    const sp = this.scrollProgress
    if (sp < 0.2) return 0
    // sweepT: 0→1 over the first 0.35 units of scroll (smooth engage)
    const sweepT = Math.min(1, (sp - 0.2) / 0.35)
    const dist = Math.abs(sp - TIER_STAGE[kind])
    const focused = Math.max(0.04, Math.exp(-dist * 2.0))
    return sweepT * (1 - focused)
  }

  private drawBody(i: number, t: number) {
    const bodyA = this.bodyAppear[i]
    const sx = this.bodyScreenX[i]
    const sy = this.bodyScreenY[i]
    const isFocus = i === this.hoveredIdx || i === this.selectedIdx
    const bloom = this.bloom[i]

    const r = this.bodyR(this.mass[i])
    const pulse = this.reduced ? 1 : 1 + 0.035 * Math.sin(t * 1.3 + this.breathPhase[i])
    const scale = (1 + (bloom - 1) * 0.18) * pulse
    let rr = r * scale * bodyA
    // Hovered/selected body grows to a readable floor so its in-circle gauge is legible
    // (and so even small states open into a real readout). Eased by hoverProg → smooth grow.
    if (isFocus) {
      const floor = Math.max(48, this.playSize * 0.09) * bodyA
      if (rr < floor) rr += (floor - rr) * Math.min(1, this.hoverProg[i])
    }

    // Metric (lens) filter alpha only — the scroll narrative now moves bodies, doesn't dim them
    const tAlpha = isFocus ? 1.0 : this.metricAlpha[i]
    const glowCol = isFocus ? YELLOW : LIGHT

    ctx_save_restore(this.ctx, () => {
      const ctx = this.ctx
      ctx.globalAlpha = bodyA * tAlpha

      const glowR = rr * (2.0 + (bloom - 1) * 1.1)
      if (glowR > 0) {
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
        grd.addColorStop(0, `rgba(${glowCol},${0.1 + (bloom - 1) * 0.14})`)
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

      // hp = eased hover reveal (0 idle → 1 fully hovered). The body fill fades to nothing
      // so the hovered body reads as a hollow, outlined ring.
      const hp = this.hoverProg[i]

      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU)
      if (hp < 0.999) {
        ctx.save()
        ctx.globalAlpha = bodyA * tAlpha * (1 - hp)
        ctx.fillStyle = `rgb(${LIGHT})`; ctx.fill()
        ctx.restore()
      }

      // Ring stroke: warms to yellow as the body hollows out (the rim becomes the subject).
      const ringCol = isFocus ? YELLOW : LIGHT
      const ringA = isFocus ? 0.92 : 0.3
      ctx.strokeStyle = `rgba(${ringCol},${ringA})`
      ctx.lineWidth = 1.5 + hp * 0.5; ctx.stroke()

      // ── Force signature ──────────────────────────────────────────────────
      // Around the hollowed rim, bloom three concentric arc-ticks — eco / mil / geo —
      // whose arc LENGTH ∝ each sub-metric (0–10). A quick visual fingerprint of the
      // state's composition, distinct from the side-panel's quantitative bars.
      if (hp > 0.01) this.drawSignature(sx, sy, rr, i, hp, bodyA * tAlpha)
    })
  }

  // The force-signature gauge — a clean set of three CONCENTRIC value-rings drawn fully INSIDE
  // the hovered/hollow circle (clipped to the rim, never spilling onto neighbours). Each ring is
  // a faint full-circle track plus a value arc whose sweep ∝ its metric / 10 (a full lap = 10).
  // mil = YELLOW (the accent), eco & geo = LIGHT at stepped opacity, so the three read as one
  // contained radial fingerprint — distinct from the side-panel's linear bars.
  private drawSignature(sx: number, sy: number, rr: number, i: number, hp: number, baseAlpha: number) {
    const ctx = this.ctx
    if (rr < 15) return // too small to read a gauge — skip rather than draw a smear
    const START = -Math.PI / 2 // 12 o'clock
    // [metric 0–10, radius as a fraction of rr, colour, peak opacity]
    const rings: [number, number, string, number][] = [
      [this.eco[i], 0.82, LIGHT,  0.55],
      [this.mil[i], 0.60, YELLOW, 0.95],
      [this.geo[i], 0.38, LIGHT,  0.42],
    ]
    ctx.save()
    // clip to the circle so the gauge stays contained inside the rim
    ctx.beginPath(); ctx.arc(sx, sy, rr - 0.5, 0, TAU); ctx.clip()
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(2, rr * 0.07)
    for (const [metric, rf, col, peak] of rings) {
      const radius = rr * rf
      if (radius < 2) continue
      // faint full-circle track
      ctx.globalAlpha = baseAlpha * hp * 0.13
      ctx.strokeStyle = `rgb(${col})`
      ctx.beginPath(); ctx.arc(sx, sy, radius, 0, TAU); ctx.stroke()
      // value arc — a full lap = 10
      const frac = Math.max(0, Math.min(1, metric / 10))
      if (frac > 0) {
        ctx.globalAlpha = baseAlpha * peak * hp
        ctx.beginPath(); ctx.arc(sx, sy, radius, START, START + frac * TAU * hp); ctx.stroke()
      }
    }
    ctx.restore()
  }

  // On-canvas ledger: the TOP-N states (by the active metric) carry a rank + name label below
  // their body, always legible at rest. Switching the sort category re-ranks live, so the field
  // itself visibly re-orders — the canvas, not just the side panel, answers "who leads here". The
  // focused body always gets its label too (highlighted). Light weight per the type pass.
  private drawLabels(intro: number) {
    const ctx = this.ctx
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const focus = this.selectedIdx ?? this.hoveredIdx

    // rank by the live metric (massTarget is set per category in setField)
    const order = Array.from({ length: BODIES.length }, (_, i) => i)
      .sort((a, b) => this.massTarget[b] - this.massTarget[a])
    const rankOf = new Int16Array(BODIES.length)
    order.forEach((idx, rk) => { rankOf[idx] = rk })
    const TOP_N = 8

    for (let i = 0; i < BODIES.length; i++) {
      const b = BODIES[i]
      const isFocus = i === focus
      const inTop = rankOf[i] < TOP_N
      if (!inTop && !isFocus) continue

      const sx = this.bodyScreenX[i]
      const sy = this.bodyScreenY[i]
      const rr = this.bodyR(this.mass[i])
      const tAlpha = isFocus ? 1 : this.metricAlpha[i]
      const fontPx = Math.max(10, Math.min(14, rr * 0.42))
      const labelY = sy + rr + Math.max(6, rr * 0.16)
      const rank = String(rankOf[i] + 1).padStart(2, '0')

      ctx.globalAlpha = intro * (isFocus ? 1 : 0.82) * tAlpha
      ctx.font = `400 ${fontPx}px 'Tel Aviv Brutalist', sans-serif`
      ctx.fillStyle = isFocus ? `rgb(${YELLOW})` : `rgb(${LIGHT})`
      ctx.fillText(`${rank}  ${b.he}`, sx, labelY)
    }
    ctx.restore()
  }

  getBodyAt(idx: number): WellBody | null { return BODIES[idx] ?? null }
  getBodyScreenPos(idx: number): { x: number; y: number } {
    return { x: this.bodyScreenX[idx] ?? 0, y: this.bodyScreenY[idx] ?? 0 }
  }
  getBodyR(idx: number): number { return this.bodyR(this.mass[idx] ?? 0) }
  getSelectedIdx(): number | null { return this.selectedIdx }
  selectById(id: string | null) {
    this.selectedIdx = id == null ? null : (BODIES.findIndex((b) => b.id === id) ?? -1)
    if (this.selectedIdx === -1) this.selectedIdx = null
  }
}

function ctx_save_restore(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save(); fn(); ctx.restore()
}

// ── Scroll annotation data ────────────────────────────────────────────────────
// Each tier stage (1–5) maps to a Hebrew label, body count, and editorial line.
const EASING_ENTER: [number, number, number, number] = [0.16, 1, 0.3, 1]   // expo out
const EASING_EXIT: [number, number, number, number]  = [0.4, 0, 0.6, 1]    // ease-in-out

interface TierAnnot {
  stage: number
  label: string
  editorial: string
  count: number
}

const TIER_ANNOTS: TierAnnot[] = [
  { stage: 1, label: 'כוח-על',          editorial: 'גופים שמחזיקים בכוח המשיכה הגלובלי',         count: TIER_COUNTS.great        },
  { stage: 2, label: 'כוח אזורי',        editorial: 'גופים שעיצבו את פני הזירה האזורית',           count: TIER_COUNTS.regional     },
  { stage: 3, label: 'כוח ביניים',       editorial: 'גופים שנעים בין הצירים',                       count: TIER_COUNTS.intermediate },
  { stage: 4, label: 'כוח קצה',          editorial: 'קטנים בגוף, לא-פרופורציונאליים בהשפעה',        count: TIER_COUNTS.edge         },
  { stage: 5, label: 'שחקן לא-מדינתי',  editorial: 'כוח המתפשט מעבר לגבולות הלאום',               count: TIER_COUNTS.nonstate     },
]

// ── Component ────────────────────────────────────────────────────────────────
export function ForcesSheet({ grav, orderBy, selected, onSelect, onHover }: {
  grav: Map<string, GravityResult>
  orderBy: Order
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

  const [chip, setChip] = useState<{ id: string; he: string; x: number; y: number } | null>(null)
  const [interacted, setInteracted] = useState(false)
  // scrollStage: 0=all visible, 1–5=tier focus
  const [scrollStage, setScrollStage] = useState(0)
  const scrollPosRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const well = new GravityWell(canvas, stage)
    wellRef.current = well

    const placeChip = (idx: number | null) => {
      if (idx == null) { setChip(null); return }
      const b = BODIES[idx]; const p = well.getBodyScreenPos(idx)
      setChip({ id: b.id, he: b.he, x: p.x, y: p.y - well.getBodyR(idx) - 16 })
    }
    well.onHover = (idx) => {
      onHoverRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
      if (well.getSelectedIdx() == null) placeChip(idx)
    }
    well.onSelect = (idx) => {
      onSelectRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
      setInteracted(true)
      placeChip(idx)
    }
    well.onScrollChange = (stage) => setScrollStage(stage)
    const onFreeze = () => well.setFrozen(true)
    const onUnfreeze = () => well.setFrozen(false)
    window.addEventListener('mp-freeze', onFreeze)
    window.addEventListener('mp-unfreeze', onUnfreeze)
    well.start_()

    // ── Wheel scroll: virtual accumulation → spring target ───────────────────
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      let dy = ev.deltaY
      if (ev.deltaMode === 1) dy *= 20    // Firefox line mode
      if (ev.deltaMode === 2) dy *= 480   // page mode
      scrollPosRef.current = Math.max(0, Math.min(5.5, scrollPosRef.current + dy * 0.0038))
      well.setScrollTarget(scrollPosRef.current)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })

    // ── Touch scroll ─────────────────────────────────────────────────────────
    let touchY = 0
    const onTouchStart = (ev: TouchEvent) => { touchY = ev.touches[0].clientY }
    const onTouchMove = (ev: TouchEvent) => {
      const dy = touchY - ev.touches[0].clientY
      touchY = ev.touches[0].clientY
      scrollPosRef.current = Math.max(0, Math.min(5.5, scrollPosRef.current + dy * 0.011))
      well.setScrollTarget(scrollPosRef.current)
      ev.preventDefault()
    }
    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })

    let resizeTimer = 0
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => well.resize(), 120) }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mp-freeze', onFreeze)
      window.removeEventListener('mp-unfreeze', onUnfreeze)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      well.destroy()
      wellRef.current = null
    }
  }, [])

  useEffect(() => { wellRef.current?.setField(orderBy, grav) }, [orderBy, grav])
  useEffect(() => { wellRef.current?.selectById(selected) }, [selected])

  const chipScore = chip ? Math.round(grav.get(chip.id)?.power ?? 0) : 0
  const activeAnnot = TIER_ANNOTS.find(a => a.stage === scrollStage) ?? null

  return (
    <div className="sheet-embed" ref={stageRef} dir="rtl" onClick={(e) => e.stopPropagation()}>
      <canvas
        ref={canvasRef}
        className="field"
        role="img"
        aria-label="שדה כוח — כל גוף הוא מדינה; ככל שהיא חזקה יותר, הגוף גדול יותר. ממוין מהחזק לחלש."
      />

      {/* ── Focus chip: name + score above the hovered/selected body ─────── */}
      {chip && (
        <div className="sheet-chip" style={{ left: chip.x, top: chip.y }} aria-live="polite">
          <span className="sheet-chip__name">{chip.he}</span>
          <span className="sheet-chip__score">{chipScore}</span>
        </div>
      )}

      {/* ── Scroll hint (before any scroll) ─────────────────────────────── */}
      {scrollStage === 0 && (
        <div className="sheet-scroll-cta" aria-hidden>
          <span className="sheet-scroll-cta__arrow">↓</span>
          <span className="sheet-scroll-cta__text">גללו לגלות את היררכיית הכוח</span>
        </div>
      )}

      {/* ── Hover hint (before first interaction) ────────────────────────── */}
      {!interacted && scrollStage === 0 && (
        <div className="sheet-hint" dir="rtl">רחפו על גוף · הגודל = הכוח · ממוין מהחזק לחלש</div>
      )}

      {/* ── Tier annotation: the editorial beat of the scroll narrative ─── */}
      <AnimatePresence mode="wait">
        {activeAnnot && (
          <motion.div
            key={activeAnnot.stage}
            className="forces-annot"
            dir="rtl"
            initial={{ opacity: 0, x: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASING_ENTER } }}
            exit={{ opacity: 0, x: 18, filter: 'blur(4px)', transition: { duration: 0.28, ease: EASING_EXIT } }}
            aria-live="polite"
          >
            <motion.div
              className="forces-annot__count"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.08, duration: 0.4, ease: EASING_ENTER } }}
            >
              {activeAnnot.count}
            </motion.div>
            <motion.h2
              className="forces-annot__label"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.0, duration: 0.5, ease: EASING_ENTER } }}
            >
              {activeAnnot.label}
            </motion.h2>
            <motion.p
              className="forces-annot__editorial"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.18, duration: 0.45, ease: EASING_ENTER } }}
            >
              {activeAnnot.editorial}
            </motion.p>
            {/* Scroll progress pips */}
            <div className="forces-annot__pips">
              {TIER_ANNOTS.map(a => (
                <span
                  key={a.stage}
                  className={`forces-annot__pip${a.stage === activeAnnot.stage ? ' forces-annot__pip--on' : ''}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
