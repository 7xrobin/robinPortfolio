# Specs

What each change is and why. Plans (the commit breakdown) live in `docs/plans/` under the same number.

Status vocabulary: `planned | in-progress | done`. On conflict, the code wins — fix the row.

| Spec | Title | Status | Evidence |
|---|---|---|---|
| [0001](0001-nextjs-migration.md) | Migrate the portfolio to Next.js (React) with CSS Modules | done | `next.config.ts` (`output: "export"`), `app/layout.tsx` + `app/globals.css`, `components/Hero.tsx` + `Hero.module.css`; `index.html` and `assets/` removed — `2a2b808`..`f8f4613` |
| [0002](0002-hero-field-animation.md) | Animated triangle field and intro sequence for the hero — Visitors now see the hero build itself: a dot lattice that draws, fills and erases triangles, then the portrait and the text arrive in order. | planned | Landed `74d44a1`..`a4fd5e3`: `components/HeroField.tsx`, `lib/field/*`, intro keyframes in `Hero.module.css`; awaiting the owner's review by eye. |
