import { useEffect, useMemo, useRef, useState } from 'react'
import { AXIS, AXIS_LABEL, powerSize, type Axis } from '../data/entities'
import { STATES, MEMBERS, isActor, relation, sharpen, stanceOf, stanceIsEdge, STANCE_HE, type Rel, type Stance } from './relations-model'
import { GRID_BEAT, GRID_BEAT_SORT_START, GRID_BEAT_SORT_STEP, GRID_PICK, GRID_PICK_SHED_START, GRID_PICK_SHRINK_START } from './panel-beats'
import { useFlipReorder } from './useFlipReorder'
import { Letters } from './Words'

// Unit-triangle vertices for the mini constellations — the SAME vertex↔field weighting as
// unifiedGeo() in RelationsView.tsx (top = friction field/מתח, bottom-left = tension field/חיכוך,
// bottom-right = harmony), so a thumbnail here is recognizably the same figure the full field
// shows for that country once opened, not a rotated re-derivation of it.
const VT = { x: 50, y: 6 }
const VF = { x: 8, y: 84 }
const VH = { x: 92, y: 84 }

// ── Lattice ────────────────────────────────────────────────────────────────────────────────
// Dots don't sit at their own continuous barycentric point; they snap to a fixed triangular
// lattice (1 slot at the apex, 2 below it, 3 below that…). Both constants are calibrated against
// the ORIGINAL site's geometry, read out of its DOM rather than guessed: its triangle is
// `M 9.542 102.5 L 68 0.503 L 126.458 102.5` in a 136×137 box, its dots fall on ~9-unit columns
// and ~10-unit rows (a ten-row lattice), and only ~15 of those slots are ever filled.
//
// That emptiness is the whole point — roughly three quarters of the lattice stays vacant, which
// is what separates one country's dots from the next and lets each triangle read as a distinct
// figure. A denser fill (this began at 6 rows = 21 slots for 19 states, ~90% full) collapses
// every thumbnail into the same solid blob.
// 13, not 10. The lattice must stay MOSTLY EMPTY for a thumbnail to read as a distinct figure
// (see the note above), and a constellation now holds 28 points rather than 19: 10 rows = 55 slots
// = 51% full, which collapses every triangle into the same solid wedge. 13 rows = 91 slots ≈ 31%,
// back near the original site's density. Row pitch stays wider than the largest dot's diameter
// (~4.8 units against 3.8), so neighbouring dots still can't touch.
const GRID_ROWS = 13
// Uniform internal padding, applied by shrinking the lattice's own triangle toward the centroid
// so no slot can land on the drawn outline. Padding the width alone isn't enough — that leaves
// the apex and base rows hard against the edge.
const GRID_PAD = 0.21

function buildSlots(): { x: number; y: number }[] {
  const cx = (VT.x + VF.x + VH.x) / 3, cy = (VT.y + VF.y + VH.y) / 3
  const inset = (v: { x: number; y: number }) => ({ x: cx + (v.x - cx) * (1 - GRID_PAD), y: cy + (v.y - cy) * (1 - GRID_PAD) })
  const T = inset(VT), F = inset(VF), H = inset(VH)
  const slots: { x: number; y: number }[] = []
  for (let r = 0; r < GRID_ROWS; r++) {
    const t = r / (GRID_ROWS - 1) // 0 = apex row, 1 = base row
    const left = { x: T.x + (F.x - T.x) * t, y: T.y + (F.y - T.y) * t }
    const right = { x: T.x + (H.x - T.x) * t, y: T.y + (H.y - T.y) * t }
    for (let i = 0; i <= r; i++) {
      const u = r === 0 ? 0 : i / r
      slots.push({ x: left.x + (right.x - left.x) * u, y: left.y + (right.y - left.y) * u })
    }
  }
  return slots
}
const SLOTS = buildSlots()

// Greedy nearest-slot assignment: each point (in power-ranked order, so the strongest reads get
// first pick) claims whichever unclaimed slot is closest to its true continuous position. It
// distorts individual positions onto the lattice while preserving each point's region of the
// triangle — the coarse read (which pole a country leans toward) survives; the exact coordinate
// doesn't, which is the trade the lattice buys legibility with.
function snapToGrid(pts: MiniPoint[]): MiniPoint[] {
  const used = new Array(SLOTS.length).fill(false)
  return pts.map((p) => {
    let best = -1, bestD = Infinity
    for (let i = 0; i < SLOTS.length; i++) {
      if (used[i]) continue
      const d = (SLOTS[i].x - p.x) ** 2 + (SLOTS[i].y - p.y) ** 2
      if (d < bestD) { bestD = d; best = i }
    }
    if (best < 0) return p // more states than slots — leave the overflow where it stands
    used[best] = true
    return { ...p, x: SLOTS[best].x, y: SLOTS[best].y }
  })
}

