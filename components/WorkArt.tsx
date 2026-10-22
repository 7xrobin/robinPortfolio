import { useId, type CSSProperties } from "react";
import type { WorkItem } from "@/lib/work";
import styles from "./WorkArt.module.css";

// Equilateral triangles of side 240, in the cluster's units, each traced
// apex -> right -> left.
const SIDE = 240;
const HEIGHT = 207.85;

// Each triangle traces over its own span of the art's progress, staggered.
const TRACE_START = 0.1;
const TRACE_STEP = 0.12;
const TRACE_WIDTH = 0.3;

// Every project's shade sits at the same point, bottom right: a change of
// project changes the colour in place and never moves it.
const SHADE_AT = ["78%", "72%"] as const;

const corners = (x: number, y: number) =>
  [
    [x, y],
    [x + SIDE / 2, y + HEIGHT],
    [x - SIDE / 2, y + HEIGHT],
  ] as const;

/* The work's backdrop: each project's placeholder art at section size, one
   layer per project, only the active one shown. A layer's radial shade fades
   in, then its triangles trace in one by one, edge by edge with a lit tip
   riding the trace, and fill. A layer's progress is the lower of
   --work-enter (the scene change) and its own --art, which turns to 1 when
   its project becomes active and back to 0 when it leaves: the scene change
   and a change of project play the same trace. Without a stage it is at
   rest. */
export default function WorkArt({ items, active }: { items: WorkItem[]; active: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg className={styles.art} aria-hidden="true" focusable="false">
      {items.map((item, p) => {
        const { art } = item;
        const key = `${id}-${p}`;
        return (
          <g key={item.slug} className={styles.project} data-active={p === active || undefined}>
            <defs>
              <radialGradient id={`${key}-shade`} cx={SHADE_AT[0]} cy={SHADE_AT[1]} r="70%">
                <stop offset="0" stopColor={art.color} stopOpacity="0.55"></stop>
                <stop offset="1" stopColor={art.color} stopOpacity="0"></stop>
              </radialGradient>
              <radialGradient id={`${key}-glow`}>
                <stop offset="0" stopColor={art.tip}></stop>
                <stop offset="1" stopColor={art.tip} stopOpacity="0"></stop>
              </radialGradient>
              <linearGradient id={`${key}-fill`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={art.color}></stop>
                <stop offset="1" stopColor={art.color2}></stop>
              </linearGradient>
            </defs>
            <rect className={styles.shade} width="100%" height="100%" fill={`url(#${key}-shade)`}></rect>
            <g className={styles.cluster}>
              {art.triangles.map((t, i) => {
                const c = corners(t.x, t.y);
                const points = c.map((pt) => pt.join(",")).join(" ");
                const path = `M${c[0].join(",")} L${c[1].join(",")} L${c[2].join(",")} Z`;
                const mask = `${key}-trace-${i}`;
                const span = {
                  "--t0": String(TRACE_START + TRACE_STEP * i),
                  "--tw": String(TRACE_WIDTH),
                } as CSSProperties;
                return (
                  <g key={i} className={styles.tri} style={span}>
                    <defs>
                      {/* The trace is drawn in the mask, in cluster units, as
                          the portrait frame's is. */}
                      <mask
                        id={mask}
                        maskUnits="userSpaceOnUse"
                        x={t.x - SIDE / 2 - 20}
                        y={t.y - 20}
                        width={SIDE + 40}
                        height={HEIGHT + 40}
                      >
                        <polygon
                          className={styles.trace}
                          points={points}
                          fill="none"
                          stroke="#fff"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></polygon>
                      </mask>
                    </defs>
                    <polygon
                      className={styles.fill}
                      points={points}
                      fill={`url(#${key}-fill)`}
                      fillOpacity={t.fill}
                      stroke="none"
                    ></polygon>
                    <polygon
                      className={styles.line}
                      points={points}
                      fill="none"
                      stroke={art.color}
                      strokeOpacity="0.7"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      mask={`url(#${mask})`}
                    ></polygon>
                    <g className={styles.tip} style={{ offsetPath: `path("${path}")` }}>
                      <circle r="8.4" fill={`url(#${key}-glow)`}></circle>
                      <circle r="2.4" fill={art.tip}></circle>
                    </g>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
