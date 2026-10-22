---
number: "0006"
type: plan
slug: scene-change-hero-to-work
title: Pinned scene change from the hero to the work section, triangle art behind the work, one card at a time
status: planned
created: 2026-10-22
tags: [plan, status/planned]
---

# 0006 — Plan: pinned scene change from the hero to the work section

**Hardened:** 2026-10-22 against `7d34811`

**Spec:** `docs/specs/0006-scene-change-hero-to-work.md` — the decisions and their why. This file
is only how they land.

## Goal

The hero and the work section share one pinned screen. Scrolling past a threshold plays a timed
scene change: the hero's text, portrait, fill/glow, outline and field leave in the reverse of
their intro order, then traced triangle art builds behind the work section, then its title,
controls and a single project card rise in, in the same place. Scrolling back plays it in
reverse. The nav is its own fixed bar over both scenes. The work section's grown canvas field and
all the code only it used are gone. The carousel shows one card per view, split picture | text
from 900 px. Without JS or with reduced motion the two sections stack at rest, as today.

## Starting point

Checked against `7d34811`. No code changed since `eb0014d`; every line reference below was
measured with `grep -n` / numbered reads on that tree.

- `app/page.tsx:7–8` renders `<Hero />` then `<Work />`; nothing after them.
- `components/Hero.tsx:6` is `<section id="top" …>`; `:7` mounts `<TriangleField handoff="leave" />`;
  the nav is inside `.hero-inner` (`:9–15`, `data-field="nav"`): logo `href="#top"` (:10), links
  `#work`, `#about` (:12–13). The hero holds no other focusable element.
- `components/Hero.module.css` — `.hero` has `overflow: hidden` (:3); intro tokens on `.hero`
  (:9–19, of which `--intro-text-delay / -step / -duration` and `--intro-ease` are :16–19);
  the leave comment (:20–25) and `--leave-portrait / -fill / -trace` (:26–28); `.hero-inner`
  `min-height: 100vh` (:40); nav styles `.hero-nav` (:47–58), `.hero-logo` (:60–67),
  `.hero-links` (:69–83); un-trace `.hero[data-leaving] .hero-frame-trace` (:143–146) and
  `.hero-frame-untip` (:149–152); text rules `.hero-hello` (:180–190), `.hero h1` (:192–201),
  `.hero-sub` (:208–216); `@keyframes hero-fade` (:262–266) and `hero-rise` (:268–273) set only
  `from`; reduced-motion block (:275–289, `.hero-links a` at :286).
- `components/TriangleField.tsx` (821 lines) — `TraceOrder` with `fromTop` (:52), `Handoff`
  (:55); `place()` takes `handoff` (:128–135) with the `grown` branches (:142–161, :211);
  component signature (:438); `pick()` scoped to the section, `frameEl` / `navEl` / `textEl`
  (:447–450); `leave` / `enter` (:491–493); `leaveProgress` / `enterProgress` / `shareLeave`
  (:495–516); `measure()` takes the nav relative to the section (`relativeRect(navEl, base)`,
  :543; bottom passed to `place()` at :549); `draw()` enter branch (:629–637), hero branch
  (:638–651); scroll scheduler `markDirty` / `drawnEnter` / `scrollFrame` / `schedule`
  (:682–706); `tick()` reads `leaveProgress()` (:732–735); `sync()` / IO / scroll listener
  (:751–776); `onMotionChange` (:778–797, resets `leave` / `shareLeave()` at :783–784,
  `drawnEnter` at :793); cleanup (:805–817, `--hero-leave` / `data-leaving` removal :815–816).
- `lib/field/config.ts` — `FieldConfig.handoff` (:97–112) and `.grow` (:113–131); `FIELD.handoff`
  (:176–180) and `FIELD.grow` (:181–197). `MOBILE_OVERRIDES` (:209) overrides neither.
  `lib/field/grow.ts` is imported only by `TriangleField.tsx:25`.
- `components/Work.tsx` — `id="work"` (:9), `aria-labelledby="work-title"` (:12), field import
  (:3) and mount with its comment (:14–16).
- `components/Work.module.css` — `.work` `overflow: hidden` (:7), `min-height: 80vh` (:8),
  opaque background (:9–12); `.inner` padding (:20; 64 px under 560 px, :36–40); `.track` bleed
  and `container-type` (:45–58); `.card` card-and-a-half basis (:63–64); phone 82 % (:145–149).
