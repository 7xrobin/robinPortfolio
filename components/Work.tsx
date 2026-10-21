import { WORK } from "@/lib/work";
import styles from "./Work.module.css";
import WorkCarousel from "./WorkCarousel";

export default function Work() {
  return (
    <section
      id="work"
      className={styles.work}
      data-screen-label="02 Work"
      aria-labelledby="work-title"
    >
      {/* Card 2 mounts the work field here, and its anchor inside .inner. */}
      <div className={styles.inner}>
        <h2 id="work-title" className={styles["work-title"]}>
          Work
        </h2>
        <WorkCarousel items={WORK} />
      </div>
    </section>
  );
}
