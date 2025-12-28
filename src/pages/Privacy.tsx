import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Legal.module.css'

export function Privacy() {
  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← Back
      </Link>

      <motion.div 
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: December 29, 2024</p>

        <section>
          <h2>Our Privacy Commitment</h2>
          <p>
            Year of the Challenge is designed with privacy as a core principle. We believe your 
            personal challenges, goals, and friendships are nobody's business but yours.
          </p>
        </section>

        <section>
          <h2>End-to-End Encryption</h2>
          <p>
            <strong>All sensitive data is encrypted on your device before it ever leaves your browser.</strong>
          </p>
          <ul>
            <li>Group names, participant names, and challenge texts are encrypted using AES-256-GCM</li>
            <li>The encryption key exists only in your invite link—it never touches our servers</li>
            <li>We cannot read, access, or decrypt your challenge content under any circumstances</li>
            <li>Even if compelled by law enforcement, we cannot provide decrypted data because we don't have the keys</li>
          </ul>
        </section>

        <section>
          <h2>What We Store</h2>
          <p>Our server stores only:</p>
          <ul>
            <li><strong>Encrypted data:</strong> Ciphertext that is meaningless without your encryption key</li>
            <li><strong>Technical metadata:</strong> Randomly generated IDs, timestamps, and group phase status</li>
            <li><strong>No personal identifiers:</strong> No emails, no phone numbers, no accounts, no tracking</li>
          </ul>
        </section>

        <section>
          <h2>What We Don't Have</h2>
          <ul>
            <li>Your real name (only encrypted text)</li>
            <li>Your email address</li>
            <li>Your IP address (Cloudflare handles requests; we don't log)</li>
            <li>Any analytics or tracking</li>
            <li>Any third-party integrations</li>
            <li>Any advertising</li>
          </ul>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            Encrypted data is stored on Cloudflare's infrastructure. We don't actively delete 
            old groups, but since all data is encrypted with keys we don't possess, abandoned 
            data is cryptographically meaningless.
          </p>
        </section>

        <section>
          <h2>Cloudflare Turnstile</h2>
          <p>
            We use Cloudflare Turnstile (a privacy-focused CAPTCHA alternative) to prevent 
            automated abuse. Turnstile does not track users across sites or use cookies for 
            advertising. See{' '}
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
              Cloudflare's privacy policy
            </a>
            {' '}for details.
          </p>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>
            Since we don't collect personal data, traditional data rights (access, deletion, 
            portability) don't apply in the usual sense. However:
          </p>
          <ul>
            <li>You control your data through your encryption key</li>
            <li>Losing your magic link means losing access—we cannot recover it</li>
            <li>You can stop using the service at any time; no account to delete</li>
          </ul>
        </section>

        <section>
          <h2>Open Source</h2>
          <p>
            Don't trust us? Verify. The entire application is open source. You can inspect 
            the encryption implementation and confirm that data is encrypted before transmission.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about privacy? Reach out at{' '}
            <a href="https://x.com/pratikgajjar_in" target="_blank" rel="noopener noreferrer">
              @pratikgajjar_in
            </a>
            {' '}or through{' '}
            <a href="https://backend.how/about/" target="_blank" rel="noopener noreferrer">
              backend.how
            </a>.
          </p>
        </section>
      </motion.div>
    </div>
  )
}

