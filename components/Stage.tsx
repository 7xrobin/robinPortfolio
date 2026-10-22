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
 * Hash links and focus land in the scenes: `#work` is a mark at the end of
 * the track, so the nav's Work link scrolls there and plays the change, and
 * `#top` names no element, so it scrolls to the document top and plays it
 * back. Focus moving into the work while the hero shows scrolls to the mark
 * too. The inactive scene takes no pointer events, and the hero is hidden
 * from assistive tech while the work shows; the work never is.
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
  const heroRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const heroScene = heroRef.current;
    const workScene = workRef.current;
    const mark = markRef.current;
    if (!root || !heroScene || !workScene || !mark) return;

    let scene = 0;
    let target = 0;
    let raf = 0;
    let last = -1;
    let staged = false;
    let first = true;

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
      if (target === 1) heroScene.setAttribute("aria-hidden", "true");
      else heroScene.removeAttribute("aria-hidden");
    };

    // Tabbing into the work while the hero shows: go to the work scene.
    const onFocusIn = () => {
      if (staged && target === 0) mark.scrollIntoView();
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
      // Already past the threshold (a reload), or opened on `/#work`: the
      // work scene, with no tween. The fragment scroll can come after this
      // runs, so the hash is read too, and the page goes to the mark now.
      const atWork = progress() > WORK_AT;
      const toWork = first && !atWork && window.location.hash === "#work";
      first = false;
      if (toWork) mark.scrollIntoView({ behavior: "instant" });
      target = atWork || toWork ? 1 : 0;
      scene = target;
      showScene();
      write();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      workScene.addEventListener("focusin", onFocusIn);
    };

    const unstage = () => {
      if (!staged) return;
      staged = false;
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      workScene.removeEventListener("focusin", onFocusIn);
      heroScene.removeAttribute("aria-hidden");
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
        <div ref={heroRef} className={styles.heroScene}>
          {hero}
        </div>
        <div ref={workRef} className={styles.workScene}>
          {work}
        </div>
      </div>
      <span ref={markRef} id="work" className={styles.mark} />
    </div>
  );
}
