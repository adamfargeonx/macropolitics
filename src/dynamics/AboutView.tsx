import { Words } from './Words'
import { InfoDisclosure } from './InfoDisclosure'
import { LetterSwap } from './PanelMotion'
import { Icon } from './Icon'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// "המודל" — the methodology overlay. The site's thesis, the equation, how each lens
// reads, and an honesty note about the data. Opens on the header control ('mp-about').
//
// Rebuilt from a 3-equal-cards grid to a layout that agrees with its own content: יחסי הכוחות
// (dynamics) is not a peer of הכוחות/היחסים, it's their SUM — Chrome.tsx's tab-bar comment states
// the equation outright (יחסי הכוחות = הכוחות + היחסים), and this overlay's own header comment
// always said it should hold "the equation," which had quietly gone missing. Forces/Relations
// now sit side by side, Dynamics spans beneath them, and the equation sits in the seam between —
// the composition makes the argument instead of three identical boxes denying it.
export function AboutOverlay() {
  const { open, closing, close } = useOverlay('mp-about')
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null

  return (
    <div className={`legend__scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside ref={dialogRef} className="about" dir="rtl" role="dialog" aria-modal="true" aria-label="המודל" inert={closing} onClick={(e) => e.stopPropagation()}>
        <button className="panel__close" onClick={close} aria-label="סגירה">✕</button>

        {/* A persistent rail at the RTL start (right), not a header row — the title, subtitle and
            the honesty trigger anchor the overlay while the argument scrolls beside them. Moving
            the disclosure UP from a footer slot is deliberate too: "some of this is measured, the
            rest is reasoned judgment" is a caveat about the METHOD, so it belongs beside the
            method's own name, not parked under three cards it never specifically applied to. */}
        <div className="about__rail">
          <span className="about__spine" aria-hidden="true" />
          <h2 className="about__title"><LetterSwap text="המודל" delay={0.10} /></h2>
          <span className="about__sub" style={{ animationDelay: '0.30s' }}>תורת היחסות של המזרח התיכון</span>
          <div className="about__rail-honesty" style={{ animationDelay: '0.55s' }}>
            <InfoDisclosure text="חלקן אמפירי ומתועד, השאר שיפוט פרשני מנומק — הכול ניתן לערעור, והמשקלים פתוחים להזזה." />
          </div>
        </div>

        <div className="about__body">
          {/* The thesis, promoted from a 13px caption indistinguishable from the lens paragraphs
              below it to a real title — this is the thesis of the entire site, not a footnote to
              it. --tracking-title-loose (base.css) is exactly the token this role exists for:
              "REGULAR/LIGHT-weight titles." */}
          <p className="about__lede">
            <Words delay={0.30} step={0.035} text="מאקרופוליטיקה מתייחסת אל המזרח התיכון כאל שדה של כוחות משיכה: לכל גוף משקל, לכל זוג גופים יחס, והמכלול — מערך מסלולים שניתן לקרוא. במקום כותרות, המפה מציעה מבנה." />
          </p>

          <div className="about__lenses">
            {/* nav-forces / nav-relations / nav-dynamics — the SAME three glyphs the footer tab
                bar uses for these exact three views (Icon.tsx's own comment already states the
                algebra: "forces + relations composed into one figure, matching the site's own
                equation"). Reusing them here is the one addition that costs nothing new and ties
                this overlay to navigation the reader has already seen, instead of inventing a
                fourth, overlay-only icon language. */}
            <div className="about__lens" style={{ animationDelay: '0.95s' }}>
              <Icon name="nav-forces" className="about__lens-icon" />
              <h3>הכוחות</h3>
              <p><Words delay={1.10} text="כוח המשיכה של כל גוף — שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי, בסולם 0–10 — קובע את גודלו במפה." /></p>
            </div>
            <div className="about__lens" style={{ animationDelay: '1.25s' }}>
              <Icon name="nav-relations" className="about__lens-icon" />
              <h3>היחסים</h3>
              <p><Words delay={1.40} text="כל יחס נמתח בין שלושה קטבים — מתח, חיכוך והרמוניה — ומיקומו במשולש מגדיר את אופיו מול מדינת הייחוס." /></p>
            </div>
          </div>

          {/* The equation itself, restored — it was named in this file's own header comment and
              never actually shown. Only the operators carry the accent; the three phrases stay
              muted, so the eye reads "these two combine into that one" rather than three more
              yellow headings competing with the lens names above. */}
          <p className="about__equation" style={{ animationDelay: '1.60s' }}>
            יחסי הכוחות <span className="about__eq-op">=</span> הכוחות <span className="about__eq-op">+</span> היחסים
          </p>

          <div className="about__lens about__lens--wide" style={{ animationDelay: '1.90s' }}>
            <Icon name="nav-dynamics" className="about__lens-icon" />
            <h3>יחסי הכוחות</h3>
            <p><Words delay={2.05} text="התמונה המלאה: גופים במסלולים סביב מרכזי כובד. המרחק, הטבעת והמסלול מבטאים תלות, חסות וזיקה." /></p>
          </div>
        </div>
      </aside>
    </div>
  )
}
