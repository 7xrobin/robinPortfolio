import { useId, type CSSProperties } from "react";
import styles from "./WorkArt.module.css";

// The cluster, in its own units: equilateral triangles of side 240, each
// listed apex -> right -> left, the order its outline traces in.
const SIDE = 240;
const HEIGHT = 207.85;
const TRIANGLES = [
  { x: 120, y: 0, fill: 0.1 },
  { x: 180, y: 110, fill: 0.18 },
  { x: 240, y: 0, fill: 0.26 },
  { x: 300, y: 110, fill: 0.18 },
];

// Each triangle traces over its own span of --work-enter, staggered.
const TRACE_START = 0.1;
const TRACE_STEP = 0.12;
const TRACE_WIDTH = 0.3;

const corners = (x: number, y: number) =>
  [
    [x, y],
    [x + SIDE / 2, y + HEIGHT],
    [x - SIDE / 2, y + HEIGHT],
  ] as const;

/* The work's backdrop: the placeholder art's language at section size. A
   radial shade fades in, then the triangles trace in one by one, edge by
   edge with a lit tip riding the trace, and fill; all of it reads
   --work-enter, so it reverses with the scene. Without a stage it is at
   rest. */
export default function WorkArt() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const shade = `${id}-shade`;
  const glow = `${id}-glow`;

  return (
    <svg className={styles.art} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={shade} cx="78%" cy="30%" r="70%">
          <stop offset="0" stopColor="#33969b" stopOpacity="0.55"></stop>
          <stop offset="1" stopColor="#33969b" stopOpacity="0"></stop>
        </radialGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#4fcdcd"></stop>
          <stop offset="1" stopColor="#4fcdcd" stopOpacity="0"></stop>
        </radialGradient>
      </defs>
      <rect className={styles.shade} width="100%" height="100%" fill={`url(#${shade})`}></rect>
      <g className={styles.cluster}>
        {TRIANGLES.map((t, i) => {
          const c = corners(t.x, t.y);
          const points = c.map((p) => p.join(",")).join(" ");
          const path = `M${c[0].join(",")} L${c[1].join(",")} L${c[2].join(",")} Z`;
          const fill = `${id}-fill-${i}`;
          const mask = `${id}-trace-${i}`;
          const span = {
            "--t0": String(TRACE_START + TRACE_STEP * i),
            "--tw": String(TRACE_WIDTH),
          } as CSSProperties;
          return (
            <g key={i} className={styles.tri} style={span}>
              <defs>
                <linearGradient id={fill} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#33969b"></stop>
                  <stop offset="1" stopColor="#3a80b7"></stop>
                </linearGradient>
                {/* The trace is drawn in the mask, in cluster units, as the
                    portrait frame's is. */}
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
                fill={`url(#${fill})`}
                fillOpacity={t.fill}
                stroke="none"
              ></polygon>
              <polygon
                className={styles.line}
                points={points}
                fill="none"
                stroke="#33969b"
                strokeOpacity="0.7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                mask={`url(#${mask})`}
              ></polygon>
              <g className={styles.tip} style={{ offsetPath: `path("${path}")` }}>
                <circle r="8.4" fill={`url(#${glow})`}></circle>
                <circle r="2.4" fill="#65d2d2"></circle>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
