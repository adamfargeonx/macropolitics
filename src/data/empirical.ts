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
import { economicScore, type EcoCriteria, type EcoResult } from '../model/economic.ts'
import { militaryScore, type MilCriteria, type MilResult } from '../model/military.ts'

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
  ecoBreakdown?: EcoResult // the 7-criterion economic composite (states with sourced inputs)
  milBreakdown?: MilResult // the 4-criterion military composite (states with sourced inputs)
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

// ── The data. eco is now a SOURCED 7-criterion composite (see ECO_CRITERIA below + economic.ts);
//    the hand value here is a fallback for bodies without sourced inputs (non-state actors, Europe).
//    mil on military spend (SIPRI 2025), geo on chokepoint/depth/energy geography. ──
const RAW_DATA: Record<string, BodyData> = {
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
    flags: ['S&P משכה את דירוג האשראי של רוסיה (2022) — רכיב הדירוג במדד הכלכלי מבוסס אינפלציה בלבד ומסומן; ייתכן שהוא מגלה-בחסר את סיכון חדלות הפירעון'],
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
    axes: { eco: 4, mil: 6, geo: 7 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $1.78 טריליון · מבודדת תחת סנקציות'),
      mil: mil('תקציב רשמי $7.4 מיליארד — הטילים/כטב״מ והשלוחים ממומנים מחוץ לתקציב; היכולות ספגו פגיעה ישירה בתקיפות יוני 2025 (גרעין, טילים, הגנה אווירית)', 'sourced', 'הציון משקף עוצמה אפקטיבית — מופחתת אחרי 2025 — לא את התקציב הרשמי'),
      geo: geo('שליטה במצרי הורמוז (~20% מנפט העולם) נותרה; אך "ציר ההתנגדות" התפורר — נפילת אסד (דצמ׳ 2024), חיזבאללה וחמאס מוכים קשות'),
    },
    flags: ['התקציב הצבאי הרשמי ($7.4 מיליארד, SIPRI) מצוין כחסר — מימון חוץ-תקציבי דרך נפט', 'הציונים עודכנו כלפי מטה (2025): תקיפות על הגרעין/הטילים + התפוררות ציר ההתנגדות'],
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
    axes: { eco: 3, mil: 6, geo: 6 }, stability: 1,
    prov: {
      eco: eco('תמ״ג PPP $2.17 טריליון — מסה גדולה, תוצר לנפש נמוך, תלוי הלוואות', 'sourced'),
      mil: mil('הוצאה צבאית $11.9 מיליארד + כוח גרעיני וצבא גדול'),
      geo: geo('עומק אסטרטגי וגבולות עם הודו, איראן, אפגניסטן וסין; נמל גוואדר (חגורה-ודרך) וחוף הים הערבי; מעצמה גרעינית'),
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
    prov: {
      eco: eco('כלכלה שקרסה; נתוני PPP (~$0.11 טריליון) ישנים ולא אמינים', 'no-data', 'אומדני התמ״ג מנותקים מהמציאות אחרי שנות מלחמה'),
      mil: mil('SIPRI אינו מדווח על סוריה; צבא תשוש שנשען על תמיכה זרה', 'no-data', 'SIPRI מחריג במפורש את סוריה מנתוני 2025'),
      geo: geo('מיקום ים-תיכוני וגבולות עם ישראל, טורקיה ועיראק; אך אחרי נפילת אסד (דצמ׳ 2024) חדל לשמש מסדרון איראני לחיזבאללה'),
    },
    stabilityNote: 'אחרי נפילת אסד (דצמ׳ 2024): שלטון מעבר בהנהגת HTS; ריבונות עדיין מפוצלת (SDF במזרח, שרידי מיליציות)',
    flags: ['אין נתוני SIPRI לסוריה; אומדני התמ״ג ישנים ולא אמינים — שני הצירים אומדן גס', 'נפילת אסד ניתקה את סוריה מציר איראן — חסות טהראן הוסרה מהמודל'],
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
    axes: { eco: 1, mil: 1, geo: 2 }, stability: 1, patron: 'iran', alpha: 0.15,
    prov: {
      eco: eco('מימון איראני והברחות; ללא בסיס כלכלי ריבוני', 'estimate'),
      mil: mil('הוכה קשות במלחמת 2024 (חיסול ההנהגה, דלדול הארסנל); הנשק המתקדם איראני (נספר כגיבוי)', 'estimate', 'נחלש מאוד מאז 2024 — שיעור הגיבוי הופחת במודל (α 0.25→0.15)'),
      geo: geo('עדיין אוחז בלבנון ומאיים על ישראל, אך כוחו היחסי ירד'),
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
    axes: { eco: 0, mil: 1, geo: 1 }, stability: 1, patron: 'iran', alpha: 0.15,
    prov: {
      eco: eco('תלות מלאה במימון איראני; ללא בסיס כלכלי', 'estimate'),
      mil: mil('רקטות וגרילה בעזה — כלי איראני להסלמה מבוקרת', 'estimate'),
      geo: geo('ללא אחריות שלטונית; שלוח כמעט-מלא של טהראן'),
    },
  },
}

// ── Economic composite inputs (SOURCED, 2025) — feed src/model/economic.ts ───────────────────
// GDP-PPP + per-capita: IMF WEO · reserves/FDI/current-account: World Bank · debt/inflation: IMF
// WEO · S&P sovereign ratings: S&P Global Ratings 2025–26. Missing fields (Iran reserves/CA/rating,
// Yemen most) → neutral + flagged in the breakdown, never imputed. `gdp` mirrors GDP_PPP[id].y2025.
export const ECO_CRITERIA: Record<string, EcoCriteria> = {
  usa: { gdp: 30767, pc: 89991, reserves: 910, fdi: 297.1, cab: -4.1, debt: 123.9, sp: 'AA+', infl: 2.7 },
  china: { gdp: 41242, pc: 29352, reserves: 3456, fdi: 18.6, cab: 2.3, debt: 99.2, sp: 'A+', infl: 0 },
  india: { gdp: 17258, pc: 11789, reserves: 643, fdi: 27.1, cab: -0.8, debt: 84.1, sp: 'BBB-', infl: 2.1 },
  russia: { gdp: 7237, pc: 50255, reserves: 608.4, fdi: -9.4, cab: 2.9, debt: 17.2, infl: 8.7 },
  saudi: { gdp: 2729, pc: 75792, reserves: 463.9, fdi: 21.3, cab: -1.3, debt: 31.7, sp: 'A+', infl: 2 },
  iran: { gdp: 1846, pc: 21200, fdi: 1.4, debt: 37.3, infl: 50.9 },
  egypt: { gdp: 2394, pc: 22185, reserves: 44.9, fdi: 46.6, cab: -5.7, debt: 86.8, sp: 'B-', infl: 20.4 },
  israel: { gdp: 572, pc: 56528, reserves: 214.5, fdi: 14.8, cab: 2.9, debt: 68.5, sp: 'A', infl: 3 },
  uae: { gdp: 948, pc: 83343, reserves: 237.9, fdi: 45.6, cab: 14.5, debt: 34.3, sp: 'AA', infl: 1.3 },
  turkey: { gdp: 3786, pc: 44110, reserves: 155.5, fdi: 11.7, cab: -0.8, debt: 23.5, sp: 'BB-', infl: 34.9 },
  pakistan: { gdp: 1687, pc: 7014, reserves: 18.4, fdi: 2.7, cab: 0.1, debt: 72.8, sp: 'CCC+', infl: 4.5 },
  iraq: { gdp: 699, pc: 15360, reserves: 100.7, fdi: -7.6, cab: 3.0, debt: 53.9, sp: 'B-', infl: 0.3 },
  qatar: { gdp: 381, pc: 120114, reserves: 54, fdi: 0.5, cab: 17.3, debt: 41.4, sp: 'AA', infl: 0.6 },
  kuwait: { gdp: 277, pc: 54150, reserves: 50.7, fdi: 0.6, cab: 29.1, debt: 14.6, sp: 'A+', infl: 2.4 },
  oman: { gdp: 232, pc: 43802, reserves: 18.3, fdi: 12.5, cab: 2.9, debt: 35.8, sp: 'BBB-', infl: 1 },
  jordan: { gdp: 145, pc: 12618, reserves: 21.9, fdi: 1.6, cab: -5.9, debt: 82.8, sp: 'BB-', infl: 1.8 },
  lebanon: { gdp: 70, pc: 13110, reserves: 33.3, fdi: 1.8, cab: -28.1, debt: 139.4, sp: 'SD', infl: 14.6 },
  bahrain: { gdp: 113, pc: 69907, reserves: 4.9, fdi: 2.7, cab: 4.8, debt: 147.6, sp: 'B+', infl: -0.1 },
  yemen: { gdp: 30, pc: 1590, reserves: 1.3, infl: 21.4 },
}

// ── Military composite inputs (SOURCED, 2025) — feed src/model/military.ts ──────────────────
// Spend: SIPRI 2025 · Manpower: IISS Military Balance 2024 (thousands active) ·
// Nuclear warheads: FAS 2025 (total stockpile, all delivery systems) ·
// Cyber: Belfer Center National Cyber Power Index 2022 (0–100, major powers only).
// Non-state actors, Europe (aggregate), UAE (no SIPRI), Syria, Lebanon, Yemen (no clean
// SIPRI or IISS figures) are excluded — they keep their hand mil scores.
// warheads: 0 = known non-nuclear; omit = not in index or unknown.
export const MIL_CRITERIA: Record<string, MilCriteria> = {
  usa:     { spend: 954,  manpower: 1328, warheads: 5500, cyber: 100 },
  china:   { spend: 336,  manpower: 2035, warheads: 500,  cyber: 91  },
  russia:  { spend: 190,  manpower: 1150, warheads: 6200, cyber: 74  },
  india:   { spend: 92.1, manpower: 1455, warheads: 180,  cyber: 44  },
  saudi:   { spend: 83.2, manpower: 257,  warheads: 0                },
  israel:  { spend: 48.3, manpower: 169,  warheads: 90,   cyber: 59  },
  turkey:  { spend: 30.0, manpower: 355,  warheads: 0,    cyber: 34  },
  // Iran: SIPRI official spend chronically understates effective capability (off-budget missiles
  // + IRGC proxies); use the official figure and flag. manpower includes IRGC (~190k).
  iran:    { spend: 7.4,  manpower: 610,  warheads: 0                },
  pakistan:{ spend: 11.9, manpower: 654,  warheads: 170              },
  // Egypt: SIPRI does not publish Egypt's figures; estimate from IISS/open sources.
  egypt:   { spend: 4.0,  manpower: 438,  warheads: 0                },
  iraq:    { spend: 6.0,  manpower: 194,  warheads: 0                },
}

// Canonical body data: where sourced economic or military criteria exist, replace the hand
// axis score with the computed composite and attach its breakdown. Immutable — new objects.
export const DATA: Record<string, BodyData> = Object.fromEntries(
  Object.entries(RAW_DATA).map(([id, d]) => {
    const ec = ECO_CRITERIA[id]
    const mc = MIL_CRITERIA[id]
    const ecoResult = ec ? economicScore(ec) : undefined
    const milResult = mc ? militaryScore(mc) : undefined
    return [id, {
      ...d,
      axes: {
        eco: ecoResult ? ecoResult.eco : d.axes.eco,
        mil: milResult ? milResult.mil : d.axes.mil,
        geo: d.axes.geo,
      },
      ecoBreakdown: ecoResult ?? d.ecoBreakdown,
      milBreakdown: milResult ?? d.milBreakdown,
    }]
  }),
)

// Build the model's input list (axes + stability + backing only).
export const BODY_INPUTS: BodyInput[] = Object.entries(DATA).map(([id, d]) => ({
  id, axes: d.axes, stability: d.stability, patron: d.patron, alpha: d.alpha,
}))

// Convenience: every body that carries a prominent data-quality flag (for the sources viewer).
export const FLAGGED: Record<string, string[]> = Object.fromEntries(
  Object.entries(DATA).filter(([, d]) => d.flags?.length).map(([id, d]) => [id, d.flags!]),
)

// ── Military-spending trend (a sourced temporal datapoint) ───────────────────────────────────
// Directly-sourced military expenditure (US$ billion, current prices) at two SIPRI snapshots,
// five years apart. Only bodies with clean figures at BOTH points are included — no interpolation.
// Source: SIPRI Trends in World Military Expenditure 2020 (fs_2104_milex) + 2025 (2604_milex).
// y2000 added for the 2000 snapshot, sourced from the World Bank's redistribution of SIPRI
// (MS.MIL.XPND.CD, current US$) — the only SIPRI series with a clean public API back to 1960.
// It tracks the 2020 fact-sheet figures within a few % for the majors. Iran is deliberately left
// without a y2000: its 2020/2025 figures are *effective* (incl. off-budget missiles/proxies), and
// the WB budget series ($8.3B in 2000) is not commensurable — so Iran holds its present mil in 2000.
export interface MilTrend { y2000?: number; y2020: number; y2025: number; note?: string }
export const MIL_TREND: Record<string, MilTrend> = {
  usa: { y2000: 320, y2020: 778, y2025: 954 },
  china: { y2000: 22.2, y2020: 252, y2025: 336 },
  russia: { y2000: 9.2, y2020: 61.7, y2025: 190, note: 'הזינוק משקף את כלכלת המלחמה באוקראינה' },
  india: { y2000: 14.3, y2020: 72.9, y2025: 92.1 },
  saudi: { y2000: 20.0, y2020: 57.5, y2025: 83.2 },
  israel: { y2000: 8.3, y2020: 21.7, y2025: 48.3, note: 'הזינוק משקף את מלחמת 2023–2025' },
  turkey: { y2000: 10.0, y2020: 17.7, y2025: 30.0 },
  iran: { y2020: 15.8, y2025: 7.4, note: 'הירידה במונחי דולר משקפת קריסת הריאל/אינפלציה — לא ירידה ביכולת; וחלק מההוצאה מחוץ לתקציב' },
  pakistan: { y2000: 3.0, y2020: 10.4, y2025: 11.9 },
}
export const MIL_TREND_SOURCE = 'SIPRI · 2020+2025 (גיליונות מגמות), 2000 (דרך הבנק העולמי) · במחירים שוטפים (US$)'

// ── GDP (PPP), IMF WEO, two snapshots (US$ billion, current international $) ──────────────────
// Source: IMF DataMapper API (PPPGDP), raw JSON parsed deterministically (not LLM-extracted).
// Powers the economic trend + the 2020⇄2025 time axis. Bodies without a clean series are omitted.
// y2000 added for the 2000 snapshot — same IMF DataMapper API (PPPGDP), raw JSON parsed.
// Yemen has no IMF 2000 figure, so it holds its present eco in the 2000 snapshot.
export interface EcoPair { y2000?: number; y2020: number; y2025: number }
export const GDP_PPP: Record<string, EcoPair> = {
  usa: { y2000: 10251, y2020: 21375, y2025: 30767 },
  china: { y2000: 3338, y2020: 25961, y2025: 41242 },
  india: { y2000: 1969, y2020: 9541, y2025: 17258 },
  russia: { y2000: 1557, y2020: 4651, y2025: 7237 },
  saudi: { y2000: 604, y2020: 1498, y2025: 2729 },
  iran: { y2000: 543, y2020: 1326, y2025: 1846 },
  egypt: { y2000: 413, y2020: 1665, y2025: 2394 },
  israel: { y2000: 140, y2020: 378, y2025: 572 },
  uae: { y2000: 221, y2020: 628, y2025: 948 },
  turkey: { y2000: 711, y2020: 2436, y2025: 3786 },
  pakistan: { y2000: 385, y2020: 1186, y2025: 1687 },
  iraq: { y2000: 160, y2020: 449, y2025: 699 },
  qatar: { y2000: 38, y2020: 230, y2025: 381 },
  kuwait: { y2000: 77, y2020: 182, y2025: 277 },
  oman: { y2000: 61, y2020: 159, y2025: 232 },
  jordan: { y2000: 33, y2020: 114, y2025: 145 },
  lebanon: { y2000: 48, y2020: 73, y2025: 70 },
  bahrain: { y2000: 25, y2020: 79, y2025: 113 },
  yemen: { y2020: 26, y2025: 30 },
}
export const GDP_PPP_SOURCE = 'IMF WEO · GDP (PPP), מיליארד $ בינל׳'

// ── Time axis: per-year effective inputs ─────────────────────────────────────────────────────
// 2025 is the calibrated present. A past year's eco/mil scores are derived by shifting the 2025
// score by the log-ratio of the SOURCED underlying figure (GDP-PPP for eco, mil-spend for mil) —
// so 2025 stays exact (ln 1 = 0) and 2020 moves consistently with the real data. geo, stability,
// backing and the alliance graph are HELD at present (flagged in the UI) — those are interpretive
// over time, not sourced. Bodies without a clean figure keep their present score for that axis.
export type Year = 2000 | 2020 | 2025
// Log-sensitivity amplifiers: one unit of log-ratio (≈ an e-fold change in the underlying
// figure) shifts the 0–10 axis score by this much. Mil is slightly more elastic than eco —
// defense budgets swing harder year-to-year than GDP. Tuned so 2020 deltas read as plausible.
const K_ECO = 1.2, K_MIL = 1.3
const clamp10 = (n: number) => Math.min(10, Math.max(0, Math.round(n)))
// Pick the figure for a past snapshot year; undefined → no clean series → hold present.
const ecoAt = (g: EcoPair, y: Exclude<Year, 2025>) => (y === 2000 ? g.y2000 : g.y2020)
const milAt = (m: MilTrend, y: Exclude<Year, 2025>) => (y === 2000 ? m.y2000 : m.y2020)
export function bodyInputsForYear(year: Year): BodyInput[] {
  if (year === 2025) return BODY_INPUTS
  return BODY_INPUTS.map((b) => {
    const g = GDP_PPP[b.id]; const m = MIL_TREND[b.id]
    const gPast = g && ecoAt(g, year); const mPast = m && milAt(m, year)
    const eco = gPast ? clamp10(b.axes.eco + K_ECO * Math.log(gPast / g!.y2025)) : b.axes.eco
    const mil = mPast ? clamp10(b.axes.mil + K_MIL * Math.log(mPast / m!.y2025)) : b.axes.mil
    return { ...b, axes: { eco, mil, geo: b.axes.geo } }
  })
}
