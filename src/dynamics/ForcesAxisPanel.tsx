import { useEffect, useState } from 'react'
import { DATA } from '../data/empirical'
import { POWER_NOTES } from '../data/entities'
import { FORCES_DESCRIPTIONS } from '../data/forces-descriptions'
import { Icon } from './Icon'
import { Hint } from './Hint'
import { CountUp, Gauge } from './PanelMotion'
import { Words } from './Words'
import { AXIS_BEAT } from './panel-beats'
import { Trend } from './EvidenceTrend'
import {
  HE_AXIS, AXIS_ROWS, AXIS_MISS, UNMODELED, SPINE_KEYS, GROUP_NOTE,
  STATUS_LABEL, STATUS_GLYPH, paramStatus, axisBreakdown, axisSpine, scoreTier, type Axis,
} from './evidence-data'

// ── The axis drill-down — the panel's THIRD content state ─────────────────────────────────────
// Reached by clicking an eco/mil/geo value row in the score view; returns via the same
// "בחזרה לציון" button vocabulary the full-narrative mode already uses. Lives INSIDE the
// persistent panel shell (see ForcesPanelFrame) rather than in a modal, so the field stays
// visible and lit behind it — the map is the argument on this site, and covering it with a scrim
// to explain one number is backwards.
//
// STRICT hierarchy, in the order the eye needs it:
//   1. the graph    — a composition bar: how much of this score is structural vs. adjustment
//   2. the criteria — every sub-criterion as a labelled bar + value, grouped spine/adjustment,
//                     PLUS every criterion from the original rubric that isn't scored at all —
//                     shown as its own row with an empty/dashed bar, not folded into a count.
//                     The reasoning (operator's own): the user should see the full rubric that
//                     COULD inform the score, even the parts that don't, not just the parts that
//                     happened to have data — an honest "here's everything, here's what's used"
//                     rather than a tidied-up "here's what's used" with a footnote for the rest.
//   3. everything else — provenance, the figure, the caveat — FOLDED.
// Nothing that is a genuine footnote gets a row of its own; the unscored rubric isn't a footnote.

// One segment of the composition bar. Mounts at zero width and steps to its real value on the next
// frame so the CSS transition has a "before" to move from — the same trick Gauge uses, inlined here
// because the segments must be bare flex children of the track, not Gauge's wrapper+inner pair.
// Without this the hero graph was the ONE bar in the panel that snapped straight to full width
// while every smaller bar beneath it grew — exactly backwards.
function Seg({ className, pct, delay }: { className: string; pct: number; delay: number }) {
  // reduced motion is read ONCE into state and short-circuits the mount-at-zero entirely — the
  // same contract Gauge and CountUp keep. Relying on the stylesheet's `transition: none` alone
  // would still paint one frame at zero width before the rAF landed: a flash, not a reveal.
  const [reduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (reduced) return
    const raf = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(raf)
  }, [pct, reduced])
  return <i className={className} style={{ width: `${reduced ? pct : w}%`, transitionDelay: `${delay}s` }} />
}

// One criterion — status glyph, label, tweening bar, value. The bar reuses Gauge so it grows into
// place on the panel's own beat, like every other bar in the panel, instead of snapping in.
function Row({ axis, k, he, sub, missing, delay }: { axis: Axis; k: string; he: string; sub: Record<string, number>; missing: string[]; delay: number }) {
  const has = k in sub
  const v = sub[k] ?? 0
  const miss = AXIS_MISS[axis](k, missing)
  const status = paramStatus(axis, miss)
  return (
    <div className={`axp__row${miss || !has ? ' axp__row--miss' : ''}`} style={{ animationDelay: `${delay}s` }}>
      <span className={`axp__status axp__status--${status}`} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]}>{STATUS_GLYPH[status]}</span>
      <span className="axp__k">{he}</span>
      <Gauge className="axp__bar" value={has ? v * 10 : 0} delay={delay} />
      <span className="axp__v">{has ? v.toFixed(1) : '—'}</span>
    </div>
  )
}

// A criterion the model deliberately does NOT score — no key into `sub`, no value, so it's a
// distinct small component rather than a branch inside Row. The dashed, unfilled track (not a
// bar sitting at 0%) is the visual distinction that matters: 0% would read as "measured, scored
// zero"; dashed-empty reads as "not measured at all" — the same language the old modal's
// unmodeled rows used, carried forward rather than reinvented.
function UnmodeledRow({ he, delay }: { he: string; delay: number }) {
  return (
    <div className="axp__row axp__row--unmodeled" style={{ animationDelay: `${delay}s` }}>
      <span className="axp__status axp__status--unmodeled" title="לא נמדד" aria-label="לא נמדד">·</span>
      <span className="axp__k">{he}</span>
      <span className="axp__bar axp__bar--unmodeled" aria-hidden />
      <span className="axp__v">—</span>
    </div>
  )
}

