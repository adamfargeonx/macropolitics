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
import { TIER_ICON, AXIS_ICON, DISPO_ICON } from './panel-icons'
import { Hint } from './Hint'
import { LetterSwap, CountUp, Gauge } from './PanelMotion'
import { BEAT } from './panel-beats'
import { ForcesIndexPanel, type ForcesIndexPanelProps } from './ForcesIndexPanel'
import { ForcesAxisPanel } from './ForcesAxisPanel'
import { hasAxisEvidence, AXIS_BLURB, scoreTier } from './evidence-data'

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
const PANEL_ENTER_MS = CANVAS_ENTRANCE_MS + PANEL_BEAT_MS

export function PanelDock({ children, forceOpen, forceClosed, onHandleClick, enterAfter = PANEL_ENTER_MS, reopenOn, autoOpen = true }: { children: ReactNode; forceOpen?: boolean; forceClosed?: boolean; onHandleClick?: () => void; enterAfter?: number; reopenOn?: string | null; autoOpen?: boolean }) {
  // mounts closed, then slides in once the screen's entrance has fully landed (see above) — the
  // panel arriving a clear beat later reads as a considered reveal, not a competing animation.
  const [open, setOpen] = useState(false)
  // the portal target may not exist yet on the very first render (App.tsx renders it as a
  // sibling) — fall back to an inline render for that one frame, then re-parent once mounted.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  /* eslint-disable react-hooks/set-state-in-effect -- portal-target discovery: #panel-root is a
     DOM sibling rendered by App.tsx and isn't guaranteed to exist in the real DOM until after this
     component's own first commit, so finding it necessarily happens a render late. */
  useEffect(() => { setRoot(document.getElementById('panel-root')) }, [])
  /* eslint-enable react-hooks/set-state-in-effect */
  // autoOpen=false: the constellation screens (RelationsView) and the Forces grid — a field of
  // circles/stars is the whole point of the view, and the panel used to slide open over it
  // unprompted a couple of seconds after arrival with nothing selected yet. Skipping the timer
  // leaves the dock closed until something actually earns it: a body gets pinned/selected (the
  // reopenOn effect below), or the handle is clicked by hand.
  useEffect(() => {
    if (!autoOpen) return
    const t = window.setTimeout(() => setOpen(true), enterAfter)
    return () => window.clearTimeout(t)
  }, [enterAfter, autoOpen])
  // Direct feedback: clicking empty space (unrelated to the panel) should close it; clicking
  // something that correlates to the panel's content should reopen it, even after a manual close
  // via the handle. `reopenOn` is whatever id the calling view uses to mean "something is
  // selected" (RelationsView's `pinned`, ForcesGridView/DynamicsView's `selected`) — a body's own
  // click handler already calls stopPropagation() before this ever fires, so selecting a body
  // never closes the panel it's about to populate; only a click that reaches window untouched
  // (empty canvas/field space, chrome outside the panel) does.
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- sync-to-prop, and provably not a
     cascade: setOpen(true) when open is already true hits React's bail-out and schedules no
     re-render. Annotated rather than silently failing the gate, matching the disable above. */
  useEffect(() => { if (reopenOn != null) setOpen(true) }, [reopenOn])
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])
  // mobile map/list toggle drives the sheet: forceClosed (map, nothing selected) keeps the field
  // full-screen; forceOpen (list, or a body selected) pins it open. Desktop passes neither.
  const isOpen = forceClosed ? false : (forceOpen || open)
  // Content mounts the FIRST time the dock opens, and then stays mounted forever after — even if
  // the user later closes it (clicking the handle, or a mobile forceClosed toggle). It must NOT be
  // re-gated on isOpen directly: that mounted content only on isOpen===true, so closing the dock
  // UNMOUNTED everything in the same instant, before the panel's own 0.66s slide-out transition
  // had a chance to play with content still visible — reported as the panel "completely vanishing"
  // instead of sliding out. everMounted only ever flips false→true, never back, so a close now
  // correctly leaves the (already-settled) content in place while the CSS transform carries it
  // off-screen, and a reopen doesn't replay the entrance cascade every single toggle either.
  const [everMounted, setEverMounted] = useState(false)
  if (isOpen && !everMounted) setEverMounted(true)
  const node = (
    <div ref={dockRef} className={`pdock${isOpen ? ' pdock--open' : ' pdock--closed'}`}>
      <div className="pdock__panel">
        {everMounted && children}
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

// Utility cluster — top-left. "המודל" (the methodology), dispatching the global 'mp-about'
// overlay event. Hidden on the closed home. (Used to also carry a legend ⓘ icon — the legend's
// one trigger, ForcesIndexPanel's "מקרא" button, was removed once its content moved inline into
// the dynamics view's own empty-state panel; see .panel__legend.)
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

// FORCES narrative (forces · תיאור mode): the interpretation layer, shown flat (no collapsible).
// General read plus three axis blocks (eco/mil/geo) drawn from FORCES_DESCRIPTIONS. Falls back to
// the short POWER_NOTES summaries where a long description is absent, so the mode is never empty.
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
// LABEL SWAP (matches RelationsView.tsx's POLE_HE — direct feedback, not a naming preference):
// `t`/`f` keep their field meaning (AuthoredRelation.t = the opp-bloc/aggressive-disposition
// axis, .f = the non-aligned messy-middle axis) — only the Hebrew word shown for each was wrong.
// מתח (tension) = opposing interests/complicated relations, no direct confrontation. חיכוך
// (friction) = direct clashes, force, open confrontation. `t` is open hostility → חיכוך; `f` is
// the non-confrontational middle → מתח.
const POLE: Record<'t' | 'f' | 'h', { he: string; cls: string }> = {
  t: { he: 'חיכוך', cls: 'panelb__chip--t' },
  f: { he: 'מתח', cls: 'panelb__chip--f' },
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
const AXIS_SHORT: Record<'eco' | 'mil' | 'geo', string> = { eco: 'כלכלה', mil: 'צבא', geo: 'גאו' }

// One relation's tension·friction·harmony makeup, reduced to a single "stance" percentage set —
// used as the title on the compressed .drel__sq square (see DynamicsCard's Relations category).
function poleShare(rel: AuthoredRelation): { t: number; f: number; h: number } {
  const total = rel.t + rel.f + rel.h || 1
  return { t: Math.round((rel.t / total) * 100), f: Math.round((rel.f / total) * 100), h: Math.round((rel.h / total) * 100) }
}

// One accordion stage — CSS grid-rows disclosure (0fr→1fr), no JS height measurement. The MARK
// leading each header is the per-value icon (TIER_ICON/AXIS_ICON/DISPO_ICON — the exact lookups
// DynamicsCard already resolves for its chips), not a generic category glyph: it says what the
// state IS before the tag word does. The tag itself leads the row as a filled accent plate — it
// used to be a dim bordered chip parked at the row's end, after the category name, so the one
// word that actually classifies the body read as an afterthought to a label that's identical on
// every body. `inert` on the collapsed body keeps its buttons/links out of tab order.
function DynStage({
  id, mark, tag, cat, meta, open, dimmed, onToggle, children,
}: {
  id: string; mark: IconName; tag: string; cat: string; meta: React.ReactNode
  open: boolean; dimmed: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <section className={`dstage${open ? ' is-open' : ''}${dimmed ? ' is-dim' : ''}`}>
      <h3 className="dstage__h">
        <button type="button" className="dstage__btn" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <Icon name={mark} className="dstage__mark" />
          <span className="dstage__tag">{tag}</span>
          <span className="dstage__cat">{cat}</span>
          <span className="dstage__meta">{meta}</span>
          <span className="dstage__caret" aria-hidden />
        </button>
      </h3>
      <div className="dstage__drawer" id={id}>
        <div className="dstage__drawer-in">
          <div className="dstage__drawer-body" inert={!open}>{children}</div>
        </div>
      </div>
    </section>
  )
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
  const hasDyn = !!(detail.parentHe || orbit.satellites.length > 0 || orbit.siblings.length > 0)
  const hasForces = !!f
  const hasRels = rels.length > 0 && !!dispoChip
  // strict one-at-a-time accordion, defaulting to whichever stage is actually present first —
  // reset (not just initialized) on every body switch: this component is NOT remounted per
  // selection (no `key` at its call site), so without this a stage left open on the previous
  // body would still show open on the next one. Same derive-during-render reset idiom
  // ForcesScore's own local state already uses, rather than an effect.
  const defaultStage = hasDyn ? 'dyn' : hasForces ? 'forces' : hasRels ? 'rels' : null
  const [openStage, setOpenStage] = useState<'dyn' | 'forces' | 'rels' | null>(defaultStage)
  const [lastStageId, setLastStageId] = useState(detail.id)
  if (detail.id !== lastStageId) { setLastStageId(detail.id); setOpenStage(defaultStage) }
  const toggle = (stage: 'dyn' | 'forces' | 'rels') => setOpenStage((v) => (v === stage ? null : stage))

  const dynMeta = detail.parentHe
    ? detail.parentHe
    : orbit.satellites.length > 0
      ? `${orbit.satellites.length} גופים במסלולה`
      : `${orbit.siblings.length} גופים בטבעת`
  const relsMeta = rels.length === 1 ? 'קשר מגדיר אחד' : `${rels.length} קשרים מגדירים`

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
      // `t` field clearly dominates — an embattled body, open hostility (POLE.t = חיכוך). Name a
      // second adversary if there is one.
      const others = doms.filter((d) => d.dom.key === 't' && d.other !== byT.other).map((d) => nameOf(d.other))
      return `${detail.he} מוקפת בחיכוך יותר משיתוף — מול ${nameOf(byT.other)} בעיקר: ${byT.rel.why}${others.length ? ` החיכוך חוזר גם מול ${others.slice(0, 2).join(' ו')}.` : ''}`
    }
    if (nF > nT && nF > nH) {
      // `f` field (chronic complication, not open enmity) dominates — neither ally nor foe, a
      // structural rivalry without direct confrontation (POLE.f = מתח).
      return `${detail.he} מוגדרת פחות באיבה גלויה ויותר במתח מתמשך — הבולט מול ${nameOf(byF.other)}: ${byF.rel.why}`
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
        {/* same swap motion as the Forces panel's title — was a dead `key` with no actual
            animation since titleSwap was retired; this is the real fix, not a leftover. */}
        <h1 className="dcard__title"><LetterSwap text={detail.he} /></h1>
      </header>

      {/* the assessment — not folded into any stage: it's the panel's only zero-click answer (fold
          it and the rest state shows a name and nothing else), and it isn't ABOUT orbital position
          specifically — it synthesises across all three categories (it usually names a relation,
          sometimes the orbit, sometimes the dominant axis), so filing it under "הדינמיקה" would
          mislabel it. */}
      {caption && <p className="dcard__assess-v"><Words key={detail.id} text={caption} /></p>}

      {/* Three stages, one open at a time (a second click on the open one closes it, so "nothing
          open" is reachable). Each header leads with the per-value icon + the classifying tag —
          the section name (הדינמיקה/הכוחות/היחסים) demotes to a quiet caption beside it, since it's
          identical on every body and carries no information the tag doesn't. */}
      <div className={`dcard__stages${openStage ? ' has-open' : ''}`}>
        {hasDyn && (
          <DynStage
            id={`dyn-${detail.id}`} mark={axisChip.icon} tag={axisChip.text} cat="הדינמיקה" meta={dynMeta}
            open={openStage === 'dyn'} dimmed={!!openStage && openStage !== 'dyn'} onToggle={() => toggle('dyn')}
          >
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
          </DynStage>
        )}

        {hasForces && f && (
          <DynStage
            id={`forces-${detail.id}`} mark={tierChip.icon} tag={tierChip.text} cat="הכוחות"
            meta={<><b key={detail.id}>{score}</b>כוח משיכה</>}
            open={openStage === 'forces'} dimmed={!!openStage && openStage !== 'forces'} onToggle={() => toggle('forces')}
          >
            <div className="dcard__axes">
              {(['eco', 'mil', 'geo'] as const).map((k) => (
                <div key={k} className="dcard__ax">
                  <Icon name={k} className="dcard__ax-icon" />
                  <span className="dcard__ax-k">{AXIS_SHORT[k]}</span>
                  <Gauge className="dcard__ax-bar" value={f[k] * 10} delay={0} />
                  <span className="dcard__ax-v">{f[k].toFixed(1)}</span>
                </div>
              ))}
            </div>
          </DynStage>
        )}

        {hasRels && dispoChip && (
          <DynStage
            id={`rels-${detail.id}`} mark={dispoChip.icon} tag={dispoChip.text} cat="היחסים" meta={relsMeta}
            open={openStage === 'rels'} dimmed={!!openStage && openStage !== 'rels'} onToggle={() => toggle('rels')}
          >
            <div className="dcard__rels">
              {rels.map(({ other, rel, dom }) => {
                const share = poleShare(rel)
                return (
                  <button key={other} className="drel" onClick={() => onRelSelect?.(other)}>
                    <span className={`drel__sq drel__sq--${dom.key}`} aria-hidden />
                    <span className="drel__body">
                      <span className="drel__head">
                        <span className="drel__name">{heById.get(other) ?? other}</span>
                        <span className={`drel__pole drel__pole--${dom.key}`}>{POLE[dom.key].he}</span>
                      </span>
                      <span className="drel__why"><Words key={other} text={rel.why} /></span>
                      {/* the exact split, spelled out with its pole names — this is what keeps the
                          colour decorative rather than load-bearing: strip every colour and the
                          row still states which pole dominates and by how much. Was hover/focus-only
                          (a `title` attribute), so the exact numbers lived nowhere visible. */}
                      <span className="drel__split">{POLE.t.he} {share.t} · {POLE.f.he} {share.f} · {POLE.h.he} {share.h}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </DynStage>
        )}
      </div>
    </aside>
  )
}

interface DetailProps { detail: EntityDetail; onClose?: () => void; onRelSelect?: (id: string) => void; view?: View }

// Shared identity header — rank + title. Used by the forces detail panel.
// Hover explanations are shown in a RESERVED caption line inside the header — NOT a floating
// ::after tooltip. The panel is an overflow scroll container (overflow-x:hidden), so a floating
// tooltip anchored to a chip near the panel's left edge is physically clipped by the panel box no
// matter how it's positioned — an in-flow caption inside the panel can never clip. (Reproduced:
// the disposition chip's tooltip ran off the panel's left edge.)
// The power tier used to live here as a descriptor line below the name — it's since moved down
// to sit beside the gravity score itself (see .fscore__tier in ForcesScore), which is the number
// the tier is actually classifying.
// Shrinks the panel title just enough to keep any name on ONE line.
// Only three names are wide enough to wrap at the display size (הכוחות הדמוקרטיים, הרשות
// הפלסטינית, הג׳יהאד האסלאמי — measured at 305–346px against 310px of column). The previous fix
// reserved a permanent SECOND line so those three couldn't shove the score and breakdown down a
// line when selected — but that made the other ~30 bodies, every one of which fits on one line,
// carry a full line (~35px) of dead space under the name. Fitting the three outliers instead costs
// the common case nothing: the reservation goes away entirely, the space under the name becomes a
// real margin rather than reserved slack, and the block below is MORE stable than before, since
// every name now occupies exactly one line.
// Measured on a detached probe, not the live <h1>: the title hosts LetterSwap, which during a swap
// holds the outgoing AND incoming names in the DOM at once — measuring the element itself would
// size to whichever is wider and change its answer mid-transition.
function useFitTitle(text: string, ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<string>()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const cs = getComputedStyle(el)
    const base = parseFloat(cs.fontSize)
    const avail = el.clientWidth
    if (!base || !avail) return
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing}`
    probe.textContent = text
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    probe.remove()
    // `flex: 1` fixes the box width independently of its content, so measuring can't feed back
    // into the width it measured against — no oscillation, no second pass needed.
    setSize(w > avail ? `${Math.floor(base * (avail / w))}px` : undefined)
  }, [text, ref])
  return size
}

function PanelHeader({ detail }: { detail: EntityDetail }) {
  const [hint, setHint] = useState<string | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const fitSize = useFitTitle(detail.he, titleRef)
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
        <h1 className="phead__title" ref={titleRef} style={fitSize ? { fontSize: fitSize } : undefined}><LetterSwap text={detail.he} /></h1>
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
// The whole row is the entry point into that axis's own criteria (see ForcesAxisPanel) — clicking
// a value drills the panel down into ITS composite, in place, rather than opening a modal over the
// field. `onOpen` is only passed when there's a real composite to show; otherwise the row is inert.
function ForceAxisRow({ label, value, icon, hint, text, beat = 0, onOpen }: { label: string; value?: number; icon: IconName; hint?: string; text?: string; beat?: number; onOpen?: () => void }) {
  const tier = value != null ? scoreTier(value) : undefined
  const content = (
    <>
      <div className="fparam__lead">
        <span className="fparam__label" data-hint={hint}><Icon name={icon} className="fparam__icon" />{label}</span>
        {tier && <span className={`tier-tag tier-tag--${tier.slug}`}>{tier.he}</span>}
        {value != null && <span className="fparam__val"><CountUp value={value} delay={beat} /></span>}
        {/* persistent (not hover-only) drill-in cue — the row's clickability used to be legible
            only on hover/focus (a background tint), so it read as inert until you happened to
            mouse over it. A quiet chevron at rest, brightening on hover/focus like the rest of
            the row, states it up front without competing with the numeral for attention. */}
        {onOpen && <span className="fparam__chevron" aria-hidden />}
      </div>
      {value != null && <Gauge value={value * 10} delay={beat} />}
      {/* reserved height (see .fparam__desc-text) so a shorter description can't pull the next row up */}
      <p className="fparam__desc-text">{text && <Words key={text} delay={beat} text={firstSentence(text)!} />}</p>
    </>
  )
  // only bodies with a real sourced composite get the drill-down (see hasAxisEvidence) — a
  // hand-judged axis value has no criteria behind it, and offering a way into an empty panel is
  // worse than offering nothing.
  if (!onOpen) return <div className="fparam">{content}</div>
  return (
    <button type="button" className="fparam fparam--link" onClick={onOpen}>{content}</button>
  )
}

// The grading cluster — a PRIMARY headline score (large numeral, no gauge bar so it doesn't
// read as a fourth category bar), a brief GENERAL summary paragraph (the single overall read,
// distinct from the per-axis breakdown beneath it, expandable in place via its own "קרא עוד"),
// then the three SUPPORTING eco/mil/geo category rows, each with a sentence-complete description
// and, when a sourced composite exists, a click-through into that axis's own drill-down.
function ForcesScore({ detail, onOpenAxis }: { detail: EntityDetail; onOpenAxis: (axis: 'eco' | 'mil' | 'geo') => void }) {
  const scoreNum = detail.scoreLabel ? parseFloat(detail.scoreLabel.split(' ')[0]) : detail.power
  const unit = detail.scoreLabel ? '/ 10' : '/ 100'
  const desc = detail.id ? FORCES_DESCRIPTIONS[detail.id] : undefined
  const notes = detail.powerNotes
  const general = desc?.general ?? notes?.general
  const short = general && firstSentence(general)
  // the general read only expands past its first sentence in place — no separate destination.
  // Resets per body (a fresh selection expanding into the PREVIOUS body's full paragraph, for one
  // frame before the new detail lands, would be wrong) using the same derive-during-render reset
  // idiom ForcesPanelContent's own mode state already uses, rather than an effect.
  const [expanded, setExpanded] = useState(false)
  const [lastId, setLastId] = useState(detail.id)
  if (detail.id !== lastId) { setLastId(detail.id); setExpanded(false) }
  // The REMAINDER after the first sentence — rendered as its own node so expanding APPENDS to the
  // sentence already on screen instead of replacing it. Keying one <Words> on expanded/collapsed
  // remounted the whole paragraph, so every word (including the ones the reader was already
  // reading) re-ran its rise — the text visibly re-spawned from scratch on both "קרא עוד" and
  // "פחות". Split in two, the short sentence's DOM is never touched by the toggle: only the tail
  // mounts and animates in, and collapsing only unmounts the tail.
  const restStart = general && short ? general.indexOf(short) : -1
  const rest = restStart >= 0 && general ? general.slice(restStart + short!.length).trim() : ''
  const hasMore = !!rest
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
      {/* reserved 3-line height while COLLAPSED (see .fscore__gen) — the breakdown below it sits
          at the same y for every body at a glance. Expanding is a deliberate action, so it's the
          one state allowed to grow the panel past that reserved height. */}
      <p className="fscore__gen">
        {/* keyed on the BODY only, never on `expanded` — the toggle must not remount this */}
        {short && <Words key={`${detail.id}-short`} delay={BEAT.lede} text={short} />}
        {expanded && rest && <>{' '}<Words key={`${detail.id}-rest`} text={rest} /></>}
        {hasMore && (
          <button type="button" className="fscore__more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? 'פחות' : 'קרא עוד'}
          </button>
        )}
      </p>
      <div className="fparams">
        {/* deliberately UNKEYED — see ForceAxisRow. A per-body key remounts the row and resets the
            bar to empty; keeping the instance alive is what lets it slide from the previous body's
            value straight to the new one. */}
        <ForceAxisRow
          label="כלכלה" icon="eco" value={detail.forces?.eco} beat={BEAT.rows}
          hint={AXIS_BLURB.eco} text={desc?.eco ?? notes?.eco}
          onOpen={hasAxisEvidence(detail.id, 'eco') ? () => onOpenAxis('eco') : undefined}
        />
        <ForceAxisRow
          label="צבא" icon="mil" value={detail.forces?.mil} beat={BEAT.rows + BEAT.rowStep}
          hint={AXIS_BLURB.mil} text={desc?.mil ?? notes?.mil}
          onOpen={hasAxisEvidence(detail.id, 'mil') ? () => onOpenAxis('mil') : undefined}
        />
        <ForceAxisRow
          label="גאו-אסטרטגיה" icon="geo" value={detail.forces?.geo} beat={BEAT.rows + BEAT.rowStep * 2}
          hint={AXIS_BLURB.geo} text={desc?.geo ?? notes?.geo}
          onOpen={hasAxisEvidence(detail.id, 'geo') ? () => onOpenAxis('geo') : undefined}
        />
      </div>
      {detail.backing && (
        <div className="fbacking">
          <span className="fbacking__label">גיבוי ⟵ {detail.backing.patronHe}</span>
          <span className="fbacking__val">+{detail.backing.amount}</span>
          <p className="fbacking__text">משקל פוליטי מושאל — חלק מכוח המשיכה תלוי בנותן החסות.</p>
        </div>
      )}
    </div>
  )
}

// FORCES detail panel (forces view) — grouped header, then ONE of two content states: the score
// cluster (default) or an axis drill-down (see ForcesAxisPanel), reached by clicking an eco/mil/
// geo value. The old third state — a separate full-narrative destination behind a "תיאור מלא"
// toggle — is gone; that content now lives where it's actually about something: the general read
// expands in place inside ForcesScore (its own inline "קרא עוד"), and each axis's analytical read
// leads its own drill-down panel, ahead of that axis's graph.
// Content only — no outer <aside> (see PanelFrame below, and its comment, for why: this used to
// own its own <aside class="panelb panel--detail">, a SEPARATE element from ForcesIndexPanel's
// <aside class="panel">, so React fully unmounted/remounted the whole shell every time the ranked
// list and a selected body's detail swapped — the shell's own mount animation replaying looked
// like a "quick disappear and reappear" instead of the frame just holding still while its content
// changed. Close button now lives in PanelFrame, since it's the ONE thing that must be visible
// while ANY detail content (Forces or Dynamics) is showing, regardless of which detail component
// is rendering.
function ForcesPanelContent({ detail, onRelSelect }: DetailProps) {
  // two content states inside the ONE persistent shell: the score cluster (default) and an axis
  // drill-down (see ForcesAxisPanel). `axis` is only meaningful while mode === 'axis'; it's kept
  // alongside rather than inside the union so returning to the score view and re-entering the
  // same axis doesn't need to re-derive it.
  const [mode, setMode] = useState<'score' | 'axis'>('score')
  const [axis, setAxis] = useState<'eco' | 'mil' | 'geo'>('eco')
  // a fresh selection resets to the score view — it's per-body, not sticky. Especially true for
  // the drill-down: a criteria list for the body you just navigated away from is actively wrong.
  const [lastId, setLastId] = useState(detail.id)
  if (detail.id !== lastId) { setLastId(detail.id); setMode('score') }
  const openAxis = (a: 'eco' | 'mil' | 'geo') => { sound.play('open'); setAxis(a); setMode('axis') }
  const backToScore = () => { sound.play('back'); setMode('score') }
  return (
    <>
      <PanelHeader detail={detail} />
      <div className="fbody">
        {mode === 'axis' && detail.id
          ? <ForcesAxisPanel key={`${detail.id}-${axis}`} id={detail.id} axis={axis} onBack={backToScore} />
          : <ForcesScore detail={detail} onOpenAxis={openAxis} />}
      </div>
      {/* the relations list belongs to the body, not to one axis's criteria — inside the
          drill-down it would read as "relations of the economic score", which is meaningless. */}
      {mode !== 'axis' && detail.relations.length > 0 && (
        <div className="panel__rels">
          <span className="panel__rels-h">יחסים</span>
          <div className="panel__rels-list">
            {detail.relations.map((r) => (
              <button key={r.id} className="panel__rel" onClick={() => onRelSelect?.(r.id)}>{r.he}</button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// The persistent shell shared by the Forces ranked-list index and a selected body's detail — ONE
// <aside>, always mounted (ForcesView/ForcesGridView render this instead of switching between two
// differently-typed components), so toggling between "nothing selected" and "a body is selected"
// never remounts the panel itself. Only the CONTENT inside swaps, and each half keeps its own
// entrance choreography (ForcesIndexPanel's INDEX_BEAT, the detail panel's own BEAT) so the panel
// visibly re-sequences its contents in place instead of flashing out and back in — reported as
// "quick disappear and reappear" when it was two separate <aside>s doing a hard swap.
// Forces-specific: DynamicsView/RelationsView's own SidePanel fallback below is a simpler, separate
// case (its "nothing selected" state is one static paragraph, not a whole second panel's worth of
// controls + a ranked list) and was never affected by this bug.
export function ForcesPanelFrame({ selected, detail, onClose, onRelSelect, indexProps }: {
  selected: string | null
  detail: EntityDetail | null
  onClose: () => void
  onRelSelect?: (id: string) => void
  indexProps: ForcesIndexPanelProps
}) {
  const showDetail = !!(selected && detail)
  // "the entire sidepanel glows when changing countries" — one flash on the SHELL, keyed to a
  // pulse counter bumped only on a REAL country→country switch (not on first opening a body from
  // the ranked list, and not on closing back to it — those already have their own reveal).
  // Adjusted during render (same pattern as ForcesPanelContent's own lastId/mode reset above).
  const [lastId, setLastId] = useState<string | null>(null)
  const [glowPulse, setGlowPulse] = useState(0)
  const curId = detail?.id ?? null
  if (curId !== lastId) {
    if (lastId && curId) setGlowPulse((p) => p + 1)
    setLastId(curId)
  }
  return (
    <aside className="panelb panel--detail" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      {showDetail && <i className="panel-glow" key={glowPulse} aria-hidden />}
      {showDetail && <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>}
      {showDetail
        ? <ForcesPanelContent detail={detail!} onRelSelect={onRelSelect} />
        : <ForcesIndexPanel {...indexProps} />}
    </aside>
  )
}

// Self-contained wrapper around ForcesPanelContent — for the callers that DON'T go through
// ForcesPanelFrame's shared shell (the mobile sheet, and SidePanel's use in Dynamics/Relations):
// those need one complete <aside>, not a frame that persists across a ranked-list ⇄ detail toggle
// that doesn't exist in those contexts.
function ForcesPanel({ detail, onClose, onRelSelect }: DetailProps) {
  return (
    // stopPropagation: the outer .stage has an onClick that deselects the current body (for
    // clicking empty canvas space to close the panel). Without this guard, EVERY click inside the
    // panel bubbles up and immediately deselects too, reverting the whole panel closed.
    <aside className="panelb panel--detail" dir="rtl" onClick={(ev) => ev.stopPropagation()}>
      <button className="panel__close" onClick={onClose} aria-label="סגירה">✕</button>
      <ForcesPanelContent detail={detail} onRelSelect={onRelSelect} />
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
      {/* the map's own visual key, inline — was the "יחסי הכוחות = הכוחות + היחסים" formula, which
          named the relationship between the two other views without helping the reader parse the
          canvas in front of them. This was also the standalone Legend overlay's entire content
          (opened via a ⓘ button) — that overlay had exactly one trigger in the whole app
          (ForcesIndexPanel's "מקרא" button), removed now that this is inline instead of behind a
          click; the graphics classes (legend__row/group/pair/swatch, the size-ramp dots, the
          disk/rim marks) survive in overlays.css and are reused verbatim here. */}
      <div className="panel__legend">
        <p className="panel__legend-h">איך לקרוא את המפה</p>
        <div className="legend__rows">
          <div className="legend__row">
            <span className="legend__swatch legend__sizeramp"><i /><i /><i /></span>
            <span className="legend__txt"><b>גודל</b> = כוח משיכה</span>
          </div>
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
      </div>
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

// A timeline, not a tab strip: one line running under the three destinations, a small circle
// resting at whichever is active and sliding to the next on switch — the connective thread
// between the views instead of three separate button chips. Reuses the exact same measured-
// geometry approach the old solid-marker version used (real offsetLeft/offsetWidth off the live
// button elements, RTL-correct for free); only the visual language changes, so switching back is
// a pure CSS revert if this doesn't earn its place.
export function TabBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  const navRef = useRef<HTMLElement>(null)
  // the dot centres ON a stop, not across its width — track the stop's horizontal CENTRE, not its
  // left+width like the old block marker needed (a block covers the tab; a dot sits on a point).
  const [dotX, setDotX] = useState<number | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current
      if (!nav) return
      const idx = TABS.findIndex((t) => t.view === view)
      if (idx < 0) { setDotX(null); return }
      // buttons are the nav's first N children — .tline__track/.tline__dot below are trailing
      // siblings, so this index still lines up 1:1 with TABS, same as the old marker's lookup.
      const tabEl = nav.children[idx] as HTMLElement | undefined
      if (!tabEl) return
      setDotX(tabEl.offsetLeft + tabEl.offsetWidth / 2)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view])

  return (
    <nav className="tline" dir="rtl" aria-label="תצוגות" ref={navRef}>
      {TABS.map((t) => (
        <button
          key={t.he}
          className={`tline__stop${view === t.view ? ' tline__stop--active' : ''}${t.ready === false ? ' tline__stop--soon' : ''}`}
          aria-current={view === t.view ? 'page' : undefined}
          onClick={() => t.ready !== false && onView(t.view)}
        >
          {t.he}
        </button>
      ))}
      <span className="tline__track" aria-hidden />
      {dotX != null && (
        <span className="tline__dot" aria-hidden style={{ transform: `translateX(${dotX}px) translateX(-50%)` }} />
      )}
    </nav>
  )
}
