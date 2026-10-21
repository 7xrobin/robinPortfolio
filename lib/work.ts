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
  },
];
