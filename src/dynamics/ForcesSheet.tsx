// ForcesSheet — the "warped field" reading of the Forces page (a rings↔sheet toggle). A wireframe
// grid deforms toward each body proportional to its LIVE power (mass); deep, wide wells = dominant
// actors. Body PLACEMENT follows the relational-gravity layout below, so the sheet IS the
// geopolitical structure: clients sit in their patron's well, blocs form two basins, neutrals ride
// the ridge between. setGravities() eases each well's depth toward the active scenario/year.
//
// Architecture mirrors engine.ts: a class drives requestAnimationFrame with devicePixelRatio
// handling via ctx.setTransform, cached rect refreshed on resize/pointerenter, full cleanup on unmount.

import { useEffect, useRef, useState } from 'react'
import { NODES, AXIS } from '../data/entities'
import { type GravityResult } from '../model/gravity'

// ── Constants (mirroring engine.ts palette) ──────────────────────────────────
const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
const TAU = Math.PI * 2

// ── Grid configuration ───────────────────────────────────────────────────────
// Top-down square sheet (no perspective) — keeps the size-aware packing isotropic so a giant
// 20× a speck never collides, and lets every disk + grid vertex share one scale.
const COLS = 40
const ROWS = 40
const PLAY = 0.92 // the centred square play-area, as a fraction of the field's shorter side

// ── DRAMATIC scale — size IS the story ────────────────────────────────────────
// Radius (and well) scale super-linearly with power, so the strong DWARF the weak (~20× radius =
// ~400× area). Radii are expressed as a fraction of the play-area, so positions + sizes scale
// together. The long tail collapses to dust on purpose — power is grotesquely concentrated.
const R_MIN_F = 0.005 // floor radius (fraction of play-area) — a speck, still hoverable
const R_MAX_F = 0.11  // the heaviest body's radius (fraction of play-area) — big, but leaves space
const R_EXP = 1.45    // >1 = dramatic; ~20× spread top-to-tail (the ratio carries the drama)
const radiusFrac = (power: number) =>
  R_MIN_F + Math.pow(Math.max(0, power) / 100, R_EXP) * (R_MAX_F - R_MIN_F)

// Gravity kernel — the well each mass carves. Mass is remapped through the same dramatic curve so
// a giant's crater dwarfs a speck's dimple (proportional to the disk drama).
const SOFTENING = 3000 // wider, smoother giant craters
const MAX_DISP = 230   // deeper craters for the heavyweights
const WELL_EXP = 1.45  // matches the radius drama

// ── Body layout ──────────────────────────────────────────────────────────────
// Place bodies across the field in a loose grid by power tier + bloc,
// pre-computed once so layout is stable across frames.
interface WellBody {
  id: string
  he: string
  power: number
  axis: string
  // Normalized field position [0,1] × [0,1]
  nx: number
  ny: number
}

// ── Pure-power layout ─────────────────────────────────────────────────────────
// The forcefield says ONE thing: how heavy each state is. Nothing relational — no blocs, no
// patrons, no alliances (those live on the Relations / Dynamics pages). Bodies are simply ordered
// by power into a clean grid (strongest top-right → weakest, RTL reading order); each well's
// depth + width = that body's power, live from the scenario/year. Position (rank) and depth both
// encode the same single quantity, so the structure is instantly readable: a sorted field of mass.
// Size-aware packing: place the heaviest first, then spiral outward (golden-angle sunflower) to
// the first spot where the body doesn't overlap one already placed. A 20× giant never collides;
// the result reads as a cluster of planets ringed by ever-smaller bodies and a halo of dust.
// Deterministic (fixed spiral, no RNG). Positions are normalized to the square play-area [0,1]².
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
        // generous gap → planets float with space between them, so the warped craters read
        if (Math.hypot(x - placed[j].nx, y - placed[j].ny) < r + radii[j] + 0.03) { ok = false; break }
      }
      if (ok) { nx = x; ny = y; break }
    }
    placed.push({ id: n.id, he: n.he, power: n.power, axis: AXIS[n.id] ?? 'none', nx, ny })
    radii.push(r)
  }
  return placed
}

const BODIES: WellBody[] = powerLayout()

