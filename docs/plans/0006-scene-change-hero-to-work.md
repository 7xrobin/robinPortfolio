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

**Spec:** `docs/specs/0006-scene-change-hero-to-work.md` (hardened 2026-10-22 against `eb0014d`)
— the decisions and their why. This file is only how they land.

## Goal

The hero and the work section share one pinned screen. Scrolling past a threshold plays a timed
scene change: the hero's text, portrait, fill/glow, outline and field leave in the reverse of
their intro order, then traced triangle art builds behind the work section, then its title,
controls and a single project card rise in, in the same place. Scrolling back plays it in
reverse. The nav is its own fixed bar over both scenes. The work section's grown canvas field and
all the code only it used are gone. The carousel shows one card per view, split picture | text
from 900 px. Without JS or with reduced motion the two sections stack at rest, as today.

## Starting point

Checked against `4f487b3` (spec 0006 hardened). No code changed since `eb0014d`, so the spec's
line references hold.

- `app/page.tsx:6–9` renders `<Hero /><Work />`; nothing after them.
- `components/Hero.tsx:7` mounts `<TriangleField handoff="leave" />`; the nav is inside
  `.hero-inner` (`Hero.tsx:9–15`, `data-field="nav"`, links `#work`, `#about`).
- `components/Hero.module.css` — intro tokens on `.hero` (:9–19), `--leave-portrait / -fill /
  -trace` (:26–28), nav styles (:47–83), the un-trace `.hero[data-leaving] .hero-frame-trace`
  (:143–146) and `.hero-frame-untip` (:149–152), text rules `.hero-hello` (:178–189), `.hero h1`
  (:191–201), `.hero-sub` (:208–216), `hero-rise` sets only `from` (:263–268), reduced-motion
  block (:271–288).
- `components/TriangleField.tsx` (821 lines) — `Handoff` type, `handoff` / `anchor` props
  (:438), `pick()` scoped to the section (:447–450), `leaveProgress` / `enterProgress` /
  `shareLeave` (:495–516), `draw()` enter branch (:629–637), scroll scheduler (:680–706),
  `tick()` reads `leaveProgress()` (:733–736), `sync()` / IO / scroll listener (:752–776),
  motion change resets `--hero-leave` (:779–797), cleanup (:803–817).
- `lib/field/config.ts` — `FIELD.handoff` (:97–112, :176–180), `FIELD.grow` (:113–131,
  :181–197). `lib/field/grow.ts` imported only by `TriangleField.tsx:25`.
- `components/Work.tsx:16` mounts `<TriangleField handoff="enter" anchor=… />`;
  `Work.module.css` — opaque `.work` background (:5–13), `.inner` padding (:15–25, :36–40),
  `.card` card-and-a-half basis (:63–64), phone 82 % (:145–149).
- `components/WorkCarousel.tsx` — `step()` measures the first card (:37–47); card markup
  title → img → desc → tags → link (:85–114).
- `app/globals.css` — `--nav-h` / `--logo-h` (:115–116, :140–141), `html { scroll-behavior:
  smooth }` (:153). No `overflow` on `html` / `body` — nothing breaks `position: sticky`.

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

A constant-rate tween makes a mid-way reversal trivially continuous (it just flips sign from
where it is). On mount, a scroll position past the upper threshold sets `scene = 1` with no tween.
Track progress = `−root.getBoundingClientRect().top / (root.offsetHeight − innerHeight)`,
read on a passive `scroll` listener (one rect read, no writes in the handler beyond the target).

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

- `components/Work.tsx` — drop the `TriangleField` import and mount (:3, :14–16).
- `components/TriangleField.tsx` — remove `Handoff`, the `anchor` prop, `growField` / `stopsAt`
  import (:25), `fromTop` order (:52, :370), `enter` / `enterProgress()`, the `grown` branches
  in `place()` (:142–161, :211), the enter branch of `draw()`, `markDirty`'s schedule branch,
  `scrollFrame` / `schedule` / `drawnEnter`, the `handoff === "enter"` branch of `sync()`, the
  scroll listener. Keep `leave` / `leaveProgress()` / `shareLeave()` for now (the hero still
  scrolls away until Card 3). Signature becomes `TriangleField()`; `Hero.tsx:7` mounts
  `<TriangleField />`. Rewrite the comments the spec lists (:107–108, :120–127, :239–243,
  :415–437, :617–624, :688–690) for one mode.
