"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkItem } from "@/lib/work";
import styles from "./Work.module.css";

const TRACK_ID = "work-track";

export default function WorkCarousel({ items }: { items: WorkItem[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  // The buttons stay hidden until mounted, so without JS there are no dead
  // buttons; the track still scrolls on its own.
  const [mounted, setMounted] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setAtStart(track.scrollLeft <= 1);
      setAtEnd(track.scrollLeft >= max - 1);
    };
    // Show the buttons once mounted; the effect is the client-only signal.
    setMounted(true);
    update();
    track.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: dir * (card.getBoundingClientRect().width + gap),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <>
      <div className={styles.controls} hidden={!mounted}>
        <button
          type="button"
          className={styles.arrow}
          aria-controls={TRACK_ID}
          aria-label="Previous project"
          disabled={atStart}
          onClick={() => step(-1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.arrow}
          aria-controls={TRACK_ID}
          aria-label="Next project"
          disabled={atEnd}
          onClick={() => step(1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <ul
        ref={trackRef}
        id={TRACK_ID}
        className={styles.track}
        tabIndex={0}
        aria-label="Projects"
      >
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
    </>
  );
}