- `components/WorkCarousel.tsx` — `step()` measures the first card (:37–47); card markup
  title → img → desc → tags → link (:85–113), the link `<a className="btn btn-primary">` at
  :105–106.
- `app/globals.css` — `--nav-h` / `--logo-h` (:115–116, 72 / 22 px under 560 px :140–141),
  `html { scroll-behavior: smooth }` (:153, `auto` under reduced motion :164–166). No `overflow`
  on `html` / `body` (`app/layout.tsx` sets none either) — nothing breaks `position: sticky`.
- Gate words outside the dead code: `lib/field/lattice.ts:4` and :166 say "anchored" (the
  lattice stays). Every gate below therefore greps with `-w`; checked on this tree, `grep -rnw`
  works the same in GNU, BSD and ugrep.

## The scene clock — how the numbers flow

One number, `scene ∈ [0, 1]`, owned by the stage's client component and moved by a rAF tween.
Everything else is derived and written inline on the stage root (`[data-stage]`):

```
target      = past 25 % of the track → 1 ("work"); back above 15 % → 0 ("hero")   (hysteresis)
scene      += sign(target − scene) × dt / 2400 ms          (constant rate, clamped; loop stops at target)
--scene      = scene
--hero-leave = clamp01(scene / 0.55)
--work-enter = clamp01((scene − 0.45) / 0.55)
data-scene   = target === 1 ? "work" : "hero"
data-leaving   present while --hero-leave > 0
```

A constant-rate tween makes a mid-way reversal continuous (it flips sign from where it is). On
mount, a scroll position past the upper threshold sets `scene = 1` with no tween. Track progress =
`−root.getBoundingClientRect().top / (root.offsetHeight − innerHeight)`, read on a passive
`scroll` listener (one rect read; the handler writes only the target).

Each element reads its own sub-span of its half: `clamp(0, calc((var(--hero-leave, 0) − a) /
w), 1)`. Starting spans (tuned by eye with the owner):

| element | variable | span (start, width) |
|---|---|---|
| hero sub | `--leave-text-sub` | 0.00, 0.16 |
| hero h1 | `--leave-text-h1` | 0.06, 0.16 |
| hero hello | `--leave-text-hello` | 0.12, 0.16 |
| portrait | `--leave-portrait` | 0.22, 0.20 |
| fill / glow | `--leave-fill` | 0.36, 0.16 |
| outline un-trace | `--leave-trace` | 0.46, 0.34 |
| field | `presenceTime(1 − leave)` | whole 0..1 (existing) |
| work shade | `--work-shade` | 0.00, 0.20 (of `--work-enter`) |
| work triangle *i* trace / fill | inline per triangle | trace 0.10 + 0.12·i, 0.30; fill +0.25, 0.15 |
| work title / controls / card | `--work-in-title` / `-controls` / `-card` | 0.60 / 0.68 / 0.76, 0.24 |

Defaults mean "at rest": `var(--hero-leave, 0)` and `var(--work-enter, 1)`.

## Changes by area

### Dead work field (Card 1, commit 1)

- `components/Work.tsx` — drop the `TriangleField` import and mount with its comment (:3,
  :14–16).
- `components/TriangleField.tsx` — remove `Handoff` (:55), `"fromTop"` from `TraceOrder` (:52)
  and its branch in `renderTrace()`'s key (:370), the `growField` / `stopsAt` import (:25), the
  `handoff` parameter of `place()` and its `grown` branches (:133, :142–161, :211 — `elig` is
  always `eligible(…)`), `enter` and `enterProgress()`, the enter branch of `draw()`,
  `markDirty`'s `schedule()` branch, `scrollFrame` / `schedule` / `drawnEnter` (and its reset in
  `onMotionChange`), the `handoff === "enter"` branch of `sync()`, the scroll listener and its
  removal (:775–776, :808). `tick()` reads `leaveProgress()` unconditionally. Keep `leave` /
  `leaveProgress()` / `shareLeave()` (the hero still scrolls away until Card 3). Signature
  becomes `TriangleField()`, the effect's deps `[]`; `Hero.tsx:7` mounts `<TriangleField />`.
