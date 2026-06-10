// Authored relations — the editorial layer of the relations lens.
// Each significant pair carries tension/friction/harmony weights (relative, normalized
// in code) and a one-line WHY in the project's voice (≤18 words). Pairs not listed fall
// back to the derived model (bloc + alliance + disposition) in RelationsView.
// Interpretive judgment, not a clinical claim — same plan as `power`: empirical later.

export interface AuthoredRelation {
  pair: [string, string]
  t: number // tension  (מתח)    — adversarial pressure
  f: number // friction (חיכוך)  — day-to-day grinding without enmity
  h: number // harmony  (הרמוניה) — alignment and cooperation
  why: string
}

export const AUTHORED_RELATIONS: AuthoredRelation[] = [
  // ── Israel (default reference — fullest coverage) ──
  { pair: ['israel', 'iran'], t: 0.78, f: 0.17, h: 0.05, why: 'תוכנית הגרעין, מלחמת הצללים והשלוחים — עוינות גלויה בכל החזיתות.' },
  { pair: ['israel', 'usa'], t: 0.05, f: 0.17, h: 0.78, why: 'ברית אסטרטגית עמוקה — עם חיכוכים פוליטיים נקודתיים סביב הסוגיה הפלסטינית.' },
  { pair: ['israel', 'saudi'], t: 0.14, f: 0.46, h: 0.4, why: 'נורמליזציה שקטה על השולחן — תלויה במחיר הפלסטיני ובערבויות אמריקניות.' },
  { pair: ['israel', 'egypt'], t: 0.1, f: 0.36, h: 0.54, why: 'שלום קר ויציב; תיאום ביטחוני הדוק בסיני ובעזה.' },
  { pair: ['israel', 'jordan'], t: 0.16, f: 0.46, h: 0.38, why: 'שלום מתוח — תלות במים ובביטחון מול רגישות ירושלים והפליטים.' },
  { pair: ['israel', 'uae'], t: 0.08, f: 0.28, h: 0.64, why: 'הסכמי אברהם בשיאם — טכנולוגיה, ביטחון והשקעות.' },
  { pair: ['israel', 'bahrain'], t: 0.1, f: 0.34, h: 0.56, why: 'נורמליזציה יציבה בחסות סעודית-אמריקנית.' },
  { pair: ['israel', 'turkey'], t: 0.48, f: 0.38, h: 0.14, why: 'עוינות רטורית חריפה לצד סחר ער — יריבות שלא מגיעה לעימות.' },
  { pair: ['israel', 'qatar'], t: 0.38, f: 0.46, h: 0.16, why: 'ערוץ תיווך חיוני לעזה — וגם פטרונית של חמאס ושל תקשורת עוינת.' },
  { pair: ['israel', 'russia'], t: 0.42, f: 0.44, h: 0.14, why: 'תיאום צבאי בסוריה שנשחק ככל שמוסקבה מתקרבת לטהראן.' },
  { pair: ['israel', 'china'], t: 0.28, f: 0.52, h: 0.2, why: 'סחר וטכנולוגיה גדלים — תחת עין אמריקנית חשדנית.' },
  { pair: ['israel', 'europe'], t: 0.24, f: 0.46, h: 0.3, why: 'שותפות סחר ומחקר עמוקה לצד ביקורת מתמדת על הסכסוך.' },
  { pair: ['israel', 'syria'], t: 0.68, f: 0.27, h: 0.05, why: 'מדינת אויב ומסדרון הנשק האיראני לחיזבאללה.' },
  { pair: ['israel', 'lebanon'], t: 0.72, f: 0.23, h: 0.05, why: 'גבול עוין בשליטת חיזבאללה; המדינה הרשמית כמעט אינה גורם.' },
  { pair: ['israel', 'iraq'], t: 0.55, f: 0.36, h: 0.09, why: 'ללא יחסים; המיליציות הפרו-איראניות הופכות אותה לזירת איום.' },
  { pair: ['israel', 'oman'], t: 0.2, f: 0.5, h: 0.3, why: 'ערוץ שקט ופרגמטי — בלי נורמליזציה רשמית.' },
  { pair: ['israel', 'kuwait'], t: 0.3, f: 0.52, h: 0.18, why: 'עוינות עקרונית לנורמליזציה — בלי עימות בפועל.' },
  { pair: ['israel', 'pakistan'], t: 0.36, f: 0.48, h: 0.16, why: 'אין יחסים רשמיים; עוינות מוצהרת ממרחק בטוח.' },
  { pair: ['israel', 'india'], t: 0.08, f: 0.3, h: 0.62, why: 'שותפות ביטחונית וטכנולוגית פורחת — ניו דלהי קונה ושותקת.' },

  // ── Great-power axes ──
  { pair: ['usa', 'russia'], t: 0.72, f: 0.23, h: 0.05, why: 'יריבות מעצמתית גלובלית — אוקראינה, סוריה ומרוץ החימוש.' },
  { pair: ['usa', 'china'], t: 0.55, f: 0.35, h: 0.1, why: 'תחרות אסטרטגית על הסדר העולמי — משזורה בתלות כלכלית הדדית.' },
  { pair: ['usa', 'iran'], t: 0.76, f: 0.19, h: 0.05, why: 'סנקציות, גרעין ושלוחים — עוינות ממוסדת מאז 1979.' },
  { pair: ['usa', 'saudi'], t: 0.14, f: 0.36, h: 0.5, why: 'ברית נפט-ביטחון ותיקה — שריאד לומדת לגוון בשחקנים נוספים.' },
  { pair: ['usa', 'turkey'], t: 0.34, f: 0.5, h: 0.16, why: 'בעלות ברית בנאט״ו במשבר אמון — S-400, הכורדים וארדואן.' },
  { pair: ['usa', 'egypt'], t: 0.12, f: 0.4, h: 0.48, why: 'סיוע צבאי תמורת יציבות ושלום עם ישראל — בלי שאלות קשות.' },
  { pair: ['russia', 'iran'], t: 0.08, f: 0.3, h: 0.62, why: 'שותפות צבאית מתהדקת — כטב״מים לאוקראינה תמורת גב אסטרטגי.' },
  { pair: ['china', 'iran'], t: 0.1, f: 0.36, h: 0.54, why: 'נפט מוזל תמורת גב כלכלי — בלי להתחייב צבאית.' },
  { pair: ['russia', 'turkey'], t: 0.34, f: 0.5, h: 0.16, why: 'שיתוף ותחרות בו-זמנית — סוריה, קווקז ואנרגיה.' },
  { pair: ['russia', 'syria'], t: 0.06, f: 0.28, h: 0.66, why: 'מוסקבה הצילה את אסד; טרטוס וחמיימים הם המחיר.' },

  // ── Regional fault lines ──
  { pair: ['iran', 'saudi'], t: 0.52, f: 0.36, h: 0.12, why: 'היריבות הסונית-שיעית המגדירה — בהפוגה זהירה בתיווך סיני.' },
  { pair: ['saudi', 'uae'], t: 0.1, f: 0.36, h: 0.54, why: 'ברית מפרץ אסטרטגית — עם תחרות גוברת על הון והשפעה.' },
  { pair: ['saudi', 'qatar'], t: 0.28, f: 0.5, h: 0.22, why: 'פיוס שביר אחרי שנות המצור — החשדנות נשארה.' },
  { pair: ['turkey', 'egypt'], t: 0.3, f: 0.48, h: 0.22, why: 'הפשרה זהירה אחרי עשור של נתק סביב האחים המוסלמים.' },
  { pair: ['iran', 'iraq'], t: 0.12, f: 0.38, h: 0.5, why: 'השפעה איראנית עמוקה במיליציות ובפוליטיקה — ריבונות עיראקית שחוקה.' },
]

// Quick lookup: "a|b" (both directions).
const index = new Map<string, AuthoredRelation>()
for (const r of AUTHORED_RELATIONS) {
  index.set(`${r.pair[0]}|${r.pair[1]}`, r)
  index.set(`${r.pair[1]}|${r.pair[0]}`, r)
}
export const authoredRelation = (a: string, b: string): AuthoredRelation | undefined => index.get(`${a}|${b}`)
