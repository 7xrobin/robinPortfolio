# Specs

What each change is and why. Plans (the commit breakdown) live in `docs/plans/` under the same number.

Status vocabulary: `planned | in-progress | done`. On conflict, the code wins — fix the row.

| Spec | Title | Status | Evidence |
|---|---|---|---|
| [0001](0001-nextjs-migration.md) | Migrate the portfolio to Next.js (React) with CSS Modules | done | `next.config.ts` (`output: "export"`), `app/layout.tsx` + `app/globals.css`, `components/Hero.tsx` + `Hero.module.css`; `index.html` and `assets/` removed — `2a2b808`..`f8f4613` |
| [0002](0002-hero-field-animation.md) | Animated triangle field and intro sequence for the hero — Visitors now see the hero build itself: a dot lattice that draws, fills and erases triangles, then the portrait and the text arrive in order. | done | Intro sequence live: `--intro-*` timings, `hero-frame-in` / `hero-portrait-in` / `hero-rise` keyframes and the reduced-motion block in `components/Hero.module.css` (`935fae8`, `c143c40`, `a4fd5e3`). Its pen-drawn field (`74d44a1`..`187588a`) was rejected by eye and reverted (`039a0b9`); the field is now 0003's. |
| [0003](0003-hero-field-design-motion.md) | Animate the hero field on the design's own triangle structure — The hero background is the "Hero 6a refined" triangle field, and it moves: triangles form, dissolve and are traced again edge by edge, colours shift, points light and fade, every change returns to the design. | done | `scripts/extract-field.mjs` → `lib/field/design.ts`; `lib/field/shape.ts` (boundary, frontier), `lib/field/changes.ts` (form / dissolve / traced rebuild), `lib/field/config.ts`; `components/HeroField.tsx` mounted in `components/Hero.tsx:7` — `5abb666`..`5898868`. Owner's review by eye still open. |
| [0004](0004-hero-frame-trace-intro.md) | Trace the portrait frame edge by edge and fade the portrait in — Visitors now see the portrait's triangle drawn edge by edge, the way the background triangles are, while the field ripples out — then the portrait fades in. | planned | plan written ([0004 plan](../plans/0004-hero-frame-trace-intro.md)), not built — next: `/exec docs/plans/0004-hero-frame-trace-intro.md` |
