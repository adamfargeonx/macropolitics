// ForcesSheet — the "warped field" reading of the Forces page (a rings↔sheet toggle). A wireframe
// grid deforms toward each body proportional to its LIVE power (mass); deep, wide wells = dominant
// actors. Body PLACEMENT follows the relational-gravity layout below, so the sheet IS the
// geopolitical structure: clients sit in their patron's well, blocs form two basins, neutrals ride
// the ridge between. setGravities() eases each well's depth toward the active scenario/year.
//
// Architecture mirrors engine.ts: a class drives requestAnimationFrame with devicePixelRatio
// handling via ctx.setTransform, cached rect refreshed on resize/pointerenter, full cleanup on unmount.

import { useEffect, useRef } from 'react'
import { NODES, AXIS } from '../data/entities'
import { type GravityResult } from '../model/gravity'

// ── Constants (mirroring engine.ts palette) ──────────────────────────────────
const YELLOW = '251,255,0'
const LIGHT = '244,242,236'
const TAU = Math.PI * 2

// Bloc rim colors — same triplets as engine.ts AXIS_COLOR
const AXIS_COLOR: Record<string, string> = {
  west: '132,160,196',
  east: '198,134,98',
  neutral: '150,150,160',
  none: '120,120,128',
}

// ── Grid configuration ───────────────────────────────────────────────────────
const COLS = 42
const ROWS = 30
// Perspective foreshortening: project y with a 3/4-view tilt so the grid reads
// as a sheet receding into space rather than a flat top-down diagram.
const PERSP_Y = 0.62  // y scale factor (< 1 = foreshortened)
const PERSP_SKEW = 0.04 // subtle horizontal lean proportional to y offset

// Gravity kernel softening (prevents division by zero when bodies sit on grid verts)
const SOFTENING = 2200
// Maximum displacement amplitude (screen px) from a single body at zero distance
const MAX_DISP = 168
// Power → mass scaling (higher = more dramatic wells for strong bodies)
const MASS_SCALE = 0.0042

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

// ── Relational-gravity layout ────────────────────────────────────────────────
// The coherent logic that makes the warped sheet mean something: a body's POSITION is its place
// in the gravitational structure, so the metaphor (you sit in the well of whoever pulls you) is
// literally true rather than decorative.
//   • Two basins by bloc — the Western system (left) and the Eastern axis (right) — with the
//     neutrals strung down the RIDGE between them.
//   • Each great power is a deep well at its bloc's centre; every client/proxy is placed on the
//     OUTER slope of its patron's well (using the model's own parent hierarchy), so Israel/Saudi
//     ring the US well and Hezbollah/Hamas/Houthis are caught inside Iran's.
//   • Depth/width = power (the engine's mass), live from the scenario/year — so weakening Iran
//     shallows its well and shrinks its captured proxies, while the STRUCTURE stays put.
// Deterministic (anchored hubs + patron-offset placement) — no physics sim, no jitter.
const BLOC_X: Record<string, number> = { west: 0.27, east: 0.73, neutral: 0.5, none: 0.5 }
const FIELD_CX = 0.5

function relationalLayout(): WellBody[] {
  const byId = new Map(NODES.map((n) => [n.id, n]))
  const pos = new Map<string, { nx: number; ny: number }>()

  // 1) top-level bodies (orbit the centre 'C') — the bloc anchors / great wells
  const tops: Record<string, typeof NODES> = { west: [], east: [], neutral: [], none: [] }
  for (const n of NODES) if (n.parent === 'C') tops[AXIS[n.id] ?? 'none'].push(n)
  for (const bloc of ['west', 'east', 'neutral', 'none'] as const) {
    const arr = [...tops[bloc]].sort((a, b) => b.power - a.power)
    const bx = BLOC_X[bloc]
    if (bloc === 'none') {
      // unaffiliated actors — a fringe along the top edge, outside both basins
      arr.forEach((n, i) => pos.set(n.id, { nx: 0.5 + (i - (arr.length - 1) / 2) * 0.12, ny: 0.1 }))
    } else if (bloc === 'neutral') {
      // the contested ridge: a vertical spine down the centre, strongest in the middle
      arr.forEach((n, i) => {
        const t = arr.length === 1 ? 0.5 : i / (arr.length - 1)
        pos.set(n.id, { nx: bx + (i % 2 ? 0.05 : -0.05), ny: 0.2 + t * 0.6 })
      })
    } else {
      // strongest anchors the basin centre; the rest alternate above/below
      arr.forEach((n, i) => {
        const dir = i % 2 === 0 ? -1 : 1
        const step = Math.ceil(i / 2)
        pos.set(n.id, { nx: bx + (i === 0 ? 0 : dir * 0.05), ny: 0.5 + dir * step * 0.2 })
      })
    }
  }

  // 2) dependents — placed on the OUTER slope of their patron's well (parents resolved first)
  const remaining = NODES.filter((n) => n.parent !== 'C')
  let guard = 0
  while (remaining.length && guard++ < 12) {
    for (let i = remaining.length - 1; i >= 0; i--) {
      const n = remaining[i]
      const p = pos.get(n.parent)
      if (!p) continue
      const sibs = NODES.filter((s) => s.parent === n.parent)
      const si = sibs.findIndex((s) => s.id === n.id)
      const ppow = byId.get(n.parent)?.power ?? 50
      const radius = 0.07 + (ppow / 100) * 0.07 // bigger patron → wider orbit
      // fan siblings on the side facing AWAY from centre, so they hang on the outer slope
      const outward = p.nx < FIELD_CX ? Math.PI : 0
      const spread = Math.PI * 0.95
      const ang = sibs.length === 1 ? outward : outward - spread / 2 + (si / (sibs.length - 1)) * spread
      const nx = Math.min(0.95, Math.max(0.05, p.nx + Math.cos(ang) * radius))
      const ny = Math.min(0.92, Math.max(0.08, p.ny + Math.sin(ang) * radius * 1.15))
      pos.set(n.id, { nx, ny })
      remaining.splice(i, 1)
    }
  }
  for (const n of remaining) pos.set(n.id, { nx: BLOC_X[AXIS[n.id] ?? 'none'], ny: 0.5 })

  return NODES.map((n) => {
    const p = pos.get(n.id) ?? { nx: 0.5, ny: 0.5 }
    return { id: n.id, he: n.he, power: n.power, axis: AXIS[n.id] ?? 'none', nx: p.nx, ny: p.ny }
  })
}

