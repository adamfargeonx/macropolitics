import { Words } from './Words'
import { InfoDisclosure } from './InfoDisclosure'
import { LetterSwap } from './PanelMotion'
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
      <aside ref={dialogRef} className="about" dir="rtl" role="dialog" aria-modal="true" aria-label="המודל" inert={closing} onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>

        {/* lede sits beside the title now (top-left corner, same row) instead of its own row
            below — saves a full row's height, so the modal contracts to match. entrance cascade,
            top→bottom: head 0s → lede .18s → cols .52/.58/.64s → honesty .78s. */}
        <header className="about__head">
          <div className="about__head-txt">
            {/* same swap primitive as every other panel title — mounts fresh each open (this
                overlay unmounts on close), so the "swap" plays as a one-shot entrance here. */}
            <h2 className="about__title"><LetterSwap text="המודל" /></h2>
            <span className="about__sub">תורת היחסות של המזרח התיכון</span>
          </div>
          <p className="about__lede about__lede--words">
            <Words delay={0.18} step={0.035} text="מאקרופוליטיקה מתייחסת אל המזרח התיכון כאל שדה של כוחות משיכה: לכל גוף משקל, לכל זוג גופים יחס, והמכלול — מערך מסלולים שניתן לקרוא. במקום כותרות, המפה מציעה מבנה." />
          </p>
        </header>

        <div className="about__cols">
          <div className="about__col">
            <span className="about__col-n">01</span>
            <h3>הכוחות</h3>
            <p><Words delay={0.52} text="כוח המשיכה של כל גוף — שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי, בסולם 0–10 — קובע את גודלו במפה." /></p>
          </div>
          <div className="about__col">
            <span className="about__col-n">02</span>
            <h3>היחסים</h3>
            <p><Words delay={0.58} text="כל יחס נמתח בין שלושה קטבים — מתח, חיכוך והרמוניה — ומיקומו במשולש מגדיר את אופיו מול מדינת הייחוס." /></p>
          </div>
          <div className="about__col">
            <span className="about__col-n">03</span>
            <h3>יחסי הכוחות</h3>
            <p><Words delay={0.64} text="התמונה המלאה: גופים במסלולים סביב מרכזי כובד. המרחק, הטבעת והמסלול מבטאים תלות, חסות וזיקה." /></p>
          </div>
        </div>

        <div className="about__honesty">
          <InfoDisclosure text="חלקן אמפירי ומתועד, השאר שיפוט פרשני מנומק — הכול ניתן לערעור, והמשקלים פתוחים להזזה." />
        </div>
      </aside>
    </div>
  )
}
