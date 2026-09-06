// Per-value icon lookups shared by the detail panels (Forces header + Relations meta rows).
// Each specific label gets its own distinct mark; callers fall back to the generic category
// icon when a value is unrecognised. Lives outside Chrome.tsx (a components-only file) because
// exporting a plain const object from a component file breaks React Fast Refresh's file-boundary
// assumption (react-refresh/only-export-components) — this is exactly the split Fast Refresh
// itself asks for, not a stylistic choice.
import type { IconName } from './Icon'

export const TIER_ICON: Record<string, IconName> = {
  'כוח-על': 'tier-great', 'כוח אזורי': 'tier-regional', 'כוח ביניים': 'tier-mid',
  'כוח קצה': 'tier-edge', 'שחקן לא-מדינתי': 'tier-nonstate',
}
export const AXIS_ICON: Record<string, IconName> = {
  'הציר המערבי': 'axis-west', 'הציר המזרחי': 'axis-east',
  'גוש ניטרלי': 'axis-neutral', 'ללא שיוך': 'axis-none',
}
export const DISPO_ICON: Record<string, IconName> = {
  'אגרסיבית': 'dispo-agg', 'אסרטיבית': 'dispo-assert', 'זהירה': 'dispo-caut',
}
