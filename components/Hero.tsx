import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section id="top" className={styles.hero} data-screen-label="01 Hero">
      <div className={styles["hero-inner"]}>
        <nav className={styles["hero-nav"]} aria-label="Main">
          <a href="#top" className={styles["hero-logo"]} aria-label="Robin — home"></a>
          <div className={styles["hero-links"]}>
            <a href="#about">About</a>
          </div>
        </nav>

        <div className={styles["hero-img"]}>
          {/* Plain img: static export cannot optimise images, and the field is positioned by CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles["hero-field"]} src="/triangle-grid.svg" alt="" aria-hidden="true" />
          <svg
            className={styles["hero-frame"]}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="frame-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="oklch(0.80 0.10 195)"></stop>
                <stop offset="1" stopColor="var(--color-accent)"></stop>
              </linearGradient>
            </defs>
            <polygon
              points="50,0 100,100 0,100"
              fill="var(--color-bg)"
              fillOpacity="0.88"
              stroke="url(#frame-stroke)"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            ></polygon>
          </svg>
          <div className={`${styles["hero-portrait"]} lighten`}>
            {/* Plain img: static export cannot optimise images, and the portrait CSS targets a plain img. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portrait.png" alt="Portrait of Robin" />
          </div>
        </div>

        <div className={styles["hero-text"]}>
          <p className={styles["hero-hello"]}>Hi, I’m Robin Oliveira.</p>
          <h1>
            I build digital products,
            <br />
            from plan to <em>delivery</em>.
          </h1>
          <p className={styles["hero-sub"]}>
            Engineer and product builder working where AI meets real software — turning models into
            tools people actually use, from the first prototype to production.
          </p>
        </div>
      </div>
    </section>
  );
}
