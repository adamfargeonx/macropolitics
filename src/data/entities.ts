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

// FORCES lens — attraction power = economic + military + geo-strategic (0–10 each).
// Headline score derives from `power` (size stays consistent). Components are placeholder
// (illustrative) until wired to empirical indices — same plan as `power`.
export const forceScore = (power: number) => Math.round(power) / 10 // 0–10, one decimal
export const FORCE_AXES = [
  { key: 'eco', he: 'כלכלי' },
  { key: 'mil', he: 'צבאי' },
  { key: 'geo', he: 'גאו-אסטרטגי' },
] as const
export const FORCES: Record<string, { eco: number; mil: number; geo: number }> = {
  usa: { eco: 10, mil: 10, geo: 10 }, china: { eco: 10, mil: 8, geo: 9 }, russia: { eco: 6, mil: 9, geo: 8 },
  europe: { eco: 9, mil: 6, geo: 7 }, india: { eco: 7, mil: 6, geo: 6 }, iran: { eco: 4, mil: 7, geo: 8 },
  saudi: { eco: 8, mil: 5, geo: 7 }, israel: { eco: 7, mil: 9, geo: 7 }, turkey: { eco: 6, mil: 7, geo: 7 },
  egypt: { eco: 4, mil: 6, geo: 7 }, pakistan: { eco: 3, mil: 6, geo: 6 }, uae: { eco: 7, mil: 4, geo: 5 },
  iraq: { eco: 4, mil: 3, geo: 5 }, qatar: { eco: 6, mil: 2, geo: 5 }, syria: { eco: 2, mil: 3, geo: 4 },
  jordan: { eco: 2, mil: 3, geo: 4 }, kuwait: { eco: 5, mil: 2, geo: 3 }, oman: { eco: 3, mil: 2, geo: 4 },
  lebanon: { eco: 2, mil: 2, geo: 3 }, bahrain: { eco: 3, mil: 2, geo: 3 }, yemen: { eco: 1, mil: 3, geo: 3 },
}

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
}

export const LINKS: [string, string][] = [
  ['usa', 'israel'], ['usa', 'saudi'], ['usa', 'egypt'], ['usa', 'europe'],
  ['saudi', 'uae'], ['saudi', 'bahrain'], ['saudi', 'kuwait'], ['saudi', 'qatar'],
  ['iran', 'hezbollah'], ['iran', 'hamas'], ['iran', 'iraq'], ['iran', 'yemen'], ['iran', 'russia'],
  ['china', 'iran'], ['hezbollah', 'lebanon'], ['turkey', 'qatar'], ['russia', 'syria'],
]
