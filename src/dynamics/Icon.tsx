// Iconization system — a small set of bespoke, geometric, thin-line marks for sitewide
// categorization (axes, panel sections). Monochrome `currentColor`, sharp corners (butt caps,
// miter joins) to honor the no-rounded-corners rule; built on the circle/orbit visual grammar.
// Use: <Icon name="eco" /> — inherits color + sizes to 1em so it sits inline with a label.

export type IconName = 'eco' | 'mil' | 'geo' | 'sources' | 'calc' | 'orbit' | 'relations' | 'backing'

// Each entry is the inner SVG of a 0 0 24 24 viewBox. Stroke is set on the <svg>.
const PATHS: Record<IconName, React.ReactNode> = {
  // economic — ascending bars on a baseline (capital / index)
  eco: (<><path d="M3.5 20.5 H20.5" /><path d="M7 20.5 V14" /><path d="M12 20.5 V9" /><path d="M17 20.5 V4.5" /></>),
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
      width="1em"
      height="1em"
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
