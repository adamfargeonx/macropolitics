// ForcesWellView — "Gravity Well / Warped Field" alternate visualization.
// A wireframe grid deforms toward each geopolitical body proportional to its
// power (mass), creating gravity wells of depth/width = gravitational pull.
// Same dataset as the orbital view; radically different reading: curvature of
// the field IS the power. Deep, wide wells = dominant actors. Shallow dimples = weak ones.
//
// Architecture mirrors engine.ts: a class drives requestAnimationFrame with
// devicePixelRatio handling via ctx.setTransform, cached rect refreshed on
// resize and pointerenter, full cleanup on unmount.
//
// Usage (after wiring into App.tsx + Chrome.tsx):
//   <ForcesWellView view={view} onView={onView} />

import { useEffect, useRef, useState } from 'react'
import { NODES, AXIS, AXIS_LABEL } from '../data/entities'
import { Header, TabBar, type View } from './Chrome'

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
const SOFTENING = 2800
// Maximum displacement amplitude (screen px) from a single body at zero distance
const MAX_DISP = 110
// Power → mass scaling (higher = more dramatic wells for strong bodies)
const MASS_SCALE = 0.0028

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

function layoutBodies(): WellBody[] {
  // Sort by power descending so strong bodies anchor first
  const sorted = [...NODES].sort((a, b) => b.power - a.power)
  const blocs: Record<string, typeof sorted> = { west: [], east: [], neutral: [], none: [] }
  for (const n of sorted) {
    const ax = AXIS[n.id] ?? 'none'
    blocs[ax].push(n)
  }

  const placed: WellBody[] = []

  // West bloc: left column cluster
  placeBloc(blocs.west, 0.12, 0.15, 0.36, 0.72, placed)
  // East bloc: right column cluster
  placeBloc(blocs.east, 0.64, 0.15, 0.88, 0.72, placed)
  // Neutral + none: centre band
  placeBloc([...blocs.neutral, ...blocs.none], 0.36, 0.2, 0.64, 0.76, placed)

  return placed
}

function placeBloc(
  nodes: typeof NODES,
  x0: number, y0: number, x1: number, y1: number,
  out: WellBody[],
) {
  const n = nodes.length
  if (n === 0) return
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * ((x1 - x0) / (y1 - y0)))))
  const rowCount = Math.ceil(n / cols)
  const dx = (x1 - x0) / (cols)
  const dy = (y1 - y0) / (rowCount)
  nodes.forEach((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    // Jitter slightly so grid lines don't form perfect rectangles with bodies
    const jx = (Math.sin(i * 7.3 + 1.1) * 0.3 + 0.5) * dx
    const jy = (Math.cos(i * 4.7 + 0.9) * 0.3 + 0.5) * dy
    out.push({
      id: node.id, he: node.he, power: node.power,
      axis: AXIS[node.id] ?? 'none',
      nx: x0 + col * dx + jx,
      ny: y0 + row * dy + jy,
    })
  })
}

