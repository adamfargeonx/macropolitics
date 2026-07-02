// Iconization system — a small set of bespoke, geometric, thin-line marks for sitewide
// categorization (axes, panel sections). Monochrome `currentColor`, sharp corners (butt caps,
// miter joins) to honor the no-rounded-corners rule; built on the circle/orbit visual grammar.
// Use: <Icon name="eco" /> — inherits color + sizes to 1em so it sits inline with a label.

export type IconName =
  | 'eco' | 'mil' | 'geo' | 'sources' | 'calc' | 'orbit' | 'relations' | 'backing'
  | 'model' | 'legend'
  // generic category icons (used in evidence overlay axis heads, pnote labels)
  | 'tier' | 'axis' | 'dispo'
  // per-value tier icons
  | 'tier-great' | 'tier-regional' | 'tier-mid' | 'tier-edge' | 'tier-nonstate'
  // per-value axis icons
  | 'axis-west' | 'axis-east' | 'axis-neutral' | 'axis-none'
  // per-value dispo icons
  | 'dispo-agg' | 'dispo-assert' | 'dispo-caut'

// Each entry is the inner SVG of a 0 0 24 24 viewBox. Stroke is set on the <svg>.
const PATHS: Record<IconName, React.ReactNode> = {
  // economic — a stacked coin cylinder (capital / reserves), reads clearer than a bar chart at small size
  eco: (<><ellipse cx="12" cy="18" rx="8" ry="2.6" /><ellipse cx="12" cy="13.5" rx="8" ry="2.6" /><ellipse cx="12" cy="9" rx="8" ry="2.6" /><path d="M4 9 V18" /><path d="M20 9 V18" /></>),
  // military — a geometric shield (sharp), no curves
  mil: (<path d="M12 3.5 L19.5 6.5 V12 L12 20.5 L4.5 12 V6.5 Z" />),
  // geo-strategic — a globe: circle + meridian + equator
  geo: (<><circle cx="12" cy="12" r="8.2" /><path d="M12 3.8 C7.4 7.5 7.4 16.5 12 20.2 C16.6 16.5 16.6 7.5 12 3.8 Z" /><path d="M3.8 12 H20.2" /></>),
  // sources — a cited page with a folded corner
  sources: (<><path d="M6.5 3.5 H14 L17.5 7 V20.5 H6.5 Z" /><path d="M14 3.5 V7 H17.5" /><path d="M9 11 H15" /><path d="M9 14.5 H15" /></>),
  // calculation — a sigma (sum), the gravity formula
  calc: (<path d="M16.5 4.5 H7.5 L13 12 L7.5 19.5 H16.5" />),
  // orbital hierarchy — a body, its orbit, and a satellite dot
  orbit: (<><ellipse cx="12" cy="12" rx="9" ry="4.2" /><circle cx="12" cy="12" r="2.6" /><circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none" /></>),
  // relations — the tension/friction/harmony triangle
  relations: (<path d="M12 4 L20.5 19.5 H3.5 Z" />),
  // backing — a borrowed-weight arrow toward the body
  backing: (<><path d="M20 12 H5" /><path d="M11 6 L5 12 L11 18" /></>),
  // model — a circled "i": the universal info glyph for "how this is calculated"
  model: (<><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none" /><path d="M12 11 V17" /></>),
  // legend — a small key-to-symbols list (swatch + label row, ×3): what a map legend literally is
  legend: (<><rect x="3" y="4.5" width="4" height="4" /><path d="M10.5 6.5 H20.5" /><rect x="3" y="10" width="4" height="4" /><path d="M10.5 12 H20.5" /><rect x="3" y="15.5" width="4" height="4" /><path d="M10.5 17.5 H20.5" /></>),
  // generic category icons (used in evidence overlay axis heads, pnote labels)
  tier: (<><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>),
  axis: (<><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></>),
  dispo: (<><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></>),

  // ── Per-value tier icons ──────────────────────────────────────────────────────
  // כוח-על: crown — three-point peak marking the top of the hierarchy
  'tier-great': (<><path d="M2 5l3 11h14l3-11-6 4.5-4-4.5-4 4.5Z" /><path d="M5 20h14" /></>),
  // כוח אזורי: hexagon — a bounded regional territory
  'tier-regional': (<polygon points="12 3 20.5 7.5 20.5 16.5 12 21 3.5 16.5 3.5 7.5" />),
  // כוח ביניים: diamond — the intermediate layer
  'tier-mid': (<polygon points="12 3 21 12 12 21 3 12" />),
  // כוח קצה: small dot + outer ring (peripheral, orbiting the core)
  'tier-edge': (<><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="8.5" /></>),
  // שחקן לא-מדינתי: three nodes linked by trunk (decentralised, no single state center)
  'tier-nonstate': (<><rect x="9" y="2" width="6" height="5" /><rect x="2" y="17" width="6" height="5" /><rect x="16" y="17" width="6" height="5" /><path d="M5 17v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" /><path d="M12 11V7" /></>),

  // ── Per-value axis icons ──────────────────────────────────────────────────────
  // הציר המערבי: landmark / capitol — columns + pediment (democratic institutions)
  'axis-west': (<><path d="M3 22h18" /><path d="M5 11h14" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" /><polygon points="12 2 20 7 4 7" /></>),
  // הציר המזרחי: flag — a different political tradition / rival bloc
  'axis-east': (<><path d="M4 22V4" /><path d="M4 4l14 4-14 4" /></>),
  // גוש ניטרלי: circle bisected horizontally (balanced, on the fence)
  'axis-neutral': (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /></>),
  // ללא שיוך: circle with X (explicitly unaligned / unclassified)
  'axis-none': (<><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>),

  // ── Per-value dispo icons ─────────────────────────────────────────────────────
  // אגרסיבית: lightning bolt (attack, aggression)
  'dispo-agg': (<polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />),
  // אסרטיבית: double chevron right (assertive forward motion)
  'dispo-assert': (<><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></>),
  // זהירה: eye (watchful, cautious)
  'dispo-caut': (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
}

interface IconProps {
  name: IconName
  className?: string
  /** decorative by default; pass a label to expose it to AT */
  title?: string
}

export function Icon({ name, className, title }: IconProps) {
  return (
    <svg
      className={`icon icon--${name}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width="1.6em"
      height="1.6em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {PATHS[name]}
    </svg>
  )
}
