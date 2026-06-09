// Macropolitics — /dynamics orrery. Structure per the authoritative ring spec.
// Hierarchy: bodies orbit the centre C, a hub (USA / Saudi / Iran), on named rings.
// Each ring rotates as a unit (shared signed omega = direction + speed).
// SIZE = political gravity: editable `power` score (0–100) → diameter.
//   diameter = 8 + (power/100)^1.7 * 124  — steep so USA towers and proxies stay tiny.
//   power scores spread across clear tiers (superpower → proxy). Wire to empirical later.

export type Kind = 'great' | 'regional' | 'intermediate' | 'edge' | 'nonstate'

export interface Entity {
  id: string
  he: string
  kind: Kind
  parent: string // 'C' or a hub body id (usa / saudi / iran)
  R: number // orbit radius around parent, world px
  omega: number // deg/sec, signed (ring direction + speed)
  ang0: number // placement angle, deg
  power: number // political gravity 0–100  → size
  dispo: string
  tier: string
}

export const powerSize = (power: number) => Math.round(8 + Math.pow(power / 100, 1.7) * 124)

export const DISPO = { agg: 'אגרסיבית', assert: 'אסרטיבית', caut: 'זהירה' }
export const TIER = { great: 'כוח-על', regional: 'כוח אזורי', mid: 'כוח ביניים', edge: 'כוח קצה', nonstate: 'שחקן לא-מדינתי' }

export const ANCHORS: Record<string, { x: number; y: number }> = { C: { x: 0, y: 0 } }

// Drawn orbit rings (around C or a hub). name → labelled. Widened for the larger disks.
export const RINGS: { around: string; r: number; he?: string; dash?: boolean }[] = [
  { around: 'C', r: 440 }, // main ring
  { around: 'C', r: 210, he: 'אזור הדמדומים', dash: true }, // twilight / neutral inner
  { around: 'C', r: 760 }, // outer ring
  { around: 'usa', r: 240 }, // western system bound
  { around: 'saudi', r: 100, he: 'טבעת המפרץ' }, // Gulf
  { around: 'iran', r: 160, he: 'טבעת האש' }, // Fire
]

export const AXES = [
  { around: 'usa', he: 'הציר המערבי', dy: -1 },
  { around: 'iran', he: 'הציר המזרחי', dy: 1 },
]

