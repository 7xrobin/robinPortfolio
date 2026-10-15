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
`assets/site.css` (259) and `assets/main.js` (95). It works, but every planned feature —
project pages, written content, metadata per page, a contact form — needs routing, components and
a build step. The owner works daily in Next.js, so Next.js is the target. The project is at its
smallest now; every feature added in plain HTML is one more thing to port later.

This spec is a port of the **hero only**. The "02 — Selected work" section is removed (owner's
decision: it does not work as designed). Everything that stays keeps the same look.

## Shape — the decisions

- **Next.js 16.4.1, pinned exactly.** The newest stable release (`latest` on npm, published
  2026-10-14). App Router + TypeScript. React and TypeScript versions are whatever
  `create-next-app@16.4.1` installs, pinned in `package.json` as installed.
- **Static export first: `output: 'export'`, hosted on Vercel.** The site has no server need today,
  so it builds to plain files in `out/`. When a server feature arrives (form, API route), remove the
  flag; that change is a later spec's decision, not this one's.
  Consequence: `next/image` cannot optimise at request time, so `images: { unoptimized: true }`.
- **The "Selected work" section is removed, with everything that only exists for it:**
  - the `#work` section and the `.fade-rule` divider (`index.html:76-103`);
  - the scroll cue "Selected work" (`index.html:50-60`), because its only target is `#work`;
  - the "Work" link in the nav (`index.html:21`), for the same reason;
  - all of `assets/main.js` — it only builds the work switcher;
  - the work CSS in `site.css` (`.fade-rule` through `.bars`, `site.css:150-253`), the
    `triBounce` / `triWipe` keyframes (`site.css:68-69`) and the work-only layout tokens
    (`--work-pad`, `--head-gap`, `--work-gap`, `--h3-size`, `--detail-gap` and their breakpoint
    overrides).
  Result: the page has **no client component**. Every component is a Server Component and the
  page ships no JavaScript of its own.
- **CSS: CSS Modules for components, one global file for tokens and base rules.**
  Why CSS Modules is the best fit for *this* codebase:
  - The existing CSS is plain, modern CSS — custom properties, `oklch()`, `color-mix()`,
    `clip-path`, and breakpoints that change CSS variables (`site.css:20`, `:37`).
    CSS Modules is the same language, so every rule moves across unchanged; only the file it
    lives in changes.
  - Zero runtime and works in Server Components. Runtime CSS-in-JS (styled-components, Emotion)
    forces `'use client'` on everything it touches and fights React Server Components, so it is ruled out.
  - Scoping per component, which the current global `site.css` does not have. That matters once
    more pages exist.
  - Tailwind v4 was considered and rejected for this port: it means rewriting every rule into
    utility classes, and the hand-tuned geometry (frame-relative `calc()` positions at
    `site.css:109-113`) reads worse as utilities. It stays possible later, because CSS Modules and
    Tailwind can live side by side.
- **What stays global** (`app/globals.css`):
  - The Nocturne token block and its component classes `.btn`, `.btn-primary`, `.tag`,
    `.tag-accent`, `.lighten`, `.hr` — copied from `assets/nocturne.css` as they are, including
    the ones the hero does not use today. This file is imported from the claude.ai/design project;
    keeping it whole means a re-sync from the design is still a single file copy.
  - The hero layout tokens and their breakpoint overrides from `site.css:3-56` (`--img-flex`,
    `--h1-size`, `--text-pad`, …).
  - Base element rules (`html`, `body`, `a`) and the `prefers-reduced-motion` rule.
- **What becomes a module:** the hero rules in `site.css` (`.hero` through `.hero-sub`) move to
  `Hero.module.css`.
- **Fonts through `next/font/google`.** Inter (now a CSS `@import` in `nocturne.css:3`) and Outfit
  (now a `<link>` in `index.html:10`) are self-hosted at build time and exposed as CSS variables
  that `--font-heading` / `--font-body` point at. This removes two render-blocking requests to
  Google Fonts and prevents layout shift during font load.
