import type { View } from './Chrome'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// The visual-language key. Opens on the ⓘ control (which dispatches 'mp-legend').
// Self-contained: owns its open state, listens for the global event, closes on ESC / backdrop.
const VIEW_HINT: Record<View, string | null> = {
  home: null,
  dynamics: 'המסלול והמרחק מן המרכז מבטאים את אופי היחסים והקרבה. גררו להזזה, גלגלו לשינוי מרחק, לחצו על גוף לפרטיו. בתצוגת "שדה כוח" עומק הבאר באריג המרחב הוא כוח המשיכה.',
  forces: 'המרחק מן המרכז הוא דירוג כוח המשיכה — ככל שגוף קרוב יותר למרכז, כוח משיכתו רב יותר.',
  relations: 'המיקום במשולש מבטא את אופי הקשר — מתח, חיכוך או הרמוניה. לחיצה על גוף קובעת את נקודת הייחוס.',
}

export function Legend({ view }: { view: View }) {
  const { open, closing, close } = useOverlay('mp-legend')
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null
  const hint = VIEW_HINT[view]
  // size (body radius = gravitational pull) and the state/non-state fill distinction are both
  // artifacts of the orbital engine (engine.ts's VISUALS.nonStateHollow) that Forces and Dynamics
  // share — Relations lays bodies out by triangle position (tension/friction/harmony) and always
  // renders a filled disk (see .rnode__disk in views.css), so neither row applies there. Bloc rim
  // colour is the one encoding that carries over unchanged (RelationsView still colours by AXIS_RIM).
  const showOrbitRows = view === 'forces' || view === 'dynamics'

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="legend" dir="rtl" role="dialog" aria-modal="true" aria-label="מקרא" inert={closing} onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>
        <header className="legend__head">
          <h2 className="legend__title">מקרא</h2>
          <span className="legend__sub">השפה החזותית של המפה</span>
        </header>

        <div className="legend__rows">
          {showOrbitRows && (
            <div className="legend__row">
              <span className="legend__swatch legend__sizeramp"><i /><i /><i /></span>
              <span className="legend__txt"><b>גודל</b> = כוח משיכה</span>
            </div>
          )}

          {/* each graphic paired directly with its own short (2-3 word) label, instead of one
              long sentence describing both — a state disk and a non-state ring are two distinct
              graphics, so they get two distinct pairs. */}
          {showOrbitRows && (
            <div className="legend__group">
              <div className="legend__pair">
                <span className="legend__swatch legend__swatch--pair"><i className="legend__disk legend__disk--full" /></span>
                <span className="legend__txt"><b>מלא</b> = מדינה</span>
              </div>
              <div className="legend__pair">
                <span className="legend__swatch legend__swatch--pair"><i className="legend__disk legend__disk--hollow" /></span>
                <span className="legend__txt"><b>חלולה</b> = לא-מדינתי</span>
              </div>
            </div>
          )}

          <div className="legend__group">
            <div className="legend__pair">
              <span className="legend__swatch legend__swatch--pair"><i className="legend__rim" style={{ borderColor: 'rgba(132,160,196,0.95)' }} /></span>
              <span className="legend__txt"><b>כחול</b> = מערב</span>
            </div>
            <div className="legend__pair">
              <span className="legend__swatch legend__swatch--pair"><i className="legend__rim" style={{ borderColor: 'rgba(198,134,98,0.95)' }} /></span>
              <span className="legend__txt"><b>חום</b> = מזרח</span>
            </div>
            <div className="legend__pair">
              <span className="legend__swatch legend__swatch--pair"><i className="legend__rim" style={{ borderColor: 'rgba(150,150,150,0.7)' }} /></span>
              <span className="legend__txt"><b>אפור</b> = ניטרלי</span>
            </div>
          </div>
        </div>

        {hint && <p className="legend__hint">{hint}</p>}
      </aside>
    </div>
  )
}