- Rewrite for one mode every comment that describes the work field, the grown field, the scroll
  handoff or an anchor: the spec's list (:107–108, :120–127, :239–243, :415–437, :617–624,
  :688–690) plus :72, :209–210 ("the shifted lattice anchor"), :354–357 (`fromTop` / "scroll
  handoff"), :752 and :792. The words `handoff` and `anchor` must not survive in this file —
  Card 3's gate greps for them.
- `lib/field/config.ts` — delete `grow` from `FieldConfig` (:113–131) and `FIELD` (:181–197);
  drop `enterStartAt` / `enterWholeAt` from both halves of `handoff` and rewrite its comment
  (:97–101) for the hero alone (only `leaveEndAt` stays until Card 3). `git rm lib/field/grow.ts`.

### Nav out of the hero (Card 1, commit 2)

- `components/Nav.tsx` (server component) — the `<nav data-field="nav" aria-label="Main">` from
  `Hero.tsx:9–15`, same markup and links. `components/Nav.module.css` — `.nav`, `.logo`,
  `.links` from `.hero-nav` / `.hero-logo` / `.hero-links` (`Hero.module.css:47–83`; `.nav`
  stays `position: absolute; top: 0` — the stacked layout), plus the `.links a` reduced-motion
  `animation: none`, plus **its own copy of the `hero-rise` keyframes** (e.g. `@keyframes rise`):
  CSS-module keyframe names are scoped per file, so `animation: hero-rise …` in
  `Nav.module.css` would name a keyframe that does not exist there and the links would skip
  their rise. Delete the moved rules and `.hero-links a` from the reduced-motion list in
  `Hero.module.css`.
- `app/globals.css` — move `--intro-text-delay`, `--intro-text-step`, `--intro-text-duration`,
  `--intro-ease` from `.hero` (`Hero.module.css:16–19`, deleted there) to `:root` (values
  unchanged); the other `--intro-*` stay on `.hero`.
- `app/page.tsx` — `<Nav /><Hero /><Work />`.
- `TriangleField.tsx` — `navEl = document.querySelector('[data-field="nav"]')` instead of
  `pick("nav")`; `frameEl` / `textEl` keep `pick()`. The nav stays measured **against the
  section** (`relativeRect(navEl, base)`, :543 — unchanged). That is right in both layouts:
  stacked, the absolute nav and the hero scroll together, so the offset is constant; staged,
  the hero is pinned at the viewport top, so section and viewport coincide. A viewport-only
  bottom (`getBoundingClientRect().bottom`) would go negative on a re-measure while scrolled in
  the stacked layout (resize, font load, reduced-motion still frame) and push the field into the
  bar. The `ResizeObserver` keeps observing `navEl` (:800).

### One card per view (Card 2, commit 1)

- `Work.module.css` — `.card { flex: 0 0 100% }` (the track's content box, which is the row
  from the heading's left edge to its right), replacing the `calc(… / 1.5)` and the comment
  above it (:60–62); delete the 560 px `flex-basis: 82%` override (:145–149).
  `@media (min-width: 900px)`: `.card { display: grid; grid-template-columns: minmax(0, 1.1fr)
  minmax(0, 1fr); grid-template-areas: "img title" "img desc" "img tags" "img link";
  column-gap: 32px; align-content: center }` with `grid-area` on `.card-title`, `.card-img`,
  `.card-desc`, `.card-tags`, `.card-link`. The track's bleed + `scroll-padding` leave no sliver
  of the next card at 100 %; touch them only if one shows.
- `WorkCarousel.tsx` — add `${styles["card-link"]}` to the link's `className` (:106); `step()`
  is unchanged.

### Hero text leaves in reverse (Card 2, commit 2)

- `Hero.module.css` `.hero` — add `--leave-text-sub / -h1 / -hello` and re-time
  `--leave-portrait / -fill / -trace` per the table (still from `var(--hero-leave, 0)`); update
  the comment above them (:20–25) to the new order.
- Base rules: `.hero-sub`, `.hero h1`, `.hero-hello` get `opacity: calc(1 - var(--leave-text-…));
  transform: translateY(calc(12px * var(--leave-text-…)))` — `hero-rise`'s `from` is the same
  pair, so the intro ends on these live values (implicit end keyframe).
- Driven by today's scroll-scrubbed `--hero-leave` from `TriangleField` until Card 3.

### The stage (Card 3)

- `components/Stage.tsx` (`"use client"`) — props `nav`, `hero`, `work` (ReactNode, so `Hero` /
  `Work` / `Nav` stay server components). Markup:
  `<div data-stage className={root}>{nav}<div className={pin}><div className={heroScene}>{hero}</div><div className={workScene}>{work}</div></div><span id="work" className={mark} /></div>`.
  The stage owns both scene wrappers, so `aria-hidden` and `pointer-events` sit on its own
  elements, never on DOM rendered by `Hero` / `Work`. `app/page.tsx` →
  `<Stage nav={<Nav />} hero={<Hero />} work={<Work />} />`.
- `components/Stage.module.css` — base: nothing (stacked). Under `.root[data-staged]`:
  `.root { height: 200svh }`, `.pin { position: sticky; top: 0; height: 100svh }`,
  `.heroScene { height: 100% }`, `.workScene { position: absolute; inset: 0 }`,
  `.mark { position: absolute; bottom: 0 }` with `.root { position: relative }` (named `mark`,
  never `anchor`, so the grep gate stays clean). The inactive scene is `pointer-events: none`:
  `.root[data-scene="hero"] .workScene`, `.root[data-scene="work"] .heroScene`. No `overflow` on
  `.root` or `.pin`.
- Mount effect: `data-staged` only when `!matchMedia("(prefers-reduced-motion: reduce)").matches`;
  follow the `change` event live (on reduce: drop `data-staged`, cancel the tween, remove
  `--scene` / `--hero-leave` / `--work-enter` / `data-scene` / `data-leaving`, drop
  `aria-hidden`). Instant set on mount when past the threshold (also covers `/#work`). Inline
  properties are written through a ref every tween frame; `data-scene` / `aria-hidden` change
  only on a target flip.
- `TriangleField.tsx` — delete `leaveProgress()`, `shareLeave()`, `sharedLeave` and the cleanup
  removals (:815–816); in `onMotionChange` keep `leave = 0` and drop only `shareLeave()`
  (:784). Add `stage = section.closest<HTMLElement>("[data-stage]")` and one
  `readLeave = () => parseFloat(stage?.style.getPropertyValue("--hero-leave") ?? "") || 0`
  (no stage → 0). `tick()` sets `leave = readLeave()`; when `leave === 1` it draws once (the
  canvas comes out empty: `presenceTime(cfg, 0)`) and does not request the next frame (`raf = 0`).
  `sync()` re-reads `leave = readLeave()` itself — the parked loop is not updating it — and its
  visible condition gains `leave < 1`. A `MutationObserver` on the stage's `style` attribute
  calls `sync()` (disconnected in cleanup). Rewrite the component comment's `--hero-leave`
  paragraph (:428–430) for the stage. `config.ts` — delete `handoff` from `FieldConfig` and
  `FIELD`.
- `Hero.module.css` — un-trace selector → `:global([data-leaving]) .hero-frame-trace`; under
  `:global([data-staged])`: `.hero { height: 100% }` and `.hero-inner { min-height: 100% }`
  (instead of `100vh`). Rewrite the leave comment (:20–25): the stage sets `--hero-leave`.
- `Nav.module.css` — `:global([data-staged]) .nav { position: fixed }`.
- `Work.module.css` — `:global([data-staged]) .work { background: none; min-height: 0;
  height: 100% }`; `.inner` top padding must clear `--nav-h` (96 px today vs 88 px; 64 px vs
  72 px under 560 px — raise it under `[data-staged]` there). Title, controls and track read
  `--work-in-*` sub-spans through base rules (`opacity` + 12 px `translateY`, as `hero-rise`),
  resolving to exactly `opacity: 1` at rest.
- Focus / hash / ARIA: the `#work` id moves from `Work.tsx:9` to the stage's `.mark` (the
  section keeps `aria-labelledby`). A `focusin` listener on `.workScene` — if `data-scene` is
  `hero`, `mark.scrollIntoView()` (smooth via `html`). `aria-hidden` on `.heroScene` while the
  scene is `work`. The work section is never `aria-hidden` / `inert`. The section's `id="top"`
  goes (`Hero.tsx:6`): staged, the hero sits inside the stuck pin, so scrolling to it is a no-op
  and the logo would do nothing from the work scene; with no `#top` element, HTML resolves
  `#top` to the top of the document, which is the hero in both layouts.

### Work triangle art (Card 4)

- `components/WorkArt.tsx` (server component, no state — `useId` is allowed in server
  components) — one inline `<svg aria-hidden="true">` absolutely placed behind `.inner` in
  `Work.tsx` (`.work` is already `position: relative; overflow: hidden`, `.inner` `z-index: 1`):
  a radial shade (`#33969b`, `stop-opacity` 0.55) reading `--work-shade`, and 3–5 equilateral
  triangles in the placeholder language (gradient `#33969b → #3a80b7`, `fill-opacity`
  0.10 / 0.18 / 0.26, stroke `#33969b` 0.7, 1.5 px), each with its own mask trace
  (`stroke-dasharray` = perimeter, `stroke-dashoffset` from its trace span), a lit tip on
  `offset-path` (as `.hero-frame-untip`, `Hero.module.css:117–125`, :149–152), and a fill fade
  after the trace. Mask and gradient ids from `useId`. Each triangle's span start / width passed
  as inline custom properties (`--t0`, `--tw`) and computed in CSS from `var(--work-enter, 1)`.
- `components/WorkArt.module.css` — the art's position per breakpoint, behind and beside the
  card so the glass has something to blur; reduced motion: no tips, art at rest.

## Risks

- **Hero taller than `100svh` on phone.** At 390×844 the stacked hero is ~900 px (112 px image
  margin + frame + text + 120 px bottom padding, `globals.css:145–147`); pinned at
  `height: 100%` with `overflow: hidden` (:3), the bottom is clipped. Mostly padding — check by
  eye that the sub's last line shows; if not, trim `--text-pad` / `--img-margin` under
  `[data-staged]` only. Same family as the spec's open question on work content height (drop the
  pin below `max-height: 560px` — add only if seen).
