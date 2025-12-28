import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Legal.module.css'

export function Terms() {
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
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Last updated: December 29, 2024</p>

        <section>
          <h2>What This Is</h2>
          <p>
            Year of the Challenge ("the Service") is a free, open-source tool for friends 
            to create and track personal challenges. It's inspired by{' '}
            <a href="https://moxie.org/stories/year-of-the-challenge/" target="_blank" rel="noopener noreferrer">
              Moxie Marlinspike's Year of the Challenge
            </a>.
          </p>
        </section>

        <section>
          <h2>No Warranty</h2>
          <p>
            This service is provided "as is" without any warranty. We make no promises about:
          </p>
          <ul>
            <li>Uptime or availability</li>
            <li>Data persistence or backup</li>
            <li>Continued operation of the service</li>
            <li>Bug-free or error-free operation</li>
          </ul>
          <p>
            <strong>If your encryption key (magic link) is lost, your data is unrecoverable. 
            We cannot help.</strong>
          </p>
        </section>

        <section>
          <h2>Your Responsibilities</h2>
          <ul>
            <li><strong>Keep your magic link safe.</strong> It's your only access to your data.</li>
            <li><strong>Share invite links only with people you trust.</strong> Anyone with the link can join and see decrypted content.</li>
            <li><strong>Don't abuse the service.</strong> No spam, no harassment, no illegal content.</li>
            <li><strong>Challenges are between you and your friends.</strong> We're not responsible for any pinky promises or consequences thereof.</li>
          </ul>
        </section>

        <section>
          <h2>Content</h2>
          <p>
            You're responsible for the challenges you create. Don't use this service to:
          </p>
          <ul>
            <li>Harass, threaten, or harm others</li>
            <li>Create illegal or harmful content</li>
            <li>Impersonate others</li>
            <li>Violate anyone's rights</li>
          </ul>
          <p>
            Since all content is end-to-end encrypted, we cannot moderate or review it. 
            We rely on you to be a good human.
          </p>
        </section>

        <section>
          <h2>Termination</h2>
          <p>
            We reserve the right to terminate access to the service at any time, for any reason, 
            without notice. Given the encryption model, this effectively means making the 
            encrypted data inaccessible (we still couldn't read it anyway).
          </p>
        </section>

        <section>
          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any damages arising 
            from your use of this service. This includes but is not limited to:
          </p>
          <ul>
            <li>Lost data or access</li>
            <li>Failed challenges or broken promises</li>
            <li>Any consequences of challenges you undertake</li>
            <li>Disputes between you and your friends</li>
            <li>Service interruptions or termination</li>
          </ul>
        </section>

        <section>
          <h2>Changes to Terms</h2>
          <p>
            We may update these terms. Continued use after changes constitutes acceptance. 
            Given that we don't collect contact information, we can't notify you directly—check 
            back occasionally if you're concerned.
          </p>
        </section>

        <section>
          <h2>Analytics</h2>
          <p>
            We use privacy-friendly analytics (Plausible) to understand basic usage patterns like 
            page views and visitor counts. This data is aggregate, anonymous, and completely 
            separate from your encrypted challenge content. No cookies, no tracking, no personal data.
          </p>
        </section>

        <section>
          <h2>The Spirit</h2>
          <p>
            This is a labor of love, built for friends who want to challenge each other to grow. 
            Use it in that spirit. Push each other. Be kind. Lose some pinky fingers (metaphorically).
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions? Reach out at{' '}
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