const BODIES: WellBody[] = layoutBodies()

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
      const pad = Math.max(diskRadius(BODIES[i].power) + 10, 18)
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
      const b = BODIES[i]
      const bsx = this.bodyScreenX[i]
      const bsy = this.bodyScreenY[i]
      const dx = vx - bsx
      const dy = vy - bsy
      const dist2 = dx * dx + dy * dy
      // Gravity kernel: displacement ∝ power / (dist² + softening)
      // breath: subtle time-varying pulse on each body's well (reduced-motion: skip)
      const breath = this.reduced ? 1 : 1 + 0.06 * Math.sin(t * 1.2 + this.breathPhase[i])
      const depth = this.wellDepth[i] * breath
      const mass = b.power * MASS_SCALE * MAX_DISP * depth
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
    const intro = Math.min(1, t / 2.0) // fade-in over 2s
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
        ? `rgba(${YELLOW},${0.22 * intro})`
        : `rgba(${YELLOW},${0.07 * intro})`
      ctx.lineWidth = nearFocus ? 0.7 : 0.45
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
        ? `rgba(${YELLOW},${0.22 * intro})`
        : `rgba(${YELLOW},${0.07 * intro})`
      ctx.lineWidth = nearFocus ? 0.7 : 0.45
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
    const r = diskRadius(b.power)
    const pulse = this.reduced ? 1 : 1 + 0.04 * Math.sin(t * 1.4 + this.breathPhase[i])
    const rr = r * pulse * (isFocus ? 1.22 : 1) * intro

    ctx_save_restore(this.ctx, () => {
      const ctx = this.ctx
      ctx.globalAlpha = intro

      // Outer glow — radial gradient, bloc-tinted
      const glowR = rr * (isFocus ? 3.2 : 2.0)
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
      grd.addColorStop(0, `rgba(${rimCol},${isFocus ? 0.3 : 0.12})`)
      grd.addColorStop(1, `rgba(${rimCol},0)`)
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, TAU); ctx.fill()

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
      const r = diskRadius(b.power)
      const isFocus = i === focus
      const isGreatOrRegional = b.power >= 40 // top tier

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
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function diskRadius(power: number): number {
  // Same power→size feel as engine.ts powerSize but smaller for the dense well field
  return 3 + Math.pow(power / 100, 1.6) * 18
}

function ctx_save_restore(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save(); fn(); ctx.restore()
}

// ── Readout chip (HTML overlay) ───────────────────────────────────────────────
interface ChipProps {
  body: WellBody | null
  screenX: number
  screenY: number
  pinned: boolean
}
function WellChip({ body, screenX, screenY, pinned }: ChipProps) {
  if (!body) return null
  const ax = AXIS[body.id] ?? 'none'
  return (
    <div
      className="well-chip"
      style={{ left: screenX, top: screenY }}
      aria-live="polite"
    >
      <span className="well-chip__name">{body.he}</span>
      <span className="well-chip__score">{body.power.toFixed(0)}</span>
      <span className="well-chip__axis">{AXIS_LABEL[ax]}</span>
      {pinned && <span className="well-chip__pin" aria-hidden>•</span>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ForcesWellView({ view, onView }: { view: View; onView: (v: View) => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Track selected state to show/hide hint; body data for the chip comes from
  // focusBody state — never from a ref read during render (React 19 rule).
  const [hasSelected, setHasSelected] = useState(false)
  const [focusBody, setFocusBody] = useState<WellBody | null>(null)
  const [chipPos, setChipPos] = useState({ x: 0, y: 0 })
  const [chipPinned, setChipPinned] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const well = new GravityWell(canvas, stage)

    well.onHover = (idx) => {
      if (idx !== null) {
        const pos = well.getBodyScreenPos(idx)
        const body = well.getBodyAt(idx)
        const r = diskRadius(body?.power ?? 0)
        setFocusBody((prev) => {
          // If something is selected, don't clobber the chip body on hover
          if (well.getSelectedIdx() !== null) return prev
          return body
        })
        setChipPos({ x: pos.x, y: pos.y - r - 56 })
      } else {
        // Only clear the chip if nothing is selected
        setFocusBody((prev) => (well.getSelectedIdx() !== null ? prev : null))
      }
    }
    well.onSelect = (idx) => {
      if (idx !== null) {
        const pos = well.getBodyScreenPos(idx)
        const body = well.getBodyAt(idx)
        const r = diskRadius(body?.power ?? 0)
        setFocusBody(body)
        setChipPos({ x: pos.x, y: pos.y - r - 56 })
        setChipPinned(true)
        setHasSelected(true)
      } else {
        setFocusBody(null)
        setChipPinned(false)
      }
    }

    well.start_()

    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => well.resize(), 120)
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      well.destroy()
    }
  }, [])

  return (
    <div className="stage forces-well" ref={stageRef} dir="rtl">
      <canvas
        ref={canvasRef}
        className="field"
        role="img"
        aria-label="שדה כוח הגרביטציה — הבארות מעמיקות ביחס לכוח המשיכה של כל גוף גאופוליטי"
      />

      {/* Accessible equivalent for the canvas — screen readers can consume the ranked list */}
      <div className="well-sr-only">
        <h2>דירוג הגופים לפי עומק באר הגרביטציה</h2>
        <ol>
          {[...BODIES].sort((a, b) => b.power - a.power).map((b) => (
            <li key={b.id}>{b.he} — {b.power.toFixed(0)} / 100, {AXIS_LABEL[AXIS[b.id] ?? 'none']}</li>
          ))}
        </ol>
      </div>

      {/* Hover / select readout chip */}
      {focusBody && (
        <WellChip
          body={focusBody}
          screenX={chipPos.x}
          screenY={chipPos.y}
          pinned={chipPinned}
        />
      )}

      {/* Hint — hidden once user selects */}
      {!hasSelected && (
        <div className="well-hint" dir="rtl" aria-live="polite">
          רחפו מעל גוף — עומק הבאר הוא כוח המשיכה
        </div>
      )}

      <Header onHome={() => onView('home')} />
      <TabBar view={view} onView={onView} />
    </div>
  )
}