- **Leaving during the load intro** (spec open question): `hero-frame-trace` overrides the
  un-trace while active. Accepted; do not add `animation: none` under `data-leaving`.
- **`position: sticky` silently failing** if any ancestor gets `overflow` ≠ `visible`. None
  today; keep `overflow: hidden` on the scene sections only, never on `.root`, `.pin` or above.
- **Hydration flash on `/#work`**: the server HTML is stacked; the browser lands on the mark at
  the document end, then the stage mounts and sets scene 1 (stacked, that offset is ≥ 80 vh, so
  progress is past 25 %). The stacked layout may show for a frame before pinning. Check by eye;
  a `useLayoutEffect` for the initial set if it shows.
- **Work link in the stacked fallback** (reduced motion, no JS): the mark sits after the work
  section, so the link scrolls to the document end rather than the section's top. The work
  section fits a viewport at the check sizes, so it reads as landing on Work with the hero's tail
  above. Check at 390×844 with reduced motion; if it reads badly, make `.pin` `display: contents`
  in the stacked base and `order` the mark before `.workScene`.
- **Glass during the rise.** `opacity < 1` on `.track` makes it a backdrop root, so the cards'
  `backdrop-filter` does not blur the art while they rise. Brief and accepted; never add
  `will-change: opacity`, and keep the at-rest value exactly 1.
