// Empirical inputs for the gravity model (src/model/gravity.ts).
// Each body has EFFECTIVE axis scores (0–10, quality-adjusted — see docs/power-model.md), an
// integrity-discount `stability`, optional graph `backing`, and — crucially — PROVENANCE for every
// axis: the underlying figure, the dataset, the year, a link, and a status. Where the data is weak
// it is FLAGGED honestly (status !== 'sourced' + a note), never silently smoothed over.
//
// SOURCES (verified 2026-06-12, primary datasets):
//   • Economic   — IMF World Economic Outlook, GDP (PPP), 2026 estimates.
//   • Military   — SIPRI Military Expenditure Database, 2025 (updated 27 Apr 2026).
//   • Geo-strat. — geography + EIA world-oil-transit-chokepoints; this axis is interpretive by
//                  nature (a structured judgment), so it is labelled 'judgment', not a hard dataset.
// The effective 0–10 score is an analyst rating ANCHORED on the cited figure (mass tempered by
// per-capita/sophistication for economy; spend + nuclear/quality for military). The figure is shown;
// the rating is arguable. The gravity FORMULA on top of these is fully computed.

import type { BodyInput } from '../model/gravity'

export type SourceStatus =
  | 'sourced' // a primary dataset figure stands behind the score
  | 'estimate' // no clean primary figure; a reasoned approximation (flagged)
  | 'judgment' // inherently interpretive (the geo-strategic axis)
  | 'no-data' // the primary source explicitly has no figure (flagged)

export interface AxisProvenance {
  figure: string // the underlying datum, human-readable (Hebrew)
  source: string // dataset / organisation
  year: number
  url: string
  status: SourceStatus
  note?: string // caveat — surfaced as a flag when the status is weak
}

export interface BodyData {
  axes: { eco: number; mil: number; geo: number } // effective 0–10
  stability: number
  patron?: string
  alpha?: number
  prov: { eco: AxisProvenance; mil: AxisProvenance; geo: AxisProvenance }
  stabilityNote?: string
  flags?: string[] // prominent data-quality caveats — populated ONLY when genuinely half-baked
}

const SIPRI = 'https://www.sipri.org/databases/milex'
const IMF = 'https://www.imf.org/external/datamapper/PPPGDP@WEO/OEMDC'
const EIA = 'https://www.eia.gov/international/analysis/special-topics/world_oil_transit_Chokepoints'

// provenance constructors (DRY) ──────────────────────────────────────────────
const eco = (figure: string, status: SourceStatus = 'sourced', note?: string): AxisProvenance =>
  ({ figure, source: 'IMF WEO 2026', year: 2026, url: IMF, status, note })
const mil = (figure: string, status: SourceStatus = 'sourced', note?: string): AxisProvenance =>
  ({ figure, source: 'SIPRI 2025', year: 2025, url: SIPRI, status, note })
const geo = (figure: string, note?: string): AxisProvenance =>
  ({ figure, source: 'גאוגרפיה · EIA', year: 2025, url: EIA, status: 'judgment', note })

