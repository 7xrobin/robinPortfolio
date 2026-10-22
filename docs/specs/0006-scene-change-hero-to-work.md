---
number: "0006"
type: spec
slug: scene-change-hero-to-work
title: Pinned scene change from the hero to the work section, triangle art behind the work, one card at a time
status: planned
created: 2026-10-22
headline: Visitors now see the hero play its intro backwards and the work section build itself in the same place, over its own traced triangles, with one project card at a time.
tags: [spec, status/planned]
---

# 0006 — Pinned scene change from the hero to the work section

**Status:** planned — spec only. Today the hero and the work section are two stacked sections
(`app/page.tsx` renders `<Hero />` then `<Work />`, nothing after them): the hero's field
dissolves and its frame un-traces as it scrolls up (`--hero-leave`, scroll-scrubbed by
`TriangleField`), and the work section has its own grown `TriangleField`
(`components/Work.tsx:16`) behind a carousel that shows a card and a half
(`components/Work.module.css:63–64`, `.card` flex-basis; 82 % under 560 px, :145–149).
**Hardened:** 2026-10-22 against `eb0014d`
**Build doc:** `docs/plans/0006-scene-change-hero-to-work.md` (not written yet — `/planc`).

## Why

The owner asked (2026-10-22):

> The elements of the first section should disappear as they entered, and then show the second
> section animating the elements. It should look like the second section appears on the same
> place as the first. I want to remove the field from the second section BG, instead it should
> have the triangle forms similar to the placeholder and the shade color. On the carousel it
> should show only one card at a time.

Today the two sections slide past each other: the hero's text and portrait scroll away while
the field dissolves, and the work section arrives from below. The owner wants a **scene change**
instead — one screen that empties and then fills again.

Decisions taken with the owner (2026-10-22):

- **Pinned + triggered.** The screen holds still; crossing a scroll threshold plays the change as
  one timed animation at its own speed. Scrolling back past it plays it in reverse. (This replaces
  0005's scroll-*scrubbed* handoff.)
- **The nav stays fixed** over both scenes and does not play backwards.
- **The work triangles are traced in, then rest** — the portrait frame's language: outline drawn
  edge by edge, then fill and shade fade in.
- **One card at a time, split on desktop:** picture on one side, text on the other; stacked on
  phone.

## Current state the change builds on

- **`--hero-leave` is already the hero's exit contract.** `TriangleField` computes it from the
  scroll (`leaveProgress()`, `components/TriangleField.tsx:496–500`, using
  `FIELD.handoff.leaveEndAt`) and writes it, with `data-leaving` while it is above 0, inline on
  the hero section (`shareLeave()`, :510–516; reset on reduced motion :783–784 and on unmount
  :815–816). `.hero` derives `--leave-portrait`, `--leave-fill`, `--leave-trace` from it
  (`components/Hero.module.css:26–28`, each `var(--hero-leave, 0)`), and the base rules of the
  portrait (:163), fill (:111), glow (:106) and the un-trace (`.hero[data-leaving]
  .hero-frame-trace` :143–146, `.hero-frame-untip` :149–152) read them. Custom properties
  inherit, so `--hero-leave` set on any ancestor of `.hero` feeds the same chain.
- **The field's dissolve reads one number.** `draw()` renders the hero at
  `presenceTime(cfg, 1 − leave)` (`TriangleField.tsx:638`), in `fromBottom` order once the intro
  is over (:643–646) and on the intro's own `centroid` order, capped at that presence, during it
  (:639–641). `tick()` drops live changes while `leave > 0` and resumes them at 0 (:736–745).
  Feeding `leave` from the stage instead of `leaveProgress()` needs no new drawing code.
- **Hero intro animations end on their base rules.** `hero-fade`, `hero-rise` and
  `hero-frame-glow` set only `from` (:256–273) with fill-mode `both`; the implicit end keyframe
  is the live base value, which is why `opacity: calc(1 - var(--leave-portrait))` on the portrait
  stays live after its fade. The hero text (`.hero-hello` :189, `.hero h1` :199–200, `.hero-sub`
  :214–215) and the nav links (`.hero-links a` :77–78) use `hero-rise` the same way and can take
  the same treatment. The exception is `hero-frame-trace` (:219–230), which sets both ends and
  runs with fill-mode `backwards` — during its active phase it overrides the un-trace's
  `stroke-dashoffset`.
- **The intro timings live on `.hero`** (`--intro-*`, `Hero.module.css:9–19`), as do the nav's
  styles (`.hero-nav` :47–58, `.hero-logo` :60–67, `.hero-links` :69–83) and the nav's
  reduced-motion line (`.hero-links a` in :276–289). `--nav-h` and `--logo-h` are global
  (`app/globals.css:115–116`, 72 px / 22 px under 560 px :140–141). The nav is
  `position: absolute` inside `.hero-inner` (`Hero.tsx:9–15`, `data-field="nav"`), and its
  `#about` link points at nothing — there is no About section.
- **The work field is the only user of the grown field.** `handoff="enter"`, the `anchor` prop
  (`TriangleField.tsx:438`, :448), `lib/field/grow.ts` (`growField`, `stopsAt` — imported only by
  `TriangleField.tsx:25`), `FIELD.grow` (`lib/field/config.ts:113–131`, :181–197), the
  `fromTop` trace order (:52, :370), `enter` / `enterProgress()` (:493, :503–507), the `grown`
  branches in `place()` (:142–161, :211), the enter branch of `draw()` (:629–637), the scroll-
  frame scheduler (`markDirty` :685, `scrollFrame` / `schedule` :691–706, `sync` :755–758,
  `drawnEnter` reset :792–793) and the window scroll listener (:775–776, :808) exist only for it.
  Once `leave` comes from the stage, `leaveProgress()` and `FIELD.handoff.leaveEndAt` are dead
  too, so the whole `FIELD.handoff` block (`config.ts:97–112`, :176–180) goes.
- **The hero's canvas loop runs whenever the hero intersects the viewport** (IntersectionObserver
  + visibility, `TriangleField.tsx:751–773`) and redraws every frame. Pinned under the work
  scene, the hero stays "on screen", so the loop would keep tracing an empty field at 60 fps.
