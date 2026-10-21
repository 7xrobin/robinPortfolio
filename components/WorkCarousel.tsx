"use client";

import type { WorkItem } from "@/lib/work";
import styles from "./Work.module.css";

export default function WorkCarousel({ items }: { items: WorkItem[] }) {
  return (
    <ul id="work-track" className={styles.track} tabIndex={0} aria-label="Projects">
      {items.map((item) => (
        <li key={item.slug} className={styles.card}>
          <h3 className={styles["card-title"]}>{item.title}</h3>
          {/* Plain img: static export cannot optimise images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles["card-img"]}
            src={item.image}
            width={800}
            height={500}
            loading="lazy"
            alt={item.imageAlt}
          />
          <p className={styles["card-desc"]}>{item.description}</p>
          <ul className={styles["card-tags"]} aria-label="Built with">
            {item.tags.map((tag) => (
              <li key={tag} className="tag tag-accent">
                {tag}
              </li>
            ))}
          </ul>
          <a
            className="btn btn-primary"
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            View project
          </a>
        </li>
      ))}
    </ul>
  );
}