- `lib/field/config.ts` — delete `FIELD.grow` and its type; drop `enterStartAt` /
  `enterWholeAt` from `handoff` (only `leaveEndAt` stays until Card 3). `git rm lib/field/grow.ts`.

### Nav out of the hero (Card 1, commit 2)

- `components/Nav.tsx` (server component) — the `<nav data-field="nav" aria-label="Main">` from
  `Hero.tsx:9–15`, unchanged markup. `components/Nav.module.css` — `.nav`, `.logo`, `.links`
  moved from `Hero.module.css:47–83` (`.nav` stays `position: absolute; top: 0` — the stacked
  layout), plus its reduced-motion `animation: none` on `.links a`.
- `app/globals.css` — move `--intro-text-delay`, `--intro-text-step`, `--intro-text-duration`,
  `--intro-ease` from `.hero` to `:root` (values unchanged); keep the other `--intro-*` on `.hero`.
- `app/page.tsx` — `<Nav /><Hero /><Work />`.
- `TriangleField.tsx` — `navEl = document.querySelector('[data-field="nav"]')`; nav bottom =
  `navEl.getBoundingClientRect().bottom` (viewport), not relative to the section (:543).
  `frameEl` / `textEl` keep `pick()`.

### One card per view (Card 2, commit 3)

- `Work.module.css` — `.card { flex: 0 0 100% }` (container-relative: `100cqi`), delete the
  `calc(… / 1.5)` and the 560 px `flex-basis: 82%` override. `@media (min-width: 900px)`:
  `.card { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  grid-template-areas: "img title" "img desc" "img tags" "img link"; column-gap: 32px;
  align-content: center }` with `grid-area` on `.card-title`, `.card-img`, `.card-desc`,
  `.card-tags`, the link (add a `.card-link` class in `WorkCarousel.tsx:107`). Remove the
  track's bleed peek only if a sliver of the next card shows (the bleed + `scroll-padding`
  should leave none at 100 %).
- `WorkCarousel.tsx` — only the `.card-link` class; `step()` is unchanged.

### Hero text leaves in reverse (Card 2, commit 4)

- `Hero.module.css` `.hero` — add `--leave-text-sub / -h1 / -hello` and re-time
  `--leave-portrait / -fill / -trace` per the table above (still `var(--hero-leave, 0)`).
- Base rules: `.hero-sub`, `.hero h1`, `.hero-hello` get `opacity: calc(1 − var(--leave-text-…));
  transform: translateY(calc(12px * var(--leave-text-…)))` — `hero-rise`'s `from` is the same
  pair, so the intro ends on these live values.
- Driven by today's scroll-scrubbed `--hero-leave` from `TriangleField` until Card 3.

### The stage (Card 3)

- `components/Stage.tsx` (`"use client"`) — props `nav`, `hero`, `work` (ReactNode, so `Hero` /
  `Work` / `Nav` stay server components). Markup:
  `<div data-stage className={root}>{nav}<div className={pin}>{hero}<div className={workScene}>{work}</div></div><span id="work" className={mark} /></div>`.
  `app/page.tsx` → `<Stage nav={<Nav />} hero={<Hero />} work={<Work />} />`.
- `components/Stage.module.css` — base: nothing (stacked). Under `.root[data-staged]`:
  `.root { height: calc(200svh) }` (`--stage-track: 100svh`), `.pin { position: sticky; top: 0;
  height: 100svh }`, `.workScene { position: absolute; inset: 0 }`, scene sections
  `height: 100%` (through `:global` hooks on the hero / work roots, or the `.workScene` child
  selector); `.mark { position: absolute; bottom: 0 }` (named `mark`, never `anchor`, so the grep gate stays clean). The inactive scene
  `pointer-events: none` via `[data-scene="hero"] .workScene`, `[data-scene="work"] .pin >
  :first-child`.
- Mount effect: `data-staged` only when `!matchMedia("(prefers-reduced-motion: reduce)").matches`;
  follow the `change` event live (on reduce: drop `data-staged`, cancel the tween, remove
  `--scene` / `--hero-leave` / `--work-enter` / `data-scene` / `data-leaving`). Instant set on
  mount when past the threshold (also covers `/#work`).
