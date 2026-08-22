// Static page chrome around the field: logo, side panel, right rail, bottom tabs.
// Co-located presentational components.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NODES, type PowerNotes } from '../data/entities'
import type { AxisProvenance } from '../data/empirical'
import { FORCES_DESCRIPTIONS } from '../data/forces-descriptions'
import { AUTHORED_RELATIONS, type AuthoredRelation } from '../data/relations'
import { sound } from '../sound'
import { Words } from './Words'
import { Icon, type IconName } from './Icon'
import { Hint } from './Hint'
import { LetterSwap, CountUp, Gauge } from './PanelMotion'
import { BEAT } from './panel-beats'

// Collapsible dock for the side panel. A clearly-labelled drawer tab (chevron + "מידע")
// at the right edge slides the panel in/out. The tab is pinned (no jitter); hovering it
// while collapsed peeks the panel as a preview.
//
// Portals into #panel-root (a sibling of .nav-rail in App.tsx) rather than rendering inline —
// .nav-rail is what gets scaled/blurred by the page-transition (zoom-up/bloom/collapse/mask),
// and the panel must NOT ride along with that; it's a foreground layer that animates in/out on
// its own (slide + fade), independent of whichever page transition is happening behind it.
// House rule: the side panel enters only AFTER the screen's own entrance animation has finished,
// then waits one more beat — the two must never animate at the same time. The orbital canvas runs
// its intro to t=4.0s (engine.ts's `intro = clamp01(t / 4.0)`), so that's the canvas default.
// DOM-based views (Relations) settle far sooner and pass their own, shorter `enterAfter`.
const CANVAS_ENTRANCE_MS = 4000
const PANEL_BEAT_MS = 1000
export const PANEL_ENTER_MS = CANVAS_ENTRANCE_MS + PANEL_BEAT_MS

export function PanelDock({ children, forceOpen, forceClosed, onHandleClick, enterAfter = PANEL_ENTER_MS }: { children: ReactNode; forceOpen?: boolean; forceClosed?: boolean; onHandleClick?: () => void; enterAfter?: number }) {
  // mounts closed, then slides in once the screen's entrance has fully landed (see above) — the
  // panel arriving a clear beat later reads as a considered reveal, not a competing animation.
  const [open, setOpen] = useState(false)
  // the portal target may not exist yet on the very first render (App.tsx renders it as a
  // sibling) — fall back to an inline render for that one frame, then re-parent once mounted.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  /* eslint-disable react-hooks/set-state-in-effect -- portal-target discovery: #panel-root is a
     DOM sibling rendered by App.tsx and isn't guaranteed to exist in the real DOM until after this
     component's own first commit, so finding it necessarily happens a render late. */
  useEffect(() => { setRoot(document.getElementById('panel-root')) }, [])
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), enterAfter)
    return () => window.clearTimeout(t)
  }, [enterAfter])
  // mobile map/list toggle drives the sheet: forceClosed (map, nothing selected) keeps the field
  // full-screen; forceOpen (list, or a body selected) pins it open. Desktop passes neither.
  const isOpen = forceClosed ? false : (forceOpen || open)
  const node = (
    <div className={`pdock${isOpen ? ' pdock--open' : ' pdock--closed'}`}>
      <div className="pdock__panel">
        {children}
        {/* The grip lives INSIDE the panel and rides its transform, so it reads as the panel's own
            pinched edge rather than a tab pinned to the viewport that the panel slides away from.
            It sits just outside the panel's inward edge (right:100%), which keeps it on-screen in
            both states — the panel parks at translateX(100%) when closed, leaving the grip visible.
            No "מידע" label: a control should afford its action by shape and motion, not narrate it;
            the chevron alone says which way it moves. */}
        <button
          className="pdock__handle"
          onClick={() => { sound.play('tab'); if (onHandleClick) onHandleClick(); else setOpen((o) => !o) }}
          aria-label={isOpen ? 'הסתרת לוח המידע' : 'הצגת לוח המידע'}
          aria-expanded={isOpen}
        >
          <svg className="pdock__chev" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="9 5 16 12 9 19" />
          </svg>
        </button>
      </div>
    </div>
  )
  return root ? createPortal(node, root) : node
}