- **MutationObserver churn**: fires every tween frame (~150 over 2.4 s) and only calls `sync()`
  — cheap; no work at rest.
- **`backdrop-filter` over SVG art in Safari** — owner check, as in 0004 / 0005.

## Verification

- `npm run lint` and `npm run build` exit 0 after each commit.
- `npm run dev` in Chrome (claude-in-chrome when available, else headless) at 1440×900, 900×1100
  and 390×844, per card's `done when`; the final pass is the spec's §Done when in full:
  - fresh load: hero intro unchanged; scroll past the threshold → screen holds; sub, h1, hello,
    portrait, fill/glow, outline, field leave in order; work triangles trace in; title and card
    rise in; scroll back → reverse; reverse mid-way → no jump; at rest in work nothing of the
    hero shows;
  - nav on screen and clickable throughout; Work link plays the change; the logo from the work
    scene plays it back; `/#work` opens on the work scene without a replay; Tab from the nav
    reaches the controls and the track and switches scene;
  - Performance panel with the work scene idle: no per-frame `TriangleField` draw;
  - `grep -rnw "growField\|stopsAt\|handoff\|anchor\|enterProgress\|leaveProgress" components lib`
    finds nothing;
  - one card per view at every size; split picture | text ≥ 900 px; prev/next one card, disabled
    at the ends;
  - DevTools reduced motion (also toggled mid-scene) and JS disabled: stacked, no pin, nav at the
    page top, everything at rest; the nav's links still rise in on load with motion allowed.