- `TriangleField.tsx` — delete `leaveProgress()`, `shareLeave()` and their resets (:779–784,
  :815–816). `stage = section.closest("[data-stage]")`; each `tick` reads
  `leave = parseFloat(stage.style.getPropertyValue("--hero-leave")) || 0` (no stage → 0). When
  `leave === 1`: clear the canvas once and park the loop (no rAF); a `MutationObserver` on the
  stage's `style` attribute calls `sync()`, which restarts the loop once `leave < 1`.
  `sync()`'s visible condition gains `leave < 1`. `config.ts` — delete `FIELD.handoff` and its
  type.
- `Hero.module.css` — un-trace selector → `:global([data-leaving]) .hero-frame-trace`;
  `.hero-inner` gets `min-height: 100%` under `:global([data-staged])` (instead of `100vh`).
- `Nav.module.css` — `:global([data-staged]) .nav { position: fixed }`.
- `Work.module.css` — `:global([data-staged]) .work { background: none; min-height: 0;
  height: 100% }`; `.inner` top padding must clear `--nav-h`. Title, controls, track read
  `--work-in-*` sub-spans through base rules (`opacity` + 12 px `translateY`, as `hero-rise`).
- Focus / hash / ARIA: a `focusin` listener on the work scene — if `data-scene` is `hero`,
  `mark.scrollIntoView()` (smooth via `html`). `aria-hidden` on the hero section while the
  scene is `work` (set on the `.pin > :first-child` from the stage, not inside `Hero`). The work
  section is never `aria-hidden` / `inert`.

### Work triangle art (Card 4)

- `components/WorkArt.tsx` (server component, no state — `useId` is fine server-side) — one
  inline `<svg aria-hidden="true">` absolutely placed behind `.inner` in `Work.tsx`: a radial
  shade (`#33969b`, `stop-opacity` 0.55) reading `--work-shade`, and 3–5 equilateral triangles
  in the placeholder language (gradient `#33969b → #3a80b7`, `fill-opacity` 0.10 / 0.18 / 0.26,
  stroke `#33969b` 0.7, 1.5 px), each with its own mask trace (`stroke-dasharray` = perimeter,
  `stroke-dashoffset` from its trace span), a lit tip on `offset-path` (as
  `.hero-frame-untip`), and a fill fade after the trace. Ids from `useId`. Each triangle's span
  start / width passed as inline custom properties (`--t0`, `--tw`) and computed in CSS from
  `var(--work-enter, 1)`.
- `components/Work.module.css` (or a `WorkArt.module.css`) — the art's position per breakpoint,
  behind and beside the card so the glass has something to blur; reduced motion: no tips.

## Risks

- **Hero taller than `100svh` on phone.** At 390×844 the stacked hero is ~900 px (112 px image
  margin + frame + text + 120 px bottom padding, `globals.css:140–150`); pinned at
  `height: 100%` with `overflow: hidden`, the bottom is clipped. Mostly padding — check by eye
  that the sub's last line shows; if not, trim `--text-pad` / `--img-margin` under
  `[data-staged]` only. Same family as the spec's open question on work content height (drop the
  pin below `max-height: 560px` — add only if seen).
- **Leaving during the load intro** (spec open question): `hero-frame-trace` overrides the
  un-trace while active. Accepted; do not add `animation: none` under `data-leaving`.
- **`position: sticky` silently failing** if any ancestor gets `overflow` ≠ `visible`. None
  today; keep `overflow: hidden` on `.pin`'s children, never on `.root` or above.
- **Hydration flash on `/#work`**: the server HTML is stacked; the stage mounts and jumps to
  scene 1. The scroll position lands on the anchor at the track end, so the page shows the
  stacked layout for a frame before pinning. Check by eye; a `useLayoutEffect` for the initial
  set if it shows.
