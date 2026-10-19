// Lattice geometry for the hero field. No DOM, no React.
//
// Every coordinate here is in section pixels (relative to the hero section's
// top-left corner). The lattice is anchored on the frame: its apex is node
// (0, 0) and its base corners are nodes (12, -6) and (12, 6).

import { DESIGN, FIELD, type FieldConfig } from "./config";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LatticeNode {
  /** Row, relative to the apex (negative above it). */
  r: number;
  /** Column, relative to the apex. */
  c: number;
  x: number;
  y: number;
  /** Horizontal fade of the design, 0..1. */
  fade: number;
  /** Logo clean zone, 0 inside, 1 clear of it. */
  clean: number;
  /** fade × clean: what drawing multiplies by. */
  weight: number;
}

/** What the coordinate mappings need: the apex and the scale. */
export interface LatticeFrame {
  apexX: number;
  apexY: number;
  /** Cell side in px. */
  side: number;
  /** side / 40: px per design unit. */
  s: number;
}

export interface Lattice extends LatticeFrame {
  rowHeight: number;
  rMin: number;
  rMax: number;
  cMin: number;
  cMax: number;
  nodes: LatticeNode[];
}

const SQRT3_2 = Math.sqrt(3) / 2;

/** Parity that is right for negative rows too. */
export function odd(r: number): boolean {
  return ((r % 2) + 2) % 2 === 1;
}

export function latticeFrame(frame: Rect): LatticeFrame {
  const side = frame.width / DESIGN.frameCells;
  return {
    apexX: frame.left + frame.width / 2,
    apexY: frame.top,
    side,
    s: side / DESIGN.cell,
  };
}

/** Section position of node (r, c). */
export function nodePosition(g: LatticeFrame, r: number, c: number): Point {
  return {
    x: g.apexX + (c + (odd(r) ? 0.5 : 0)) * g.side,
    y: g.apexY + r * g.side * SQRT3_2,
  };
}

/** Maps a design coordinate (1280 × 760 space) to section px. */
export function designToSection(g: LatticeFrame, X: number, Y: number): Point {
  return {
    x: g.apexX + (X - DESIGN.apexX) * g.s,
    y: g.apexY + (Y - DESIGN.apexY) * g.s,
  };
}

/**
 * The design's horizontal fade at section x. Clamped to the first stop left of
 * the design (the SVG gradient pads), the stops up to t = 1 with the last one
 * held, then linear to 0 over `dropCells` cells past the design's right edge.
 */
export function fade(x: number, g: LatticeFrame, cfg: FieldConfig["fade"] = FIELD.fade): number {
  const x0 = g.apexX - DESIGN.apexX * g.s;
  const w = DESIGN.width * g.s;
  const t = (x - x0) / w;
  const stops = cfg.stops;
  if (t <= stops[0][0]) return stops[0][1];
  if (t <= 1) {
    for (let i = 1; i < stops.length; i++) {
      const [t1, v1] = stops[i];
      if (t <= t1) {
        const [t0, v0] = stops[i - 1];
        return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
      }
    }
    return stops[stops.length - 1][1];
  }
  const drop = cfg.dropCells * g.side;
  const past = x - (x0 + w);
  const last = stops[stops.length - 1][1];
  return past >= drop ? 0 : last * (1 - past / drop);
}

function smoothstep(u: number): number {
  const v = Math.min(1, Math.max(0, u));
  return v * v * (3 - 2 * v);
}

/**
 * The logo clean zone: 0 within the logo rect padded by `paddingCells`, then a
 * smoothstep to 1 over `rampCells` cells.
 */
export function cleanZone(
  logoRect: Rect | null,
  side: number,
  cfg: FieldConfig["cleanZone"] = FIELD.cleanZone,
): (x: number, y: number) => number {
  if (!logoRect) return () => 1;
  const pad = cfg.paddingCells * side;
  const ramp = cfg.rampCells * side;
  const { left, top } = logoRect;
  const right = left + logoRect.width;
  const bottom = top + logoRect.height;
  return (x, y) => {
    const dx = Math.max(left - x, 0, x - right);
    const dy = Math.max(top - y, 0, y - bottom);
    const d = Math.hypot(dx, dy);
    return smoothstep((d - pad) / ramp);
  };
}

/**
 * Builds the node lattice over the whole section plus one cell of margin,
 * anchored on the frame apex. `logo` drives each node's clean value.
 */