- **The work section's background is opaque** (`Work.module.css:9–12`, two radial glows over
  `var(--color-bg)`), and `.work` has `min-height: 80vh` (:8) with `96px` block padding on
  `.inner` (:20; 64 px under 560 px, :36–40).
- **The carousel is native scroll snap** with prev/next that scroll by one card width plus gap
  (`step()`, `components/WorkCarousel.tsx:37–47`) and disable at the ends (:18–35). Each card is
  title → image → description → tags → link in one flex column (:91–117). `.track` sets
  `container-type: inline-size` and bleeds to the side padding for the peek
  (`Work.module.css:45–58`).
- **`html { scroll-behavior: smooth }`** (`app/globals.css:153`, `auto` under reduced motion
  :164–166) — hash links and programmatic scrolls are smooth.
- **Placeholder art** (`public/work/placeholder-{1..4}.svg`, 800 × 500): a `#161826`
  (`--color-bg`) base, one radial "shade" at `stop-opacity` 0.55 in one brand colour (`#33969b`,
  `#3a80b7` or `#968ae0`, its centre moving per image), and three overlapping equilateral
  triangles (side 240) with a two-colour linear-gradient fill at rising `fill-opacity`
  0.10 / 0.18 / 0.26 and a `#33969b` stroke at 0.7 opacity, 1.5 px.

## Shape — the decisions

- **A stage pins both scenes.** A new `Stage` wraps `<Hero />` and `<Work />` in `app/page.tsx`: a
  tall outer block (one viewport of scene + a scroll track, start: one more viewport) with a
  `position: sticky; top: 0` inner, `100svh` tall, that holds both sections stacked in the same
  place (work `position: absolute; inset: 0` over the hero; each scene `height: 100%`). No
  ancestor of the sticky inner may set `overflow` other than `visible`. Why: "the second section
  appears on the same place as the first" means one screen, so the page must stop moving while
  the change plays; sticky does that with no scroll capture. The stage is the last thing on the
  page, so the track end is the document end: the stage never unpins downward.