// ── The data. eco anchored on GDP-PPP (IMF 2026), mil on military spend (SIPRI 2025),
//    geo on chokepoint/depth/energy geography. Effective scores temper mass by quality. ──
export const DATA: Record<string, BodyData> = {
  usa: {
    axes: { eco: 10, mil: 10, geo: 10 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $32.4 טריליון · הכלכלה המתוחכמת בעולם'),
      mil: mil('הוצאה צבאית $954 מיליארד (33% עולמי) + טריאדה גרעינית'),
      geo: geo('טווח גלובלי, צי חמישי במפרץ, מעגן את הסדר האזורי'),
    },
  },
  china: {
    axes: { eco: 10, mil: 8, geo: 9 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $44.3 טריליון · הגדולה בעולם'),
      mil: mil('הוצאה צבאית $336 מיליארד (אומדן) · מתחדשת בכל הזירות'),
      geo: geo('"החגורה והדרך", צי גדל, תיווך אזורי בלי התחייבות'),
    },
  },
  russia: {
    axes: { eco: 6, mil: 9, geo: 8 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $7.5 טריליון · כלכלת אנרגיה תחת סנקציות'),
      mil: mil('הוצאה צבאית $190 מיליארד (אומדן, 7.5% תמ״ג) + הארסנל הגרעיני הגדול בעולם'),
      geo: geo('בסיסים בסוריה (טרטוס/חמיימים), דריסת רגל ים-תיכונית'),
    },
  },
  europe: {
    axes: { eco: 9, mil: 6, geo: 7 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP ~$28 טריליון (האיחוד) · כוח רגולטורי וכלכלי'),
      mil: mil('נאט״ו אירופה ~$559 מיליארד מצרפית — אך מפוצל ותלוי נאט״ו', 'estimate', 'יכולת מצרפית; אין צבא אירופי מאוחד'),
      geo: geo('שכנה ים-תיכונית; השפעה רכה > קשה, פעולה לא-מאוחדת'),
    },
  },
  india: {
    axes: { eco: 7, mil: 6, geo: 5 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $18.9 טריליון (3 בעולם) — אך תוצר לנפש נמוך', 'sourced', 'מסה גדולה ממותנת בתחכום/לנפש'),
      mil: mil('הוצאה צבאית $92 מיליארד + גרעין; פערי מוכנות'),
      geo: geo('כוח ימי באוקיינוס ההודי; שחקן היקפי במזה״ת'),
    },
  },
  iran: {
    axes: { eco: 4, mil: 7, geo: 8 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $1.78 טריליון · מבודדת תחת סנקציות'),
      mil: mil('תקציב רשמי $7.4 מיליארד בלבד — אך הטילים/כטב״מ והשלוחים ממומנים מחוץ לתקציב', 'sourced', 'הציון משקף עוצמה אפקטיבית, לא התקציב הרשמי (SIPRI מציין מימון חוץ-תקציבי)'),
      geo: geo('שליטה במצרי הורמוז (~20% מנפט העולם) + "ציר ההתנגדות" מלבנון לתימן'),
    },
    flags: ['התקציב הצבאי הרשמי ($7.4 מיליארד, SIPRI) מצוין במפורש כחסר — תוכניות הטילים/כטב״מ ממומנות מחוץ לתקציב דרך הכנסות נפט'],
  },
  saudi: {
    axes: { eco: 7, mil: 5, geo: 7 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $2.9 טריליון · נפט + קרן ריבונית, תוצר לנפש גבוה'),
      mil: mil('הוצאה צבאית $83.2 מיליארד (המובילה במזה״ת) — אך תלוית נשק מערבי'),
      geo: geo('עתודות הנפט, מקומות הקודש, חופי הים האדום והמפרץ'),
    },
  },
  israel: {
    axes: { eco: 6, mil: 8, geo: 6 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.61 טריליון — קטן אך תוצר לנפש והיי-טק גבוהים', 'sourced', 'מסה קטנה מתוגברת בתחכום/לנפש'),
      mil: mil('הוצאה צבאית $48.3 מיליארד (7.8% תמ״ג) + עליונות אווירית, מודיעין וכושר גרעיני מיוחס'),
      geo: geo('צומת אזורי מרכזי; שטח קטן וסביבה עוינת'),
    },
  },
  turkey: {
    axes: { eco: 6, mil: 6, geo: 6 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $4.0 טריליון · תעשייתי אך תנודתי (אינפלציה)'),
      mil: mil('הוצאה צבאית $30 מיליארד + הצבא השני בנאט״ו, תעשיית כטב״מ'),
      geo: geo('שליטה במצרי הבוספורוס; גשר בין יבשות'),
    },
  },
  egypt: {
    axes: { eco: 4, mil: 5, geo: 6 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $2.57 טריליון — מסה גדולה אך תוצר לנפש נמוך, חוב כבד', 'sourced', 'כושלת כלכלית: מסה ללא לנפש'),
      mil: mil('תקציב רשמי נמוך ולא שקוף (~$3–5 מיליארד) לצד צבא ענק ממומן אמריקנית', 'estimate', 'מצרים מדווחת חלקית ל-SIPRI; כלכלה צבאית נרחבת מחוץ לתקציב'),
      geo: geo('שליטה בתעלת סואץ (~12% מהסחר העולמי, EIA)'),
    },
    flags: ['ההוצאה הצבאית הרשמית של מצרים נמוכה ולא שקופה; הציון אומדן של עוצמה אפקטיבית'],
  },
  pakistan: {
    axes: { eco: 3, mil: 6, geo: 5 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $2.17 טריליון — מסה גדולה, תוצר לנפש נמוך, תלוי הלוואות', 'sourced'),
      mil: mil('הוצאה צבאית $11.9 מיליארד + כוח גרעיני וצבא גדול'),
      geo: geo('גשר אל אסיה, חוף הים הערבי; יריבות גרעינית מול הודו'),
    },
  },
  uae: {
    axes: { eco: 6, mil: 4, geo: 4 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $1.0 טריליון · מרכז פיננסי, תוצר לנפש גבוה מאוד'),
      mil: mil('SIPRI אינו מדווח על איחוד האמירויות; אומדן ~$20 מיליארד · "ספרטה הקטנה"', 'no-data', 'SIPRI מחריג במפורש את איחוד האמירויות מנתוני 2025'),
      geo: geo('נמלים אסטרטגיים, סמיכות להורמוז, השקעות גלובליות'),
    },
    flags: ['SIPRI אינו מפרסם נתוני הוצאה צבאית לאיחוד האמירויות — ציון הצבא אומדן'],
  },
  qatar: {
    axes: { eco: 6, mil: 2, geo: 4 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.36 טריליון · התוצר לנפש מהגבוהים בעולם (גז נוזלי)'),
      mil: mil('צבא זעיר (~$4–6 מיליארד) — אך מארח את בסיס אל-עודייד האמריקני', 'estimate'),
      geo: geo('יצוא גז מוביל, דיפלומטיית תיווך, אל-ג׳זירה'),
    },
  },
  iraq: {
    axes: { eco: 4, mil: 3, geo: 5 }, stability: 0.75,
    patron: 'iran', alpha: 0.15,
    prov: {
      eco: eco('תמ״ג PPP $0.67 טריליון · כלכלת נפט כמעט בלעדית'),
      mil: mil('הוצאה צבאית ~$6 מיליארד · צבא משוקם לצד מיליציות', 'estimate'),
      geo: geo('גשר יבשתי בין איראן לסוריה/לבנון — חוליה ב"ציר"'),
    },
    stabilityNote: 'ריבונות חלקית — מיליציות שיעיות מקבילות לצבא הרשמי',
  },
  kuwait: {
    axes: { eco: 4, mil: 2, geo: 3 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.28 טריליון · עתודות נפט, תוצר לנפש גבוה'),
      mil: mil('צבא קטן (~$8 מיליארד) · נשען על הגנה אמריקנית', 'estimate'),
      geo: geo('יושבת בין עיראק, איראן וסעודיה'),
    },
  },
  oman: {
    axes: { eco: 3, mil: 2, geo: 3 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.25 טריליון · נפט/גז בינוני'),
      mil: mil('צבא צנוע (~$6 מיליארד, נטל גבוה) · אי-הזדהות', 'estimate'),
      geo: geo('שולטת בצד הדרומי של מצרי הורמוז'),
    },
  },
  jordan: {
    axes: { eco: 2, mil: 3, geo: 3 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.15 טריליון · קטן, תלוי סיוע, משאבים דלים'),
      mil: mil('צבא מקצועי קטן (~$3 מיליארד) ממומן אמריקנית', 'estimate'),
      geo: geo('חיץ אסטרטגי בין ישראל, עיראק וסעודיה'),
    },
  },
  bahrain: {
    axes: { eco: 3, mil: 1, geo: 3 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $0.12 טריליון · מרכז פיננסי קטן, תלוי סעודיה'),
      mil: mil('צבא זעיר (~$1.5 מיליארד) · מארח את הצי החמישי האמריקני', 'estimate'),
      geo: geo('קו חזית סוני מול השפעה איראנית; בסיס הצי החמישי'),
    },
  },
  syria: {
    axes: { eco: 2, mil: 2, geo: 4 }, stability: 0.45,
    patron: 'iran', alpha: 0.12,
    prov: {
      eco: eco('כלכלה שקרסה; נתוני PPP (~$0.11 טריליון) ישנים ולא אמינים', 'no-data', 'אומדני התמ״ג מנותקים מהמציאות אחרי שנות מלחמה'),
      mil: mil('SIPRI אינו מדווח על סוריה; צבא תשוש שנשען על תמיכה זרה', 'no-data', 'SIPRI מחריג במפורש את סוריה מנתוני 2025'),
      geo: geo('חוליה מרכזית ב"ציר" — מעבר נשק מאיראן לחיזבאללה'),
    },
    stabilityNote: 'מדינה מפוצלת; ריבונות מחולקת בין כוחות זרים ומקומיים',
    flags: ['אין נתוני SIPRI לסוריה; אומדני התמ״ג ישנים ולא אמינים — שני הצירים אומדן גס'],
  },
  lebanon: {
    axes: { eco: 2, mil: 2, geo: 3 }, stability: 0.5,
    prov: {
      eco: eco('קריסה פיננסית; תמ״ג PPP ~$0.07 טריליון, מטבע שהתרסק', 'sourced', 'כלכלה בקריסה — הנתון משקף תמונה רעועה'),
      mil: mil('צבא חלש (~$1.5 מיליארד) לצד חיזבאללה החמוש — "מדינה בתוך מדינה"', 'estimate'),
      geo: geo('זירת עימות ישראל–איראן; חזית דרומית פעילה'),
    },
    stabilityNote: 'חיזבאללה חזק מהצבא הרשמי; המדינה משותקת',
  },

  // ── non-state actors: OWN indigenous axes are small; the supplied weight is BACKING.
  //    No sovereign datasets exist, so axes are reasoned estimates (the standing caveat for
  //    sub-state actors), and backing — not own capability — drives their gravity. ──
  hezbollah: {
    axes: { eco: 1, mil: 1, geo: 2 }, stability: 1, patron: 'iran', alpha: 0.25,
    prov: {
      eco: eco('מימון איראני והברחות; ללא בסיס כלכלי ריבוני', 'estimate'),
      mil: mil('בסיס עצמאי מצומצם — הארסנל המדויק הוא איראני (נספר כגיבוי)', 'estimate', 'עשרות אלפי רקטות, אך מסופקות בידי החסות'),
      geo: geo('אוחז בלבנון ומאיים על ישראל; השלוח המרכזי של איראן'),
    },
  },
  yemen: {
    axes: { eco: 1, mil: 2, geo: 3 }, stability: 0.6, patron: 'iran', alpha: 0.12,
    prov: {
      eco: eco('המדינה הענייה באזור; משבר הומניטרי', 'no-data', 'SIPRI מחריג את תימן; מדינה קרועת מלחמה'),
      mil: mil('החות׳ים: טילים וכטב״מ (חלקם איראניים) — נתוני מדינה אין', 'estimate'),
      geo: geo('שליטה במצרי באב אל-מנדב — צוואר בקבוק לסחר העולמי'),
    },
    flags: ['אין נתוני SIPRI לתימן; הציונים מתייחסים לחות׳ים כשחקן, באומדן'],
  },
  hamas: {
    axes: { eco: 1, mil: 1, geo: 2 }, stability: 1, patron: 'iran', alpha: 0.1,
    prov: {
      eco: eco('מימון קטארי ואיראני, מסים ומנהור; כלכלת מצור', 'estimate'),
      mil: mil('רקטות, מנהרות ולוחמת גרילה — נחלש מאז המלחמה', 'estimate'),
      geo: geo('הציב את עזה במרכז הסכסוך'),
    },
  },
  militias: {
    axes: { eco: 1, mil: 1, geo: 1 }, stability: 1, patron: 'iran', alpha: 0.1,
    prov: {
      eco: eco('אחיזה בנמלים, מכס ותקציבי המדינה העיראקית', 'estimate'),
      mil: mil('כטב״מ ורקטות נגד בסיסים אמריקניים; כפיפות לטהראן', 'estimate'),
      geo: geo('מקבעות את עיראק כמסדרון איראני'),
    },
  },
  sdf: {
    axes: { eco: 1, mil: 2, geo: 2 }, stability: 0.7, patron: 'usa', alpha: 0.05,
    prov: {
      eco: eco('שולטים בשדות נפט סוריים; כלכלה מקומית שברירית', 'estimate'),
      mil: mil('הכוח הקרקעי שהביס את דאעש; תלוי בסיוע אמריקני', 'estimate'),
      geo: geo('מחזיקים את המרחב בין טורקיה, אסד ואיראן'),
    },
  },
  fatah: {
    axes: { eco: 1, mil: 1, geo: 2 }, stability: 0.8, patron: 'saudi', alpha: 0.05,
    prov: {
      eco: eco('תלויה במסי ישראל ובסיוע זר; כלכלה ללא ריבונות', 'estimate'),
      mil: mil('כוחות ביטחון מתואמים עם ישראל; ללא צבא של ממש', 'estimate'),
      geo: geo('הכתובת הרשמית לסוגיה הפלסטינית — והחוליה החלשה בה'),
    },
  },
  isis: {
    axes: { eco: 1, mil: 2, geo: 2 }, stability: 1,
    prov: {
      eco: eco('שרידי מימון מסחיטה והברחות; אבד הבסיס הטריטוריאלי', 'estimate'),
      mil: mil('תאי גרילה בסוריה ובעיראק; פיגועים בהשראתו', 'estimate'),
      geo: geo('איום מתמשך המצדיק נוכחות צבאית זרה'),
    },
  },
  qaeda: {
    axes: { eco: 1, mil: 1, geo: 2 }, stability: 1,
    prov: {
      eco: eco('מימון מבוזר דרך תרומות, כופר וכלכלות צל', 'estimate'),
      mil: mil('שלוחות פעילות בתימן, סוריה ואפריקה; יכולת גלובלית', 'estimate'),
      geo: geo('הציתה את עידן "המלחמה בטרור"'),
    },
  },
  pij: {
    axes: { eco: 0, mil: 1, geo: 1 }, stability: 1, patron: 'iran', alpha: 0.12,
    prov: {
      eco: eco('תלות מלאה במימון איראני; ללא בסיס כלכלי', 'estimate'),
      mil: mil('רקטות וגרילה בעזה — כלי איראני להסלמה מבוקרת', 'estimate'),
      geo: geo('ללא אחריות שלטונית; שלוח כמעט-מלא של טהראן'),
    },
  },
}

// Build the model's input list (axes + stability + backing only).
export const BODY_INPUTS: BodyInput[] = Object.entries(DATA).map(([id, d]) => ({
  id, axes: d.axes, stability: d.stability, patron: d.patron, alpha: d.alpha,
}))

// Convenience: every body that carries a prominent data-quality flag (for the sources viewer).
export const FLAGGED: Record<string, string[]> = Object.fromEntries(
  Object.entries(DATA).filter(([, d]) => d.flags?.length).map(([id, d]) => [id, d.flags!]),
)