export const NODES: Entity[] = [
  // ── MAIN RING (around C) — Western lead + Eastern axis ──
  { id: 'usa', he: 'ארה״ב', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 180, power: 100, dispo: DISPO.agg, tier: TIER.great },
  { id: 'russia', he: 'רוסיה', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 345, power: 74, dispo: DISPO.assert, tier: TIER.great },
  { id: 'iran', he: 'איראן', kind: 'regional', parent: 'C', R: 440, omega: 1.4, ang0: 25, power: 66, dispo: DISPO.agg, tier: TIER.regional },
  { id: 'china', he: 'סין', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 62, power: 90, dispo: DISPO.caut, tier: TIER.great },

  // ── TWILIGHT / NEUTRAL inner ring (around C) ──
  { id: 'turkey', he: 'טורקיה', kind: 'regional', parent: 'C', R: 210, omega: -3.2, ang0: 30, power: 52, dispo: DISPO.assert, tier: TIER.regional },
  { id: 'qatar', he: 'קטאר', kind: 'intermediate', parent: 'C', R: 210, omega: -3.2, ang0: 95, power: 32, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'oman', he: 'עומאן', kind: 'intermediate', parent: 'C', R: 210, omega: -3.2, ang0: 158, power: 20, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'syria', he: 'סוריה', kind: 'edge', parent: 'C', R: 210, omega: -3.2, ang0: 222, power: 28, dispo: DISPO.assert, tier: TIER.edge },
  { id: 'lebanon', he: 'לבנון', kind: 'edge', parent: 'C', R: 210, omega: -3.2, ang0: 290, power: 18, dispo: DISPO.assert, tier: TIER.edge },

  // ── OUTER RING (around C, beyond main) ──
  { id: 'europe', he: 'אירופה', kind: 'great', parent: 'C', R: 760, omega: 2.0, ang0: 205, power: 78, dispo: DISPO.assert, tier: TIER.great },
  { id: 'india', he: 'הודו', kind: 'great', parent: 'C', R: 760, omega: 2.0, ang0: 325, power: 56, dispo: DISPO.caut, tier: TIER.great },
  { id: 'pakistan', he: 'פקיסטן', kind: 'regional', parent: 'C', R: 760, omega: 2.0, ang0: 80, power: 46, dispo: DISPO.caut, tier: TIER.regional },

  // ── No affiliation (free, no ring) ──
  { id: 'isis', he: 'דאעש', kind: 'nonstate', parent: 'C', R: 620, omega: -3.4, ang0: 300, power: 15, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'qaeda', he: 'אל-קעאידה', kind: 'nonstate', parent: 'C', R: 670, omega: -3.4, ang0: 332, power: 14, dispo: DISPO.agg, tier: TIER.nonstate },

  // ── USA's system (3 rings around USA) ──
  { id: 'israel', he: 'ישראל', kind: 'regional', parent: 'usa', R: 120, omega: 6.5, ang0: 0, power: 58, dispo: DISPO.agg, tier: TIER.regional },
  { id: 'egypt', he: 'מצרים', kind: 'intermediate', parent: 'usa', R: 180, omega: 4.0, ang0: 200, power: 50, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'jordan', he: 'ירדן', kind: 'edge', parent: 'usa', R: 180, omega: 4.0, ang0: 320, power: 22, dispo: DISPO.caut, tier: TIER.edge },
  { id: 'saudi', he: 'סעודיה', kind: 'regional', parent: 'usa', R: 240, omega: 2.8, ang0: 90, power: 60, dispo: DISPO.assert, tier: TIER.regional },
  { id: 'sdf', he: 'הכוחות הדמוקרטיים', kind: 'nonstate', parent: 'usa', R: 240, omega: 2.8, ang0: 35, power: 13, dispo: DISPO.caut, tier: TIER.nonstate },

  // ── Saudi's Gulf system (2 rings around Saudi) ──
  { id: 'uae', he: 'האמירויות', kind: 'intermediate', parent: 'saudi', R: 60, omega: 7.5, ang0: 120, power: 38, dispo: DISPO.assert, tier: TIER.mid },
  { id: 'bahrain', he: 'בחריין', kind: 'intermediate', parent: 'saudi', R: 60, omega: 7.5, ang0: 300, power: 16, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'kuwait', he: 'כווית', kind: 'intermediate', parent: 'saudi', R: 100, omega: 5.5, ang0: 60, power: 20, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'fatah', he: 'הרשות הפלסטינית', kind: 'nonstate', parent: 'saudi', R: 100, omega: 5.5, ang0: 240, power: 13, dispo: DISPO.caut, tier: TIER.nonstate },

  // ── Iran's Fire system (3 rings around Iran) ──
  { id: 'hezbollah', he: 'חיזבאללה', kind: 'nonstate', parent: 'iran', R: 100, omega: 8.0, ang0: 40, power: 26, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'yemen', he: 'תימן (חות׳ים)', kind: 'nonstate', parent: 'iran', R: 100, omega: 8.0, ang0: 220, power: 22, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'iraq', he: 'עיראק', kind: 'intermediate', parent: 'iran', R: 160, omega: -5.5, ang0: 100, power: 36, dispo: DISPO.assert, tier: TIER.mid },
  { id: 'militias', he: 'מיליציות עיראקיות', kind: 'nonstate', parent: 'iran', R: 160, omega: -5.5, ang0: 280, power: 14, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'hamas', he: 'חמאס', kind: 'nonstate', parent: 'iran', R: 225, omega: -5.0, ang0: 160, power: 16, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'pij', he: 'הג׳יהאד האסלאמי', kind: 'nonstate', parent: 'iran', R: 225, omega: -5.0, ang0: 340, power: 9, dispo: DISPO.agg, tier: TIER.nonstate },
]

// Allegiance (bloc) — drives a whisper-subtle temperature rim, not a fill.
export type Axis = 'west' | 'east' | 'neutral' | 'none'
export const AXIS: Record<string, Axis> = {
  usa: 'west', israel: 'west', egypt: 'west', jordan: 'west', saudi: 'west', sdf: 'west',
  uae: 'west', bahrain: 'west', kuwait: 'west', fatah: 'west', europe: 'west',
  russia: 'east', china: 'east', iran: 'east', hezbollah: 'east', yemen: 'east',
  iraq: 'east', militias: 'east', hamas: 'east', pij: 'east',
  turkey: 'neutral', qatar: 'neutral', oman: 'neutral', syria: 'neutral',
  lebanon: 'neutral', india: 'neutral', pakistan: 'neutral',
  isis: 'none', qaeda: 'none',
}
export const AXIS_LABEL: Record<Axis, string> = {
  west: 'הציר המערבי', east: 'הציר המזרחי', neutral: 'גוש ניטרלי', none: 'ללא שיוך',
}

export const LINKS: [string, string][] = [
  ['usa', 'israel'], ['usa', 'saudi'], ['usa', 'egypt'], ['usa', 'europe'],
  ['saudi', 'uae'], ['saudi', 'bahrain'], ['saudi', 'kuwait'], ['saudi', 'qatar'],
  ['iran', 'hezbollah'], ['iran', 'hamas'], ['iran', 'iraq'], ['iran', 'yemen'], ['iran', 'russia'],
  ['china', 'iran'], ['hezbollah', 'lebanon'], ['turkey', 'qatar'], ['russia', 'syria'],
]