// `dom` is the dot's OWN dominant pole — kept per-dot so a hover can light up exactly the
// relations that drive the country's overall label (see .rel-grid__dot--lit).
interface MiniPoint { x: number; y: number; d: number; stance: Stance; actor: boolean }
interface GridRow {
  id: string; he: string; power: number; items: MiniPoint[]
  // Each dot's OWN stance drives which ones light up — see the --lit comment at the JSX site for
  // why this used to be dominantOf() (a different, 3-pole axis: חיכוך/מתח/הרמוניה) instead of the
  // stance actually printed in the caption below (אגרסיבית/אסרטיבית/זהירה).
  mean: Rel; stance: Stance
  // posture sits within STANCE_EDGE of a bucket boundary — the caption says so rather than
  // rounding to one side in silence (see stanceIsEdge in relations-model).
  edge: boolean
  // 'great' (usa/russia/china/europe/india) is the outside-power tier in entities.ts — the only
  // states that orbit the centre rather than sitting inside the region. Everything else here is
  // a Middle Eastern or immediately-adjacent native actor. Used to split the power sort into
  // native actors first, outside powers last, rather than one flat power ranking.
  isGlobal: boolean
  axis: Axis
}

// Severity order for the stance sort — matches stanceOf()'s own threshold ordering (agg > dom >
// caut), not alphabetical or insertion order.
const STANCE_RANK: Record<Stance, number> = { agg: 0, dom: 1, caut: 2 }
// west/east/neutral, matching forces-model.ts's own BLOCS order elsewhere in the app. 'none' has
// no member among the 20 relations states, but ranked last defensively rather than omitted.
const AXIS_RANK: Record<Axis, number> = { west: 0, east: 1, neutral: 2, none: 3 }

type SortKey = 'power' | 'stance' | 'bloc'
const SORTS: Record<SortKey, { label: string; fn: (a: GridRow, b: GridRow) => number }> = {
  // Native actors first (by power), outside powers last (by power) — not one flat ranking. With
  // 5 global powers and a 5-wide grid this lands the outside powers on their own final row.
  power: { label: 'לפי עוצמה', fn: (a, b) => (Number(a.isGlobal) - Number(b.isGlobal)) || (b.power - a.power) },
  // Grouped by posture (אגרסיבית → אסרטיבית → זהירה), power desc within each group.
  stance: { label: 'לפי עמדה', fn: (a, b) => (STANCE_RANK[a.stance] - STANCE_RANK[b.stance]) || (b.power - a.power) },
  // Grouped by bloc (הציר המערבי → הציר המזרחי → גוש ניטרלי), power desc within each group.
  bloc: { label: 'לפי גוש', fn: (a, b) => (AXIS_RANK[a.axis] - AXIS_RANK[b.axis]) || (b.power - a.power) },
}
// The caption's colour follows the stance, reusing the pole ramp: אגרסיבית takes the חיכוך warm,
// אסרטיבית the מתח yellow, זהירה the הרמוניה cool.
const STANCE_CLASS: Record<Stance, string> = { agg: 't', dom: 'f', caut: 'h' }
// Bloc bands reuse the app's existing allegiance rims (--rim-west/east/neutral, base.css), so a
// band header here runs the same temperature the forces screen already paints that bloc.
const AXIS_CLASS: Record<Axis, string> = { west: 'w', east: 'e', neutral: 'n', none: 'n' }

// ── Bands ─────────────────────────────────────────────────────────────────────────────────────
// Both grouped sorts stop being a flat run of 20 cells and become labelled registers. The grouping
// used to be carried by ORDER alone — you had to read every caption to find where אגרסיבית ended
// and אסרטיבית began — so the band header now states it once, with the count.
//
// `align` is what makes the bloc sort read as an axis instead of a list. The two blocs don't share
// a row of columns at all there: they take a half of the screen each, facing across a centre
// spine, and each one's ragged row presses TOWARD that line (west's align is 'end' because in RTL
// the right half's end edge IS the spine, and east's 'start' is the same edge from the other
// side). The unaligned band drops below and spans the whole width — the only band that crosses.
type Align = 'start' | 'center' | 'end'
const AXIS_ALIGN: Record<Axis, Align> = { west: 'end', east: 'start', neutral: 'center', none: 'center' }

interface Band { key: string; label: string; tone: string; align: Align; items: GridRow[] }

// `sorted` already runs group-by-group (both grouped sorts lead with their group rank), so the
// bands are just its consecutive runs — no second pass over the roster, and the order inside a
// band stays exactly the power ranking the sort produced.
function buildBands(sorted: GridRow[], sort: SortKey): Band[] {
  const bands: Band[] = []
  for (const row of sorted) {
    const key = sort === 'stance' ? row.stance : row.axis
    const open = bands[bands.length - 1]
    if (open && open.key === key) { open.items.push(row); continue }
    bands.push({
      key,
      label: sort === 'stance' ? STANCE_HE[row.stance] : AXIS_LABEL[row.axis],
      tone: sort === 'stance' ? STANCE_CLASS[row.stance] : AXIS_CLASS[row.axis],
      align: sort === 'stance' ? 'start' : AXIS_ALIGN[row.axis],
      items: [row],
    })
  }
  return bands
}

