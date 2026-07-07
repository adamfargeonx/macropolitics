import { Icon } from './Icon'
import { Words } from './Words'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// hardcoded — there's no CMS/backend behind this overlay, so "last updated" is a literal
// constant bumped by hand whenever the model or its data sources change meaningfully.
const LAST_UPDATED = '6.7.2026'

// "המודל" — the methodology overlay. The site's thesis, the equation, how each lens
// reads, and an honesty note about the data. Opens on the header control ('mp-about').
export function AboutOverlay() {
  const { open, closing, close } = useOverlay('mp-about')
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="about" dir="rtl" role="dialog" aria-modal="true" aria-label="המודל" inert={closing} onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>

        <header className="about__head">
          <span className="about__mark" aria-hidden><Icon name="model" className="about__mark-icon" /></span>
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
            <p><Words delay={0.05} text="כוח המשיכה של כל גוף — שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי, בסולם 0–10 — קובע את גודלו במפה." /></p>
          </div>
          <div className="about__col">
            <span className="about__col-n">02</span>
            <h3>היחסים</h3>
            <p><Words delay={0.05} text="כל יחס נמתח בין שלושה קטבים — מתח, חיכוך והרמוניה — ומיקומו במשולש מגדיר את אופיו מול מדינת הייחוס." /></p>
          </div>
          <div className="about__col">
            <span className="about__col-n">03</span>
            <h3>יחסי הכוחות</h3>
            <p><Words delay={0.05} text="התמונה המלאה: גופים במסלולים סביב מרכזי כובד. המרחק, הטבעת והמסלול מבטאים תלות, חסות וזיקה." /></p>
          </div>
        </div>

        <p className="about__honesty">
          <Words text="חלקן אמפירי ומתועד, השאר שיפוט פרשני מנומק — הכול ניתן לערעור, והמשקלים פתוחים להזזה." />
        </p>

        <footer className="about__foot">
          <span>מאקרופוליטיקה · מודל 0.9</span>
          <span>עודכן לאחרונה: {LAST_UPDATED}</span>
          <span className="about__credit">MADE BY ADAM FARGEON</span>
        </footer>
      </aside>
    </div>
  )
}
