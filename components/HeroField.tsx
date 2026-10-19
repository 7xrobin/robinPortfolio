"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";
import { MOBILE_QUERY, fieldConfig, type FieldConfig } from "@/lib/field/config";
import { buildLattice, type Lattice, type Rect } from "@/lib/field/lattice";

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
}

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
 * The hero's triangle field: a lattice of faint dots on a canvas, anchored on
 * the frame, faded to the right like the design and kept clear of the logo.
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
    const st: FieldState = {
      width: 0,
      height: 0,
      dpr: 1,
      cfg: fieldConfig(mobile.matches),
      lattice: null,
      frame: null,
      logo: null,
      text: null,
    };

    const draw = () => {
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.width, st.height);
      ctx.drawImage(dotsLayer, 0, 0, st.width, st.height);
    };

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
      renderDots(dotsLayer, st);
      draw();
    };

    // Coalesce bursts of resize notifications into one re-measure per frame.
    let pending = 0;
    let disposed = false;
    const schedule = () => {
      if (disposed || pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        measure();
      });
    };

    const ro = new ResizeObserver(schedule);
    for (const el of [section, frameEl, logoEl, textEl]) if (el) ro.observe(el);
    document.fonts.ready.then(schedule, () => {});
    schedule();

    return () => {
      disposed = true;
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
    };
  }, []);

  return <canvas ref={canvasRef} className={styles["hero-field"]} aria-hidden="true" />;
}
