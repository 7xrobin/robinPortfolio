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
      <TriangleField handoff="enter" />
      {/* Where the field is anchored: an invisible frame, like the hero's portrait. */}
      <div className={styles.anchor} data-field="frame" aria-hidden="true" />
      <div className={styles.inner}>
        <h2 id="work-title" className={styles["work-title"]}>
          Work
        </h2>
        <WorkCarousel items={WORK} />
      </div>
    </section>
  );
}