- Safari: recorded as an owner check if not drivable.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card touches `components/Work.module.css` or `components/TriangleField.tsx`,
and Cards 3–4 depend on the earlier ones, so the cards are a sequence.

### Card 1 — one-mode field and the nav as its own component
precondition:  none — first session. `7d34811` or later on the branch; `Work.tsx:16` still mounts the grown field
read for why:  spec §Shape ("The work field is removed…", "The nav leaves the hero"); this plan §Dead work field and §Nav out of the hero — follow only if you need the why
model:         opus
commits:
  1. refactor: drop the work section's grown field
     touches: components/TriangleField.tsx, components/Work.tsx, components/Hero.tsx, lib/field/config.ts, lib/field/grow.ts (git rm)  (only these)
     do:      - remove the enter mode, `anchor`, `Handoff`, `fromTop`, `place()`'s `handoff` param and `grown` branches, scroll scheduler and listener per this plan §Dead work field; keep `leaveProgress` / `shareLeave` / `FIELD.handoff.leaveEndAt`
              - `TriangleField()` takes no props, effect deps `[]`; `Hero.tsx:7` and `Work.tsx` updated; every listed comment rewritten for one mode, no `handoff` / `anchor` left in the file
              - `grow` and `enterStartAt` / `enterWholeAt` deleted from `FieldConfig` and `FIELD`; `git rm lib/field/grow.ts`
  2. refactor: move the nav out of the hero
     touches: components/Nav.tsx, components/Nav.module.css, components/Hero.tsx, components/Hero.module.css, app/globals.css, app/page.tsx, components/TriangleField.tsx  (only these)
     do:      - `Nav.tsx` + module from `Hero.tsx:9–15` / `Hero.module.css:47–83`, its own copy of the rise keyframes, its reduced-motion line; still absolute at the page top
              - `--intro-text-*` and `--intro-ease` moved from `.hero` to `:root` in `globals.css`; `page.tsx` renders `<Nav />` before `<Hero />`
              - field finds `[data-field="nav"]` in the document; the nav stays measured with `relativeRect(navEl, base)`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; `grep -rnw "growField\|stopsAt\|enterProgress\|enterStartAt\|enterWholeAt\|fromTop\|Handoff\|anchor" components lib` is empty and `grep -rnw "handoff" components lib` hits only `lib/field/config.ts`; `lib/field/grow.ts` is gone; in `npm run dev` at 1440×900 and 390×844 the hero intro, the nav (links rise in last, not instantly) and the scroll-away dissolve look as before, the field's nav band still stops below the bar — also after a window resize while scrolled half-way down the hero — and the work section shows no canvas over its unchanged background; all commits landed

