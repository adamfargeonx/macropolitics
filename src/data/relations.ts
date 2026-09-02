// Authored relations — the editorial layer of the relations lens.
// Each significant pair carries tension/friction/harmony weights (relative, normalized
// in code) and a one-line WHY in the project's voice (≤18 words). Pairs not listed fall
// back to the derived model (bloc + alliance + disposition) in RelationsView.
// Interpretive judgment, not a clinical claim — same plan as `power`: empirical later.

// LABEL SWAP (direct feedback, not a naming preference — matches RelationsView.tsx's POLE_HE,
// Chrome.tsx's POLE, and engine.ts's POLE_HE): the FIELD names below (t/f, "tension"/"friction")
// and every value assigned to them are UNCHANGED — only the Hebrew word each one displays as was
// wrong. Corrected: `t` is open/direct confrontation — adversarial pressure, shadow wars, proxies
// — and displays as חיכוך. `f` is day-to-day grinding WITHOUT direct enmity, opposing interests
// short of confrontation — and displays as מתח. (The TS identifiers "tension"/"friction" are NOT
// translations of the Hebrew words they now display as — see each consumer's own comment.)
export interface AuthoredRelation {
  pair: [string, string]
  t: number // tension  → displays as חיכוך — adversarial pressure, direct confrontation
  f: number // friction → displays as מתח   — day-to-day grinding without enmity
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

  // ── USA — full coverage (was 7/19; council-recommended before the relations grid) ──
  { pair: ['usa', 'qatar'], t: 0.08, f: 0.28, h: 0.64, why: 'בסיס אל-עודיד הוא עוגן צבאי מרכזי במפרץ — לצד אי-נוחות מתיווכה מול חמאס.' },
  { pair: ['usa', 'oman'], t: 0.06, f: 0.3, h: 0.64, why: 'ערוץ תיווך מהימן מול טהראן — יחסים שקטים, לא בעלת ברית רשמית.' },
  { pair: ['usa', 'syria'], t: 0.4, f: 0.42, h: 0.18, why: 'משטר חדש שטרם זכה לאמון מלא; סנקציות מוסרות בהדרגה, שיתוף פעולה זהיר על דאעש.' },
  { pair: ['usa', 'lebanon'], t: 0.28, f: 0.42, h: 0.3, why: 'תומכת בצבא הלבנוני מול חיזבאללה — אך המדינה חלשה מכדי להיות שותפה אמיתית.' },
  { pair: ['usa', 'europe'], t: 0.06, f: 0.24, h: 0.7, why: 'ציר הנאט״ו וההיסטוריה המשותפת — לצד חיכוכים מסחריים וחילוקי דעות על ריבונות.' },
  { pair: ['usa', 'india'], t: 0.06, f: 0.26, h: 0.68, why: 'שותפות אסטרטגית מול סין — מוצלת בהמשך רכישת הנפט הרוסי של הודו.' },
  { pair: ['usa', 'pakistan'], t: 0.22, f: 0.5, h: 0.28, why: 'ברית ישנה שהתקררה — פקיסטן נוטה לעבר סין, שיתוף הפעולה מצטמצם לביטחון נקודתי.' },
  { pair: ['usa', 'jordan'], t: 0.06, f: 0.28, h: 0.66, why: 'בעלת ברית יציבה ונתמכת-סיוע — עמוד תווך של הביטחון האזורי האמריקני.' },
  { pair: ['usa', 'uae'], t: 0.08, f: 0.3, h: 0.62, why: 'שותפות ביטחונית וכלכלית עמוקה — מוצלת בקשרי האמירויות הגוברים עם סין.' },
  { pair: ['usa', 'bahrain'], t: 0.04, f: 0.22, h: 0.74, why: 'מארחת את הצי החמישי האמריקני — נאמנות ביטחונית כמעט ללא סייג.' },
  { pair: ['usa', 'kuwait'], t: 0.04, f: 0.24, h: 0.72, why: 'בעלת ברית ותיקה מאז מלחמת המפרץ — מארחת כוחות אמריקנים ביציבות.' },
  { pair: ['usa', 'iraq'], t: 0.24, f: 0.46, h: 0.3, why: 'נוכחות צבאית מוגבלת ויחסי אימון נמשכים — מול ממשלה הנתונה גם להשפעה איראנית.' },

