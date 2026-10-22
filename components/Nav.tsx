import styles from "./Nav.module.css";

export default function Nav() {
  return (
    <nav className={styles.nav} data-field="nav" aria-label="Main">
      <a href="#top" className={styles.logo} aria-label="Robin — home"></a>
      <div className={styles.links}>
        <a href="#work">Work</a>
        <a href="#about">About</a>
      </div>
    </nav>
  );
}