- **Component split:**
  - `app/layout.tsx` — `<html>`, fonts, `metadata` (title + description from `index.html:6-8`).
  - `app/page.tsx` — renders `Hero`.
  - `Hero` — nav (logo + "About"), triangle frame, portrait, text, and the background
    `<img src="/triangle-grid.svg">` exactly as wired now (`index.html:25`).
- **Static files move to `public/`** unchanged: `portrait.png`, `triangle-grid.svg`,
  `robin-logo.svg` (its CSS mask URL becomes `/robin-logo.svg`).
- **The old files are deleted** once parity is verified: `index.html`, `assets/`. Git history
  (`fcd4413`) keeps them.
- **npm** as package manager, with the ESLint setup that `create-next-app` generates.
- **Parity is checked against committed baseline screenshots.** `docs/specs/0001-baseline/`
  holds the old site's hero at 1440×900, 900×1100 and 390×844, captured from `fcd4413` with
  headless Chrome. The narrow sizes are captured inside an iframe of the exact width, because
  headless Chrome will not shrink its window below ~500 px. After the port, the same three
  captures of `out/` are compared to them by eye.
  **Expected differences:** the scroll cue and the "Work" nav link are gone. Anything else that
  differs is a bug.

## The new part

There is very little new logic. The work is moving markup into JSX (`class` → `className`,
module class references) and moving CSS into the right file. The two places that need care:

- **Fonts:** `next/font` generates its own font-family names. `--font-heading`, `--font-body`
  and the hero's `'Outfit'` reference (`site.css:131`) must point at the generated variables, or
  the headline silently falls back to a system font.
- **The hero geometry:** the triangle-grid background is positioned in frame-relative units
  (`site.css:104-113`). It must keep the exact same parent (`.hero-img`), or the grid stops
  lining up with the frame apex.

## Reused, not rebuilt

- Every hero CSS rule in `assets/site.css`, and all of `assets/nocturne.css` — moved, not
  rewritten.
- `assets/triangle-grid.svg` (from the claude.ai/design project) — moved to `public/`.
- The hero markup and class names of `index.html` — they become JSX.

## Out of scope (named, deferred)

- **A replacement for the "Selected work" section** — the owner does not want the current design;
  a new projects section (or project pages with MDX) is its own spec.
- **The "About" nav link** — it points at `#about`, which does not exist today. The port keeps it
  as it is; what it should point to is a later decision.
- **Tailwind** — rejected for the port (see Shape); can be added later next to CSS Modules.
- **Server features (forms, API routes) and dropping `output: 'export'`** — no need yet.
- **Image optimisation of `portrait.png` (1.8 MB)** — static export cannot optimise at request
  time. Pre-compressing it (WebP/AVIF) is worth doing, but it changes an asset, not the
  framework. Separate small change.
- **Analytics, light theme, i18n** — not requested.
- **Deploy pipeline / custom domain setup** — a `vercel` deploy of the result is a one-command
  step after `/exec`, not part of this spec.

## Open questions

- **"About" link** — keep pointing at a missing `#about`, remove it, or wait for an About section?
  The port keeps it, so this does not block the port.

## Commit breakdown — SKETCH

This is a sketch of intent, in dependency order. **It is not the plan** — `/planc` expands it
into executable session cards in `docs/plans/0001-nextjs-migration.md`.

1. Scaffold Next.js 16.4.1 (App Router, TypeScript, ESLint, npm) next to the old files;
   `next.config` with `output: 'export'` and unoptimised images; copy static assets into `public/`.
2. `app/globals.css` (Nocturne tokens + components, hero layout tokens, base rules) and
   `app/layout.tsx` with `next/font` (Inter, Outfit) and metadata.
3. `Hero` component + `Hero.module.css` — nav (logo + About), frame, portrait, triangle-grid
   background, text. `app/page.tsx` renders it.
4. Parity check of `out/` against `docs/specs/0001-baseline/` at the three sizes; then delete
   `index.html` and `assets/`.
