import { Icon } from './Icon'
import { Hint } from './Hint'

// Shared disclaimer affordance — a small asterisk mark that reveals its caveat sentence on HOVER,
// as a floating tooltip. It deliberately does NOT expand in-flow: growing the panel to fit a
// footnote pushed the whole modal taller for a line most readers never need.
//
// Delegates entirely to <Hint>, which renders in the browser's top layer — so unlike an in-flow
// reveal it costs the panel no height, and unlike the old ::after tooltips it can't be clipped by
// the overflow-scroll panel it lives in.
export function InfoDisclosure({ text, label = 'מידע נוסף' }: { text: string; label?: string }) {
  return (
    <Hint text={text} className="info-disclosure__btn">
      <Icon name="disclaimer" className="info-disclosure__icon" />
      <span className="u-sr-only">{label}</span>
    </Hint>
  )
}