// ── GravityWell engine class ─────────────────────────────────────────────────
class GravityWell {
  private ctx: CanvasRenderingContext2D
  private w = 0; private h = 0; private dpr = 1
  private raf = 0
  private start = 0
  private reduced: boolean
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  // reused grid-vertex scratch (allocated on resize, not per frame — avoids GC churn)
  private gridVx: Float32Array = new Float32Array((COLS + 1) * (ROWS + 1))
  private gridVy: Float32Array = new Float32Array((COLS + 1) * (ROWS + 1))

  private mouse = { x: -9999, y: -9999 }
  private hoveredIdx: number | null = null
  private selectedIdx: number | null = null

  // Screen positions of bodies (updated each frame)
  private bodyScreenX: Float32Array
  private bodyScreenY: Float32Array

  // Well depth multipliers per body: 1 at rest, blooms on hover/select
  private wellDepth: Float32Array
  // Phase offsets for ambient breathing
  private breathPhase: Float32Array
  // Live gravity (mass) per body — eases toward the active scenario/year so wells deepen/shallow.
  private mass: Float32Array
  private massTarget: Float32Array

  onHover?: (idx: number | null) => void
  onSelect?: (idx: number | null) => void

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas
    this.container = container
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('GravityWell: 2D context unavailable')
    this.ctx = ctx
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const n = BODIES.length
    this.bodyScreenX = new Float32Array(n)
    this.bodyScreenY = new Float32Array(n)
    this.wellDepth = new Float32Array(n).fill(1)
    this.breathPhase = new Float32Array(n).map((_, i) => (i * 2.39) % TAU) // golden angle spread
    this.mass = new Float32Array(n).map((_, i) => BODIES[i].power)
    this.massTarget = new Float32Array(n).map((_, i) => BODIES[i].power)

