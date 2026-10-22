/** A project shown in the Work section. Placeholder content until the real
    projects are written up. */
export interface WorkItem {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  tags: string[];
  art: WorkArt;
}

/** The triangle art behind a project's card, in the language of its
    placeholder picture: a radial shade, then triangles traced in and filled.
    Triangles are listed by apex, in the art's cluster units (side 240). */
export interface WorkArt {
  /** Shade, outline and the fill gradient's start. */
  color: string;
  /** The fill gradient's end. */
  color2: string;
  /** The lit point riding the trace. */
  tip: string;
  triangles: { x: number; y: number; fill: number }[];
}

export const WORK: WorkItem[] = [
  {
    slug: "project-one",
    title: "Project One",
    description:
      "A placeholder for a product built end to end, from the first sketch to the release.",
    image: "/work/placeholder-1.svg",
    imageAlt: "Placeholder artwork for Project One",
    href: "#",
    tags: ["Next.js", "TypeScript", "Vercel"],
    art: {
      color: "#33969b",
      color2: "#3a80b7",
      tip: "#65d2d2",
      triangles: [
        { x: 120, y: 0, fill: 0.1 },
        { x: 180, y: 110, fill: 0.18 },
        { x: 240, y: 0, fill: 0.26 },
        { x: 300, y: 110, fill: 0.18 },
      ],
    },
  },
  {
    slug: "project-two",
    title: "Project Two",
    description:
      "A placeholder for an AI feature shaped around what its users actually need.",
    image: "/work/placeholder-2.svg",
    imageAlt: "Placeholder artwork for Project Two",
    href: "#",
    tags: ["Python", "AI", "Postgres"],
    art: {
      color: "#3a80b7",
      color2: "#968ae0",
      tip: "#7fb4e6",
      triangles: [
        { x: 120, y: 0, fill: 0.1 },
        { x: 240, y: 0, fill: 0.18 },
        { x: 180, y: 110, fill: 0.26 },
      ],
    },
  },
  {
    slug: "project-three",
    title: "Project Three",
    description:
      "A placeholder for a design system taken from Figma into working components.",
    image: "/work/placeholder-3.svg",
    imageAlt: "Placeholder artwork for Project Three",
    href: "#",
    tags: ["Figma", "React"],
    art: {
      color: "#968ae0",
      color2: "#33969b",
      tip: "#b5abfc",
      triangles: [
        { x: 240, y: 0, fill: 0.1 },
        { x: 180, y: 110, fill: 0.18 },
        { x: 300, y: 110, fill: 0.26 },
      ],
    },
  },
  {
    slug: "project-four",
    title: "Project Four",
    description:
      "A placeholder for a data-heavy tool made simple to use. Fast to load, clear to read.",
    image: "/work/placeholder-4.svg",
    imageAlt: "Placeholder artwork for Project Four",
    href: "#",
    tags: ["React", "TypeScript", "Postgres", "AI"],
    art: {
      color: "#33969b",
      color2: "#968ae0",
      tip: "#65d2d2",
      triangles: [
        { x: 180, y: 0, fill: 0.26 },
        { x: 120, y: 110, fill: 0.1 },
        { x: 300, y: 0, fill: 0.18 },
        { x: 360, y: 110, fill: 0.1 },
      ],
    },
  },
];
