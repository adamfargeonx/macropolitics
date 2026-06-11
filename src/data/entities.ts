// Macropolitics — /dynamics orrery. Structure per the authoritative ring spec.
// Hierarchy: bodies orbit the centre C, a hub (USA / Saudi / Iran), on named rings.
// Each ring rotates as a unit (shared signed omega = direction + speed).
// SIZE = political gravity: editable `power` score (0–100) → diameter.
//   diameter = 8 + (power/100)^1.7 * 124  — steep so USA towers and proxies stay tiny.
//   `power` is now COMPUTED from the gravity model (src/model/gravity.ts) — weighted effective
//   axes × stability + graph backing — not hand-set. See docs/power-model.md + src/data/empirical.ts.

import { computeGravities, type GravityResult } from '../model/gravity'
import { BODY_INPUTS, AXES_DATA } from './empirical'

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

// Structural defs (placement, hierarchy, identity). `power` is NOT here — it's computed below.
const NODE_DEFS: Omit<Entity, 'power'>[] = [
  // ── MAIN RING (around C) — Western lead + Eastern axis ──
  { id: 'usa', he: 'ארה״ב', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 180, dispo: DISPO.agg, tier: TIER.great },
  { id: 'russia', he: 'רוסיה', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 345, dispo: DISPO.assert, tier: TIER.great },
  { id: 'iran', he: 'איראן', kind: 'regional', parent: 'C', R: 440, omega: 1.4, ang0: 25, dispo: DISPO.agg, tier: TIER.regional },
  { id: 'china', he: 'סין', kind: 'great', parent: 'C', R: 440, omega: 1.4, ang0: 62, dispo: DISPO.caut, tier: TIER.great },

  // ── TWILIGHT / NEUTRAL inner ring (around C) ──
  { id: 'turkey', he: 'טורקיה', kind: 'regional', parent: 'C', R: 210, omega: -3.2, ang0: 30, dispo: DISPO.assert, tier: TIER.regional },
  { id: 'qatar', he: 'קטאר', kind: 'intermediate', parent: 'C', R: 210, omega: -3.2, ang0: 95, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'oman', he: 'עומאן', kind: 'intermediate', parent: 'C', R: 210, omega: -3.2, ang0: 158, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'syria', he: 'סוריה', kind: 'edge', parent: 'C', R: 210, omega: -3.2, ang0: 222, dispo: DISPO.assert, tier: TIER.edge },
  { id: 'lebanon', he: 'לבנון', kind: 'edge', parent: 'C', R: 210, omega: -3.2, ang0: 290, dispo: DISPO.assert, tier: TIER.edge },

  // ── OUTER RING (around C, beyond main) ──
  { id: 'europe', he: 'אירופה', kind: 'great', parent: 'C', R: 760, omega: 2.0, ang0: 205, dispo: DISPO.assert, tier: TIER.great },
  { id: 'india', he: 'הודו', kind: 'great', parent: 'C', R: 760, omega: 2.0, ang0: 325, dispo: DISPO.caut, tier: TIER.great },
  { id: 'pakistan', he: 'פקיסטן', kind: 'regional', parent: 'C', R: 760, omega: 2.0, ang0: 80, dispo: DISPO.caut, tier: TIER.regional },

  // ── No affiliation (free, no ring) ──
  { id: 'isis', he: 'דאעש', kind: 'nonstate', parent: 'C', R: 620, omega: -3.4, ang0: 300, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'qaeda', he: 'אל-קעאידה', kind: 'nonstate', parent: 'C', R: 670, omega: -3.4, ang0: 332, dispo: DISPO.agg, tier: TIER.nonstate },

  // ── USA's system (3 rings around USA) ──
  { id: 'israel', he: 'ישראל', kind: 'regional', parent: 'usa', R: 120, omega: 6.5, ang0: 0, dispo: DISPO.agg, tier: TIER.regional },
  { id: 'egypt', he: 'מצרים', kind: 'intermediate', parent: 'usa', R: 180, omega: 4.0, ang0: 200, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'jordan', he: 'ירדן', kind: 'edge', parent: 'usa', R: 180, omega: 4.0, ang0: 320, dispo: DISPO.caut, tier: TIER.edge },
  { id: 'saudi', he: 'סעודיה', kind: 'regional', parent: 'usa', R: 240, omega: 2.8, ang0: 90, dispo: DISPO.assert, tier: TIER.regional },
  { id: 'sdf', he: 'הכוחות הדמוקרטיים', kind: 'nonstate', parent: 'usa', R: 240, omega: 2.8, ang0: 35, dispo: DISPO.caut, tier: TIER.nonstate },

  // ── Saudi's Gulf system (2 rings around Saudi) ──
  { id: 'uae', he: 'האמירויות', kind: 'intermediate', parent: 'saudi', R: 60, omega: 7.5, ang0: 120, dispo: DISPO.assert, tier: TIER.mid },
  { id: 'bahrain', he: 'בחריין', kind: 'intermediate', parent: 'saudi', R: 60, omega: 7.5, ang0: 300, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'kuwait', he: 'כווית', kind: 'intermediate', parent: 'saudi', R: 100, omega: 5.5, ang0: 60, dispo: DISPO.caut, tier: TIER.mid },
  { id: 'fatah', he: 'הרשות הפלסטינית', kind: 'nonstate', parent: 'saudi', R: 100, omega: 5.5, ang0: 240, dispo: DISPO.caut, tier: TIER.nonstate },

  // ── Iran's Fire system (3 rings around Iran) ──
  { id: 'hezbollah', he: 'חיזבאללה', kind: 'nonstate', parent: 'iran', R: 100, omega: 8.0, ang0: 40, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'yemen', he: 'תימן (חות׳ים)', kind: 'nonstate', parent: 'iran', R: 100, omega: 8.0, ang0: 220, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'iraq', he: 'עיראק', kind: 'intermediate', parent: 'iran', R: 160, omega: -5.5, ang0: 100, dispo: DISPO.assert, tier: TIER.mid },
  { id: 'militias', he: 'מיליציות עיראקיות', kind: 'nonstate', parent: 'iran', R: 160, omega: -5.5, ang0: 280, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'hamas', he: 'חמאס', kind: 'nonstate', parent: 'iran', R: 225, omega: -5.0, ang0: 160, dispo: DISPO.agg, tier: TIER.nonstate },
  { id: 'pij', he: 'הג׳יהאד האסלאמי', kind: 'nonstate', parent: 'iran', R: 225, omega: -5.0, ang0: 340, dispo: DISPO.agg, tier: TIER.nonstate },
]