const BODIES: WellBody[] = relationalLayout()

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
      const pad = Math.max(diskRadius(this.mass[i]) + 10, 18)
      if (d < pad && d < bestD) { bestD = d; best = i }
    }
    if (best !== this.hoveredIdx) { this.hoveredIdx = best; this.onHover?.(best) }
  }

  // Map normalized body position to screen coords (perspective projection)
  private bodyToScreen(nx: number, ny: number): [number, number] {
    // Usable field margins
    const marginX = this.w * 0.07
    const marginY = this.h * 0.08
    const fw = this.w - marginX * 2
    const fh = this.h - marginY * 2

    // Centre of the perspective projection
    const cy = this.h * 0.5

    // Raw flat position
    const rx = marginX + nx * fw
    const ry = marginY + ny * fh

    // Apply 3/4 perspective: y distances from centre compressed by PERSP_Y,
    // x subtly skewed proportional to y offset for a sheet-in-space feel
    const dy = ry - cy
    const sx = rx + dy * PERSP_SKEW
    const sy = cy + dy * PERSP_Y

    return [sx, sy]
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
      const mass = this.mass[i] * MASS_SCALE * MAX_DISP * depth
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
    const b = BODIES[i]
    const sx = this.bodyScreenX[i]
    const sy = this.bodyScreenY[i]
    const isHov = i === this.hoveredIdx
    const isSel = i === this.selectedIdx
    const isFocus = isHov || isSel

    const rimCol = AXIS_COLOR[b.axis] ?? AXIS_COLOR.none
    const r = diskRadius(this.mass[i])
    const pulse = this.reduced ? 1 : 1 + 0.04 * Math.sin(t * 1.4 + this.breathPhase[i])
    const rr = r * pulse * (isFocus ? 1.22 : 1) * intro

    ctx_save_restore(this.ctx, () => {
      const ctx = this.ctx
      ctx.globalAlpha = intro

      // Outer glow — radial gradient, bloc-tinted (skip when the radius isn't drawable)
      const glowR = rr * (isFocus ? 3.2 : 2.0)
      if (glowR > 0) {
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
        grd.addColorStop(0, `rgba(${rimCol},${isFocus ? 0.3 : 0.12})`)
        grd.addColorStop(1, `rgba(${rimCol},0)`)
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

      // Bloc rim
      ctx.strokeStyle = `rgba(${rimCol},${isFocus ? 0.95 : 0.5})`
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
      const r = diskRadius(this.mass[i])
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
  getSelectedIdx(): number | null { return this.selectedIdx }
  // External selection (from the index / side panel) — sets the highlight WITHOUT firing onSelect.
  selectById(id: string | null) {
    this.selectedIdx = id == null ? null : (BODIES.findIndex((b) => b.id === id) ?? -1)
    if (this.selectedIdx === -1) this.selectedIdx = null
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function diskRadius(power: number): number {
  // Same power→size feel as engine.ts powerSize but smaller for the dense well field.
  // Guard the input: a non-finite/negative power (e.g. a transient during the mass tween) would
  // make Math.pow return NaN → an invalid canvas radius → a throw that halts the whole rAF loop.
  const p = Number.isFinite(power) ? Math.max(0, power) : 0
  return 3 + Math.pow(p / 100, 1.6) * 18
}

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

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const well = new GravityWell(canvas, stage)
    wellRef.current = well
    well.onHover = (idx) => onHoverRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
    well.onSelect = (idx) => onSelectRef.current(idx == null ? null : (BODIES[idx]?.id ?? null))
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

  return (
    <div className="sheet-embed" ref={stageRef} dir="rtl">
      <canvas
        ref={canvasRef}
        className="field"
        role="img"
        aria-label="שדה כוח — מערך גרביטציוני: כל גוף יושב בבאר של מי שמושך אותו, ועומק הבאר הוא כוחו"
      />
    </div>
  )
}
