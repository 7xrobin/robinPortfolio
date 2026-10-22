"use client";

import { useState } from "react";
import { WORK } from "@/lib/work";
import styles from "./Work.module.css";
import WorkArt from "./WorkArt";
import WorkCarousel from "./WorkCarousel";

/* No heading: the nav's Work link marks the section while it shows. The
   art behind follows the card in view. */
export default function Work() {
  const [active, setActive] = useState(0);

  return (
    <section className={styles.work} data-screen-label="02 Work" aria-label="Work">
      <WorkArt items={WORK} active={active} />
      <div className={styles.inner}>
        <WorkCarousel items={WORK} onActiveChange={setActive} />
      </div>
    </section>
  );
}
