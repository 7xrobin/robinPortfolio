# Specs

What each change is and why. Plans (the commit breakdown) live in `docs/plans/` under the same number.

Status vocabulary: `planned | in-progress | done`. On conflict, the code wins — fix the row.

| Spec | Title | Status | Evidence |
|---|---|---|---|
| [0001](0001-nextjs-migration.md) | Migrate the portfolio to Next.js (React) with CSS Modules | done | `next.config.ts` (`output: "export"`), `app/layout.tsx` + `app/globals.css`, `components/Hero.tsx` + `Hero.module.css`; `index.html` and `assets/` removed — `2a2b808`..`f8f4613` |
| [0002](0002-hero-field-animation.md) | Animated triangle field and intro sequence for the hero — Visitors now see the hero build itself: a dot lattice that draws, fills and erases triangles, then the portrait and the text arrive in order. | planned | Landed `74d44a1`..`a4fd5e3`: `components/HeroField.tsx`, `lib/field/*`, intro keyframes in `Hero.module.css`; owner rejected the forms by eye (2026-10-20); static field restored (`039a0b9`); field motion replaced by 0003. |
| [0003](0003-hero-field-design-motion.md) | Animate the hero field on the design's own triangle structure — The hero background is the "Hero 6a refined" triangle field, and it breathes: triangles form and dissolve along the edge of the shape, colours shift, points light and fade, the body never moves. | planned | plan written — run `/exec docs/plans/0003-hero-field-design-motion.md` |
