"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Stage.module.css";

/** Past this share of the track the scene turns to the work. */
const WORK_AT = 0.25;
/** Back above this share it turns to the hero, so it does not flicker. */
const HERO_AT = 0.15;
/** The whole change, 0 to 1, plays over this long, at a constant rate. */
const CHANGE_MS = 2400;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The stage: one pinned screen holding the hero and the work in the same
 * place, with the nav fixed over both. Scrolling past a threshold of the
 * track turns the scene to the work; a rAF tween then moves `scene` (0..1)
 * toward it at a constant rate, so a reversal mid-way carries on from where
 * it is. The numbers go inline on the root, where both scenes inherit them:
 * `--scene`, `--hero-leave` (the hero's half), `--work-enter` (the work's
 * half), plus `data-scene` and `data-leaving`.
 *
 * The pin is opt-in: `data-staged` is set only when motion is allowed, and
 * follows the preference live. Without it (or without JS) the two sections
 * stack at rest, and the CSS defaults read as "at rest".
 */
export default function Stage({
  nav,
  hero,
  work,
}: {
  nav: ReactNode;
  hero: ReactNode;
  work: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let scene = 0;
    let target = 0;
    let raf = 0;
    let last = -1;
    let staged = false;

    /** How far down the track the page is, 0..1. */
    const progress = () =>
      clamp01(-root.getBoundingClientRect().top / Math.max(1, root.offsetHeight - window.innerHeight));

    const write = () => {
      const leave = clamp01(scene / 0.55);
      root.style.setProperty("--scene", scene.toFixed(4));
      root.style.setProperty("--hero-leave", leave.toFixed(4));
      root.style.setProperty("--work-enter", clamp01((scene - 0.45) / 0.55).toFixed(4));
      root.toggleAttribute("data-leaving", leave > 0);
    };

    const frame = (now: number) => {
      // A long gap (a dropped or throttled frame) counts as one frame.
      const dt = last < 0 ? 0 : Math.min(50, now - last);
      last = now;
      const d = dt / CHANGE_MS;
      scene = target > scene ? Math.min(target, scene + d) : Math.max(target, scene - d);
      write();
      raf = scene === target ? 0 : requestAnimationFrame(frame);
    };

    const showScene = () => {
      root.dataset.scene = target === 1 ? "work" : "hero";
    };

    const onScroll = () => {
      const p = progress();
      const next = target === 0 ? (p > WORK_AT ? 1 : 0) : p < HERO_AT ? 0 : 1;
      if (next === target) return;
      target = next;
      showScene();
      if (!raf) {
        last = -1;
        raf = requestAnimationFrame(frame);
      }
    };

    const stage = () => {
      if (staged) return;
      staged = true;
      root.setAttribute("data-staged", "");
      // Already past the threshold (a reload, a hash link): the work scene,
      // with no tween.
      target = progress() > WORK_AT ? 1 : 0;
      scene = target;
      showScene();
      write();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    };

    const unstage = () => {
      if (!staged) return;
      staged = false;
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeAttribute("data-staged");
      root.removeAttribute("data-scene");
      root.removeAttribute("data-leaving");
      for (const p of ["--scene", "--hero-leave", "--work-enter"]) root.style.removeProperty(p);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = (e: MediaQueryListEvent) => (e.matches ? unstage() : stage());
    if (!reduce.matches) stage();
    reduce.addEventListener("change", onMotionChange);

    return () => {
      reduce.removeEventListener("change", onMotionChange);
      unstage();
    };
  }, []);

  return (
    <div ref={rootRef} data-stage className={styles.root}>
      {nav}
      <div className={styles.pin}>
        <div className={styles.heroScene}>{hero}</div>
        <div className={styles.workScene}>{work}</div>
      </div>
    </div>
  );
}
