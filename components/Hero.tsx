import styles from "./Hero.module.css";
import HeroField from "./HeroField";

export default function Hero() {
  return (
    <section id="top" className={styles.hero} data-screen-label="01 Hero">
      <HeroField />
      <div className={styles["hero-inner"]}>
        <nav className={styles["hero-nav"]} data-field="nav" aria-label="Main">
          <a href="#top" className={styles["hero-logo"]} aria-label="Robin — home"></a>
          <div className={styles["hero-links"]}>
            <a href="#about">About</a>
          </div>
        </nav>

        <div className={styles["hero-img"]} data-field="frame">
          <svg
            className={styles["hero-frame"]}
            viewBox="0 0 480 415.7"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="frame-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="oklch(0.80 0.10 195)"></stop>
                <stop offset="1" stopColor="var(--color-accent)"></stop>
              </linearGradient>
              {/* The trace is drawn in the mask, in viewBox units, so one dash
                  length fits every frame size and the visible line keeps its
                  non-scaling 1.4 px stroke. */}
              <mask
                id="frame-trace"
                maskUnits="userSpaceOnUse"
                x="-20"
                y="-20"
                width="520"
                height="455.7"
              >
                <polygon
                  className={styles["hero-frame-trace"]}
                  points="240,0 480,415.7 0,415.7"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></polygon>
              </mask>
            </defs>
            <polygon
              className={styles["hero-frame-fill"]}
              points="240,0 480,415.7 0,415.7"
              fill="var(--color-bg)"
              fillOpacity="0.88"
              stroke="none"
            ></polygon>
            <polygon
              className={styles["hero-frame-line"]}
              points="240,0 480,415.7 0,415.7"
              fill="none"
              stroke="url(#frame-stroke)"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              mask="url(#frame-trace)"
            ></polygon>
          </svg>
          <div className={`${styles["hero-portrait"]} lighten`}>
            {/* Plain img: static export cannot optimise images, and the portrait CSS targets a plain img. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portrait.png" alt="Portrait of Robin" />
          </div>
        </div>

        <div className={styles["hero-text"]} data-field="text">
          <p className={styles["hero-hello"]}>Hi, I’m Robin Oliveira.</p>
          <h1>
            Shaping digital solutions, from first idea to <em>release</em>.
          </h1>
          <p className={styles["hero-sub"]}>
            I bring business and design thinking to every stage of the build, so what ships is smart, usable, and impactful.
            <br />Where AI engineering meets user experience.
          </p>
        </div>
      </div>
    </section >
  );
}