- **The spec's grep gate matches a survivor.** `lib/field/lattice.ts:4` and :166 say "anchored"
  (the lattice stays), so the spec's literal `grep -rn … anchor …` can never be empty. This plan
  runs it with `-w` (whole words); the stage names its end-of-track element `mark`, and the
  rewritten `TriangleField` comments avoid the bare word `anchor`.
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
  - nav on screen and clickable throughout; Work link plays the change; `/#work` opens on the
    work scene without a replay; Tab from the nav reaches the controls and the track and
    switches scene;
  - Performance panel with the work scene idle: no per-frame `TriangleField` draw;
  - `grep -rnw "growField\|stopsAt\|handoff\|anchor\|enterProgress\|leaveProgress" components lib`
    finds nothing;
  - one card per view at every size; split picture | text ≥ 900 px; prev/next one card, disabled
    at the ends;
  - DevTools reduced motion (also toggled mid-scene) and JS disabled: stacked, no pin, nav at the
    page top, everything at rest.
- Safari: recorded as an owner check if not drivable.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card touches `components/Work.module.css` or `components/TriangleField.tsx`,
and Cards 3–4 depend on the earlier ones, so the cards are a sequence.

### Card 1 — one-mode field and the nav as its own component
precondition:  none — first session. `4f487b3` or later on the branch; `Work.tsx:16` still mounts the grown field
read for why:  spec §Shape ("The work field is removed…", "The nav leaves the hero") — follow only if you need the why
model:         opus
commits:
  1. refactor: drop the work section's grown field
     touches: components/TriangleField.tsx, components/Work.tsx, components/Hero.tsx, lib/field/config.ts, lib/field/grow.ts (git rm)  (only these)
     do:      - remove the enter mode, `anchor`, `Handoff`, `fromTop`, `grown` branches, scroll scheduler and listener per this plan §Dead work field; keep `leaveProgress` / `shareLeave` / `FIELD.handoff.leaveEndAt`
              - `TriangleField()` takes no props; `Hero.tsx:7` and `Work.tsx` updated; comments rewritten for one mode
              - `FIELD.grow` and `enterStartAt` / `enterWholeAt` deleted from `config.ts`; `git rm lib/field/grow.ts`
  2. refactor: move the nav out of the hero
     touches: components/Nav.tsx, components/Nav.module.css, components/Hero.tsx, components/Hero.module.css, app/globals.css, app/page.tsx, components/TriangleField.tsx  (only these)
     do:      - `Nav.tsx` + module from `Hero.tsx:9–15` / `Hero.module.css:47–83` and the nav's reduced-motion line; still absolute at the page top
              - `--intro-text-*` and `--intro-ease` to `:root` in `globals.css`; `page.tsx` renders `<Nav />` before `<Hero />`
              - field finds `[data-field="nav"]` in the document and takes its bottom from `getBoundingClientRect().bottom`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; `grep -rnw "growField\|stopsAt\|enterProgress\|anchor" components lib` is empty; in `npm run dev` at 1440×900 and 390×844 the hero intro, the nav (links rise in last) and the scroll-away dissolve look as before, the field's nav band still stops below the bar, and the work section shows no canvas over its unchanged background; all commits landed

