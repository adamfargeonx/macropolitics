import { Words } from './Words'
import { InfoDisclosure } from './InfoDisclosure'
import { LetterSwap } from './PanelMotion'
import { ParticleCursor } from './ParticleCursor'
import { useFocusTrap } from './useFocusTrap'
import { useOverlay } from './useOverlay'

// "המודל" — the methodology, as a full-bleed takeover rather than a dialog box.
//
// It used to be a centred card on a dimmed scrim: the same treatment as the legend and the
// evidence sheet, i.e. the site saying "here is a secondary note". But this screen is the site's
// argument — the one place that states what the whole map means — and a card three columns wide
// framed it as a footnote. The takeover inverts the field to solid accent and gives the thesis
// the full width, so reading it is a place you go, not a panel you glance at.
//
// Structure, top to bottom in reading order: an eyebrow that names the screen, the thesis set at
// display scale, then the three lenses laid out AS THE EQUATION they actually form —
// הכוחות + היחסים = יחסי הכוחות — rather than as three equal sibling cards, which stated the
// third was a peer of the other two when it is their sum.
// Exit runs the SAME duration as the entrance slide (aboutSlideIn, chrome.css) so leaving reads
// as the same move in reverse rather than a quick cut — the default OVERLAY_EXIT_MS (280ms) is
// tuned for the small card overlays, not a full-viewport takeover.
const ABOUT_EXIT_MS = 860

export function AboutOverlay() {
  const { open, closing, close } = useOverlay('mp-about', ABOUT_EXIT_MS)
  const dialogRef = useFocusTrap<HTMLElement>(open && !closing)

  if (!open) return null

  return (
    <div className={`legend__scrim legend__scrim--takeover${closing ? ' is-closing' : ''}`} onClick={close}>
      <aside
        ref={dialogRef}
        className="about about--takeover"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="המודל"
        inert={closing}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sits under the content (z-index in chrome.css) so the trail never draws over type. */}
        <ParticleCursor className="about__particles" />

        <button className="panel__close about__close" onClick={close} aria-label="סגירה">✕</button>

        {/* Pinned at the panel's own top edge, opposite the close button — a permanent eyebrow
            label for the screen, not part of the vertically-centred content block below it (which
            is why it sits OUTSIDE .about__inner rather than stacked above the title inside it). */}
        <span className="about__sub">תורת היחסות של המזרח התיכון</span>

        <div className="about__inner">
          <header className="about__head">
            <h2 className="about__title"><LetterSwap text="המודל" /></h2>
          </header>

          {/* The thesis, at display scale — this is the screen's reason to exist, so it is set
              as the headline rather than as a lede paragraph beside a title. */}
          <p className="about__thesis">
            <Words delay={0.55} step={0.045} text="מאקרופוליטיקה מתייחסת אל המזרח התיכון כאל שדה של כוחות משיכה: לכל גוף משקל, לכל זוג גופים יחס, והמכלול — מערך מסלולים שניתן לקרוא." />
          </p>

          {/* The equation. The operators are real elements, not decoration: they carry the claim
              that the third lens is derived from the first two. Marked aria-hidden because
              "plus" and "equals" read as noise to a screen reader walking three headed
              sections — the headings already carry the structure. */}
          <div className="about__eq">
            <section className="about__lens">
              <span className="about__lens-n">01</span>
              <h3>הכוחות</h3>
              <p><Words delay={1.15} text="כוח המשיכה של כל גוף — שקלול של כוח כלכלי, צבאי וגאו-אסטרטגי, בסולם 0–10 — קובע את גודלו במפה." /></p>
            </section>

            <span className="about__op" aria-hidden="true">+</span>

            <section className="about__lens">
              <span className="about__lens-n">02</span>
              <h3>היחסים</h3>
              <p><Words delay={1.45} text="כל יחס נמתח בין שלושה קטבים — מתח, חיכוך והרמוניה — ומיקומו במשולש מגדיר את אופיו מול מדינת הייחוס." /></p>
            </section>

            <span className="about__op" aria-hidden="true">=</span>

            <section className="about__lens about__lens--sum">
              <span className="about__lens-n">03</span>
              <h3>יחסי הכוחות</h3>
              <p><Words delay={1.75} text="התמונה המלאה: גופים במסלולים סביב מרכזי כובד. המרחק, הטבעת והמסלול מבטאים תלות, חסות וזיקה." /></p>
            </section>
          </div>

          <div className="about__honesty">
            <InfoDisclosure text="חלקן אמפירי ומתועד, השאר שיפוט פרשני מנומק — הכול ניתן לערעור, והמשקלים פתוחים להזזה." />
          </div>
        </div>
      </aside>
    </div>
  )
}