- **One scene variable, timed, not scrolled.** The stage's client component sets
  `data-scene="hero" | "work"` from the scroll position in the track: past a threshold
  (start: 25 % of the track) it is `work`, back above a lower one (start: 15 %) it is `hero`, so
  it does not flicker. A rAF tween moves `--scene` (0..1) toward the target over a fixed
  duration (start: 2.4 s), running only while it moves. Reversing mid-way retargets the tween
  from where it is, so the change never jumps. On mount, a scroll position already past the
  threshold (a reload, or a visit to `/#work`) sets `--scene` to 1 with no tween. Why a tween and
  not CSS transitions: transitions replay the same delays in both directions, and "disappear as
  they entered" needs the order reversed going out.
- **The stage owns the numbers, on its own root.** The stage writes `--scene`, `--hero-leave =
  clamp(--scene / 0.55)` and `--work-enter = clamp((--scene − 0.45) / 0.55)` inline on its root
  element, plus `data-scene` and `data-leaving` (while `--hero-leave` > 0). The small overlap
  lets the work's first triangle start as the hero's field finishes. Both sections inherit the
  properties; every element reads its own sub-span of its half, as `--leave-*` already does.
  Defaults mean "at rest": `var(--hero-leave, 0)` and `var(--work-enter, 1)`, so without a stage
  both scenes show whole. `shareLeave()` and its resets leave `TriangleField`; the un-trace
  selector becomes `:global([data-leaving]) .hero-frame-trace` (it no longer sits on `.hero`).
- **The hero leaves in the reverse of its intro order.** The intro is field → frame trace → fill
  → portrait → text (hello, h1, sub). Leaving is text (sub, h1, hello, each a step apart) →
  portrait → fill/glow → outline un-trace → field dissolve. The text gets `--leave-text-*` spans
  on `.hero`, each fading and sinking 12 px through its base rule (`opacity` and `transform`) —
  `hero-rise` backwards. The existing `--leave-portrait` / `--leave-fill` / `--leave-trace` spans
  are re-timed to follow the text.
- **`TriangleField` reads the scene, not the scroll.** The hero's `leave` is the inline
  `--hero-leave` of the nearest `[data-stage]` ancestor (`style.getPropertyValue`, read once per
  frame — no computed-style read in the loop); no stage means `leave = 0`. Live changes drop
  while `leave > 0` and resume at 0, as today. At `leave = 1` the loop clears the canvas once and
  stops redrawing until `leave` drops again, so the pinned, hidden hero costs nothing.
- **The nav leaves the hero.** It moves into its own `components/Nav.tsx` + `Nav.module.css`,
  rendered by the stage above both scenes, keeping the `hero-rise` load animation on its links
  and its reduced-motion opt-out. The intro timing tokens it uses (`--intro-text-*`,
  `--intro-ease`) move from `.hero` to `:root` in `app/globals.css`, so the nav and the hero read
  one source. Under `data-staged` the nav is `position: fixed`; without it, it sits
  `position: absolute` at the top of the page as today, so the stacked fallback does not lay a
  backgroundless bar over the work content. The field still needs the nav bottom for its nav
  band: `TriangleField` finds `[data-field="nav"]` in the document, not only in its section,
  and takes its bottom from the viewport (`getBoundingClientRect().bottom`, the bar's height
  from the top of the screen) rather than relative to the section, so a re-measure while
  scrolled does not shift the band.
- **The work field is removed, with everything only it used.** `Work.tsx` stops mounting
  `TriangleField`. `lib/field/grow.ts`, `FIELD.grow`, the whole `FIELD.handoff` block,
  `leaveProgress()`, `enterProgress()`, `fromTop`, the `Handoff` type and `handoff` / `anchor`
  props, the `grown` branches in `place()`, the enter branch of `draw()`, the scroll-frame
  scheduler and the scroll listener go, and the comments that describe the work field
  (`TriangleField.tsx:107–108`, :120–127, :239–243, :415–437, :617–624, :688–690) are rewritten
  for one mode. `lattice.ts` and `shape.ts` exports stay (still used by `changes.ts`). Why: dead
  code in an 821-line canvas file is where the next tuning pass goes wrong.