### Card 2 — one card per view, and the hero text leaving in reverse
precondition:  Card 1 landed — work section has no field; nav in `components/Nav.tsx`
read for why:  spec §Shape ("One card per view", "The hero leaves in the reverse of its intro order"); this plan §The scene clock table — follow only if you need the why
model:         opus
commits:
  1. feat: one project card at a time, split on desktop
     touches: components/Work.module.css, components/WorkCarousel.tsx  (only these)
     do:      - `.card` full row (`flex: 0 0 100%`), the `calc(… / 1.5)` and its comment and the 82 % phone override gone (`Work.module.css:60–64`, :145–149)
              - ≥ 900 px two-column grid, picture left (16:10), title / desc / tags / link right; `.card-link` class added at `WorkCarousel.tsx:106`
  2. feat: play the hero text out in reverse of its intro
     touches: components/Hero.module.css  (only these)
     do:      - `--leave-text-sub / -h1 / -hello` on `.hero`; `--leave-portrait / -fill / -trace` re-timed per the table; leave comment updated
              - `opacity` + 12 px `translateY` base rules on `.hero-sub`, `.hero h1`, `.hero-hello`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; in `npm run dev` at 1440×900, 900×1100 and 390×844 exactly one card shows (no peek), split picture | text at 1440 and 900, stacked at 390, prev/next move one card and disable at the ends; scrolling the hero away (today's scrub) fades sub, h1, hello in that order, then portrait, fill/glow, outline; the load intro is unchanged; all commits landed

### Card 3 — the stage: pin, timed scene change, nav fixed, focus and hash
precondition:  Card 2 landed — hero `--leave-*` spans re-timed; nav is its own component; one card per view
read for why:  spec §Shape (stage, scene variable, numbers on the stage root, `TriangleField` reads the scene, hash links and focus, opt-in pin); this plan §The scene clock, §The stage and §Risks — follow when tuning or when something does not pin
model:         opus
commits:
  1. feat: pin the hero and work in one stage with a timed scene change
     touches: components/Stage.tsx, components/Stage.module.css, app/page.tsx, components/TriangleField.tsx, lib/field/config.ts, components/Hero.module.css, components/Nav.module.css, components/Work.module.css  (only these)
     do:      - `Stage` per this plan §The stage: own `heroScene` / `workScene` wrappers, track, hysteresis, constant-rate rAF tween, instant set on mount, inline `--scene` / `--hero-leave` / `--work-enter` / `data-scene` / `data-leaving`; `data-staged` gated on motion, live
              - field reads `--hero-leave` from `closest("[data-stage]")` through one `readLeave()` used by `tick()` and `sync()`, parks at `leave === 1` with a MutationObserver wake-up; `leaveProgress()`, `shareLeave()` and `handoff` (type and value) deleted
              - un-trace selector `:global([data-leaving])`; fixed nav, transparent / full-height work scene, `.hero` `height: 100%` and `.hero-inner` `min-height: 100%` under `data-staged`
  2. feat: rise the work content in after the scene change
     touches: components/Work.module.css  (only these)
     do:      - `--work-in-title / -controls / -card` spans on `.work` from `var(--work-enter, 1)`; `opacity` + 12 px `translateY` base rules on `.work-title`, `.controls`, `.track`, exactly 1 / 0 at rest
  3. feat: land hash links and keyboard focus in the work scene
     touches: components/Stage.tsx, components/Stage.module.css, components/Work.tsx, components/Hero.tsx  (only these)
     do:      - `#work` id moves from `Work.tsx:9` to the stage's end-of-track `.mark` (section keeps `aria-labelledby`); `id="top"` removed from `Hero.tsx:6`
              - `focusin` on `.workScene` while `hero` → scroll to the `.mark`; `pointer-events: none` on the inactive scene wrapper; `aria-hidden` on `.heroScene` while `work`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; `grep -rnw "growField\|stopsAt\|handoff\|anchor\|enterProgress\|leaveProgress\|shareLeave" components lib` finds nothing; in `npm run dev` at 1440×900, 900×1100 and 390×844: the screen holds past the threshold and the hero leaves in order, then the work title and card rise in, in the same place; back reverses; reversing mid-way does not jump; the nav stays clickable, its Work link plays the change and its logo plays it back from the work scene; `/#work` opens on the work scene with no replay; Tab from the nav reaches the controls and the track and switches scene; the Performance panel shows no per-frame `TriangleField` draw while the work scene idles, and the field resumes when scrolling back; reduced motion (also toggled mid-scene) and JS disabled stack the page at rest with the nav at the top and the Work link landing on the work section (this plan §Risks); the hero's phone clipping checked (this plan §Risks); all commits landed

### Card 4 — traced triangle art behind the work card
precondition:  Card 3 landed — the stage writes `--work-enter`; work content rises in from 0.60
read for why:  spec §Shape ("The work background is triangle art, in SVG"), §Current state (placeholder art); `components/Hero.tsx:32–52` and `Hero.module.css:117–125`, :140–152 for the mask trace and the untip — follow only if you need the why
model:         opus
commits:
  1. feat: trace triangle art in behind the work card
     touches: components/WorkArt.tsx, components/WorkArt.module.css, components/Work.tsx  (only these)
     do:      - `WorkArt.tsx` per this plan §Work triangle art: shade on `--work-shade`, 3–5 masked triangles with `useId` ids, per-triangle `--t0` / `--tw`, lit tip on `offset-path`, fill after trace
              - mounted behind `.inner` in `Work.tsx`; position per breakpoint by eye against `public/work/placeholder-*.svg`; reduced motion: no tips, art at rest
done when:     `npm run lint` and `npm run build` exit 0; in `npm run dev` at 1440×900, 900×1100 and 390×844 the shade fades in, the triangles trace edge by edge with a lit tip and then fill, then the title and card rise in over them, the card's glass blurs the art, scrolling back reverses it; the stacked fallback (reduced motion, JS off) shows the art at rest over today's background; the spec's §Done when passes in full; Safari checked or recorded as an owner check; committed
