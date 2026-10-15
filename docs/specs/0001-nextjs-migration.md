---
number: "0001"
type: spec
slug: nextjs-migration
title: Migrate the portfolio to Next.js (React) with CSS Modules
status: planned
created: 2026-10-15
tags: [spec, status/planned]
---

# 0001 — Migrate the portfolio to Next.js (React) with CSS Modules

**Status:** planned — spec only. The site is still a static `index.html` + `assets/` (baseline commit `fcd4413`); no Next.js code exists yet.
**Build doc:** `docs/plans/0001-nextjs-migration.md` (written by `/planc`, not yet).

## Why

The portfolio is one hand-written page: `index.html` (106 lines), `assets/nocturne.css` (111),
`assets/site.css` (259) and `assets/main.js` (95, an imperative DOM switcher). It works, but every
planned feature — case-study pages behind the "Case study" button, written content, metadata per
page, a contact form — needs routing, components and a build step. The owner works daily in
Next.js, so Next.js is the target. The project is at its smallest now; every feature added in plain
HTML is one more thing to port later.

This spec is a **pure port**: the same single page, the same look, the same behaviour. New
features get their own specs on top of it.

## Shape — the decisions

- **Next.js App Router + TypeScript.** The owner's daily stack, and the App Router is the current
  default. Version: current stable Next.js at plan time, pinned exactly in `package.json`.
- **Static export first: `output: 'export'`, hosted on Vercel.** The site has no server need today,
  so it builds to plain files in `out/`. When a server feature arrives (form, API route), remove the
  flag; that change is a later spec's decision, not this one's.
  Consequence: `next/image` cannot optimise at request time, so `images: { unoptimized: true }`.
- **CSS: CSS Modules for components, one global file for tokens and base rules.**
  Why CSS Modules is the best fit for *this* codebase:
  - The existing CSS is plain, modern CSS — custom properties, `oklch()`, `color-mix()`,
    `clip-path` keyframes, and breakpoints that change CSS variables (`site.css:20`, `:37`).
    CSS Modules is the same language, so every rule moves across unchanged; only the file it
    lives in changes.
  - Zero runtime and works in Server Components. Runtime CSS-in-JS (styled-components, Emotion)
    forces `'use client'` on everything it touches and fights React Server Components, so it is ruled out.
  - Scoping per component, which the current global `site.css` does not have (`.num`, `.ttl`,
    `.marker` are global names today). That matters once more pages exist.
  - Tailwind v4 was considered and rejected for this port: it means rewriting all ~370 lines into
    utility classes, and the hand-tuned geometry (frame-relative `calc()` positions at
    `site.css:109-113`, the `triWipe` clip-path) reads worse as utilities. It stays possible
    later, because CSS Modules and Tailwind can live side by side.
- **What stays global** (`app/globals.css`):
  - The Nocturne token block and its component classes `.btn`, `.btn-primary`, `.tag`,
    `.tag-accent`, `.lighten`, `.hr` — copied from `assets/nocturne.css` as they are. This file is
    imported from the claude.ai/design project. Keeping it as one global file means a re-sync from
    the design is still a single file copy, not a merge into modules.
  - The layout tokens and their breakpoint overrides from `site.css:3-56` (`--img-flex`,
    `--h1-size`, `--work-pad`, …), because both sections read them.
  - Base element rules (`html`, `body`, `a`) and the `prefers-reduced-motion` rule.
- **What becomes a module:** everything else in `site.css`, split by the component that owns it.
  `@keyframes` move into the module that uses them (CSS Modules scopes keyframe names).
- **Fonts through `next/font/google`.** Inter (now a CSS `@import` in `nocturne.css:3`) and Outfit
  (now a `<link>` in `index.html:10`) are self-hosted at build time and exposed as CSS variables
  that `--font-heading` / `--font-body` point at. This removes two render-blocking requests to
  Google Fonts and prevents layout shift during font load.
- **Component split** (Server Components unless stated):
  - `app/layout.tsx` — `<html>`, fonts, `metadata` (title + description from `index.html:6-8`).
  - `app/page.tsx` — composes the sections.
  - `Hero` — nav, triangle frame, portrait, text, scroll cue. Includes the background
    `<img src="/triangle-grid.svg">` exactly as wired now (`index.html:25`).
  - `Work` — section head; passes the project data to the switcher.
  - `ProjectSwitcher` — **`'use client'`**, the only client component (see below).
- **Project data moves to `content/projects.ts`**, typed (`Project` type), out of the script
  (`main.js:4-10`). It is the obvious future source for case-study routes.