- **The work background is triangle art, in SVG.** Under `data-staged` `.work` drops its opaque
  background (it sits over the hero and would hide it); the hero section's background stays as
  the screen's backdrop through both scenes, and the work's shade comes from its art. In the
  stacked fallback `.work` keeps today's background. The art is an inline SVG
  (`components/WorkArt.tsx`) in the placeholder's language: one radial shade in `#33969b` at
  0.55, and a small cluster of overlapping outlined equilateral triangles (gradient fill
  `#33969b → #3a80b7` at 0.10 / 0.18 / 0.26, `#33969b` stroke at 0.7), placed behind and beside
  the card so the glass has something to blur. Each triangle uses the frame's mask trace
  technique (`Hero.tsx:32–52`, `.hero-frame-trace`) driven by a variable instead of a keyframe:
  `stroke-dashoffset` from its own `--work-enter` sub-span, a lit tip riding the outline as
  `.hero-frame-untip` does (`offset-distance` from the same span), then its fill fades in; the
  shade fades in under them first. Mask and gradient ids are unique per triangle (`useId`), not
  the frame's `frame-trace`. Static after that; it reverses with `--work-enter`. Why SVG and not
  the canvas: a few still triangles need no engine, and the frame's trace is already the tested
  SVG route.
- **The work content arrives after its art.** Title, controls, then card rise in (`hero-rise`
  language, through base rules reading `--work-enter` sub-spans) on the last part of
  `--work-enter`.
- **One card per view.** `.card` takes the full row (`flex-basis: 100%`); the `calc(... / 1.5)`
  and the 82 % phone override go. From 900 px up the card is a two-column grid: picture left
  (16:10), title / description / tags / link right. Below 900 px it stacks as today. Prev/next
  keep scrolling by one card — `step()` already measures the card width.
- **Hash links and focus land in the right scene.** The `#work` id moves from the section to an
  anchor at the end of the track (the section keeps `aria-labelledby="work-title"`), so the nav's
  Work link scrolls past the threshold and plays the change. Focus moving into the work section
  (keyboard Tab) while the scene is `hero` scrolls to that anchor. The inactive scene gets
  `pointer-events: none`. The hero gets `aria-hidden` while the scene is `work` (it holds no
  focusable element once the nav is out); the work section is never `aria-hidden` or `inert`,
  because Tab must still reach it from the hero and focusable content must not sit inside an
  `aria-hidden` subtree.
- **The pin is opt-in by JS and motion.** The stacked layout is the base CSS; the stage adds
  `data-staged` when mounted and motion is allowed, and only then do the sticky pin, the
  absolute work scene, the fixed nav and the transparent work background apply. It follows the
  `prefers-reduced-motion` change event live: switching to reduce drops `data-staged`, clears the
  inline properties and returns to the stacked page at rest. Without JS, or with reduced motion,
  the two sections stack as today, both at rest, and the hero intro still runs without JS.

## The new part

- **The stage and its scene tween** (`components/Stage.tsx` + `Stage.module.css`): track and
  threshold with a gap, the rAF tween with mid-way reversal and instant set on mount, writing
  `--scene`, `--hero-leave`, `--work-enter`, `data-scene`, `data-leaving` on its root;
  `data-staged` gated on motion; focus/hash handling. This is the one new piece of motion logic.
- **The nav as its own component** (`components/Nav.tsx` + `Nav.module.css`), fixed only when
  staged.
- **The work triangle art** (`components/WorkArt.tsx`): the variable-driven mask trace applied to
  several triangles with staggered sub-spans.

## Reused, not rebuilt

- The `--hero-leave` → `--leave-*` CSS pattern and the un-trace with its lit tip
  (`Hero.module.css:26–28`, :143–152).
- `renderTrace()` in `fromBottom` order at `presenceTime(cfg, 1 − leave)` — the field's dissolve.
- The frame's mask trace (`Hero.tsx:32–52`) and the untip's `offset-path` tip for the work
  triangles.
- `hero-rise` for the text going out and the work content coming in.
- `WorkCarousel`'s scroll snap, prev/next and `step()`, glass styles, `lib/work.ts` data —
  unchanged apart from the card layout.

## Out of scope

- **Scroll capture** (hijacking wheel/touch to snap between scenes) — sticky + threshold gives
  the pin without taking scroll away from the visitor.