  // ── Iran — full coverage (was 6/19) ──
  { pair: ['iran', 'turkey'], t: 0.22, f: 0.52, h: 0.26, why: 'יריבות אזורית על סוריה ודרום קווקז — מנוהלת בפרגמטיות ומסחר ער.' },
  { pair: ['iran', 'qatar'], t: 0.08, f: 0.34, h: 0.58, why: 'שותפות בשדה הגז המשותף וזרימת דיפלומטיה שקטה — נדירה ביחסי איראן עם שכנותיה.' },
  { pair: ['iran', 'oman'], t: 0.04, f: 0.28, h: 0.68, why: 'התיווך הקבוע בין טהראן לוושינגטון — היחסים הפתוחים ביותר של איראן במפרץ.' },
  { pair: ['iran', 'syria'], t: 0.42, f: 0.4, h: 0.18, why: 'איבדה את בת בריתה המרכזית עם נפילת אסד — המשטר החדש עוין ומנתק את מסדרון הנשק.' },
  { pair: ['iran', 'lebanon'], t: 0.06, f: 0.24, h: 0.7, why: 'חיזבאללה, שלוחתה המרכזית, הופך את לבנון לזירת השפעה איראנית כמעט בלתי מעורערת.' },
  { pair: ['iran', 'europe'], t: 0.26, f: 0.5, h: 0.24, why: 'עסקת הגרעין שקרסה, סנקציות ומשברי בני ערובה — עוינות דיפלומטית כרונית.' },
  { pair: ['iran', 'india'], t: 0.08, f: 0.34, h: 0.58, why: 'השקעה בנמל צ׳אבהאר כשער למרכז אסיה — מוגבלת בזהירות הודית מול וושינגטון.' },
  { pair: ['iran', 'pakistan'], t: 0.26, f: 0.48, h: 0.26, why: 'גבול רותח עם התקפות הדדיות על מורדים בלוצ׳ים — לצד יחסי שכנות זהירים.' },
  { pair: ['iran', 'egypt'], t: 0.24, f: 0.52, h: 0.2, why: 'ללא יחסים דיפלומטיים מלאים מאז 1979 — שיחות חידוש זהירות בשנים האחרונות.' },
  { pair: ['iran', 'jordan'], t: 0.24, f: 0.5, h: 0.22, why: 'ירדן חוששת ממסדרון ההברחות והנשק העובר משטחה מאיראן דרך סוריה ועיראק.' },
  { pair: ['iran', 'uae'], t: 0.16, f: 0.42, h: 0.36, why: 'מפרץ פרסי משותף לצד יריבות אזורית — דובאי נותרה צוהר המסחר המרכזי של איראן.' },
  { pair: ['iran', 'bahrain'], t: 0.32, f: 0.42, h: 0.16, why: 'מיעוט שיעי בשלטון סוני מזין חשד מתמיד בחרחור איראני — יחסים עוינים כרונית.' },
  { pair: ['iran', 'kuwait'], t: 0.2, f: 0.48, h: 0.24, why: 'שכנות מפרצית זהירה — חשדנות כרונית לצד יחסי מסחר מוגבלים.' },

  // ── Saudi — full coverage (was 5/19) ──
  { pair: ['saudi', 'russia'], t: 0.08, f: 0.36, h: 0.5, why: 'תיאום הדוק במסגרת אופ״ק+ על מחירי הנפט — פרגמטיות חוצה מחנות.' },
  { pair: ['saudi', 'china'], t: 0.06, f: 0.32, h: 0.56, why: 'לקוחת הנפט הגדולה ומתווכת הפיוס עם איראן — שותפות כלכלית עמוקה בלי ברית ביטחונית.' },
  { pair: ['saudi', 'turkey'], t: 0.16, f: 0.44, h: 0.34, why: 'יריבות על הנהגת העולם הסוני שנרגעה בשנים האחרונות — עדיין חשדנות הדדית.' },
  { pair: ['saudi', 'oman'], t: 0.06, f: 0.34, h: 0.56, why: 'שכנות מפרצית תקינה — עומאן שומרת על מדיניות חוץ עצמאית שלא תמיד תואמת את ריאד.' },
  { pair: ['saudi', 'syria'], t: 0.14, f: 0.4, h: 0.42, why: 'תמכה במורדים, השלימה עם אסד ואז איבדה אותו — כעת בונה זהירות מול המשטר החדש.' },
  { pair: ['saudi', 'lebanon'], t: 0.16, f: 0.52, h: 0.26, why: 'נסוגה מחסותה המסורתית על הפוליטיקה הסונית הלבנונית ככל שחיזבאללה גובר.' },
  { pair: ['saudi', 'europe'], t: 0.1, f: 0.44, h: 0.4, why: 'שותפות מסחר ונשק משמעותית — מוצלת בביקורת אירופית קבועה על זכויות אדם ותימן.' },
  { pair: ['saudi', 'india'], t: 0.04, f: 0.28, h: 0.62, why: 'ספקית נפט מרכזית ומעסיקה של מיליוני עובדים הודים — יחסים כלכליים פורחים.' },
  { pair: ['saudi', 'pakistan'], t: 0.04, f: 0.3, h: 0.6, why: 'ברית ותיקה מבוססת סיוע כספי וקשרים צבאיים-דתיים — יציבה למרות איזון פקיסטני מול איראן.' },
  { pair: ['saudi', 'egypt'], t: 0.06, f: 0.32, h: 0.56, why: 'ברית ערבית-סונית מבוססת סיוע כלכלי — עם חיכוכים נקודתיים על גבולות ומדיניות עזה.' },
  { pair: ['saudi', 'jordan'], t: 0.04, f: 0.28, h: 0.62, why: 'תמיכה כלכלית קבועה בחסות המחנה המתון הסוני — יחסים יציבים ללא חיכוך משמעותי.' },
  { pair: ['saudi', 'bahrain'], t: 0.02, f: 0.16, h: 0.8, why: 'מדינת-לוויין למעשה — ריאד התערבה צבאית ב-2011 והמשיכה להכתיב את מדיניותה.' },
  { pair: ['saudi', 'kuwait'], t: 0.04, f: 0.3, h: 0.58, why: 'שותפה במועצת שיתוף הפעולה המפרצית — שומרת על עצמאות יחסית מול איראן וקטאר.' },
  { pair: ['saudi', 'iraq'], t: 0.16, f: 0.42, h: 0.38, why: 'משקמת קשרים אחרי עשורים של ניכור — משקיעה כדי לאזן את ההשפעה האיראנית בבגדד.' },
]

// Quick lookup: "a|b" (both directions).
const index = new Map<string, AuthoredRelation>()
for (const r of AUTHORED_RELATIONS) {
  index.set(`${r.pair[0]}|${r.pair[1]}`, r)
  index.set(`${r.pair[1]}|${r.pair[0]}`, r)
}
export const authoredRelation = (a: string, b: string): AuthoredRelation | undefined => index.get(`${a}|${b}`)