### Card 2 — one card per view, and the hero text leaving in reverse
precondition:  Card 1 landed — work section has no field; nav in `components/Nav.tsx`
read for why:  spec §Shape ("One card per view", "The hero leaves in the reverse of its intro order"); this plan §The scene clock table — follow only if you need the why
model:         opus
commits:
  1. feat: one project card at a time, split on desktop
     touches: components/Work.module.css, components/WorkCarousel.tsx  (only these)
     do:      - `.card` full row, `calc(… / 1.5)` and the 82 % phone override gone (`Work.module.css:63–64`, :145–149)
              - ≥ 900 px two-column grid, picture left (16:10), title / desc / tags / link right; `.card-link` class at `WorkCarousel.tsx:107`
  2. feat: play the hero text out in reverse of its intro
     touches: components/Hero.module.css  (only these)
     do:      - `--leave-text-sub / -h1 / -hello` on `.hero`; `--leave-portrait / -fill / -trace` re-timed per the table
              - `opacity` + 12 px `translateY` base rules on `.hero-sub`, `.hero h1`, `.hero-hello`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; in `npm run dev` at 1440×900, 900×1100 and 390×844 exactly one card shows (no peek), split picture | text at 1440 and 900, stacked at 390, prev/next move one card and disable at the ends; scrolling the hero away (today's scrub) fades sub, h1, hello in that order, then portrait, fill/glow, outline; the load intro is unchanged; all commits landed

### Card 3 — the stage: pin, timed scene change, nav fixed, focus and hash
precondition:  Card 2 landed — hero `--leave-*` spans re-timed; nav is its own component; one card per view
read for why:  spec §Shape (stage, scene variable, numbers on the stage root, `TriangleField` reads the scene, hash links and focus, opt-in pin); this plan §The scene clock and §Risks — follow when tuning or when something does not pin
commits:
  1. feat: pin the hero and work in one stage with a timed scene change
     touches: components/Stage.tsx, components/Stage.module.css, app/page.tsx, components/TriangleField.tsx, lib/field/config.ts, components/Hero.module.css, components/Nav.module.css, components/Work.module.css  (only these)
     do:      - `Stage` per this plan §The stage: track, hysteresis, constant-rate rAF tween, instant set on mount, inline `--scene` / `--hero-leave` / `--work-enter` / `data-scene` / `data-leaving`; `data-staged` gated on motion, live
              - field reads `--hero-leave` from `closest("[data-stage]")`, parks at `leave === 1` with a MutationObserver wake-up; `leaveProgress()`, `shareLeave()` and `FIELD.handoff` deleted
              - un-trace selector `:global([data-leaving])`; fixed nav, transparent / full-height work scene, `.hero-inner` `min-height: 100%` under `data-staged`
  2. feat: rise the work content in after the scene change
     touches: components/Work.module.css  (only these)
     do:      - `--work-in-title / -controls / -card` spans on `.work` from `var(--work-enter, 1)`; `opacity` + 12 px `translateY` base rules on the title, `.controls`, `.track`
  3. feat: land hash links and keyboard focus in the work scene
     touches: components/Stage.tsx, components/Stage.module.css, components/Work.tsx  (only these)
     do:      - `#work` id moves from `Work.tsx:9` to the stage's end-of-track `.mark` (section keeps `aria-labelledby`)
              - `focusin` in the work scene while `hero` → scroll to the `.mark`; `pointer-events: none` on the inactive scene; `aria-hidden` on the hero while `work`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; `grep -rnw "growField\|stopsAt\|handoff\|anchor\|enterProgress\|leaveProgress" components lib` finds nothing; in `npm run dev` at 1440×900, 900×1100 and 390×844: the screen holds past the threshold and the hero leaves in order, then the work title and card rise in, in the same place; back reverses; reversing mid-way does not jump; the nav stays clickable and its Work link plays the change; `/#work` opens on the work scene with no replay; Tab from the nav reaches the controls and the track and switches scene; the Performance panel shows no per-frame `TriangleField` draw while the work scene idles; reduced motion (also toggled mid-scene) and JS disabled stack the page at rest with the nav at the top; the hero's phone clipping checked (this plan §Risks); all commits landed

### Card 4 — traced triangle art behind the work card
precondition:  Card 3 landed — the stage writes `--work-enter`; work content rises in from 0.60
read for why:  spec §Shape ("The work background is triangle art, in SVG"), §Current state (placeholder art); `components/Hero.tsx:32–52` and `Hero.module.css:140–152` for the mask trace and the untip — follow only if you need the why
model:         opus
commits:
  1. feat: trace triangle art in behind the work card
     touches: components/WorkArt.tsx, components/Work.tsx, components/Work.module.css  (only these)
     do:      - `WorkArt.tsx` per this plan §Work triangle art: shade on `--work-shade`, 3–5 masked triangles with `useId` ids, per-triangle `--t0` / `--tw`, lit tip on `offset-path`, fill after trace
              - mounted behind `.inner` in `Work.tsx`; position per breakpoint by eye against `public/work/placeholder-*.svg`; reduced motion: no tips, art at rest
done when:     `npm run lint` and `npm run build` exit 0; in `npm run dev` at 1440×900, 900×1100 and 390×844 the shade fades in, the triangles trace edge by edge with a lit tip and then fill, then the title and card rise in over them, the card's glass blurs the art, scrolling back reverses it; the stacked fallback (reduced motion, JS off) shows the art at rest over today's background; the spec's §Done when passes in full; Safari checked or recorded as an owner check; committed