- **More scenes** (About) — the stage is written for two; a third earns a general timeline later.
  A section after the stage would also need the stage to unpin cleanly with the change mid-way;
  that belongs to the spec that adds it.
- **Carousel dots or a position counter** — prev/next disable at the ends; add if the owner misses
  a cue now that the peek is gone.
- **Changing the hero load intro** — its timings and order stay as 0002–0004 set them (the tokens
  move to `:root`, unchanged).
- **Real project content** — still placeholders (0005).

## Open questions

- **Track length, thresholds, tween duration and the half overlap** — starting values above, tuned
  by eye with the owner.
- **Leaving during the load intro.** Crossing the threshold in the first ~4.8 s of a visit plays
  the leave over an intro still running. The field and the `hero-rise` / `hero-fade` elements
  follow (their end keyframe is the live base value), but `hero-frame-trace` sets its own end and
  overrides the un-trace while active, so the outline can finish tracing in before it is
  un-traced. Accepted unless it reads badly; the fix is not `animation: none` under
  `data-leaving`, which would replay the trace every time the visitor scrolls back.
- **Work content taller than a viewport.** The work scene must fit `100svh` (one split card should
  at the three check sizes). On short landscape phones it may not; the fallback is to drop the pin
  below a height (start: `max-height: 560px`) and stack.
- **Which triangle layout behind the card** — the art's exact cluster and position are placed by
  eye; the placeholder SVGs are the reference.

## Done when

- `npm run lint` and `npm run build` pass.
- At 1440×900, 900×1100 and 390×844: the hero load intro is unchanged; scrolling past the
  threshold holds the screen still while the hero text (sub, h1, hello), portrait, fill/glow,
  outline and field leave in that order, then the work triangles trace in, then the title and
  the card rise in, in the same place; scrolling back plays it in reverse; reversing mid-way
  does not jump; at rest in the work scene nothing of the hero's content shows.
- The nav stays on screen and clickable through both scenes; its Work link plays the change;
  loading `/#work` opens on the work scene with no replay.
- Tab from the hero's nav reaches the carousel controls and the track, and switches to the work
  scene on the way.
- With the work scene showing and the tab idle, the hero canvas does not redraw every frame
  (Performance panel: no per-frame `TriangleField` draw while `--hero-leave` is 1).
- The work section has no canvas; `lib/field/grow.ts`, `FIELD.grow` and `FIELD.handoff` are gone,
  and `grep -rn "growField\|stopsAt\|handoff\|anchor\|enterProgress\|leaveProgress" components lib`
  finds nothing.
- The carousel shows exactly one card at every check size; on desktop it is split picture |
  text; prev/next move one card and disable at the ends.
- With reduced motion (including switching it on mid-scene), or JS disabled, the sections stack
  with no pin, the nav at the top of the page, and everything at rest (hero intro still runs
  without JS).

## Commit breakdown — a sketch, not the plan

`/planc` turns this into session cards. Each commit builds and leaves the page working.

1. `refactor: drop the work section's grown field` — remove the `enter` mode, `anchor`,
   `fromTop`, `grow.ts`, `FIELD.grow` and the enter config; `Work.tsx` mounts no field.
2. `refactor: move the nav out of the hero` — `Nav.tsx` + module, intro text tokens to `:root`,
   still absolute at the page top; field finds the nav in the document and measures it from the
   viewport.
3. `feat: one project card at a time, split on desktop` — card width, phone override gone,
   two-column grid ≥ 900 px.
4. `feat: play the hero text out in reverse of its intro` — `--leave-text-*`, re-timed
   portrait/fill/trace spans; driven by today's scroll-scrubbed `--hero-leave` until the stage
   lands.
5. `feat: pin the hero and work in one stage with a timed scene change` — `Stage`, thresholds,
   tween, `--scene` / `--hero-leave` / `--work-enter` on the stage root; field reads the stage
   and idles at full leave; `leaveProgress()`, `shareLeave()` and `FIELD.handoff` go; fixed nav
   and transparent work background under `data-staged`; work content rises in; focus/hash;
   no-JS and reduced-motion stack.
6. `feat: trace triangle art in behind the work card` — `WorkArt.tsx`, shade + traced triangles
   on `--work-enter`.