    this.resize()
    this.container.addEventListener('pointermove', this.onMove)
    this.container.addEventListener('pointerleave', this.onLeave)
    this.container.addEventListener('pointerdown', this.onDown)
  }

  resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    // clientWidth/Height are transform-immune (the .stage entrance scale would shrink a
    // getBoundingClientRect read → offset hit-testing for the session). Matches engine.ts.
    this.w = this.container.clientWidth; this.h = this.container.clientHeight
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  start_() { this.start = performance.now(); this.raf = requestAnimationFrame(this.frame) }

  // Live gravity in — Scenario Sandbox (weights) + Time Axis (year). Only the target moves; the
  // frame loop eases each body's mass toward it, so the wells re-form rather than snapping.
  setGravities(grav: Map<string, { power: number }>) {
    for (let i = 0; i < BODIES.length; i++) {
      const p = grav.get(BODIES[i].id)?.power
      if (p != null) this.massTarget[i] = p
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.container.removeEventListener('pointermove', this.onMove)
    this.container.removeEventListener('pointerleave', this.onLeave)
    this.container.removeEventListener('pointerdown', this.onDown)
  }

  private onMove = (ev: PointerEvent) => {
    const r = this.container.getBoundingClientRect() // live rect — correct once the entrance settles
    this.mouse.x = ev.clientX - r.left
    this.mouse.y = ev.clientY - r.top
    this.hitTest()
  }
  private onLeave = () => {
    this.mouse.x = -9999; this.mouse.y = -9999
    if (this.hoveredIdx !== null) { this.hoveredIdx = null; this.onHover?.(null) }
  }
  private onDown = () => {
    if (this.hoveredIdx !== null) {
      const next = this.selectedIdx === this.hoveredIdx ? null : this.hoveredIdx
      this.selectedIdx = next
      this.onSelect?.(next)
    } else if (this.selectedIdx !== null) {
      this.selectedIdx = null
      this.onSelect?.(null)
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

  // The centred square play-area: side = shorter field dim × PLAY. Positions + radii both scale by
  // this single number, so packing stays isotropic and a giant never distorts into an ellipse.
  private get playSize() { return Math.min(this.w, this.h) * PLAY }
  // Body radius in screen px — the dramatic field-fraction curve × the play-area.
  private bodyR(power: number) { return radiusFrac(power) * this.playSize }

  // Map normalized [0,1]² position to screen — top-down, centred square (no perspective).
  private bodyToScreen(nx: number, ny: number): [number, number] {
    const s = this.playSize
    const ox = (this.w - s) / 2
    const oy = (this.h - s) / 2
    return [ox + nx * s, oy + ny * s]
  }

  // Sum displacement from all bodies at a grid vertex (gravity kernel)
  private gravDisplacement(vx: number, vy: number, t: number): [number, number] {
    let ddx = 0; let ddy = 0
    for (let i = 0; i < BODIES.length; i++) {
      const bsx = this.bodyScreenX[i]
      const bsy = this.bodyScreenY[i]
      const dx = vx - bsx
      const dy = vy - bsy
      const dist2 = dx * dx + dy * dy
      // Gravity kernel: displacement ∝ power / (dist² + softening)
      // breath: subtle time-varying pulse on each body's well (reduced-motion: skip)
      const breath = this.reduced ? 1 : 1 + 0.06 * Math.sin(t * 1.2 + this.breathPhase[i])
      const depth = this.wellDepth[i] * breath
      // dramatic mass: remap power through the same curve as the radius so a giant's crater dwarfs a speck's
      const mass = Math.pow(Math.max(0, this.mass[i]) / 100, WELL_EXP) * MAX_DISP * depth
      const k = mass / (dist2 + SOFTENING)
      ddx -= dx * k   // pull toward body
      ddy -= dy * k
    }
    // Clamp total displacement so extreme overlaps don't blow up
    const mag = Math.hypot(ddx, ddy)
    const maxMag = MAX_DISP * 1.8
    if (mag > maxMag) { const s = maxMag / mag; ddx *= s; ddy *= s }
    return [ddx, ddy]
  }

  private frame = (now: number) => {
    const t = (now - this.start) / 1000
    // clamp low end too (matches engine.ts clamp01): a transient negative t on the first frame
    // would make intro < 0 → negative body radii → an arc/gradient throw that halts the loop.
    const intro = Math.max(0, Math.min(1, t / 2.0)) // fade-in over 2s
    const ctx = this.ctx

    ctx.clearRect(0, 0, this.w, this.h)

    // ── Update body screen positions ──────────────────────────────────────────
    for (let i = 0; i < BODIES.length; i++) {
      const [sx, sy] = this.bodyToScreen(BODIES[i].nx, BODIES[i].ny)
      this.bodyScreenX[i] = sx
      this.bodyScreenY[i] = sy
    }

    // ── Animate well depth multipliers (smooth lerp toward target) ────────────
    for (let i = 0; i < BODIES.length; i++) {
      const isHov = i === this.hoveredIdx
      const isSel = i === this.selectedIdx
      const target = isSel ? 2.8 : isHov ? 2.0 : 1.0
      // Lerp speed: fast in, slow out
      const rate = this.wellDepth[i] < target ? 0.12 : 0.06
      this.wellDepth[i] += (target - this.wellDepth[i]) * rate
      // ease mass toward the live gravity target (snap when reduced-motion)
      this.mass[i] += this.reduced ? (this.massTarget[i] - this.mass[i]) : (this.massTarget[i] - this.mass[i]) * 0.12
    }

    // ── Draw grid ─────────────────────────────────────────────────────────────
    this.drawGrid(t, intro)

    // ── Draw bodies ───────────────────────────────────────────────────────────
    for (let i = 0; i < BODIES.length; i++) {
      this.drawBody(i, t, intro)
    }

    // ── Draw labels ───────────────────────────────────────────────────────────
    this.drawLabels(intro)

    this.raf = requestAnimationFrame(this.frame)
  }

  private drawGrid(t: number, intro: number) {
    const ctx = this.ctx
    // Grid vertex positions — reuse instance scratch (recomputed each frame, no per-frame alloc)
    const vx = this.gridVx
    const vy = this.gridVy

    for (let row = 0; row <= ROWS; row++) {
      for (let col = 0; col <= COLS; col++) {
        // Flat grid vertex (screen space)
        const [fx, fy] = this.bodyToScreen(col / COLS, row / ROWS)
        const [ddx, ddy] = this.gravDisplacement(fx, fy, t)
        const idx = row * (COLS + 1) + col
        vx[idx] = fx + ddx * intro
        vy[idx] = fy + ddy * intro
      }
    }

    // Draw horizontal lines
    for (let row = 0; row <= ROWS; row++) {
      ctx.beginPath()
      for (let col = 0; col <= COLS; col++) {
        const idx = row * (COLS + 1) + col
        if (col === 0) ctx.moveTo(vx[idx], vy[idx])
        else ctx.lineTo(vx[idx], vy[idx])
      }
      // Lines near a hovered/selected body glow brighter
      const nearFocus = this.isFocusRow(row, ROWS)
      ctx.strokeStyle = nearFocus
        ? `rgba(${YELLOW},${0.34 * intro})`
        : `rgba(${YELLOW},${0.12 * intro})`
      ctx.lineWidth = nearFocus ? 0.85 : 0.6
      ctx.stroke()
    }

    // Draw vertical lines
    for (let col = 0; col <= COLS; col++) {
      ctx.beginPath()
      for (let row = 0; row <= ROWS; row++) {
        const idx = row * (COLS + 1) + col
        if (row === 0) ctx.moveTo(vx[idx], vy[idx])
        else ctx.lineTo(vx[idx], vy[idx])
      }
      const nearFocus = this.isFocusCol(col, COLS)
      ctx.strokeStyle = nearFocus
        ? `rgba(${YELLOW},${0.34 * intro})`
        : `rgba(${YELLOW},${0.12 * intro})`
      ctx.lineWidth = nearFocus ? 0.85 : 0.6
      ctx.stroke()
    }
  }

  // Check if a grid row is near a focused body (for subtle highlight)
  private isFocusRow(row: number, maxRow: number): boolean {
    const focus = this.selectedIdx ?? this.hoveredIdx
    if (focus === null) return false
    const ny = BODIES[focus].ny
    const bodyRow = ny * maxRow
    return Math.abs(row - bodyRow) < 3
  }
  private isFocusCol(col: number, maxCol: number): boolean {
    const focus = this.selectedIdx ?? this.hoveredIdx
    if (focus === null) return false
    const nx = BODIES[focus].nx
    const bodyCol = nx * maxCol
    return Math.abs(col - bodyCol) < 3
  }

  private drawBody(i: number, t: number, intro: number) {
    const sx = this.bodyScreenX[i]
    const sy = this.bodyScreenY[i]
    const isHov = i === this.hoveredIdx
    const isSel = i === this.selectedIdx
    const isFocus = isHov || isSel

    // Uniform bodies — power is the ONLY signal (size + well depth). No bloc/identity colour.
    const r = this.bodyR(this.mass[i])
    const pulse = this.reduced ? 1 : 1 + 0.04 * Math.sin(t * 1.4 + this.breathPhase[i])
    const rr = r * pulse * (isFocus ? 1.22 : 1) * intro
    const glowCol = isFocus ? YELLOW : LIGHT

    ctx_save_restore(this.ctx, () => {
      const ctx = this.ctx
      ctx.globalAlpha = intro

      // Outer glow — uniform, warms to yellow on focus (skip when the radius isn't drawable)
      const glowR = rr * (isFocus ? 3.2 : 2.0)
      if (glowR > 0) {
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
        grd.addColorStop(0, `rgba(${glowCol},${isFocus ? 0.28 : 0.1})`)
        grd.addColorStop(1, `rgba(${glowCol},0)`)
        ctx.fillStyle = grd
        ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, TAU); ctx.fill()
      }

      // Focus pulse rings (expand outward from centre)
      if (isFocus && !this.reduced) {
        const age = (this.wellDepth[i] - 1) * 0.5 // 0→1 as depth grows
        for (let k = 0; k < 2; k++) {
          const pp = ((t * 0.8 + k * 0.5) % 1) * age
          ctx.strokeStyle = `rgba(${YELLOW},${(1 - pp) * 0.45})`
          ctx.lineWidth = 0.8
          ctx.beginPath(); ctx.arc(sx, sy, rr + 6 + pp * 48, 0, TAU); ctx.stroke()
        }
      }

      // Inner disc
      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU)
      ctx.fillStyle = `rgb(${LIGHT})`; ctx.fill()

      // Rim — faint at rest, yellow when focused
      ctx.strokeStyle = isFocus ? `rgba(${YELLOW},0.95)` : `rgba(${LIGHT},0.32)`
      ctx.lineWidth = 1.5; ctx.stroke()
    })
  }

  private drawLabels(intro: number) {
    const ctx = this.ctx
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = "700 13px 'Tel Aviv Brutalist', sans-serif"

    const focus = this.selectedIdx ?? this.hoveredIdx
    // Placed label bounding boxes for simple de-collision (great/regional bodies)
    const placed: { x: number; y: number; w: number }[] = []

    for (let i = 0; i < BODIES.length; i++) {
      const b = BODIES[i]
      const sx = this.bodyScreenX[i]
      const sy = this.bodyScreenY[i]
      const r = this.bodyR(this.mass[i])
      const isFocus = i === focus
      const isGreatOrRegional = this.mass[i] >= 40 // top tier

      // Major bodies always show; minor bodies only on focus
      const alwaysShow = isGreatOrRegional
      if (!alwaysShow && !isFocus) continue

      const labelY = sy + r * (isFocus ? 1.35 : 1.2) + 5
      const textW = b.he.length * 8 // rough estimate

      // De-collide: skip if overlaps a placed label (not focus)
      let skip = false
      if (!isFocus) {
        for (const p of placed) {
          if (Math.abs(sx - p.x) < (textW + p.w) / 2 + 4 && Math.abs(labelY - p.y) < 14) {
            skip = true; break
          }
        }
      }
      if (skip) continue

      placed.push({ x: sx, y: labelY, w: textW })

      const alpha = isFocus ? 1 : 0.72
      ctx.globalAlpha = intro * alpha
      ctx.fillStyle = isFocus ? `rgba(${YELLOW},1)` : `rgba(${LIGHT},0.85)`
      ctx.fillText(b.he, sx, labelY)
    }
    ctx.restore()
  }

  getBodyAt(idx: number): WellBody | null { return BODIES[idx] ?? null }
  getBodyScreenPos(idx: number): { x: number; y: number } {
    return { x: this.bodyScreenX[idx] ?? 0, y: this.bodyScreenY[idx] ?? 0 }
  }
  getBodyR(idx: number): number { return this.bodyR(this.mass[idx] ?? 0) }
  getSelectedIdx(): number | null { return this.selectedIdx }
  // External selection (from the index / side panel) — sets the highlight WITHOUT firing onSelect.
  selectById(id: string | null) {
    this.selectedIdx = id == null ? null : (BODIES.findIndex((b) => b.id === id) ?? -1)
    if (this.selectedIdx === -1) this.selectedIdx = null
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

function ctx_save_restore(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save(); fn(); ctx.restore()
}

// ── Component — the warped-sheet reading of the Forces page ────────────────────
// Self-contained canvas; hover/select are lifted up to the Forces page so the SAME side panel +
// index drive both readings. Selection coming back down (an index click) highlights via selectById.
export function ForcesSheet({ grav, selected, onSelect, onHover }: {
  grav: Map<string, GravityResult>
  selected: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wellRef = useRef<GravityWell | null>(null)
  // keep the latest callbacks in refs so the engine is created ONCE (not re-created per render)
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onHoverRef.current = onHover; onSelectRef.current = onSelect })
  // local readout for the focused body (name + live score), shown right at the body on the sheet
  const [chip, setChip] = useState<{ id: string; he: string; x: number; y: number } | null>(null)
  const [interacted, setInteracted] = useState(false)

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
      if (well.getSelectedIdx() == null) placeChip(idx) // don't clobber a pinned selection on hover-out
    }
    well.onSelect = (idx) => {
      onSelectRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
      setInteracted(true)
      placeChip(idx)
    }
    well.start_()
    let resizeTimer = 0
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => well.resize(), 120) }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      well.destroy()
      wellRef.current = null
    }
  }, [])

  // live gravity in → each well's depth eases toward the active scenario/year
  useEffect(() => { wellRef.current?.setGravities(grav) }, [grav])
  // external selection (index row / side panel) → highlight on the sheet
  useEffect(() => { wellRef.current?.selectById(selected) }, [selected])

  const chipScore = chip ? Math.round(grav.get(chip.id)?.power ?? 0) : 0

  return (
    <div className="sheet-embed" ref={stageRef} dir="rtl" onClick={(e) => e.stopPropagation()}>
      <canvas
        ref={canvasRef}
        className="field"
        role="img"
        aria-label="שדה כוח — שדה גרביטציוני ממוין לפי כוח: ככל שגוף חזק יותר, הבאר שהוא יוצר עמוקה ורחבה יותר"
      />
      {chip && (
        <div className="sheet-chip" style={{ left: chip.x, top: chip.y }} aria-live="polite">
          <span className="sheet-chip__name">{chip.he}</span>
          <span className="sheet-chip__score">{chipScore}</span>
        </div>
      )}
      {!interacted && (
        <div className="sheet-hint" dir="rtl">רחפו על גוף · עומק הבאר = הכוח · ממוין מהחזק לחלש</div>
      )}
    </div>
  )
}