// ── Compute gravity once (module init) and attach `power` to every node. ──────────────────
// This is the fix: `power` is derived from (effective axes × stability + graph backing),
// so the headline score and its eco/mil/geo parts can no longer disagree.
export const GRAVITY: Map<string, GravityResult> = computeGravities(BODY_INPUTS)
export const NODES: Entity[] = NODE_DEFS.map((d) => ({ ...d, power: GRAVITY.get(d.id)?.power ?? 0 }))

// Backing surfaced relationally for the panel ("+N ⟵ patron").
export interface Backing { amount: number; patronId: string; patronHe: string }
export function backingOf(id: string): Backing | null {
  const g = GRAVITY.get(id)
  if (!g || !g.patron || g.backing <= 0) return null
  const patron = NODES.find((n) => n.id === g.patron)
  return { amount: Math.round(g.backing * 10), patronId: g.patron, patronHe: patron?.he ?? g.patron }
}

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

// FORCES lens — the three EFFECTIVE axes (0–10) that feed the gravity model. Sourced from
// src/data/empirical.ts (single source of truth), so the eco/mil/geo bars in the panel are
// exactly the parts the headline score is computed from. forceScore = power / 10.
export const forceScore = (power: number) => Math.round(power) / 10 // 0–10, one decimal
export const FORCE_AXES = [
  { key: 'eco', he: 'כלכלי' },
  { key: 'mil', he: 'צבאי' },
  { key: 'geo', he: 'גאו-אסטרטגי' },
] as const
export const FORCES: Record<string, { eco: number; mil: number; geo: number }> = Object.fromEntries(
  Object.entries(AXES_DATA).map(([id, v]) => [id, { eco: v.axes.eco, mil: v.axes.mil, geo: v.axes.geo }]),
)

