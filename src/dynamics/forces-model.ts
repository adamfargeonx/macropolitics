// Pure model + layout helpers for the Forces constellation. No React, no JSX — just the
// constants, derived metrics, the detail-record builder, and the polar layout solver.
import { NODES, FORCES, POWER_NOTES, forceScore, powerSize, AXIS, AXIS_LABEL } from '../data/entities'
import { DATA } from '../data/empirical'
import { type GravityResult } from '../model/gravity'
import { type EntityDetail } from './Chrome'

export type Order = 'total' | 'eco' | 'mil' | 'geo'
export type Bloc = 'all' | 'west' | 'east' | 'neutral'
export type Raw = { eco: number; mil: number; geo: number }
export type LayoutNode = { e: typeof NODES[number]; x: number; y: number; d: number }
export type LayoutRing = { k: string; r: number; label: string }
export type Layout = { nodes: LayoutNode[]; rings: LayoutRing[]; cx: number; cy: number }

const TAU = Math.PI * 2
const BANDS = ['great', 'regional', 'intermediate', 'edge', 'nonstate'] as const
const BAND_R: Record<string, number> = { great: 0.26, regional: 0.47, intermediate: 0.65, edge: 0.81, nonstate: 0.96 }
const TIER_LABEL: Record<string, string> = {
  great: 'כוח-על', regional: 'כוח אזורי', intermediate: 'כוח ביניים', edge: 'כוח קצה', nonstate: 'שחקנים לא-מדינתיים',
}
const QUANTILE_LABEL = ['המובילים', 'חזקים', 'בינוניים', 'חלשים', 'שוליים']
const RANK_BANDS = [0.26, 0.47, 0.65, 0.81, 0.96]
const BAND_PHASE: Record<string, number> = { great: 0, regional: 0.55, intermediate: 0.25, edge: 0.8, nonstate: 0.45 }

export const AXIS_RIM: Record<string, string> = { west: '132,160,196', east: '198,134,98', neutral: '150,150,160', none: '120,120,128' }
export const ORDERS: Order[] = ['total', 'eco', 'mil', 'geo']
export const ORDER_LABEL: Record<Order, string> = { total: 'כוח משיכה', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו-אסטרטגי' }
export const ORDER_SHORT: Record<Order, string> = { total: 'סה״כ', eco: 'כלכלי', mil: 'צבאי', geo: 'גאו' }
export const BLOCS: Bloc[] = ['all', 'west', 'east', 'neutral']
export const BLOC_LABEL: Record<Bloc, string> = { all: 'הכל', west: 'מערב', east: 'מזרח', neutral: 'ניטרלי' }
export const DEFAULT_RAW: Raw = { eco: 36, mil: 34, geo: 30 }
export const SB_AXES: { k: keyof Raw; he: string }[] = [{ k: 'eco', he: 'כלכלי' }, { k: 'mil', he: 'צבאי' }, { k: 'geo', he: 'גאו' }]

// interaction tuning
export const REACT_R = 210
export const MAX_NUDGE = 13
export const NEAR_R = 76
export const ZOOM_NAMES_AT = 1.8
export const TOP_NAMES_N = 8 // top-N bodies always show their names at rest
export const INDEX_PREVIEW_N = 8 // index rows before "expand"

const byId = new Map(NODES.map((n) => [n.id, n]))
const RANKED = [...NODES].sort((a, b) => b.power - a.power)
export const RANK_OF = new Map(RANKED.map((n, i) => [n.id, i]))

export const metricVal = (e: typeof NODES[number], ord: Order, grav: Map<string, GravityResult>) =>
  (ord === 'total' ? (grav.get(e.id)?.power ?? 0) : (FORCES[e.id]?.[ord] ?? 0) * 10)
export const passesBloc = (id: string, bloc: Bloc) => bloc === 'all' || (AXIS[id] ?? 'none') === bloc

export function buildForceDetail(id: string | null, grav: Map<string, GravityResult>): EntityDetail | null {
  if (!id) return null
  const e = byId.get(id); if (!e) return null
  const g = grav.get(id)
  const d = DATA[id]
  const score = g ? g.gravity : forceScore(e.power)
  const backing = g && g.patron && g.backing > 0
    ? { amount: Math.round(g.backing * 10), patronHe: byId.get(g.patron)?.he ?? g.patron }
    : null
  // global rank by live power — single pass (count bodies strictly stronger), no array copy
  const myPower = g?.power ?? 0
  const rank = NODES.reduce((acc, n) => acc + ((grav.get(n.id)?.power ?? 0) > myPower ? 1 : 0), 0) + 1
  return {
    id,
    he: e.he, power: g ? g.power : e.power, tier: e.tier, dispo: e.dispo,
    axisLabel: AXIS_LABEL[AXIS[id] ?? 'none'], parentHe: null, relations: [],
    scoreLabel: `${score.toFixed(1)} / 10`, forces: FORCES[id], powerNotes: POWER_NOTES[id],
    rank, total: NODES.length,
    backing,
    prov: d?.prov,
    flags: d?.flags,
    components: g ? { base: g.base, intrinsic: g.intrinsic, backing: g.backing, gravity: g.gravity, stability: g.stability } : undefined,
  }
}

// Polar layout solver — places visible bodies on tier rings (total) or quantile rings (axis).
export function computeLayout(
  size: { w: number; h: number },
  orderBy: Order,
  filterBloc: Bloc,
  minScore: number,
  grav: Map<string, GravityResult>,
): Layout {
  const { w, h } = size
  if (!w || !h) return { nodes: [], rings: [], cx: 0, cy: 0 }
  const cx = w / 2, cy = h / 2, halfMin = Math.min(w, h) / 2
  const nodes: LayoutNode[] = []
  const vis = NODES.filter((n) => passesBloc(n.id, filterBloc) && metricVal(n, orderBy, grav) / 10 >= minScore)
  const sizeOf = (e: typeof NODES[number]) => Math.max(8, Math.min(66, powerSize(metricVal(e, orderBy, grav)) * 0.5))
  let rings: LayoutRing[]

  if (orderBy === 'total') {
    rings = BANDS.map((k) => ({ k, r: BAND_R[k] * halfMin, label: TIER_LABEL[k] }))
    for (const kind of BANDS) {
      const items = vis.filter((n) => n.kind === kind).sort((a, b) => metricVal(b, 'total', grav) - metricVal(a, 'total', grav))
      const R = BAND_R[kind] * halfMin
      items.forEach((e, i) => {
        const ang = -Math.PI / 2 + BAND_PHASE[kind] + (i / Math.max(1, items.length)) * TAU
        nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: sizeOf(e) })
      })
    }
  } else {
    const sorted = [...vis].sort((a, b) => metricVal(b, orderBy, grav) - metricVal(a, orderBy, grav))
    const per = Math.max(1, Math.ceil(sorted.length / 5))
    rings = RANK_BANDS.map((rr, qi) => ({ k: `q${qi}`, r: rr * halfMin, label: QUANTILE_LABEL[qi] }))
    sorted.forEach((e, idx) => {
      const qi = Math.min(4, Math.floor(idx / per))
      const within = idx - qi * per
      const groupSize = Math.min(per, sorted.length - qi * per)
      const ang = -Math.PI / 2 + qi * 0.4 + (within / Math.max(1, groupSize)) * TAU
      const R = RANK_BANDS[qi] * halfMin
      nodes.push({ e, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, d: sizeOf(e) })
    })
  }
  return { nodes, rings, cx, cy }
}
