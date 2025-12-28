import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.left}>
          <span className={styles.madeWith}>
            Made with <span className={styles.heart}>❤️</span> by{' '}
            <a href="https://backend.how/about/" target="_blank" rel="noopener noreferrer">
              Pratik
            </a>
          </span>
        </div>
        
        <div className={styles.right}>
          <a href="https://backend.how" target="_blank" rel="noopener noreferrer">
            backend.how
          </a>
          <span className={styles.divider}>·</span>
          <a href="https://github.com/pratikgajjar" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className={styles.divider}>·</span>
          <a href="https://x.com/pratikgajjar_in" target="_blank" rel="noopener noreferrer">
            X
          </a>
        </div>
      </div>
      
      <div className={styles.legal}>
        <Link to="/privacy">Privacy</Link>
        <span className={styles.divider}>·</span>
        <Link to="/terms">Terms</Link>
        <span className={styles.divider}>·</span>
        <span className={styles.encrypted}>🔐 End-to-End Encrypted</span>
      </div>
      
      <div className={styles.inspired}>
        Inspired by{' '}
        <a href="https://moxie.org/stories/year-of-the-challenge/" target="_blank" rel="noopener noreferrer">
          Moxie's Year of the Challenge
        </a>
      </div>
    </footer>
  )
}

