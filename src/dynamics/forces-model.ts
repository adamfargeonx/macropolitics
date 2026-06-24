// Pure model + derived helpers for the Forces page. No React, no JSX — just the constants,
// derived metrics, and the detail-record builder. (Body placement now lives in ForcesSheet.)
import { NODES, FORCES, POWER_NOTES, forceScore, AXIS, AXIS_LABEL } from '../data/entities'
import { DATA } from '../data/empirical'
import { type GravityResult } from '../model/gravity'
import { type EntityDetail } from './Chrome'

export type Order = 'total' | 'eco' | 'mil' | 'geo'
export type Bloc = 'all' | 'west' | 'east' | 'neutral'
export type Raw = { eco: number; mil: number; geo: number }

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