// Power profile — four short notes per state (general + the three force components).
// Editorial Hebrew, each ≤20 words. Interpretive (broad consensus), wired to empirical later.
export interface PowerNotes { general: string; eco: string; mil: string; geo: string }
export const POWER_NOTES: Record<string, PowerNotes> = {
  usa: {
    general: 'המעצמה ההגמונית של המערכת — מעצבת בריתות, מכתיבה כללים ומגינה על בנות בריתה באזור.',
    eco: 'הכלכלה הגדולה בעולם; הדולר והשליטה במערכת הפיננסית הם נשק אסטרטגי בפני עצמו.',
    mil: 'צבא בעל טווח גלובלי, הצי החמישי במפרץ ובסיסים הפרושים מקטאר ועד הים האדום.',
    geo: 'מעגנת את הסדר האזורי דרך ישראל, סעודיה ומצרים — ומאזנת את איראן ורוסיה.',
  },
  china: {
    general: 'שחקן עולה הנכנס לאזור דרך כלכלה ותשתיות, ונמנע ממעורבות צבאית ישירה.',
    eco: 'צרכנית הנפט הגדולה באזור ומשקיעה מרכזית ביוזמת "החגורה והדרך".',
    mil: 'נוכחות צבאית מוגבלת — בסיס בג׳יבוטי וסיורי צי — אך גדלה בהדרגה.',
    geo: 'מתווכת בין יריבים (סעודיה–איראן) ומרחיבה השפעה בלי להתחייב לצד.',
  },
  russia: {
    general: 'מעצמה המשחזרת השפעה אזורית דרך התערבות צבאית ודיפלומטיה תקיפה.',
    eco: 'כלכלה תלוית אנרגיה; משתפת פעולה עם אופ״ק בניהול שוק הנפט.',
    mil: 'בסיסים בסוריה (טרטוס, חמיימים) המעניקים לה דריסת רגל בים התיכון.',
    geo: 'בעלת ברית של איראן ואסד; מאזנת את המערב ומוכרת נשק לכל הצדדים.',
  },
  europe: {
    general: 'גוש כלכלי רב-עוצמה אך מפוצל מדינית, בעל השפעה רכה יותר מקשה.',
    eco: 'שוק הייצוא והאנרגיה המרכזי של האזור; כוח רגולטורי וכלכלי עצום.',
    mil: 'יכולת צבאית מוגבלת ותלות בנאט״ו; מעורבות בעיקר בסחר ובאמברגו.',
    geo: 'שכנה ים-תיכונית הרגישה להגירה, טרור ואנרגיה — אך מתקשה לפעול במאוחד.',
  },
  india: {
    general: 'מעצמה עולה השומרת על קשרים פרגמטיים עם כל הצדדים באזור.',
    eco: 'יבואנית נפט גדולה; מיליוני עובדים הודים במפרץ ממנפים השפעה כלכלית.',
    mil: 'כוח ימי גדל באוקיינוס ההודי; שיתופי פעולה ביטחוניים עם ישראל והמפרץ.',
    geo: 'מאזנת בין איראן, ישראל והמפרץ; מתחרה בסין על נתיבי סחר.',
  },
  iran: {
    general: 'מובילת הציר המזרחי; מקרינה כוח דרך רשת שלוחים אזורית.',
    eco: 'כלכלה תחת סנקציות כבדות, נשענת על נפט ועל סחר עם סין.',
    mil: 'טילים בליסטיים, כטב״מים ושלוחים — אסטרטגיית הרתעה א-סימטרית.',
    geo: '"ציר ההתנגדות" משתרע מלבנון ועד תימן ומאיים על ישראל והמפרץ.',
  },
  saudi: {
    general: 'מנהיגת המפרץ הסונית; משקלה נובע מנפט, הון ומקומות הקודש.',
    eco: 'יצרנית הנפט המובילה באופ״ק; קרן הון ריבונית הממנת את חזון 2030.',
    mil: 'צבא ממומן היטב אך תלוי בנשק מערבי; מסובכת במלחמת תימן.',
    geo: 'יריבתה ההיסטורית של איראן; מאזנת בין וושינגטון, בייג׳ינג ונורמליזציה אפשרית.',
  },
  israel: {
    general: 'מעצמה אזורית טכנולוגית-צבאית; ממנפת ברית הדוקה עם וושינגטון.',
    eco: 'כלכלת היי-טק חדשנית; יצוא ביטחון, סייבר וגז מהים התיכון.',
    mil: 'הצבא החזק באזור — עליונות אווירית, מודיעין וכושר גרעיני מיוחס.',
    geo: 'הסכמי אברהם הרחיבו את מעמדה; חזית מתמשכת מול איראן ושלוחיה.',
  },
  turkey: {
    general: 'כוח אזורי שאפתן הפועל באופן עצמאי בין נאט״ו, רוסיה והמזרח.',
    eco: 'כלכלה תעשייתית גדולה אך תנודתית; צומת אנרגיה וסחר בין יבשות.',
    mil: 'הצבא השני בגודלו בנאט״ו; מתערבת בסוריה, בלוב ובקווקז.',
    geo: 'שולטת במצרי הבוספורוס; מאזנת בין המערב לרוסיה ומובילה אסלאם פוליטי.',
  },
  egypt: {
    general: 'המדינה הערבית רבת האוכלוסין; משקל דמוגרפי וסמלי רב, כוח כלכלי מוגבל.',
    eco: 'כלכלה שברירית תלוית סיוע, תיירות ותעלת סואץ; חוב חיצוני כבד.',
    mil: 'צבא גדול ממומן אמריקנית; שומר על השקט בגבול עם ישראל ועזה.',
    geo: 'שולטת בתעלת סואץ — עורק סחר עולמי; מתווכת מסורתית בסכסוך הפלסטיני.',
  },
  pakistan: {
    general: 'מדינה גרעינית ענייה, מאזנת בין סעודיה, סין והמערב.',
    eco: 'כלכלה חלשה תלוית הלוואות וסיוע; מסדרון כלכלי סיני מרכזי.',
    mil: 'צבא גדול וכוח גרעיני; מייצא כוח אדם וביטחון למפרץ.',
    geo: 'גשר בין המזרח התיכון לאסיה; יריבות גרעינית מול הודו.',
  },
  uae: {
    general: 'כוח מפרץ קטן ועשיר המקרין השפעה הרבה מעבר לגודלו.',
    eco: 'מרכז פיננסי, לוגיסטי ותעופתי עולמי; הון ריבוני אדיר.',
    mil: 'צבא קטן ומקצועי ("ספרטה הקטנה"); מעורב בתימן ובלוב.',
    geo: 'חתמה על הסכמי אברהם; משחקת בין וושינגטון, בייג׳ינג ונמלים אסטרטגיים.',
  },
  iraq: {
    general: 'זירת התמודדות בין השפעה איראנית לאמריקנית; ריבונות חלקית.',
    eco: 'כלכלת נפט כמעט בלעדית; שחיתות ותלות בהכנסות גולמיות.',
    mil: 'צבא משוקם לצד מיליציות שיעיות הנאמנות לטהראן.',
    geo: 'גשר יבשתי בין איראן לסוריה ולבנון — חוליה ב"ציר".',
  },
  qatar: {
    general: 'אמירות זעירה ועשירה הממנפת גז, תקשורת ודיפלומטיה.',
    eco: 'מיצואניות הגז הטבעי הנוזלי הגדולות; קרן הון ריבונית גלובלית.',
    mil: 'צבא זעיר אך מארחת את בסיס אל-עודייד האמריקני הגדול.',
    geo: 'מתווכת בין יריבים (חמאס, טליבאן, איראן); אל-ג׳זירה ככלי השפעה.',
  },
  syria: {
    general: 'מדינה הרוסה ממלחמת אזרחים; ריבונותה מחולקת בין כוחות זרים.',
    eco: 'כלכלה שקרסה; תלויה בסיוע איראני ורוסי ובהברחות.',
    mil: 'צבא תשוש הנשען על רוסיה, איראן וחיזבאללה לשרידותו.',
    geo: 'חוליה מרכזית ב"ציר" — מעבר נשק מאיראן לחיזבאללה.',
  },
  jordan: {
    general: 'ממלכה יציבה אך פגיעה, מאזנת בין המערב, ישראל והפלסטינים.',
    eco: 'כלכלה קטנה תלוית סיוע מערבי ומפרצי; משאבים דלים.',
    mil: 'צבא מקצועי ממומן אמריקנית; שותף ביטחוני יציב למערב.',
    geo: 'חיץ אסטרטגי בין ישראל, עיראק וסעודיה; שומרת על הסכם השלום.',
  },
  kuwait: {
    general: 'אמירות נפט עשירה ושמרנית, מתמקדת בהישרדות ובניטרליות.',
    eco: 'עתודות נפט עצומות וקרן הון ריבונית; כלכלה ריכוזית.',
    mil: 'צבא קטן; נשענת על הגנה אמריקנית מאז מלחמת המפרץ.',
    geo: 'יושבת בין עיראק, איראן וסעודיה; מתווכת זהירה במפרץ.',
  },
  oman: {
    general: 'סולטנות ניטרלית המשמשת ערוץ דיפלומטי שקט בין יריבים.',
    eco: 'כלכלת נפט וגז בינונית; משקיעה בנמלים ובתיירות.',
    mil: 'צבא צנוע; מדיניות אי-הזדהות מסורתית.',
    geo: 'שולטת במצרי הורמוז מדרום; מתווכת בין איראן, המערב והמפרץ.',
  },
  lebanon: {
    general: 'מדינה משותקת שבה חיזבאללה חזק מן הצבא הרשמי.',
    eco: 'קריסה כלכלית עמוקה; מערכת בנקאית שהתמוטטה ומטבע שהתרסק.',
    mil: 'צבא חלש לצד חיזבאללה החמוש מאיראן — "מדינה בתוך מדינה".',
    geo: 'זירת עימות ישראל–איראן; חזית דרומית פעילה מול ישראל.',
  },
  bahrain: {
    general: 'ממלכה איית קטנה, בעלת ברית הדוקה של סעודיה וושינגטון.',
    eco: 'כלכלה תלוית סעודיה ונפט; מרכז פיננסי בקנה מידה קטן.',
    mil: 'מארחת את הצי החמישי האמריקני; צבא זעיר.',
    geo: 'חתמה על הסכמי אברהם; קו חזית סוני מול השפעה איראנית.',
  },
  yemen: {
    general: 'מדינה קרועת מלחמה; החות׳ים השיעים שולטים בצפון ובבירה.',
    eco: 'המדינה הענייה באזור; משבר הומניטרי וכלכלה הרוסה.',
    mil: 'החות׳ים משגרים טילים וכטב״מים לסעודיה, לישראל ולספנות.',
    geo: 'שולטים במצרי באב אל-מנדב — צוואר בקבוק לסחר העולמי.',
  },
  hezbollah: {
    general: 'הכוח הלא-מדינתי החמוש בעולם; השלוח המרכזי של איראן.',
    eco: 'מימון איראני, הברחות וסחר; אחיזה בכלכלה הלבנונית הקורסת.',
    mil: 'עשרות אלפי רקטות וטילים מדויקים; צבא טרור מנוסה מסוריה.',
    geo: 'מחזיק את לבנון כבת ערובה ואת ישראל תחת איום מתמיד.',
  },
  hamas: {
    general: 'תנועה אסלאמיסטית פלסטינית; שלטה בעזה והובילה את מתקפת 2023.',
    eco: 'מימון קטארי ואיראני, מסים ומנהור; כלכלת מצור.',
    mil: 'רקטות, מנהרות ולוחמת גרילה עירונית; נחלש משמעותית מאז המלחמה.',
    geo: 'הציב את עזה במרכז הסכסוך וגרר את האזור לעימות רחב.',
  },
  pij: {
    general: 'ארגון פלסטיני קטן ורדיקלי, כפוף כמעט לחלוטין לטהראן.',
    eco: 'תלות מלאה במימון איראני; ללא בסיס כלכלי עצמאי.',
    mil: 'רקטות ופעילות גרילה בעזה וביהודה ושומרון.',
    geo: 'כלי איראני להסלמה מבוקרת — ללא אחריות שלטונית.',
  },
  isis: {
    general: 'ח׳ליפות הטרור שקרסה; שרידיה פועלים במחתרת ובמדבר.',
    eco: 'שרידי מימון מסחיטה והברחות; אבד הבסיס הטריטוריאלי.',
    mil: 'תאי גרילה בסוריה ובעיראק; פיגועים בינלאומיים בהשראתו.',
    geo: 'איום מתמשך המצדיק נוכחות צבאית זרה באזור.',
  },
  qaeda: {
    general: 'רשת הג׳יהאד העולמית הוותיקה; נחלשה אך לא נעלמה.',
    eco: 'מימון מבוזר דרך תרומות, כופר וכלכלות צל.',
    mil: 'שלוחות פעילות בתימן, בסוריה ובאפריקה; יכולת פיגועים גלובלית.',
    geo: 'הציתה את עידן ״המלחמה בטרור״ ששינה את האזור כולו.',
  },
  sdf: {
    general: 'כוחות כורדיים-ערביים בצפון-מזרח סוריה, בני בריתה של וושינגטון.',
    eco: 'שולטים בשדות הנפט הסוריים; כלכלה מקומית שברירית.',
    mil: 'הכוח הקרקעי שהביס את דאעש; תלוי בסיוע אמריקני.',
    geo: 'מחזיקים את המרחב בין טורקיה, אסד ואיראן — ופגיעים לכולם.',
  },
  militias: {
    general: 'רשת מיליציות שיעיות בעיראק הנאמנות לטהראן יותר מלבגדאד.',
    eco: 'אחיזה בנמלים, במכס ובתקציבי המדינה העיראקית.',
    mil: 'כטב״מים ורקטות נגד בסיסים אמריקניים; עשרות אלפי לוחמים.',
    geo: 'מקבעות את עיראק כמסדרון איראני אל סוריה ולבנון.',
  },
  fatah: {
    general: 'הרשות הפלסטינית — שלטון מוגבל, לגיטימציה שחוקה ותלות חיצונית.',
    eco: 'תלויה במסי ישראל ובסיוע זר; כלכלה ללא ריבונות.',
    mil: 'כוחות ביטחון מתואמים עם ישראל; ללא צבא של ממש.',
    geo: 'הכתובת הרשמית לסוגיה הפלסטינית — וגם החוליה החלשה בה.',
  },
}

export const LINKS: [string, string][] = [
  ['usa', 'israel'], ['usa', 'saudi'], ['usa', 'egypt'], ['usa', 'europe'],
  ['saudi', 'uae'], ['saudi', 'bahrain'], ['saudi', 'kuwait'], ['saudi', 'qatar'],
  ['iran', 'hezbollah'], ['iran', 'hamas'], ['iran', 'iraq'], ['iran', 'yemen'], ['iran', 'russia'],
  ['china', 'iran'], ['hezbollah', 'lebanon'], ['turkey', 'qatar'], ['russia', 'syria'],
]