export function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="hdr">
      {/* a mini of the home orbit, before the wordmark — a portal back to the homepage */}
      <button
        className="hdr__logo"
        onClick={onHome}
        aria-label="דף הבית"
        title="חזרה לדף הבית"
        onMouseEnter={() => window.dispatchEvent(new Event('mp-freeze'))}
        onMouseLeave={() => window.dispatchEvent(new Event('mp-unfreeze'))}
      >
        <span className="hdr__orbit" aria-hidden><span className="hdr__orbit-spin"><i className="hdr__orbit-dot" /></span></span>
        <span className="hdr__wm">מאקרופוליטיקה</span>
        {/* the thesis tagline — hidden until logo hover, then it "writes" itself in to the logo's
            inline-start (visually left, RTL) via a right-to-left clip wipe. Absolutely positioned
            so it never pushes the wordmark. */}
        <span className="hdr__tagline" aria-hidden>תורת היחסות של המזרח התיכון</span>
      </button>
    </header>
  )
}

// Utility cluster — top-left. "המודל" (the methodology, made prominent) + a crisp info
// icon (the legend). Both dispatch the global overlay events. Hidden on the closed home.
export function UtilityNav() {
  return (
    <div className="unav" dir="rtl">
      <button className="unav__model" onClick={() => window.dispatchEvent(new Event('mp-about'))} title="המודל — המתודולוגיה">
        <Icon name="model" className="unav__icon" />המודל
      </button>
    </div>
  )
}

export interface EntityDetail {
  id?: string // forces view: lets the evidence overlay look up sources + the calculation
  he: string; power: number; tier: string; dispo: string
  axisLabel: string; parentHe: string | null; relations: { id: string; he: string }[]
  satellites?: { id: string; he: string }[] // dynamics: bodies that orbit THIS one (orbital children)
  scoreLabel?: string // forces view: "6.6 / 10" instead of "/100"
  forces?: { eco: number; mil: number; geo: number }
  powerNotes?: PowerNotes // forces view: four short paragraphs (general + components)
  rank?: number; total?: number // forces view: rank in the gravity index
  backing?: { amount: number; patronHe: string } | null // forces: borrowed weight from a patron
  prov?: { eco: AxisProvenance; mil: AxisProvenance; geo: AxisProvenance } // per-axis provenance
  flags?: string[] // prominent data-quality caveats (only when genuinely half-baked)
  components?: { base: number; intrinsic: number; backing: number; gravity: number; stability: number } // for the methodology drill-down
}

// The evidence link — opens the sources/calculation overlay. A subtle on-brand text link
// (not a grey box), consistent with the panel's accent language.
function EvidenceLink({ detail }: { detail: EntityDetail }) {
  if (!detail.id) return null
  return (
    <button
      className="fevidence"
      onClick={() => window.dispatchEvent(new CustomEvent('mp-evidence', { detail: { id: detail.id } }))}
    >
      המקורות והחישוב <span aria-hidden>↗</span>
    </button>
  )
}

// FORCES narrative (forces · תיאור mode): the interpretation layer, shown flat (no collapsible).
// General read plus three axis blocks (eco/mil/geo) drawn from FORCES_DESCRIPTIONS. Falls back to
// the short POWER_NOTES summaries where a long description is absent, so the mode is never empty.
function ForcesNarrative({ detail, hasNarrative, onToggleFull }: { detail: EntityDetail; hasNarrative: boolean; onToggleFull: () => void }) {
  const desc = detail.id ? FORCES_DESCRIPTIONS[detail.id] : undefined
  const notes = detail.powerNotes
  const general = desc?.general ?? notes?.general
  const axes: { label: string; icon: IconName; text?: string }[] = [
    { label: 'כלכלי', icon: 'eco', text: desc?.eco ?? notes?.eco },
    { label: 'צבאי', icon: 'mil', text: desc?.mil ?? notes?.mil },
    { label: 'גאו-אסטרטגי', icon: 'geo', text: desc?.geo ?? notes?.geo },
  ]
  if (!general && axes.every((a) => !a.text)) return null
  return (
    <div className="fnarr">
      {/* the toggle button — sits above the general read now (was: between it and the per-axis
          blocks). Here it's always in the "open" (full-narrative) state, so it reads "בחזרה לציון". */}
      {hasNarrative && (
        <button className="ffull-btn is-open" onClick={onToggleFull} aria-expanded={true}>
          בחזרה לציון <Icon name="arrow-back" className="ffull-btn__arrow" />
        </button>
      )}
      {general && <p className="fnarr__gen"><Words key={detail.id} text={general} /></p>}
      {axes.filter((a) => a.text).map((a) => (
        <div key={a.label} className="fnarr__axis">
          <span className="fnarr__axis-l"><Icon name={a.icon} className="fnarr__axis-icon" />{a.label}</span>
          <p className="fnarr__axis-t"><Words key={`${detail.id}-${a.label}`} text={a.text!} /></p>
        </div>
      ))}
    </div>
  )
}