// A criteria group. Its label row carries a "קרא עוד" that stays invisible until the group is
// hovered or focused — the note is a disclaimer, so it costs no space until it's wanted.
function Group({ title, note, delay, children }: { title: string; note: string; delay: number; children: React.ReactNode }) {
  return (
    <section className="axp__group">
      <div className="axp__group-head" style={{ animationDelay: `${delay}s` }}>
        <span className="axp__group-title">{title}</span>
        <Hint text={note} className="axp__more">קרא עוד</Hint>
      </div>
      {children}
    </section>
  )
}

export function ForcesAxisPanel({ id, axis, onBack }: { id: string; axis: Axis; onBack: () => void }) {
  const [srcOpen, setSrcOpen] = useState(false)
  const d = DATA[id]
  const breakdown = axisBreakdown(id, axis)
  // guarded upstream (the row is only clickable when hasAxisEvidence is true), but a body whose
  // data changes underneath an open panel must not render an empty shell.
  if (!d || !breakdown) return null

  const sub = breakdown.sub as unknown as Record<string, number>
  const missing = breakdown.missing
  const finalV = d.axes[axis]
  const spine = axisSpine(id, axis)
  const delta = spine != null ? Math.round((finalV - spine) * 10) / 10 : 0
  const pct = (n: number) => Math.max(0, Math.min(100, (n / 10) * 100))

  // The bar is a flex row of segments, NOT absolutely-positioned offsets — flex lays out from the
  // inline-start edge on its own, so the whole thing is RTL-correct without a single directional
  // offset to get wrong. Invariant in BOTH directions: the LIT extent always equals the final
  // score. A positive adjustment is a brighter segment extending the spine to the score; a
  // negative one is a hatched segment PAST the score, showing the reach the spine had before
  // fiscal health took it back. Drawing a negative delta as extra length would make a punished
  // score look longer than it is.
  const litBase = delta >= 0 ? pct(spine ?? finalV) : pct(finalV)
  const tail = spine != null ? Math.abs(pct(finalV) - pct(spine)) : 0

  const rows = AXIS_ROWS[axis]
  const isSpine = (k: string) => (SPINE_KEYS[axis] as readonly string[]).includes(k)
  const spineRows = rows.filter((r) => isSpine(r.k))
  const bonusRows = rows.filter((r) => !isSpine(r.k))
  const unmodeled = UNMODELED[axis]
  const p = d.prov[axis]
  const bonusDelay = AXIS_BEAT.groups + AXIS_BEAT.groupStep + spineRows.length * AXIS_BEAT.rowStep
  // third group — every rubric criterion the model does NOT score, as its own row (empty/dashed
  // bar), not folded into a count. Own beat off the group header, same (i+1) idiom spine uses —
  // NOT bonus's row-count-derived offset, which was tuned specifically for bonus's own shape.
  const unmodeledHeaderDelay = AXIS_BEAT.groups + AXIS_BEAT.groupStep * 2
  const unmodeledRowDelay = (i: number) => unmodeledHeaderDelay + (i + 1) * AXIS_BEAT.rowStep
  // the footer must land AFTER every row above it, whatever the row count — a fixed beat would
  // have it appear mid-cascade on mil (7 unmodeled rows run well past the static AXIS_BEAT.foot).
  const lastRowDelay = unmodeled.length > 0
    ? unmodeledRowDelay(unmodeled.length - 1)
    : bonusDelay + Math.max(0, bonusRows.length - 1) * AXIS_BEAT.rowStep
  const footDelay = Math.max(AXIS_BEAT.foot, lastRowDelay + AXIS_BEAT.rowStep)

  // Country-specific analytical read for this axis — the same interpretation layer the old
  // "תיאור מלא" full-narrative mode showed, now living where it's actually about something (this
  // axis's own criteria) instead of a separate destination. Falls back to the shorter POWER_NOTES
  // summary where the long-form description is absent, exactly as that old mode did.
  const analysis = FORCES_DESCRIPTIONS[id]?.[axis] ?? POWER_NOTES[id]?.[axis]

  return (
    <div className="axp">
      <button className="axp__back" onClick={onBack} aria-label="בחזרה לציון" style={{ animationDelay: `${AXIS_BEAT.back}s` }}>
        בחזרה לציון <Icon name="arrow-back" className="axp__back-arrow" />
      </button>

      <div className="axp__head" style={{ animationDelay: `${AXIS_BEAT.head}s` }}>
        <span className="axp__axis">{HE_AXIS[axis]}</span>
        <span className={`tier-tag tier-tag--${scoreTier(finalV).slug}`}>{scoreTier(finalV).he}</span>
        <span className="axp__score"><b><CountUp value={finalV} delay={AXIS_BEAT.head} /></b><i>/ 10</i></span>
      </div>

      {/* The analytical read belongs with the identity above it — axis, tier, score, THEN "why" —
          not with the evidence block below, which is a separate concern (how the score is built,
          not what it means). Lives outside .axp__body so it stays top-anchored with .axp__head
          instead of getting pulled into the body's bottom-alignment. */}
      {analysis && <p className="axp__analysis" style={{ animationDelay: `${AXIS_BEAT.analysis}s` }}><Words key={`${id}-${axis}`} text={analysis} /></p>}

      {/* Everything else — the graph, the criteria, the sources — groups as ONE unit and
          bottom-aligns within the panel (see .axp__body's margin-top:auto). On a body whose
          content doesn't fill the panel's fixed height, this used to just leave dead space below
          the footer; now that space sits ABOVE this block instead, so the evidence stays anchored
          to the bottom — a real gap between "what this is" (head + analysis, top) and "what backs
          it up" (graph + criteria + sources, bottom), not an accident of how much content a given
          body happens to have. */}
      <div className="axp__body">
        <div className="axp__comp" style={{ animationDelay: `${AXIS_BEAT.bar}s` }}>
          <span className="axp__comp-track">
            <Seg className="axp__comp-spine" pct={litBase} delay={AXIS_BEAT.bar} />
            {tail > 0 && <Seg className={`axp__comp-${delta > 0 ? 'bonus' : 'retract'}`} pct={tail} delay={AXIS_BEAT.bar + 0.12} />}
          </span>
          {spine != null && delta !== 0 && (
            <p className="axp__comp-legend">
              <span>עמוד שדרה <b>{spine.toFixed(1)}</b></span>
              <span className={`axp__delta axp__delta--${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>
            </p>
          )}
        </div>

        <Group title="עמוד השדרה" note={GROUP_NOTE[axis].spine} delay={AXIS_BEAT.groups}>
          {spineRows.map(({ k, he }, i) => (
            <Row key={k} axis={axis} k={k} he={he} sub={sub} missing={missing} delay={AXIS_BEAT.groups + (i + 1) * AXIS_BEAT.rowStep} />
          ))}
        </Group>

        <Group title="התאמות" note={GROUP_NOTE[axis].bonus} delay={AXIS_BEAT.groups + AXIS_BEAT.groupStep}>
          {bonusRows.map(({ k, he }, i) => (
            <Row key={k} axis={axis} k={k} he={he} sub={sub} missing={missing} delay={bonusDelay + i * AXIS_BEAT.rowStep} />
          ))}
        </Group>

        {/* every criterion the original rubric names but this model does NOT score, as a real row —
            the reasoning (operator's own): the full rubric should be visible even where it isn't
            calculated into the value, not summarised away into a count the reader has to hover to
            unpack. eco has none, so this group simply doesn't render there. */}
        {unmodeled.length > 0 && (
          <Group title="לא נמדד" note={GROUP_NOTE[axis].unmodeled ?? ''} delay={unmodeledHeaderDelay}>
            {unmodeled.map((he, i) => (
              <UnmodeledRow key={he} he={he} delay={unmodeledRowDelay(i)} />
            ))}
          </Group>
        )}

        {/* Provenance — folded behind one disclosure. The status verdict survives the fold (the
            evidence-honesty gate: a verdict this panel is built around must never sit fully behind
            a click); the trend cells, the raw figure and the citation are one click away. */}
        <footer className={`axp__foot${srcOpen ? ' is-open' : ''}`} style={{ animationDelay: `${footDelay}s` }}>
          <button
            type="button" className="axp__foot-btn" aria-expanded={srcOpen} aria-controls="axp-src-drawer"
            onClick={() => setSrcOpen((v) => !v)}
          >
            <span className={`evid__tag evid__tag--${p.status}`}>{STATUS_LABEL[p.status]}</span>
            <span className="axp__foot-lbl">מקורות ונתונים</span>
            <span className="axp__caret" aria-hidden />
          </button>
          <div className="axp__foot-drawer" id="axp-src-drawer">
            <div className="axp__foot-drawer-in">
              <div className="axp__foot-drawer-body" inert={!srcOpen}>
                <Trend id={id} axis={axis} />
                <p className="axp__prov">
                  <Hint text={p.note ? `${p.figure} — ${p.note}` : p.figure}>
                    <span className="evid__tag evid__tag--figure">הנתון</span>
                  </Hint>
                  <a className="axp__src" href={p.url} target="_blank" rel="noreferrer"><bdi>{p.source} · {p.year}</bdi> ↗</a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
