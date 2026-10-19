"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";
import { MOBILE_QUERY, fieldConfig, type FieldConfig, type Pacing } from "@/lib/field/config";
import {
  buildLattice,
  designToSection,
  frameCentroid,
  type Lattice,
  type Point,
  type Rect,
} from "@/lib/field/lattice";
import { place, type Form } from "@/lib/field/forms";

/** Rect of `el` relative to `base`, in CSS px. */
function relativeRect(el: Element, base: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
}

interface FieldState {
  width: number;
  height: number;
  dpr: number;
  cfg: FieldConfig;
  lattice: Lattice | null;
  frame: Rect | null;
  logo: Rect | null;
  text: Rect | null;
  /** Ripple origin (the frame centroid) and each node's distance to it. */
  rippleCentre: Point;
  rippleDist: Float32Array;
  /** Ripple radius at which the farthest section corner is fully revealed. */
  rippleMax: number;
}

/** A placed form with its own timeline. Times are on the performance.now() clock. */
interface LiveForm extends Form {
  start: number;
  /** Pen speed, px per ms. */
  speed: number;
  /** Cumulative path length at each node; the last entry is the closing length. */
  cum: number[];
  total: number;
  drawEnd: number;
  /** Fill phases (equal to drawEnd for an unfilled form). */
  fillInEnd: number;
  fillHoldEnd: number;
  fillOutEnd: number;
  holdEnd: number;
  end: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Renders the faint dots into `layer`, sized to the field at `dpr`. */
function renderDots(layer: HTMLCanvasElement, st: FieldState) {
  layer.width = Math.max(1, Math.round(st.width * st.dpr));
  layer.height = Math.max(1, Math.round(st.height * st.dpr));
  const ctx = layer.getContext("2d");
  if (!ctx || !st.lattice) return;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.clearRect(0, 0, st.width, st.height);
  const { dots } = st.cfg;
  const radius = dots.radius * st.lattice.s;
  ctx.fillStyle = dots.color;
  for (const n of st.lattice.nodes) {
    if (n.weight <= 0.001) continue;
    ctx.globalAlpha = dots.opacity * n.weight;
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Renders one lit node with its glow into `sprite`, at `dpr`. Returns the
 * sprite's size in CSS px; it is drawn centred on the node.
 */
function renderGlow(sprite: HTMLCanvasElement, st: FieldState): number {
  const s = st.lattice?.s ?? 1;
  const { radius, color, glowBlur, glowColor } = st.cfg.litNode;
  const r = radius * s;
  const blur = glowBlur * s;
  const size = 2 * (r + 2 * blur + 1);
  sprite.width = sprite.height = Math.max(1, Math.ceil(size * st.dpr));
  const ctx = sprite.getContext("2d");
  if (!ctx) return size;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  // shadowBlur ignores the transform, so it is set in device pixels.
  ctx.shadowBlur = blur * st.dpr;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  ctx.fill();
  return size;
}

/** Builds the live timeline of a freshly placed form. */
function startForm(form: Form, now: number, pacing: Pacing, st: FieldState): LiveForm {
  const s = st.lattice?.s ?? 1;
  const { path } = form;
  const cum = [0];
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[cum.length - 1];
  const speed = (pacing.penSpeed * s) / 1000;
  const drawMs = total / speed;
  const drawEnd = drawMs;
  let fillInEnd = drawEnd;
  let fillHoldEnd = drawEnd;
  let fillOutEnd = drawEnd;
  if (form.fill) {
    const { staggerMs, fadeMs, holdMs } = st.cfg.fills;
    const sweep = (form.cells.length - 1) * staggerMs + fadeMs;
    fillInEnd = drawEnd + sweep;
    fillHoldEnd = fillInEnd + holdMs;
    fillOutEnd = fillHoldEnd + sweep;
  }
  const holdEnd = fillOutEnd + pacing.outlineHoldMs;
  return {
    ...form,
    start: now,
    speed,
    cum,
    total,
    drawEnd,
    fillInEnd,
    fillHoldEnd,
    fillOutEnd,
    holdEnd,
    end: holdEnd + drawMs,
  };
}

/**
 * The hero's triangle field: a lattice of faint dots on a canvas, anchored on
 * the frame, faded to the right like the design and kept clear of the logo.
 * Forms are traced by a pen, sometimes filled, then erased tail after head.
 */
export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !section || !ctx) return;

    const pick = (name: string) => section.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const frameEl = pick("frame");
    const logoEl = pick("logo");
    const textEl = pick("text");
    if (!frameEl) return;

    const mobile = window.matchMedia(MOBILE_QUERY);
    const dotsLayer = document.createElement("canvas");
    const glow = document.createElement("canvas");
    let glowSize = 0;
    let lineStyle: CanvasGradient | string = "#5dbcc1";
    const st: FieldState = {
      width: 0,
      height: 0,
      dpr: 1,
      cfg: fieldConfig(mobile.matches),
      lattice: null,
      frame: null,
      logo: null,
      text: null,
      rippleCentre: { x: 0, y: 0 },
      rippleDist: new Float32Array(0),
      rippleMax: 0,
    };
    let forms: LiveForm[] = [];
    let nextSpawn = 0;

    const measure = () => {
      const base = section.getBoundingClientRect();
      st.cfg = fieldConfig(mobile.matches);
      st.width = base.width;
      st.height = base.height;
      st.dpr = Math.min(window.devicePixelRatio || 1, st.cfg.maxDpr);
      st.frame = relativeRect(frameEl, base);
      st.logo = logoEl ? relativeRect(logoEl, base) : null;
      st.text = textEl ? relativeRect(textEl, base) : null;

      canvas.width = Math.max(1, Math.round(st.width * st.dpr));
      canvas.height = Math.max(1, Math.round(st.height * st.dpr));

      st.lattice =
        st.frame.width > 0 ? buildLattice(st.frame, st, st.logo, st.cfg) : null;
      // The ripple runs from the frame centroid until its soft edge has passed
      // the farthest section corner.
      const centre = frameCentroid(st.frame);
      const soft = st.cfg.intro.rippleSoftCells * (st.lattice?.side ?? 0);
      st.rippleCentre = centre;
      st.rippleMax =
        Math.max(
          Math.hypot(centre.x, centre.y),
          Math.hypot(st.width - centre.x, centre.y),
          Math.hypot(centre.x, st.height - centre.y),
          Math.hypot(st.width - centre.x, st.height - centre.y),
        ) + soft;
      const nodes = st.lattice?.nodes ?? [];
      st.rippleDist = new Float32Array(nodes.length);
      nodes.forEach((n, i) => {
        st.rippleDist[i] = Math.hypot(n.x - centre.x, n.y - centre.y);
      });
      renderDots(dotsLayer, st);
      glowSize = renderGlow(glow, st);
      if (st.lattice) {
        const { lines } = st.cfg;
        const p0 = designToSection(st.lattice, lines.from[0], lines.from[1]);
        const p1 = designToSection(st.lattice, lines.to[0], lines.to[1]);
        const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
        lines.stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, lines.stops.length - 1), c));
        lineStyle = grad;
      }
      // The geometry changed under the live forms; the scheduler refills them.
      forms = [];
    };

    /** Ripple radius at `now`: 0 before the window, rippleMax after it. */
    const rippleAt = (now: number) => {
      const { rippleStartMs, rippleEndMs } = st.cfg.intro;
      return st.rippleMax * clamp01((now - rippleStartMs) / (rippleEndMs - rippleStartMs));
    };
    const rippleSoft = () => Math.max(1e-3, st.cfg.intro.rippleSoftCells * (st.lattice?.side ?? 0));

    const pacingAt = (now: number) =>
      now < st.cfg.pacing.calmAtMs ? st.cfg.pacing.busy : st.cfg.pacing.calm;
    const gap = (p: Pacing) => p.gapMinMs + Math.random() * (p.gapMaxMs - p.gapMinMs);

    const step = (now: number) => {
      const pacing = pacingAt(now);
      const before = forms.length;
      forms = forms.filter((f) => now - f.start < f.end);
      if (forms.length < before) nextSpawn = Math.max(nextSpawn, now + gap(pacing));
      if (!st.lattice || now < st.cfg.intro.firstFormsMs) return;
      if (now < nextSpawn || forms.length >= pacing.liveForms) return;
      // Forms only start where the ripple has fully revealed the dots.
      const form = place(
        st.lattice,
        forms,
        { section: st, frame: st.frame, text: st.text },
        { centre: st.rippleCentre, r: rippleAt(now) - rippleSoft() },
        Math.random,
        st.cfg,
      );
      if (form) {
        forms.push(startForm(form, now, pacing, st));
        nextSpawn = now + gap(pacing);
      } else {
        nextSpawn = now + 100;
      }
    };

    const drawForm = (f: LiveForm, now: number) => {
      const t = now - f.start;
      const n = f.path.length;

      // Fills: cells fade in one by one, hold, then fade out in the same order.
      if (f.fill && t > f.drawEnd && t < f.fillOutEnd) {
        const { staggerMs, fadeMs } = st.cfg.fills;
        ctx.fillStyle = f.fill;
        for (let i = 0; i < f.cells.length; i++) {
          const a =
            t < f.fillInEnd
              ? clamp01((t - f.drawEnd - i * staggerMs) / fadeMs)
              : t < f.fillHoldEnd
                ? 1
                : 1 - clamp01((t - f.fillHoldEnd - i * staggerMs) / fadeMs);
          if (a <= 0) continue;
          const [p, q, r] = f.cellCorners[i];
          ctx.globalAlpha = f.cellOpacity[i] * a * ((p.weight + q.weight + r.weight) / 3);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.lineTo(r.x, r.y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Pen: the head runs along the path, then the tail follows it round.
      const head = Math.min(f.total, t * f.speed);
      const tail = t < f.holdEnd ? 0 : Math.min(f.total, (t - f.holdEnd) * f.speed);
      const { lines } = st.cfg;
      ctx.strokeStyle = lineStyle;
      ctx.lineWidth = lines.width * (st.lattice?.s ?? 1);
      ctx.lineCap = "round";
      for (let j = 0; j < n; j++) {
        const from = Math.max(tail, f.cum[j]);
        const to = Math.min(head, f.cum[j + 1]);
        if (to <= from) continue;
        const a = f.path[j];
        const b = f.path[(j + 1) % n];
        const len = f.cum[j + 1] - f.cum[j];
        const u0 = (from - f.cum[j]) / len;
        const u1 = (to - f.cum[j]) / len;
        ctx.globalAlpha = lines.opacity * ((a.weight + b.weight) / 2);
        ctx.beginPath();
        ctx.moveTo(a.x + (b.x - a.x) * u0, a.y + (b.y - a.y) * u0);
        ctx.lineTo(a.x + (b.x - a.x) * u1, a.y + (b.y - a.y) * u1);
        ctx.stroke();
      }

      // Lit nodes: on when the head reaches them, dark once the tail passes.
      // The first node is also the last, so it stays lit until the tail closes.
      const half = glowSize / 2;
      for (let j = 0; j < n; j++) {
        const lit = j === 0 ? tail < f.total && (tail <= 0 || head >= f.total) : head >= f.cum[j] && tail < f.cum[j];
        if (!lit) continue;
        const p = f.path[j];
        ctx.globalAlpha = p.weight;
        ctx.drawImage(glow, p.x - half, p.y - half, glowSize, glowSize);
      }
    };

    // While the ripple grows the dots are drawn one by one, each faded in by
    // the ripple's soft edge; once it has passed every corner, the cached
    // layer takes over. The time is absolute, so a late hydration joins the
    // ripple where it already is instead of restarting it.
    const drawDots = (now: number) => {
      if (now >= st.cfg.intro.rippleEndMs || !st.lattice) {
        ctx.drawImage(dotsLayer, 0, 0, st.width, st.height);
        return;
      }
      const r = rippleAt(now);
      if (r <= 0) return;
      const soft = rippleSoft();
      const { dots } = st.cfg;
      const radius = dots.radius * st.lattice.s;
      ctx.fillStyle = dots.color;
      const { nodes } = st.lattice;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const e = clamp01((r - st.rippleDist[i]) / soft);
        const edge = e * e * (3 - 2 * e);
        const a = dots.opacity * n.weight * edge;
        if (a <= 0.001) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (now: number) => {
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, st.width, st.height);
      drawDots(now);
      for (const f of forms) drawForm(f, now);
      ctx.globalAlpha = 1;
    };

    // Resizes only mark the field dirty; the next frame re-measures once, so a
    // resize while paused is picked up on resume.
    let dirty = true;
    let raf = 0;
    const markDirty = () => {
      dirty = true;
    };

    const tick = () => {
      const now = performance.now();
      if (dirty) {
        dirty = false;
        measure();
      }
      step(now);
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    // The loop runs only while the hero is on screen and the tab is visible.
    // While paused no frame is pending; on resume every timeline shifts by the
    // paused time, so forms carry on where they stopped instead of jumping.
    let onScreen = true;
    let pausedAt = -1;
    const sync = () => {
      const visible = onScreen && document.visibilityState === "visible";
      if (visible && !raf) {
        if (pausedAt >= 0) {
          const paused = performance.now() - pausedAt;
          for (const f of forms) f.start += paused;
          nextSpawn += paused;
          pausedAt = -1;
        }
        raf = requestAnimationFrame(tick);
      } else if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        pausedAt = performance.now();
      }
    };

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    });
    io.observe(section);
    document.addEventListener("visibilitychange", sync);

    const ro = new ResizeObserver(markDirty);
    for (const el of [section, frameEl, logoEl, textEl]) if (el) ro.observe(el);
    document.fonts.ready.then(markDirty, () => {});
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      ro.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, []);

  return <canvas ref={canvasRef} className={styles["hero-field"]} aria-hidden="true" />;
}