- **Screenshots are resolved at build time, not in the browser.** Today each slide requests
  `assets/projects/project-N.png` and shows an empty state on error (`main.js:42-48`), which is a
  404 per missing image on every visit. In the port, the `Work` server component checks the file
  exists in `public/projects/` at build and passes `image?: string`. Same visual result, no
  failed requests.
- **Static files move to `public/`** unchanged: `portrait.png`, `triangle-grid.svg`,
  `robin-logo.svg` (its CSS mask URL becomes `/robin-logo.svg`).
- **The old files are deleted** once parity is verified: `index.html`, `assets/`. Git history
  (`fcd4413`) keeps them.
- **npm** as package manager, with the ESLint setup that `create-next-app` generates.

## The new part: `ProjectSwitcher`

Everything else is moving files. This is the one real rewrite: `main.js:21-93` builds the list,
chips, slides and bars with `document.createElement` and toggles `is-on` classes by hand. In React:

- One `useState` for `current`; list, chips, slides, bars and the detail panel all render from it.
  `aria-selected` is derived from it, no manual sync.
- **Wipe animation restart:** today a fresh `.wipe` element is created on every change
  (`main.js:73-75`). In React, render the wipe element with `key={current}` so React re-mounts it
  and the CSS animation runs again. No animation library.
- **Arrow keys:** a `keydown` listener on `window` in `useEffect`, with cleanup, keeping the
  same "ignore when typing in an input" guard (`main.js:79-83`).
- **Swipe:** `onTouchStart` / `onTouchEnd` on the stage, same 40px threshold (`main.js:86-91`).
- Must render the first project on the server (static HTML), so the section is not empty before
  JavaScript loads — an improvement over today, where the section is empty until `main.js` runs.

## Reused, not rebuilt

- Every CSS rule in `assets/site.css` and `assets/nocturne.css` — moved, not rewritten.
- `assets/triangle-grid.svg` (from the claude.ai/design project) — moved to `public/`.
- The project content and the switcher's behaviour rules (keys, swipe threshold, wrap-around in
  `main.js:77`).
- The markup structure and class names of `index.html` — they become JSX, with `class` →
  `className` and module class references.

## Out of scope (named, deferred)

- **Case-study routes (`/work/[slug]`) and MDX content** — the first feature after the port; its
  own spec. The "Case study" link keeps pointing at `#work`.
- **Tailwind** — rejected for the port (see Shape); can be added later next to CSS Modules.
- **Server features (forms, API routes) and dropping `output: 'export'`** — no need yet.
- **Image optimisation of `portrait.png` (1.8 MB)** — static export cannot optimise at request
  time. Pre-compressing it (WebP/AVIF) is worth doing, but it changes an asset, not the
  framework. Separate small change.
- **Accessibility fixes beyond parity** — e.g. two `role="tablist"` groups controlling the same
  slides (`index.html:79-80`). The port keeps today's semantics. Fixing them is its own change.
- **Analytics, light theme, i18n** — not requested.
- **Deploy pipeline / custom domain setup** — a `vercel` deploy of the result is a one-command
  step after `/exec`, not part of this spec.

## Open questions

- **Next.js major version** — pick the current stable at `/planc` time and pin it exactly.
  Nothing in this spec depends on a specific major.
- **Parity check method** — proposed: headless-Chrome screenshots of the baseline (`fcd4413`
  served statically) and of `out/` at 1440×900, 900×1100 and 390×844, compared by eye, plus a
  manual run of click / arrow keys / swipe on the switcher. A pixel-diff tool is possible but
  probably more setup than this page needs.

## Commit breakdown — SKETCH

This is a sketch of intent, in dependency order. **It is not the plan** — `/planc` expands it
into executable session cards in `docs/plans/0001-nextjs-migration.md`.

1. Scaffold Next.js (App Router, TypeScript, ESLint, npm) next to the old files; `next.config`
   with `output: 'export'` and unoptimised images; copy static assets into `public/`.
2. `app/globals.css` (Nocturne tokens + components, layout tokens, base rules) and
   `app/layout.tsx` with `next/font` (Inter, Outfit) and metadata.
3. `Hero` component + `Hero.module.css` — nav, frame, portrait, triangle-grid background,
   text, scroll cue.
4. `content/projects.ts` + `Work` (build-time screenshot lookup) + `ProjectSwitcher` client
   component + its module CSS.
5. Parity check against the baseline at three viewport sizes and on switcher behaviour; then
   delete `index.html` and `assets/`.
