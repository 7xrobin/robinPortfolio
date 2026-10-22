import { WORK } from "@/lib/work";
import styles from "./Work.module.css";
import WorkArt from "./WorkArt";
import WorkCarousel from "./WorkCarousel";

export default function Work() {
  return (
    <section
      className={styles.work}
      data-screen-label="02 Work"
      aria-labelledby="work-title"
    >
      <WorkArt />
      <div className={styles.inner}>
        <h2 id="work-title" className={styles["work-title"]}>
          Work
        </h2>
        <WorkCarousel items={WORK} />
      </div>
    </section>
  );
}