// Authored relations involving a given id, both directions, paired with the OTHER body's id.
function relationsFor(id: string): { other: string; rel: AuthoredRelation }[] {
  const out: { other: string; rel: AuthoredRelation }[] = []
  for (const rel of AUTHORED_RELATIONS) {
    const [a, b] = rel.pair
    if (a === id) out.push({ other: b, rel })
    else if (b === id) out.push({ other: a, rel })
  }
  return out
}

// The dominant pole of a relation + its display chrome (Hebrew label + token-driven colour).
const POLE: Record<'t' | 'f' | 'h', { he: string; cls: string }> = {
  t: { he: 'מתח', cls: 'panelb__chip--t' },
  f: { he: 'חיכוך', cls: 'panelb__chip--f' },
  h: { he: 'הרמוניה', cls: 'panelb__chip--h' },
}
function dominantPole(rel: AuthoredRelation): { key: 't' | 'f' | 'h'; v: number } {
  const entries: ['t' | 'f' | 'h', number][] = [['t', rel.t], ['f', rel.f], ['h', rel.h]]
  let best: { key: 't' | 'f' | 'h'; v: number } = { key: 't', v: -1 }
  for (const [k, v] of entries) if (v > best.v) best = { key: k, v }
  return best
}

// DYNAMICS card (dynamics view only) — RELATIONSHIP-FIRST. The forces panel already owns the deep
// power read; the dynamics view is about a body's place in the web of ties the orrery draws, so
// THAT is the story here: a tight header + a one-line power strip for context, then the centrepiece
// — each defining tie shown with its tension/friction/harmony makeup (one split bar) and a one-line
// why — then orbital position and a synthesis line. No duplication of the forces score breakdown.
const AXIS_SHORT: Record<'eco' | 'mil' | 'geo', string> = { eco: 'כלכלי', mil: 'צבאי', geo: 'גאו' }

// One relation's tension·friction·harmony makeup, reduced to a single "stance" percentage set —
// used as the title on the compressed .drel__sq square (see DynamicsCard's Relations category).
function poleShare(rel: AuthoredRelation): { t: number; f: number; h: number } {
  const total = rel.t + rel.f + rel.h || 1
  return { t: Math.round((rel.t / total) * 100), f: Math.round((rel.f / total) * 100), h: Math.round((rel.h / total) * 100) }
}