// Empty leading modules, so a short band can sit at the far edge or on the centre line while every
// cell still lands on the SAME column rhythm as every other band — the grid breaks where the data
// does, the alignment doesn't. Grid fills row by row, so the offset rides the first cell and the
// partial row ends up at the TOP of the band; that's deliberate, it keeps the last row flush.
function leadOffset(count: number, cols: number, align: Align): number {
  const slack = (cols - (count % cols)) % cols
  if (align === 'end') return slack
  if (align === 'center') return Math.floor(slack / 2)
  return 0
}

// Exit spread (ms) — the window over which cells BEGIN leaving, count-independent. Kept so that
// spread + relGridCellOut's own duration (340ms) fits inside App.tsx's EXIT_MS (680ms) budget for
// the page → home transition; overshoot it and the last cells are cut off mid-animation.
const EXIT_SPREAD = 300

// Stance-caption ambient cycling (views.css: .rel-grid__pole uses its OWN poleCycle keyframe, a
// slower cousin of the field's nameCycle — see the CSS for why the two diverged). Removed from
// being permanently visible under every name; it now surfaces on hover, and sporadically on its
// own for whichever cells the per-cell phase below currently favours, so the grid keeps a little
// life in it at rest instead of reading as a static wall of labels once settled.
// There is deliberately no SETTLE constant any more: the loop is phase-offset with a NEGATIVE
// delay (see the call site), so there is no leading wait to place past the entrance — and none is
// needed, because .rel-grid__pole's own relCapIn is `backwards`-filled and holds the parent at
// opacity 0 until its caption beat, masking the cycling letters underneath until then.
// 10, not the field's 9 — poleCycle's own keyframe percentages (views.css) are tuned against this
// exact period; the field's nameCycle keyframe is a different shape.
const POLE_CYCLE_PERIOD = 10

// Deterministic pseudo-random in [0,1) (FNV-1a). The dot phase needs a SCATTER, but it must be the
// same scatter on every render — Math.random() would reshuffle the constellations on any re-render
// that lands mid-cascade, and a re-sort would visibly re-roll dots that hadn't moved.
function hash01(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}


// Every row must be full — no half-empty last row. CSS can't express "pick a column count that
// divides the item count", since auto-fill only knows the width, so the count is chosen here:
// take the column count the width suggests, then snap to the nearest exact divisor of the item
// count. With 20 states the usable divisors are 1, 2, 4, 5, 10, 20 — a wide screen lands on 5
// (4 full rows), a narrow one on 2 (10 full rows).
//
// Caveat worth knowing: this is only satisfiable when the item count is composite. If the roster
// ever became a prime number of states (19, say) the only divisors are 1 and itself, and a ragged
// row becomes unavoidable — the nearest-divisor snap keeps it sane, it just can't work miracles.
//
// Applies to the FLAT sort only. The banded sorts want the opposite: a ragged tail is how a band
// shows its own length, so they take the suggested count as-is (useBandColumns below).
// How many cell rows the banded layout may spend before it stops fitting one fold. Three band
// headers already cost roughly half a row between them, so this is one less than it looks.
const ROW_BUDGET = 4
// The narrowest a cell may get before the constellation inside it stops being readable — the only
// thing stopping a very wide viewport from running everything into a single thin row.
const MIN_BAND_CELL_W = 150

const bandRows = (band: Band, cols: number): number =>
  Math.ceil((band.items.length + leadOffset(band.items.length, cols, band.align)) / cols)

// Unlike the flat sort, the bands don't want a divisor of the roster — they want the FEWEST
// columns that still fit the row budget, because fewer columns means bigger triangles. Searching
// upward from 3 and stopping at the first count that fits is what keeps the cells large: picking
// columns from width alone gave 8 where 7 fits the same four rows with cells 15% wider.
//
// `rowsAt` is passed in because the two grouped sorts stack differently — stance bands each take a
// full-width row of their own, while the bloc's two poles share one row side by side.
function pickColumns(width: number, rowsAt: (cols: number) => number): number {
  const ceiling = Math.max(3, Math.min(8, Math.floor(width / MIN_BAND_CELL_W)))
  for (let cols = 3; cols < ceiling; cols++) if (rowsAt(cols) <= ROW_BUDGET) return cols
  return ceiling
}

function useElementWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setWidth(el.clientWidth)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

interface RelationsGridProps {
  onSelect: (id: string) => void
  // navigating away to home — a per-cell rank-ordered shrink/fade, mirroring the field's own
  // .rel-field--leaving .rnode cascade so leaving reads the same from either mode.
  leaving?: boolean
  // a cell was just picked — the WHOLE grid cross-fades out as one unit (not per-cell) before the
  // field mounts; see RelationsView's enterField/GRID_EXIT_MS.
  selecting?: boolean
  // RelationsView sets this once you've been to the field and come BACK — every other arrival
  // (home, another screen's nav, the very first load) keeps the full three-phase reveal below
  // unchanged. Coming back from the field is different: you've already watched the grid load
  // once this visit, so replaying that ~3.5s show every time you tap "back" read as the app
  // stalling on something you'd already seen. See .rel-grid--fast in views.css.
  fast?: boolean
}

