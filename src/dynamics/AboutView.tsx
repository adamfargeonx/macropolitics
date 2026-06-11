import { useEffect, useState } from 'react'
import { sound } from '../sound'
import { Words } from './Words'

// "המודל" — the methodology overlay. The site's thesis, the equation, how each lens
// reads, and an honesty note about the data. Opens on the header control ('mp-about').
export function AboutOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onToggle = () => { sound.play(open ? 'back' : 'open'); setOpen((v) => !v) }
    window.addEventListener('mp-about', onToggle)
    return () => window.removeEventListener('mp-about', onToggle)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { sound.play('back'); setOpen(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const close = () => { sound.play('back'); setOpen(false) }

  return (
    <div className="legend__scrim" onClick={close}>
      <aside className="about" dir="rtl" role="dialog" aria-label="המודל" onClick={(e) => e.stopPropagation()}>
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
          הציונים והיחסים בגרסה זו הם שיפוט פרשני מנומק — לא מדידה. חיבור למדדים
          אמפיריים (תמ״ג, הוצאה ביטחונית, בריתות) הוא השלב הבא של הפרויקט, וכל
          מספר יקבל מקור.
        </p>

        <footer className="about__foot">
          <span>מאקרופוליטיקה · מודל 0.9</span>
          <span>ESC לסגירה</span>
        </footer>
      </aside>
    </div>
  )
}
