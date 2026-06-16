import type { View } from './Chrome'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// The visual-language key. Opens on the ⓘ control (which dispatches 'mp-legend').
// Self-contained: owns its open state, listens for the global event, closes on ESC / backdrop.
const VIEW_HINT: Record<View, string | null> = {
  home: null,
  dynamics: 'המסלול והמרחק מן המרכז מבטאים את אופי היחסים והקרבה. גררו להזזה, גלגלו לשינוי מרחק, לחצו על גוף לפרטיו.',
  forces: 'המרחק מן המרכז הוא דירוג כוח המשיכה — ככל שגוף קרוב יותר למרכז, כוח משיכתו רב יותר.',
  relations: 'המיקום במשולש מבטא את אופי הקשר — מתח, חיכוך או הרמוניה. לחיצה על גוף קובעת את נקודת הייחוס.',
  well: 'שדה כוח: כל גוף שוקע באריג המרחב יחסית לכוח המשיכה שלו — ככל שהבאר עמוקה ורחבה יותר, כך הגוף כבד יותר. רחפו מעל גוף להעמקה.',
}

export function Legend({ view }: { view: View }) {
  const { open, closing, close } = useOverlay('mp-legend')
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null
  const hint = VIEW_HINT[view]

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="legend" dir="rtl" role="dialog" aria-modal="true" aria-label="מקרא" onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>
        <header className="legend__head">
          <h2 className="legend__title">מקרא</h2>
          <span className="legend__sub">השפה החזותית של המפה</span>
        </header>

        <div className="legend__rows">
          <div className="legend__row">
            <span className="legend__swatch legend__sizeramp"><i /><i /><i /></span>
            <span className="legend__txt"><b>גודל</b> — כוח משיכה: שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי.</span>
          </div>

          <div className="legend__row">
            <span className="legend__swatch"><i className="legend__disk legend__disk--full" /><i className="legend__disk legend__disk--hollow" /></span>
            <span className="legend__txt">עיגול <b>מלא</b> — מדינה · טבעת <b>חלולה</b> — שחקן לא-מדינתי.</span>
          </div>

          <div className="legend__row">
            <span className="legend__swatch legend__rims">
              <i style={{ borderColor: 'rgba(132,160,196,0.95)' }} />
              <i style={{ borderColor: 'rgba(198,134,98,0.95)' }} />
              <i style={{ borderColor: 'rgba(150,150,150,0.7)' }} />
            </span>
            <span className="legend__txt">גוון המסגרת — שיוך: <b>כחול</b> מערב · <b>חום</b> מזרח · <b>אפור</b> ניטרלי.</span>
          </div>
        </div>

        {hint && <p className="legend__hint">{hint}</p>}
        <p className="legend__foot">ESC או לחיצה מחוץ לחלון לסגירה</p>
      </aside>
    </div>
  )
}
