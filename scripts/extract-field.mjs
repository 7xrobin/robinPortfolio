// Extracts the hero triangle field from public/triangle-grid.svg into lattice
// data: lib/field/design.ts. Run with `node scripts/extract-field.mjs`.
//
// The SVG is drawn in a 1280 × 760 design space with 40-unit cells and the
// frame apex on node (320, 138.6). Every point is snapped to its lattice node
// (r, c), relative to the apex, with odd rows shifted half a cell right. The
// SVG rounds its coordinates to one decimal, so a point may sit a little off
// its node; past SNAP design units the script fails instead of guessing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/triangle-grid.svg");
const OUT = join(ROOT, "lib/field/design.ts");

const CELL = 40;
const ROW = CELL * (Math.sqrt(3) / 2); // 34.641
const APEX_X = 320;
const APEX_Y = 138.6;
const SNAP = 0.5;
/** The SVG has a small cluster right of the shape, at design x 900–1000,
 *  that sits behind the hero text; the owner dropped it. Nothing of the
 *  shape itself reaches past x = 860. */
const RIGHT_LIMIT = 880;

/** Expected counts (spec 0003, "The design, measured", less the cluster right of RIGHT_LIMIT: 11 edges, 1 fill, 4 lit nodes). */
const EXPECT = { edges: 830, stubs: 3, fills: 164, lit: 185 };

/** Fill colours in the order of FIELD.fills.palette. */
const COLOURS = ["oklch(0.62 0.09 200)", "oklch(0.58 0.11 245)", "#968ae0"];

// Must match cellId() in lib/field/lattice.ts.
const OFFSET = 1 << 12;
const STRIDE = 1 << 13;

const odd = (r) => ((r % 2) + 2) % 2 === 1;

function fail(msg) {
  console.error(`extract-field: ${msg}`);
  process.exit(1);
}

/** Snaps a design point to its node, failing past the tolerance. */
function snap(X, Y) {
  const r = Math.round((Y - APEX_Y) / ROW);
  const c = Math.round((X - APEX_X) / CELL - (odd(r) ? 0.5 : 0));
  const nx = APEX_X + (c + (odd(r) ? 0.5 : 0)) * CELL;
  const ny = APEX_Y + r * ROW;
  const d = Math.hypot(X - nx, Y - ny);
  if (d > SNAP) fail(`point (${X}, ${Y}) is ${d.toFixed(3)} du from node (${r}, ${c})`);
  return [r, c];
}

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
const key = ([r, c]) => `${r},${c}`;

/** The cell a triangle of three nodes covers: the strip row and leftmost half-cell. */
function cellOf(nodes) {
  const rows = nodes.map((n) => n[0]);
  const r = Math.min(...rows);
  if (Math.max(...rows) !== r + 1) fail(`triangle ${nodes.map(key).join(" ")} spans no single row strip`);
  const k = Math.min(...nodes.map(([nr, nc]) => 2 * nc + (odd(nr) ? 1 : 0)));
  return { r, k, id: (r + OFFSET) * STRIDE + (k + OFFSET) };
}

const numbers = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);

const svg = readFileSync(SRC, "utf8");
const paths = [...svg.matchAll(/<path\b([^>]*)>/g)].map((m) => {
  const attr = (name) => m[1].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  return { d: attr("d"), fill: attr("fill"), fillOpacity: attr("fill-opacity"), stroke: attr("stroke") };
});

// ---- Edges: the one stroked path, "M x y L x y" per segment. -------------
const strokes = paths.filter((p) => p.stroke);
if (strokes.length !== 1) fail(`expected 1 stroked path, found ${strokes.length}`);
const edgeMap = new Map();
for (const seg of strokes[0].d.split("M").filter(Boolean)) {
  const [x1, y1, x2, y2, ...rest] = numbers(seg);
  if (rest.length || y2 === undefined) fail(`unexpected edge segment "M${seg}"`);
  const pair = [snap(x1, y1), snap(x2, y2)].sort(cmp);
  const [a, b] = pair;
  const dr = Math.abs(a[0] - b[0]);
  const adjacent = dr === 0 ? Math.abs(a[1] - b[1]) === 1 : dr === 1 && Math.abs(snapX(a) - snapX(b)) === CELL / 2;
  if (!adjacent) fail(`edge ${key(a)} – ${key(b)} does not join neighbouring nodes`);
  edgeMap.set(`${key(a)}|${key(b)}`, pair);
}
function snapX([r, c]) {
  return (c + (odd(r) ? 0.5 : 0)) * CELL;
}
const byPair = (p, q) => cmp(p[0], q[0]) || cmp(p[1], q[1]);
// The stroked path runs past the left edge of the design box (x = 0). Edges
// with both ends at x >= 0 are the design; edges reaching across x = 0 into
// x > 0 are stubs (drawn clipped to the box, never part of the shape); edges
// that never reach x > 0 are never seen and are dropped.
const designX = (n) => APEX_X + snapX(n);
const allEdges = [...edgeMap.values()];
const right = (n) => designX(n) > RIGHT_LIMIT;
const edges = allEdges
  .filter(([a, b]) => designX(a) >= 0 && designX(b) >= 0 && !right(a) && !right(b))
  .sort(byPair);