function DynamicsCard({ detail, onClose, onRelSelect }: DetailProps) {
  const heById = useMemo(() => new Map(NODES.map((n) => [n.id, n.he])), [])
  const id = detail.id
  const f = detail.forces
  const score = detail.scoreLabel ? detail.scoreLabel.split(' ')[0] : String(detail.power)
  // orbital context — the orrery's own meaning: what it orbits, what orbits it, or (failing both)
  // the bodies it shares a ring with. This is the information the forces view does not have.
  const orbit = useMemo(() => {
    const e = id ? NODES.find((n) => n.id === id) : undefined
    const satellites = detail.satellites?.map((s) => s.he) ?? []
    const siblings = e
      ? NODES.filter((n) => n.id !== id && n.parent === e.parent && n.R === e.R).map((n) => n.he)
      : []
    return { satellites, siblings }
  }, [id, detail.satellites])
  // the three descriptor chips no longer sit in one flat header row — each is now the badge for
  // the category it actually describes: tier (a power fact) → הכוחות, axis/bloc (what fixes the
  // body's orbital structure) → הדינמיקה, disposition (how it behaves toward others) → היחסים.
  const tierChip: { icon: IconName; text: string } = { icon: TIER_ICON[detail.tier] ?? 'tier', text: detail.tier }
  const axisChip: { icon: IconName; text: string } = { icon: AXIS_ICON[detail.axisLabel] ?? 'axis', text: detail.axisLabel }
  const dispoChip: { icon: IconName; text: string } | null = detail.dispo
    ? { icon: (DISPO_ICON[detail.dispo] ?? 'dispo') as IconName, text: detail.dispo }
    : null
  // CENTREPIECE — the sharpest defining ties, strongest dominant-pole first (up to 5).
  const rels = useMemo(() => {
    if (!id) return []
    return relationsFor(id)
      .map((r) => ({ ...r, dom: dominantPole(r.rel) }))
      .sort((a, b) => b.dom.v - a.dom.v)
      .slice(0, 5)
  }, [id])
  // strongest axis — used as a fallback anchor in the closing synthesis below, when there's no
  // patron to orbit and no relation strong enough to hang the sentence on.
  const axisName = f
    ? (['eco', 'mil', 'geo'] as const).map((k) => ({ k, v: f[k] })).reduce((m, x) => (x.v > m.v ? x : m)).k
    : null
  const AXIS_HE: Record<'eco' | 'mil' | 'geo', string> = { eco: 'הכוח הכלכלי', mil: 'הכוח הצבאי', geo: 'המעמד הגאו-אסטרטגי' }
  const all = id ? relationsFor(id) : []
  // Closing synthesis — a genuine, varied read of the body's actual shape, not one mad-lib
  // template restated for all 29 bodies (the old version always read "X: strength rests on Y,
  // tense against Z, relies on W" verbatim). Branches on the RELATIONAL PATTERN — no authored ties
  // at all / anchors its own orbital system / one pole (tension·friction·harmony) clearly
  // dominates its ties / a genuinely even mix — so both the sentence's shape AND which fields it
  // pulls differ per body. Where possible it reuses the already-authored `rel.why` line verbatim
  // as the evidence, instead of re-deriving new generic phrasing on top of it.
  const nameOf = (oid: string) => heById.get(oid) ?? oid
  const caption = ((): string => {
    if (all.length === 0) {
      // no bilateral ties authored — almost always a non-state proxy whose relevance is entirely
      // structural (who backs it), never relational. The powerNotes general line supplies the one
      // fact the (empty) relation graph can't: what the body actually IS.
      const gen = detail.powerNotes?.general
      return detail.parentHe
        ? `${detail.he} כמעט ואינה שחקן עצמאי במארג היחסים — מעמדה נגזר כמעט כולו מזיקתה ל${detail.parentHe}.${gen ? ` ${gen}` : ''}`
        : `${detail.he} פועלת מחוץ למארג היחסים הדו-צדדיים שהמפה עוקבת אחריהם.${gen ? ` ${gen}` : ''}`
    }
    const doms = all.map((r) => ({ ...r, dom: dominantPole(r.rel) }))
    const nT = doms.filter((d) => d.dom.key === 't').length
    const nH = doms.filter((d) => d.dom.key === 'h').length
    const nF = doms.filter((d) => d.dom.key === 'f').length
    const byT = doms.slice().sort((a, b) => b.rel.t - a.rel.t)[0]
    const byH = doms.slice().sort((a, b) => b.rel.h - a.rel.h)[0]
    const byF = doms.slice().sort((a, b) => b.rel.f - a.rel.f)[0]
    if (orbit.satellites.length >= 2) {
      // a hub anchoring its own orbital system (usa / saudi / iran) — that IS the defining fact,
      // so lead with it, then whichever single tie (tensest or warmest) is sharpest in absolute terms.
      const sharp = byT.rel.t >= byH.rel.h ? byT : byH
      return `${detail.he} מעגנת מערכת שלמה של ${orbit.satellites.length} גופים סביבה — אך מוגדרת לא פחות ביחסה עם ${nameOf(sharp.other)}: ${sharp.rel.why}`
    }
    if (nH > nT && nH > nF) {
      // harmony clearly dominates its ties — a genuinely aligned body. Name the exception too (how
      // many of its ties AREN'T warm) so the line doesn't oversell a uniformly cozy picture.
      const rest = doms.length - 1
      return `${detail.he} נשענת בעיקר על יחסי שיתוף — במובהק מול ${nameOf(byH.other)}: ${byH.rel.why}${rest > 0 ? ` שאר קשריה המוגדרים (${rest}) נותרים תחרותיים או חסרי חום דומה.` : ''}`
    }
    if (nT > nH && nT > nF) {
      // tension clearly dominates — an embattled body. Name a second adversary if there is one.
      const others = doms.filter((d) => d.dom.key === 't' && d.other !== byT.other).map((d) => nameOf(d.other))
      return `${detail.he} מוקפת מתח יותר משיתוף — מול ${nameOf(byT.other)} בעיקר: ${byT.rel.why}${others.length ? ` המתח חוזר גם מול ${others.slice(0, 2).join(' ו')}.` : ''}`
    }
    if (nF > nT && nF > nH) {
      // friction (chronic grinding, not open enmity) dominates — neither ally nor foe, just abrasion.
      return `${detail.he} מוגדרת פחות באיבה גלויה ויותר בחיכוך מתמשך — הבולט מול ${nameOf(byF.other)}: ${byF.rel.why}`
    }
    // no clean majority — a genuinely mixed profile. Anchor the read in whatever IS fixed about
    // the body (the patron it orbits, or failing that, the axis carrying its weight), then name
    // the single sharpest tie — folding the two together when they're the same body, rather than
    // naming the same partner twice in one sentence.
    const tie = byH.rel.h >= byT.rel.t ? byH : byT
    const tieIsAnchor = !!detail.parentHe && nameOf(tie.other) === detail.parentHe
    if (tieIsAnchor) {
      return `${detail.he} סובבת במסלול תלות סביב ${detail.parentHe} — ${tie.rel.why} — ושאר קשריה נותרים מעורבים, בלי גוש ברור אחד.`
    }
    const anchor = detail.parentHe
      ? `נעה במסלול תלות סביב ${detail.parentHe}`
      : axisName
        ? `שואבת את עיקר משקלה מ${AXIS_HE[axisName]}`
        : 'ללא עוגן ברור אחד'
    return `${detail.he} ${anchor}, ומחזיקה יחסים מעורבים יותר משהיא שייכת לגוש אחד — הבולט שבהם עם ${nameOf(tie.other)}: ${tie.rel.why}`
  })()
  return (
    <aside className="panelb dcard panel--detail" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <header className="dcard__head">
        {detail.rank && <span className="dcard__rank">{String(detail.rank).padStart(2, '0')}</span>}
        <h1 className="dcard__title" key={detail.id}>{detail.he}</h1>
      </header>

      {/* synthesis — moved to the top (was the closing line at the bottom). It's the one-line read
          of the body's whole shape; the three categories below back it up with the specifics that
          built it. Mirrors ForcesScore's own "brief read right after the header" placement. */}
      {caption && <p className="dcard__lede"><Words key={detail.id} text={caption} /></p>}

      {/* ── category: DYNAMICS (orbital position). Written-out section titles were dropped — they
          restated what the content plainly shows and cost a full row each; the category's own chip
          now heads it. Badge = the axis/bloc chip: bloc alignment is what actually fixes a body's
          place in the orbital structure, so it belongs here, not in a generic header row. ── */}
      {(detail.parentHe || orbit.satellites.length > 0 || orbit.siblings.length > 0) && (
        <section className="dcat">
          <header className="dcat__head">
            <span className="dcat__badge"><Icon name={axisChip.icon} className="dcat__badge-icon" />{axisChip.text}</span>
          </header>
          <div className="dcard__orbit">
            {detail.parentHe && (
              <div className="dcard__orbit-row">
                <span className="dcard__orbit-k">במסלול סביב</span>
                <span className="dcard__orbit-v">{detail.parentHe}</span>
              </div>
            )}
            {orbit.satellites.length > 0 && (
              <div className="dcard__orbit-row">
                <span className="dcard__orbit-k">גופים במסלולה</span>
                <span className="dcard__orbit-v">{orbit.satellites.join(' · ')}</span>
              </div>
            )}
            {!detail.parentHe && orbit.satellites.length === 0 && orbit.siblings.length > 0 && (
              <div className="dcard__orbit-row">
                <span className="dcard__orbit-k">משתפת מסלול עם</span>
                <span className="dcard__orbit-v">{orbit.siblings.join(' · ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── category: FORCES — score + eco/mil/geo, on the same compact one-line strip as before
          (the forces panel still owns the deep breakdown). Badge = the power-tier chip. ── */}
      {f && (
        <section className="dcat">
          <header className="dcat__head">
            <span className="dcat__badge"><Icon name={tierChip.icon} className="dcat__badge-icon" />{tierChip.text}</span>
          </header>
          <div className="dcard__pstrip">
            <span className="dcard__pstrip-score" key={detail.id}><b>{score}</b><span>כוח משיכה</span></span>
            <span className="dcard__pstrip-axes">
              {(['eco', 'mil', 'geo'] as const).map((k) => (
                <span key={k} className="dcard__pstrip-ax">
                  <Icon name={k} className="dcard__pstrip-icon" /><b>{f[k]}</b>{AXIS_SHORT[k]}
                </span>
              ))}
            </span>
          </div>
        </section>
      )}

      {/* ── category: RELATIONS — defining ties. Each row's tension/friction/harmony makeup, formerly
          a full-width split bar, is now one small square coloured by the dominant pole (the exact
          split is still there — hover/focus the square for the percentages — just not spelled out
          in pixels, since the pole word beside the name already states the headline read). Badge =
          the disposition chip: how the body BEHAVES toward others belongs with its ties. ── */}
      {rels.length > 0 && (
        <section className="dcat">
          {dispoChip && (
            <header className="dcat__head">
              <span className="dcat__badge"><Icon name={dispoChip.icon} className="dcat__badge-icon" />{dispoChip.text}</span>
            </header>
          )}
          <div className="dcard__rels">
            {rels.map(({ other, rel, dom }) => {
              const share = poleShare(rel)
              return (
                <button key={other} className="drel" onClick={() => onRelSelect?.(other)}>
                  <span
                    className={`drel__sq drel__sq--${dom.key}`} aria-hidden
                    title={`מתח ${share.t}% · חיכוך ${share.f}% · הרמוניה ${share.h}%`}
                  />
                  <span className="drel__body">
                    <span className="drel__head">
                      <span className="drel__name">{heById.get(other) ?? other}</span>
                      <span className={`drel__pole drel__pole--${dom.key}`}>{POLE[dom.key].he}</span>
                    </span>
                    <span className="drel__why"><Words key={other} text={rel.why} /></span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </aside>
  )
}

interface DetailProps { detail: EntityDetail; onClose?: () => void; onRelSelect?: (id: string) => void; view?: View }

// Per-value icon lookups — each specific label gets its own distinct mark.
// Fallback to the generic category icon if a value is unrecognised.
const TIER_ICON: Record<string, IconName> = {
  'כוח-על': 'tier-great', 'כוח אזורי': 'tier-regional', 'כוח ביניים': 'tier-mid',
  'כוח קצה': 'tier-edge', 'שחקן לא-מדינתי': 'tier-nonstate',
}
const AXIS_ICON: Record<string, IconName> = {
  'הציר המערבי': 'axis-west', 'הציר המזרחי': 'axis-east',
  'גוש ניטרלי': 'axis-neutral', 'ללא שיוך': 'axis-none',
}
const DISPO_ICON: Record<string, IconName> = {
  'אגרסיבית': 'dispo-agg', 'אסרטיבית': 'dispo-assert', 'זהירה': 'dispo-caut',
}

// Shared identity header — rank + title. Used by the forces detail panel.
// Hover explanations are shown in a RESERVED caption line inside the header — NOT a floating
// ::after tooltip. The panel is an overflow scroll container (overflow-x:hidden), so a floating
// tooltip anchored to a chip near the panel's left edge is physically clipped by the panel box no
// matter how it's positioned — an in-flow caption inside the panel can never clip. (Reproduced:
// the disposition chip's tooltip ran off the panel's left edge.)
// The power tier used to live here as a descriptor line below the name — it's since moved down
// to sit beside the gravity score itself (see .fscore__tier in ForcesScore), which is the number
// the tier is actually classifying.
function PanelHeader({ detail }: { detail: EntityDetail }) {
  const [hint, setHint] = useState<string | null>(null)
  const rankHint = 'הדירוג בכוח המשיכה — מקומו בטבלת העוצמה'
  const bind = (h: string) => ({
    tabIndex: 0,
    onMouseEnter: () => setHint(h), onMouseLeave: () => setHint(null),
    onFocus: () => setHint(h), onBlur: () => setHint(null),
  })
  return (
    <header className="phead">
      <div className="phead__line">
        {detail.rank && <span className="phead__rank" {...bind(rankHint)}>{String(detail.rank).padStart(2, '0')}</span>}
        {/* the name is the panel's one genuinely expressive swap — letters of the old drop away as
            the new rise in (see LetterSwap). The <h1> itself never animates or moves. */}
        <h1 className="phead__title"><LetterSwap text={detail.he} /></h1>
      </div>
      <p className="phead__hint" aria-live="polite">{hint ?? ' '}</p>
    </header>
  )
}

// The score view shows a BRIEF, COMPLETE description — just the first sentence — never a mid-thought
// cut trailing off in an ellipsis (users flagged the "…"). The first sentence is always a whole
// thought ending on its own punctuation; the full multi-sentence text lives behind "תיאור מלא".
// No character budget, no line-clamp, no ellipsis — so a row can never read as unfinished.
function firstSentence(t?: string): string | undefined {
  if (!t) return undefined
  const trimmed = t.trim()
  const m = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : trimmed).trim()
}

// One scored axis row — icon + label + numeric value + bar + a brief first-sentence description.
// The full text lives behind the single "תיאור מלא" drill-down.
// The row itself, its icon and its label are IDENTICAL for every body, so they are permanently
// static — no key, no entrance animation. Only the value (counts) and the bar (tweens its width)
// move, plus the description's own per-word rise.
function ForceAxisRow({ label, value, icon, hint, text, beat = 0 }: { label: string; value?: number; icon: IconName; hint?: string; text?: string; beat?: number }) {
  return (
    <div className="fparam">
      <div className="fparam__lead">
        <span className="fparam__label" data-hint={hint}><Icon name={icon} className="fparam__icon" />{label}</span>
        {value != null && <span className="fparam__val"><CountUp value={value} delay={beat} /></span>}
      </div>
      {value != null && <Gauge value={value * 10} delay={beat} />}
      {/* reserved height (see .fparam__desc-text) so a shorter description can't pull the next row up */}
      <p className="fparam__desc-text">{text && <Words key={text} delay={beat} text={firstSentence(text)!} />}</p>
    </div>
  )
}

// The grading cluster — a PRIMARY headline score (large numeral, no gauge bar so it doesn't
// read as a fourth category bar), a brief GENERAL summary paragraph (the single overall read,
// distinct from the per-axis breakdown beneath it), then the three SUPPORTING eco/mil/geo
// category rows, each with a sentence-complete description, plus a backing note (if any) and
// the evidence link. The same `general` text opens ForcesNarrative too (the fuller read) — that's
// intentional: a brief intro here, the same line reprised as the narrative's opening there.
function ForcesScore({ detail, hasNarrative, onToggleFull }: { detail: EntityDetail; hasNarrative: boolean; onToggleFull: () => void }) {
  const scoreNum = detail.scoreLabel ? parseFloat(detail.scoreLabel.split(' ')[0]) : detail.power
  const unit = detail.scoreLabel ? '/ 10' : '/ 100'
  const desc = detail.id ? FORCES_DESCRIPTIONS[detail.id] : undefined
  const notes = detail.powerNotes
  const general = desc?.general ?? notes?.general
  return (
    <div className="fscore">
      {/* the headline ROW never animates or moves — only the numeral inside it counts to its new
          value, and the tier chip (whose text genuinely differs per body) cross-fades. */}
      <div className="fscore__headline">
        <span className="fscore__num"><b><CountUp value={scoreNum} delay={BEAT.score} /></b><span className="fscore__unit">{unit}</span></span>
        <span className="fscore__meta">
          <span className="fscore__lbl">כוח משיכה</span>
        </span>
        {detail.tier && (
          <Hint text="דרגת העוצמה — סיווג הכוח של הגוף" className="fscore__tier">
            <Icon name={TIER_ICON[detail.tier] ?? 'tier'} className="fscore__tier-icon" />
            <span className="fscore__tier-txt" key={detail.tier}>{detail.tier}</span>
          </Hint>
        )}
      </div>
      {/* reserved 3-line height (see .fscore__gen) — the breakdown below it must sit at the same
          y for every body, whatever the sentence length. */}
      <p className="fscore__gen">{general && <Words key={detail.id} delay={BEAT.lede} text={firstSentence(general)!} />}</p>
      <div className="fparams">
        {/* deliberately UNKEYED — see ForceAxisRow. A per-body key remounts the row and resets the
            bar to empty; keeping the instance alive is what lets it slide from the previous body's
            value straight to the new one. */}
        <ForceAxisRow
          label="כלכלי" icon="eco" value={detail.forces?.eco} beat={BEAT.rows}
          hint="כוח כלכלי — תמ״ג, סחר, פיננסים ומשקל בשרשראות האספקה" text={desc?.eco ?? notes?.eco}
        />
        <ForceAxisRow
          label="צבאי" icon="mil" value={detail.forces?.mil} beat={BEAT.rows + BEAT.rowStep}
          hint="כוח צבאי — הוצאות ביטחון, יכולות וכוח אש" text={desc?.mil ?? notes?.mil}
        />
        <ForceAxisRow
          label="גאו-אסטרטגי" icon="geo" value={detail.forces?.geo} beat={BEAT.rows + BEAT.rowStep * 2}
          hint="כוח גאו-אסטרטגי — מיקום, בריתות והשפעה אזורית" text={desc?.geo ?? notes?.geo}
        />
      </div>
      {detail.backing && (
        <div className="fbacking">
          <span className="fbacking__label">גיבוי ⟵ {detail.backing.patronHe}</span>
          <span className="fbacking__val">+{detail.backing.amount}</span>
          <p className="fbacking__text">משקל פוליטי מושאל — חלק מכוח המשיכה תלוי בנותן החסות.</p>
        </div>
      )}
      {/* the toggle button — moved below every metric component (headline, description, eco/mil/geo
          breakdown, backing note), directly above the sources link, per user placement request. */}
      {hasNarrative && (
        <button className="ffull-btn" onClick={onToggleFull} aria-expanded={false}>
          תיאור מלא <span aria-hidden>↗</span>
        </button>
      )}
      <EvidenceLink detail={detail} />
    </div>
  )
}


// FORCES detail panel (forces view) — grouped header, then ONE of two full-panel-body states:
// the score/category cluster (default) OR the complete narrative — toggled by a single button
// whose label names which way it switches. The button sits right below the brief description,
// ABOVE the eco/mil/geo breakdown (moved up from the old panel-foot position, after the relations
// section) — its rendering is delegated to ForcesScore/ForcesNarrative (each renders it in the
// equivalent slot right after their own general-read paragraph) since only one of the two is ever
// mounted at a time, but the MODE STATE and toggle logic stay owned here, passed down as props.
function ForcesPanel({ detail, onClose, onRelSelect }: DetailProps) {
  const [mode, setMode] = useState<'score' | 'full'>('score')
  // a fresh selection resets to the score view — it's per-body, not sticky.
  const [lastId, setLastId] = useState(detail.id)
  if (detail.id !== lastId) { setLastId(detail.id); setMode('score') }
  const hasNarrative = !!(detail.id && FORCES_DESCRIPTIONS[detail.id]) || !!detail.powerNotes
  const toggleMode = () => { sound.play('tab'); setMode((v) => (v === 'score' ? 'full' : 'score')) }
  return (
    // stopPropagation: ForcesView's outer .stage has an onClick that deselects the current body
    // (for clicking empty canvas space to close the panel). Without this guard, EVERY click inside
    // the panel — the full-description button, the evidence link, relation chips — bubbles up and
    // immediately deselects too, reverting the whole panel closed.
    <aside className="panelb panel--detail" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <PanelHeader detail={detail} />
      <div className="fbody">
        {mode === 'score'
          ? <ForcesScore detail={detail} hasNarrative={hasNarrative} onToggleFull={toggleMode} />
          : <ForcesNarrative detail={detail} hasNarrative={hasNarrative} onToggleFull={toggleMode} />}
      </div>
      {detail.relations.length > 0 && (
        <div className="panel__rels">
          <span className="panel__rels-h">יחסים</span>
          <div className="panel__rels-list">
            {detail.relations.map((r) => (
              <button key={r.id} className="panel__rel" onClick={() => onRelSelect?.(r.id)}>{r.he}</button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

// Router for the selected-body panel: a compact card for Dynamics, the richer two-mode
// layout for Forces (and any other view that surfaces a detail).
function SidePanelHybrid({ detail, onClose, onRelSelect, view }: DetailProps) {
  if (view === 'dynamics') {
    return <DynamicsCard detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
  }
  return <ForcesPanel detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
}

export function SidePanel({ detail, onClose, onRelSelect, view }: { detail?: EntityDetail | null; onClose?: () => void; onRelSelect?: (id: string) => void; view?: View }) {
  if (detail) {
    return <SidePanelHybrid detail={detail} onClose={onClose} onRelSelect={onRelSelect} view={view} />
  }
  return (
    <aside className="panel" dir="rtl">
      <h1 className="panel__title">יחסי הכוחות</h1>
      <p className="panel__body panel__body--words">
        <Words delay={0.2} text="במערך יחסי הכוחות ניתן לראות את השילוב של הכוחות והיחסים, ולהבין את הדינמיקות דרך הגופים, מעגלי ההשפעה ומרכזי הכובד. גודלם נקבע על פי כוח משיכתם, והמרחקים ביניהם מעידים על אופי היחסים שלהם." />
      </p>
      <h2 className="panel__eq">יחסי הכוחות = הכוחות + היחסים</h2>
      <p className="panel__note">בחרו גוף במפה כדי לראות את נתוניו.</p>
    </aside>
  )
}

export type View = 'home' | 'forces' | 'relations' | 'dynamics'
// Icons: forces = a single mass (weight, standalone); relations = the tension/friction/harmony
// triangle (a tie between two); dynamics = two masses on one shared orbit — forces + relations
// composed into one figure, matching the site's own equation (יחסי הכוחות = הכוחות + היחסים).
const TABS: { he: string; view: View; ready?: boolean }[] = [
  { he: 'הכוחות', view: 'forces', ready: true },
  { he: 'היחסים', view: 'relations', ready: true },
  { he: 'יחסי הכוחות', view: 'dynamics', ready: true },
]

export function TabBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  const navRef = useRef<HTMLElement>(null)
  // a single shared marker that slides (translateX) to the active tab; measured from real
  // tab geometry so RTL + varying Hebrew widths both stay correct. Re-measures on resize.
  const [marker, setMarker] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current
      if (!nav) return
      const idx = TABS.findIndex((t) => t.view === view)
      if (idx < 0) { setMarker(null); return }
      const tabEl = nav.children[idx] as HTMLElement | undefined
      if (!tabEl) return
      // offsetLeft is relative to the nav's padding box — already RTL-correct
      setMarker({ x: tabEl.offsetLeft, w: tabEl.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view])

  return (
    <nav className="tabs" dir="rtl" aria-label="תצוגות" ref={navRef}>
      {TABS.map((t) => (
        <button
          key={t.he}
          className={`tab${view === t.view ? ' tab--active' : ''}${t.ready === false ? ' tab--soon' : ''}`}
          aria-current={view === t.view ? 'page' : undefined}
          onClick={() => t.ready !== false && onView(t.view)}
        >
          {t.he}
        </button>
      ))}
      {marker && (
        <span
          className="tabs__marker"
          aria-hidden
          style={{ width: marker.w, transform: `translateX(${marker.x}px)` }}
        />
      )}
    </nav>
  )
}