export function buildLattice(
  frame: Rect,
  section: Size,
  logo: Rect | null = null,
  cfg: FieldConfig = FIELD,
): Lattice {
  const g = latticeFrame(frame);
  const { side, apexX, apexY } = g;
  const rowHeight = side * SQRT3_2;
  const rMin = Math.floor((-side - apexY) / rowHeight);
  const rMax = Math.ceil((section.height + side - apexY) / rowHeight);
  const cMin = Math.floor((-side - apexX) / side) - 1;
  const cMax = Math.ceil((section.width + side - apexX) / side);
  const clean = cleanZone(logo, side, cfg.cleanZone);

  const nodes: LatticeNode[] = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const { x, y } = nodePosition(g, r, c);
      const f = fade(x, g, cfg.fade);
      const k = clean(x, y);
      nodes.push({ r, c, x, y, fade: f, clean: k, weight: f * k });
    }
  }
  return { ...g, rowHeight, rMin, rMax, cMin, cMax, nodes };
}

/** The node (r, c), or undefined outside the built range. */
export function nodeAt(l: Lattice, r: number, c: number): LatticeNode | undefined {
  if (r < l.rMin || r > l.rMax || c < l.cMin || c > l.cMax) return undefined;
  return l.nodes[(r - l.rMin) * (l.cMax - l.cMin + 1) + (c - l.cMin)];
}

/** The ripple origin: the frame triangle's centroid. */
export function frameCentroid(frame: Rect): Point {
  return { x: frame.left + frame.width / 2, y: frame.top + (2 / 3) * frame.height };
}

// ---- Cells ---------------------------------------------------------------
//
// A cell is a triangle in the strip between rows r and r + 1. Along the strip,
// positions are in half-cells, `hx = 2c + odd(r)` for a node, with the apex at
// hx = 0. Cell k has its leftmost vertex at hx = k. When that vertex is on row
// r (k has the parity of row r) the cell points down, otherwise up.

const OFFSET = 1 << 12;
const STRIDE = 1 << 13;

export type CellId = number;
export type NodeKey = readonly [r: number, c: number];

export function cellId(r: number, k: number): CellId {
  return (r + OFFSET) * STRIDE + (k + OFFSET);
}

export function cellRow(id: CellId): number {
  return Math.floor(id / STRIDE) - OFFSET;
}

export function cellK(id: CellId): number {
  return (id % STRIDE) - OFFSET;
}

function hxParity(r: number): number {
  return odd(r) ? 1 : 0;
}

/** True when the cell points down (its flat side on row r). */
export function cellIsDown(id: CellId): boolean {
  const r = cellRow(id);
  const k = cellK(id);
  return ((k - hxParity(r)) & 1) === 0;
}

function nodeFromHx(r: number, hx: number): NodeKey {
  return [r, (hx - hxParity(r)) / 2];
}

/** The three nodes of a cell. */
export function cellNodes(id: CellId): [NodeKey, NodeKey, NodeKey] {
  const r = cellRow(id);
  const k = cellK(id);
  return cellIsDown(id)
    ? [nodeFromHx(r, k), nodeFromHx(r, k + 2), nodeFromHx(r + 1, k + 1)]
    : [nodeFromHx(r + 1, k), nodeFromHx(r + 1, k + 2), nodeFromHx(r, k + 1)];
}

/** The three edge-sharing cells. */
export function cellNeighbours(id: CellId): [CellId, CellId, CellId] {
  const r = cellRow(id);
  const k = cellK(id);
  return [cellId(r, k - 1), cellId(r, k + 1), cellIsDown(id) ? cellId(r - 1, k) : cellId(r + 1, k)];
}

/** The six cells fanned around node (r, c). */
export function cellsAroundNode(r: number, c: number): CellId[] {
  const hx = 2 * c + hxParity(r);
  return [
    cellId(r - 1, hx - 2),
    cellId(r - 1, hx - 1),
    cellId(r - 1, hx),
    cellId(r, hx - 2),
    cellId(r, hx - 1),
    cellId(r, hx),
  ];
}

/** Section position of a cell's centroid. */
export function cellCentroid(g: LatticeFrame, id: CellId): Point {
  const r = cellRow(id);
  const k = cellK(id);
  const rowHeight = g.side * SQRT3_2;
  return {
    x: g.apexX + ((k + 1) / 2) * g.side,
    y: g.apexY + (r + (cellIsDown(id) ? 1 / 3 : 2 / 3)) * rowHeight,
  };
}