const stubs = allEdges
  .filter(([a, b]) => Math.min(designX(a), designX(b)) < 0 && Math.max(designX(a), designX(b)) > 0)
  .sort(byPair);
const dropped = allEdges.filter(([a, b]) => right(a) || right(b)).length;
const hidden = allEdges.length - edges.length - stubs.length - dropped;

// ---- Fills: one closed triangle path each. ---------------------------------
const fills = paths
  .filter((p) => p.fillOpacity !== undefined)
  .map((p) => {
    const n = numbers(p.d);
    if (n.length !== 6) fail(`fill path "${p.d}" is not a triangle`);
    const nodes = [snap(n[0], n[1]), snap(n[2], n[3]), snap(n[4], n[5])];
    if (nodes.some(right)) return null;
    const colour = COLOURS.indexOf(p.fill);
    if (colour < 0) fail(`unknown fill colour ${p.fill}`);
    return { ...cellOf(nodes), colour, opacity: Number(p.fillOpacity) };
  })
  .filter(Boolean)
  .sort((a, b) => a.r - b.r || a.k - b.k);
if (new Set(fills.map((f) => f.id)).size !== fills.length) fail("two fills share a cell");

// ---- Lit nodes: one path of circles, "M (x - 1.6) y a1.6 ...". -------------
const glows = paths.filter((p) => p.fill && p.fillOpacity === undefined && !p.stroke);
if (glows.length !== 1) fail(`expected 1 lit-node path, found ${glows.length}`);
const litMap = new Map();
for (const seg of glows[0].d.split("M").filter(Boolean)) {
  const [x, y] = numbers(seg);
  const radius = Number(seg.match(/a(\d+(?:\.\d+)?)/)[1]);
  const node = snap(x + radius, y);
  if (!right(node)) litMap.set(key(node), node);
}
const lit = [...litMap.values()].sort(cmp);

const counts = { edges: edges.length, stubs: stubs.length, fills: fills.length, lit: lit.length };
for (const k of Object.keys(EXPECT)) {
  if (counts[k] !== EXPECT[k]) fail(`expected ${EXPECT[k]} ${k}, found ${counts[k]}`);
}

// ---- Output ----------------------------------------------------------------
const node = ([r, c]) => `[${r}, ${c}]`;
const rows = (items, perLine) => {
  const lines = [];
  for (let i = 0; i < items.length; i += perLine) lines.push(`  ${items.slice(i, i + perLine).join(", ")},`);
  return lines.join("\n");
};

const out = `// GENERATED by scripts/extract-field.mjs from public/triangle-grid.svg — do not edit.
// Re-run \`node scripts/extract-field.mjs\` after changing the SVG.
//
// Nodes are lattice keys [r, c] relative to the frame apex, odd rows shifted
// half a cell right (lib/field/lattice.ts nodePosition). Cells are CellIds
// (lib/field/lattice.ts cellId): cell(r, k) is the triangle in the strip
// between rows r and r + 1 whose leftmost vertex is at half-cell k.

type Node = readonly [r: number, c: number];

/** Must match cellId() in lib/field/lattice.ts. */
const cell = (r: number, k: number) => (r + ${OFFSET}) * ${STRIDE} + (k + ${OFFSET});

export interface DesignFill {
  cell: number;
  /** Index into FIELD.fills.palette. */
  colour: 0 | 1 | 2;
  opacity: number;
}

/** ${edges.length} edges inside the design box (both ends at 0 <= x <= ${RIGHT_LIMIT}), each a sorted node pair. */
export const DESIGN_EDGES: readonly (readonly [Node, Node])[] = [
${rows(
  edges.map(([a, b]) => `[${node(a)}, ${node(b)}]`),
  4,
)}
];

/**
 * ${stubs.length} edges crossing the left edge of the design box (x = 0), each a
 * sorted node pair. Drawn clipped to x >= 0; not part of the shape.
 */
export const DESIGN_STUBS: readonly (readonly [Node, Node])[] = [
${rows(
  stubs.map(([a, b]) => `[${node(a)}, ${node(b)}]`),
  4,
)}
];

/** ${fills.length} filled cells. */
export const DESIGN_FILLS: readonly DesignFill[] = [
${fills.map((f) => `  { cell: cell(${f.r}, ${f.k}), colour: ${f.colour}, opacity: ${f.opacity} },`).join("\n")}
];

/** ${lit.length} lit nodes. */
export const DESIGN_LIT: readonly Node[] = [
${rows(lit.map(node), 8)}
];
`;

writeFileSync(OUT, out);
console.log(`extract-field: ${counts.edges} edges, ${counts.stubs} stubs (${hidden} hidden, ${dropped} right of x = ${RIGHT_LIMIT} dropped), ${counts.fills} fills, ${counts.lit} lit nodes → lib/field/design.ts`);
