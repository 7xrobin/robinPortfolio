import { WORK } from "@/lib/work";
import styles from "./Work.module.css";
import TriangleField from "./TriangleField";
import WorkCarousel from "./WorkCarousel";

export default function Work() {
  return (
    <section
      id="work"
      className={styles.work}
      data-screen-label="02 Work"
      aria-labelledby="work-title"
    >
      {/* Anchored on the hero's portrait frame, so its triangles sit on the
          hero's lattice and continue its field down the page. */}
      <TriangleField handoff="enter" anchor='#top [data-field="frame"]' />
      <div className={styles.inner}>
        <h2 id="work-title" className={styles["work-title"]}>
          Work
        </h2>
        <WorkCarousel items={WORK} />
      </div>
    </section>
  );
}