// How long the three-phase load runs end to end (captions finish at capStart + capMax + 0.5s).
// After this the screen is "settled" and re-sorts REFLOW instead of replaying — see below.
const LOAD_MS = 4550
// The fast (back-from-field) re-entrance settles almost as soon as it starts. Duration/rise
// distance live in views.css (relCellRiseIn); only the per-cell delay spread is needed here.
const FAST_LOAD_MS = 650
const FAST_START = 0.04
const FAST_SPREAD = 0.14

// What the picked cell needs in order to fly: where to go, how big to get, and which point of
// itself to pivot around. All of it is measured from the LIVE rects at click time rather than
// assumed from the layout — the grid is fluid (column count snaps to a divisor of the roster, rows
// divide the leftover viewport height), so a cell's size and position are not knowable statically.
// he is all that's still needed once picking — the title card is the only thing that reads it.
// Used to also carry a measured flight plan (tx/ty/ts/ox/oy, via getBoundingClientRect) for flying
// the bare outline to the field's own future triangle and landing there — dropped along with that
// travel beat (see relPickShrink in views.css): the picked cell now just shrinks where it sits, so
// nothing about the field's eventual position or size needs measuring any more.
interface Pick { id: string; he: string }

export function RelationsGrid({ onSelect, leaving, selecting, fast }: RelationsGridProps) {
  const [sort, setSort] = useState<SortKey>('power')
  // the cell being flown to the field, with its measured flight plan
  const [pick, setPick] = useState<Pick | null>(null)
  // The three-phase load is a first-impression device, not a sort transition. Switching sort
  // swaps the flat grid for the banded one (a different container, so React remounts every cell)
  // and the whole 3.7s outline → dots → captions sequence played again — a reveal the first time,
  // a wait for a table to re-sort by the third. Once settled, the cells appear immediately and
  // only their POSITION changes. `fast` settles almost immediately — its own reveal is one quick
  // beat, not three, so there's nothing left to protect a re-sort from replaying.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(true), fast ? FAST_LOAD_MS : LOAD_MS)
    return () => window.clearTimeout(t)
  }, [fast])

  // Per-country label is the MEAN of its own 19 relations (raw, pre-sharpen), reduced to a
  // dominant pole — not DISPO, which already feeds INTO relation() and would make the caption
  // circular. This gives the grid a sortable spine no other screen has, in the same vocabulary
  // the live field already uses (POLE_HE).
  const rows = useMemo<GridRow[]>(() => STATES.map((ref) => {
    let mt = 0, mf = 0, mh = 0, mn = 0
    const items = snapToGrid(MEMBERS.filter((e) => e.id !== ref.id).map((e) => {
      const raw = relation(ref.id, e.id)
      // The stance MEAN counts states only, even though the figure now plots all 28 members.
      // Deliberate: posture answers "how does this country sit toward the state system", and
      // nearly every state is hostile to דאעש and אל-קעאידה, so folding actors in adds a near
      // constant that rewards the DEFENSIVE. Measured with actors included, אירופה came out
      // אגרסיבית above רוסיה purely for opposing jihadist groups it has no theatre against —
      // the label stops describing posture and starts counting how many armed groups exist.
      if (!isActor(e.id)) { mt += raw.tension; mf += raw.friction; mh += raw.harmony; mn++ }
      const sr = sharpen(raw)
      // No jitter here (the field's own placement uses it): its only job was keeping two states
      // with identical derived output from stacking into one dot, and the lattice already
      // guarantees every point a distinct slot. Jitter would also blur which slot is nearest.
      return {
        x: sr.friction * VT.x + sr.tension * VF.x + sr.harmony * VH.x,
        y: sr.friction * VT.y + sr.tension * VF.y + sr.harmony * VH.y,
        // Scaled to the lattice, not the free layout: at this density the field-sized radii are
        // wider than half a slot gap, so neighbouring dots would touch and close the very gaps
        // the lattice exists to create. Holds roughly the original's dot-to-spacing ratio.
        d: Math.max(0.9, Math.min(1.9, powerSize(e.power) * 0.0104)),
        // Same stanceOf() the country's own MEAN is classified by, applied per-relationship — so
        // "lit" answers "which of this country's ties are themselves aggressive/assertive/cautious
        // enough to match its overall reading", not a different, invisible axis (see the JSX site).
        stance: stanceOf(raw),
        actor: isActor(e.id),
      }
    }))
    // mn (states counted) is NOT items.length (all members plotted) — see the mean note above.
    const mean: Rel = { tension: mt / mn, friction: mf / mn, harmony: mh / mn }
    // isGlobal here is a RELATIONS-GRID-SPECIFIC grouping, not a read of the shared `kind` tier
    // alone: Pakistan is folded into it (at the tier's own bottom — see the power-sort tiebreak,
    // which ranks WITHIN isGlobal by power) without touching entities.ts's `kind: 'regional'`.
    // `kind === 'great'` also drives which states orbit the Dynamics centre instead of a regional
    // parent — reclassifying it there would silently move Pakistan's orbit on a completely
    // different screen as a side effect of a grid-layout request. Scoped to this one computation.
    const isGlobal = ref.kind === 'great' || ref.id === 'pakistan'
    return { id: ref.id, he: ref.he, power: ref.power, items, mean, stance: stanceOf(mean), edge: stanceIsEdge(mean), isGlobal, axis: AXIS[ref.id] ?? 'none' }
  }), [])

  const sorted = useMemo(() => rows.slice().sort(SORTS[sort].fn), [rows, sort])

  const n = sorted.length
  // Base entrance delay for the sort rail's 4 items (label + 3 buttons) — see GRID_BEAT_SORT_STEP
  // at the JSX site for why each one adds its own offset on top of this instead of sharing it.
  const sortBase = fast ? 0.5 : GRID_BEAT_SORT_START
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyWidth = useElementWidth(bodyRef)
  // The flat (power) sort is fixed at 3 rows now — a deliberate structural choice, not the
  // width-responsive "closest divisor of the roster" useEvenColumns picks for every other count.
  // cols is derived from THAT constraint (ceil(n/3)), and any short slot in the last row is filled
  // with an inert placeholder rather than leaving the grid a jagged, uneven shape.
  const FLAT_ROWS = 3
  const flatCols = Math.ceil(n / FLAT_ROWS)
  const flatSlots = flatCols * FLAT_ROWS
  const flatPlaceholders = flatSlots - n
  const bands = useMemo(() => (sort === 'power' ? null : buildBands(sorted, sort)), [sorted, sort])
  // The bloc sort splits its bands in two: the poles face each other across the spine, everything
  // unaligned falls below them. The stance sort has no such split — every band is full width.
  const poles = useMemo(() => (sort === 'bloc' && bands ? bands.filter((b) => b.key === 'west' || b.key === 'east') : []), [bands, sort])
  const loose = useMemo(() => (bands ? bands.filter((b) => !poles.includes(b)) : []), [bands, poles])
  // A pole band only gets HALF the width, so it counts columns at half the module; the bands below
  // span the full width and get double. One number drives both, which is what keeps every cell on
  // the screen the same size no matter which region it sits in.
  const cols = useMemo(() => {
    if (!bands) return 0
    if (!poles.length) return pickColumns(bodyWidth, (c) => bands.reduce((sum, b) => sum + bandRows(b, c), 0))
    return pickColumns(bodyWidth / 2, (c) => (
      Math.max(...poles.map((b) => bandRows(b, c))) + loose.reduce((sum, b) => sum + bandRows(b, c * 2), 0)
    ))
  }, [bands, poles, loose, bodyWidth])
  // Height of the facing-poles region, in cell rows — both halves lay out on it so a four-item
  // band and a nine-item one still print the same size cell.
  const poleRows = poles.length ? Math.max(...poles.map((b) => bandRows(b, cols))) : 0

  // Reading-order rank, taken once from the sorted roster rather than each band's own index — the
  // entrance cascade has to sweep the screen once, not restart at every band header.
  const rank = useMemo(() => new Map(sorted.map((row, i) => [row.id, i])), [sorted])

  // Re-sorting glides the triangles from their old positions to their new ones instead of the
  // whole grid cutting to a new frame. Gated on `settled`: during the first 3.7s the cells are
  // still playing their own three-phase reveal, and a FLIP on top of that would fight it.
  useFlipReorder(bodyRef, '.rel-grid__cell', sort, settled)

  const cell = (row: GridRow, offset = 0) => {
    const i = rank.get(row.id) ?? 0
    const chosen = pick?.id === row.id
    // Dismissal is ordered by DISTANCE FROM THE PICK, not reading order: the grid should empty
    // outward from the cell you chose, so the motion points at your own action. |rank difference|
    // is the honest proxy here — the cells are laid out in rank order, so rank distance and
    // on-screen distance agree, and it costs no measurement.
    const pickRank = pick ? (rank.get(pick.id) ?? 0) : 0
    const spread = Math.max(1, Math.max(pickRank, n - 1 - pickRank))
    const dismissDelay = GRID_PICK.dismissStart + (Math.abs(i - pickRank) / spread) * GRID_PICK.dismissSpread
    // per-cell exit delay — spread over EXIT_SPREAD in rank order, count-independent,
    // mirroring RelationsView's own exitDelay for .rnode (same idiom, same spread window).
    const exitDelay = (n <= 1 ? 0 : i / (n - 1)) * EXIT_SPREAD
    // Phase 1 does NOT sweep in reading order — a per-rank ladder read as one row after another,
    // which is a real offset but a *legible, expected* one; the brief was scattered, not sequential.
    // Hashed on row.id (the same idiom already used for the dots/pole-cycle below), so each triangle
    // gets an independent, uncorrelated delay — no relationship to its row, column, or rank.
    const strokeDelay = GRID_BEAT.strokeStart + hash01(`${row.id}:stroke`) * GRID_BEAT.strokeSpread
    // Phase 3 still sweeps in reading order (capped) — the caption naming what's already visible
    // reads better as "the eye's own path catches up", unlike phase 1's spawn.
    const capDelay = GRID_BEAT.capStart + Math.min(i * GRID_BEAT.capStep, GRID_BEAT.capMax)
    // per-cell phase, hashed (not by index) for the same reason the dots are — a sweep in reading
    // order would just be phase 3's own cascade motion repeating one layer down; independent
    // phases are what reads as "sporadic" instead.
    // NEGATIVE — a phase offset, not a wait. animation-delay is spent once, BEFORE the first
    // iteration, so a positive value is re-served in full on every restart. And the cycle DOES get
    // restarted constantly: the hover rule overrides it with its own animation, so the moment the
    // cursor leaves a cell, poleCycle re-attaches from scratch and the caption both pops out with
    // no fade AND goes dark for the whole 4-14s wait again. Mousing across the grid blanked most of
    // it. Negative starts each cell already at its own offset, so a restart drops straight back
    // into the loop mid-phase instead of hiding the label. The entrance is still protected without
    // the old settle: .rel-grid__pole's own relCapIn is `backwards`-filled, so the PARENT holds
    // opacity 0 until its caption beat and masks whatever the letters are doing underneath.
    const poleCycleDelay = -(hash01(`${row.id}:pole`) * POLE_CYCLE_PERIOD)
    // Fast (back-from-field) re-entrance: a single quick rise, hashed the same way phase 1 is —
    // see .rel-grid--fast in views.css, which swaps out the three-phase reveal entirely rather
    // than just speeding it up (there's nothing left to draw-in/rain-in/caption when the whole
    // cell arrives pre-formed).
    const fastDelay = FAST_START + hash01(`${row.id}:fast`) * FAST_SPREAD
    return (
      <button
        key={row.id}
        // the FLIP matches on this, NOT on the node — see useFlipReorder for why node identity
        // isn't stable across a flat <-> banded sort change
        data-id={row.id}
        className={`rel-grid__cell${chosen ? ' rel-grid__cell--chosen' : ''}${pick && !chosen ? ' rel-grid__cell--gone' : ''}`}
        style={{
          '--stroke-d': `${strokeDelay}s`,
          '--fast-d': `${fastDelay.toFixed(3)}s`,
          '--cap-d': `${capDelay}s`,
          '--cp-delay': `${poleCycleDelay.toFixed(3)}s`,
          '--cp-dur': `${POLE_CYCLE_PERIOD}s`,
          '--exit-cd': `${exitDelay}ms`,
          '--dismiss-d': `${dismissDelay}s`,
          // only ever set on a band's first cell — see leadOffset()
          gridColumnStart: offset > 0 ? offset + 1 : undefined,
        } as React.CSSProperties}
        onClick={() => {
          if (pick) return
          setPick({ id: row.id, he: row.he })
          onSelect(row.id)
        }}
        aria-label={`פתחו את מערכת היחסים של ${row.he} — עמדה ${STANCE_HE[row.stance]}${row.edge ? ' (קרוב לגבול הסיווג)' : ''}`}
      >
        {/* viewBox height 85, not 90: the triangle's BASE sits at y=84, so the original box carried
            6 units of dead space beneath it — which read as part of the gap between a triangle and
            its caption (measured 15px, over half of it empty box). 85 crops that to 1 unit, enough
            to still contain the base stroke's outer half at stroke-width 1; an exact 84 would clip
            it. The coordinate space is untouched, so VT/VF/VH and the lattice math are unaffected.
            xMidYMax keeps the figure bottom-anchored if the box is ever width-bound rather than
            height-bound, so the caption gap can't reopen at another viewport size. */}
        <svg viewBox="0 0 100 85" preserveAspectRatio="xMidYMax meet" className="rel-grid__svg" aria-hidden="true">
          <polygon className="rel-grid__poly" points={`${VT.x},${VT.y} ${VF.x},${VF.y} ${VH.x},${VH.y}`} />
          {/* --lit marks the relations that are THEMSELVES aggressive/assertive/cautious enough to
              match the country's own overall stance — the same stanceOf() classification, just
              applied per-relationship instead of to the mean — so hovering the card answers
              "which ties actually make this read אגרסיבית?" with an answer that traces back to the
              stance actually printed below, not a separate invisible axis. (Used to compare
              dominantOf() — a 3-pole חיכוך/מתח/הרמוניה read that, per relations-model.ts's own
              documented reasoning, the חיכוך pole never wins on ANY country's mean — so an
              "aggressive" country's lit dots were clustering at the מתח vertex regardless of how
              aggressive it read, reported live as confrontational countries lighting up the wrong
              corner of their own triangle.) */}
          {row.items.map((p, pi) => (
            <circle
              key={pi}
              className={`rel-grid__dot${p.actor ? ' rel-grid__dot--actor' : ''}${p.stance === row.stance ? ' rel-grid__dot--lit' : ''}`}
              cx={p.x} cy={p.y} r={p.d}
              // hashed on the dot's own identity, NOT its index — so the fill-in reads as rain
              // across the whole screen rather than a second sweep in cell order.
              // --shed-d is the pick sequence's own scatter (beat 2.5, see GRID_PICK.shedSpread):
              // a SEPARATE salt from the rain above, so the stars don't leave in the same order
              // they arrived in — the same "independent, uncorrelated phases" reasoning the stroke
              // and pole-cycle delays already use, applied to the one cell that gets picked.
              style={{
                '--dot-d': `${(GRID_BEAT.dotsStart + hash01(`${row.id}:${pi}`) * GRID_BEAT.dotsSpread).toFixed(3)}s`,
                '--shed-d': `${(hash01(`${row.id}:${pi}:shed`) * GRID_PICK.shedSpread).toFixed(3)}s`,
              } as React.CSSProperties}
            />
          ))}
        </svg>
        <span className="rel-grid__name">{row.he}</span>
        {/* the trailing asterisk is this site's existing "this is a judgment, not a measurement"
            mark (see the honesty disclosure in the utility nav) — reused rather than inventing a
            second vocabulary for the same admission.
            Letters, not plain text: each ambient reveal now cascades per character (views.css's
            .rel-grid__pole .letters__ch), the SAME per-letter stagger-in idiom already built for
            the home intro line — reused rather than hand-rolling a second one. */}
        <Letters
          text={`${STANCE_HE[row.stance]}${row.edge ? '*' : ''}`}
          className={`rel-grid__pole rel-grid__pole--${STANCE_CLASS[row.stance]}${row.edge ? ' rel-grid__pole--edge' : ''}`}
        />
      </button>
    )
  }


  // One band — header, then its own slice of the shared column module. `cols` differs by region
  // (half-width for a pole, full width for a band below), which is exactly why it's an argument
  // rather than read off a single state.
  const band = (b: Band, bandCols: number, order: number) => {
    const off = leadOffset(b.items.length, bandCols, b.align)
    return (
      <section
        key={b.key}
        className={`rel-grid__band rel-grid__band--${b.tone} rel-grid__band--${b.align}`}
        style={{
          '--cols': bandCols,
          '--brows': bandRows(b, bandCols),
          animationDelay: `${GRID_BEAT.note + order * 0.07}s`,
        } as React.CSSProperties}
      >
        <h2 className="rel-grid__band-head">
          <span className="rel-grid__band-rule rel-grid__band-rule--a" aria-hidden="true" />
          <span className="rel-grid__band-l">{b.label}</span>
          <span className="rel-grid__band-n">{b.items.length}</span>
          <span className="rel-grid__band-rule rel-grid__band-rule--b" aria-hidden="true" />
        </h2>
        <div className="rel-grid__band-cells">
          {b.items.map((row, ri) => cell(row, ri === 0 ? off : 0))}
        </div>
      </section>
    )
  }

  return (
    <div
      className={`rel-grid${settled ? ' rel-grid--settled' : ''}${pick ? ' rel-grid--picking' : ''}${selecting && !pick ? ' rel-grid--selecting' : ''}${leaving ? ' rel-grid--leaving' : ''}${fast ? ' rel-grid--fast' : ''}`}
      // the pick beats are published to CSS from GRID_PICK rather than restated as literals in the
      // stylesheet — the schedule has ONE definition (panel-beats.ts) that both sides read.
      style={pick ? ({
        '--dismiss-dur': `${GRID_PICK.dismissDur}s`,
        '--shed-d0': `${GRID_PICK_SHED_START}s`,
        '--shed-dur': `${GRID_PICK.shedDur}s`,
        '--shrink-d': `${GRID_PICK_SHRINK_START}s`,
        '--shrink-dur': `${GRID_PICK.shrinkDur}s`,
      } as React.CSSProperties) : undefined}
    >
      {/* No screen title or standfirst here. The bottom tab bar already names this screen, and
          every vertical pixel the header takes comes straight out of the triangles — which have
          to fit in one fold. The sort row carries the whole header instead, with the coverage
          note riding its far end rather than owning a block of its own. */}
      {/* A vertical rail down the LEFT edge, centred against the grid — not a header band. The
          grid block is now width-derived and centred (see .rel-grid__cells), which leaves a wide
          empty margin on each side; the sort control moves into it instead of spending a row of
          the fold. The coverage note that used to ride this bar is gone — it stated a number
          (20/20) that never changes for the reader. */}
      {/* fast (back-from-field) re-entrance collapses the whole reveal to ~0.65s — waiting out
          the SLOW load's own finish time here would leave this rail stranded off-screen for
          seconds after every cell has already reappeared. FAST_START + FAST_SPREAD + relCellRiseIn's
          own 0.32s (views.css) ≈ 0.5s is that cascade's own end, the fast-mode equivalent of
          GRID_BEAT_SORT_START below. */}
      {/* The four items (label + 3 buttons) each carry their OWN entrance delay now — see
          GRID_BEAT_SORT_STEP — rather than the container animating as one rigid block: reported
          live as wanting them to appear individually, offset from one another. The container
          itself no longer animates (see views.css), so it carries no delay of its own. */}
      <div className="rel-grid__sortbar">
        <span className="rel-grid__sort-l" style={{ animationDelay: `${sortBase}s` }}>מיון</span>
        {(Object.keys(SORTS) as SortKey[]).map((key, si) => (
          <button
            key={key}
            className={`rel-grid__sort-btn${sort === key ? ' rel-grid__sort-btn--on' : ''}`}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
            style={{ animationDelay: `${sortBase + (si + 1) * GRID_BEAT_SORT_STEP}s` }}
          >
            {SORTS[key].label}
          </button>
        ))}
      </div>

      {/* One wrapper for whichever body the sort produces, so a single ref measures the available
          width for the banded layout's own column strategy (pickColumns) — the flat sort's column
          count is now a fixed structural derivation (FLAT_ROWS), not width-responsive. */}
      <div className="rel-grid__body" ref={bodyRef}>
        {bands ? (
          <div className="rel-grid__bands">
            {poles.length > 0 && (
              /* The divide itself. The two blocs get a half of the screen each and press toward
                 the line between them; the bands underneath run the full width and cross it. */
              <div className="rel-grid__poles" style={{ '--prows': poleRows } as React.CSSProperties}>
                <span className="rel-grid__spine" aria-hidden="true" />
                {poles.map((b, bi) => band(b, cols, bi))}
              </div>
            )}
            {loose.map((b, bi) => band(b, poles.length ? cols * 2 : cols, poles.length + bi))}
          </div>
        ) : (
          /* --rows so the cells area can divide the remaining viewport height into exactly the
             rows it needs; the whole grid has to sit in one fold on desktop, no scrolling. */
          <div
            className="rel-grid__cells"
            style={{ '--cols': flatCols, '--rows': FLAT_ROWS } as React.CSSProperties}
          >
            {sorted.map((row) => cell(row))}
            {/* fills out row 3 when the roster isn't an exact multiple of flatCols — inert, no
                interaction, no caption. Renders the same bare triangle geometry as a real cell
                (dimmed, static — see .rel-grid__cell--placeholder) so the empty seat reads as a
                reserved slot in the grid's own visual language rather than a hole in it. */}
            {Array.from({ length: flatPlaceholders }, (_, i) => {
              // A placeholder is a CELL for layout, so it has to be a cell for every CASCADE the
              // grid runs too. --gone is applied inside cell(), which placeholders never go through,
              // so on a pick every real triangle dismissed and this one just sat there lit — and on
              // a page exit it carried no --exit-cd, so it left first instead of in sequence.
              // Ranked one past the last real cell: it is the last seat in reading order, so it
              // dismisses furthest-from-the-pick and exits last, exactly like a real trailing cell.
              const phRank = n + i
              const pickRank = pick ? (rank.get(pick.id) ?? 0) : 0
              const spread = Math.max(1, Math.max(pickRank, n - 1 - pickRank))
              const dismissDelay = GRID_PICK.dismissStart + (Math.abs(phRank - pickRank) / spread) * GRID_PICK.dismissSpread
              return (
              <div
                key={`ph-${i}`}
                className={`rel-grid__cell rel-grid__cell--placeholder${pick ? ' rel-grid__cell--gone' : ''}`}
                aria-hidden="true"
                style={{ '--exit-cd': `${EXIT_SPREAD}ms`, '--dismiss-d': `${dismissDelay}s` } as React.CSSProperties}
              >
                <svg viewBox="0 0 100 85" preserveAspectRatio="xMidYMax meet" className="rel-grid__svg">
                  <polygon className="rel-grid__poly" points={`${VT.x},${VT.y} ${VF.x},${VF.y} ${VH.x},${VH.y}`} />
                </svg>
                {/* invisible spacers, not just the bare svg — a real cell's column is svg+name+pole
                    centered as ONE group (.rel-grid__cell's justify-content:center), so the two text
                    lines below the triangle push IT up within the cell. Without them here the lone
                    svg centers on the FULL cell height instead and sits visibly lower than its row —
                    reported live as "still disconnected from grid". visibility:hidden (not display:
                    none) keeps the box in layout while painting nothing. */}
                <span className="rel-grid__name" style={{ visibility: 'hidden' }}>&nbsp;</span>
                <span className="rel-grid__pole" style={{ visibility: 'hidden' }}>&nbsp;</span>
              </div>
              )
            })}
          </div>
        )}
      </div>
      {/* The title card used to render here — moved to RelationsView.tsx. It now has to outlive
          this component: the field mounts WHILE the title is still rising/fading (not after), so
          the title needs its own lifecycle independent of `pick`, which dies the instant this
          whole component unmounts at the mode switch. See RelationsView's pickTitleId. */}
    </div>
  )
}
