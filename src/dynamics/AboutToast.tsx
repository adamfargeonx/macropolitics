import { useEffect, useState } from 'react'

// A brief top-left intro that appears once per session after the loader settles, explains
// the project in a sentence, then dismisses itself. A soft on-ramp — not a blocking modal.
const SEEN_KEY = 'mp-toast-seen'
const SHOW_AT = 5200 // after the loader fade
const LIFETIME = 9000

export function AboutToast() {
  const [show, setShow] = useState(false)
  const [out, setOut] = useState(false)

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1' } catch { /* private mode */ }
    if (seen) return
    const mark = () => { try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ } }
    const t1 = window.setTimeout(() => setShow(true), SHOW_AT)
    const t2 = window.setTimeout(() => setOut(true), SHOW_AT + LIFETIME)
    const t3 = window.setTimeout(() => { setShow(false); mark() }, SHOW_AT + LIFETIME + 600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (!show) return null
  const close = () => {
    setOut(true)
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ }
    window.setTimeout(() => setShow(false), 420)
  }

  return (
    <div className={`abtoast${out ? ' abtoast--out' : ''}`} dir="rtl" role="status">
      <span className="abtoast__bar" />
      <div className="abtoast__body">
        <span className="abtoast__title">מה זה?</span>
        <p className="abtoast__text">
          מאקרופוליטיקה ממפה את המזרח התיכון כשדה של כוחות משיכה — לכל גוף משקל, לכל זוג יחס.
          בחרו עדשה: הכוחות, היחסים, או יחסי הכוחות.
        </p>
        <button className="abtoast__more" onClick={() => { window.dispatchEvent(new Event('mp-about')); close() }}>
          למודל המלא ←
        </button>
      </div>
      <button className="abtoast__close" onClick={close} aria-label="סגירה">✕</button>
    </div>
  )
}
