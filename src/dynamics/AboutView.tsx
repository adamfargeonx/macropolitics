import { Words } from './Words'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// "המודל" — the methodology overlay. The site's thesis, the equation, how each lens
// reads, and an honesty note about the data. Opens on the header control ('mp-about').
export function AboutOverlay() {
  const { open, closing, close } = useOverlay('mp-about')
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="about" dir="rtl" role="dialog" aria-modal="true" aria-label="המודל" onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>

        <header className="about__head">
          <span className="about__mark" aria-hidden><span className="about__mark-spin"><i /></span></span>
          <div className="about__head-txt">
            <h2 className="about__title">המודל</h2>
            <span className="about__sub">תורת היחסות של המזרח התיכון</span>
          </div>
        </header>

        <p className="about__lede about__lede--words">
          <Words delay={0.15} step={0.035} text="מאקרופוליטיקה מתייחסת אל המזרח התיכון כאל שדה של כוחות משיכה: לכל גוף משקל, לכל זוג גופים יחס, והמכלול — מערך מסלולים שניתן לקרוא. במקום כותרות, המפה מציעה מבנה." />
        </p>

        <div className="about__eq" aria-label="המשוואה">
          <span className="about__eq-term">יחסי הכוחות</span>
          <span className="about__eq-op">=</span>
          <span className="about__eq-term">הכוחות</span>
          <span className="about__eq-op">+</span>
          <span className="about__eq-term">היחסים</span>
        </div>

        <div className="about__cols">
          <div className="about__col">
            <span className="about__col-n">01</span>
            <h3>הכוחות</h3>
            <p>כוח המשיכה של כל גוף — שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי, בסולם 0–10 — קובע את גודלו במפה.</p>
          </div>
          <div className="about__col">
            <span className="about__col-n">02</span>
            <h3>היחסים</h3>
            <p>כל יחס נמתח בין שלושה קטבים — מתח, חיכוך והרמוניה — ומיקומו במשולש מגדיר את אופיו מול מדינת הייחוס.</p>
          </div>
          <div className="about__col">
            <span className="about__col-n">03</span>
            <h3>יחסי הכוחות</h3>
            <p>התמונה המלאה: גופים במסלולים סביב מרכזי כובד. המרחק, הטבעת והמסלול מבטאים תלות, חסות וזיקה.</p>
          </div>
        </div>

        <p className="about__honesty">
          ציוני הכוח מעוגנים כעת במדדים אמפיריים — תמ״ג (PPP, IMF) והוצאה ביטחונית
          (SIPRI) — וכל ציר נושא מקור. הציר הגאו-אסטרטגי, היציבות והיחסים נותרים
          שיפוט פרשני מנומק, ומסומנים ככאלה. המשקלים ניתנים לערעור — הזיזו אותם.
        </p>

        <footer className="about__foot">
          <span>מאקרופוליטיקה · מודל 0.9</span>
          <span>ESC לסגירה</span>
        </footer>
      </aside>
    </div>
  )
}
