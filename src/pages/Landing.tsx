import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Landing.module.css'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      {/* Animated background elements */}
      <div className={styles.bgElements}>
        <motion.div 
          className={styles.orb1}
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={styles.orb2}
          animate={{ 
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.header 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className={styles.logo}>🤙</span>
        <span className={styles.tagline}>the tyranny of friendship</span>
      </motion.header>

      <main className={styles.main}>
        <motion.div 
          className={styles.hero}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className={styles.title}>
            Year of the
            <br />
            <span className={styles.titleAccent}>Challenge</span>
          </h1>

          <p className={styles.description}>
            Stop making resolutions for yourself.
            <br />
            Let your friends do it for you.
          </p>

          <div className={styles.quote}>
            <blockquote>
              "Friends can have a uniquely insightful perspective, as well as a kind of permission to challenge you in ways that you might not give yourself."
            </blockquote>
            <cite>— Moxie Marlinspike</cite>
          </div>
        </motion.div>

        <motion.div 
          className={styles.actions}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button 
            className={styles.primaryBtn}
            onClick={() => navigate('/create')}
          >
            <span className={styles.btnIcon}>🔥</span>
            Start a Challenge Group
          </button>

          <div className={styles.joinSection}>
            <span className={styles.orText}>or</span>
            <p className={styles.joinHint}>Got an invite code? Join your friends</p>
            <JoinCodeInput />
          </div>
        </motion.div>

        <motion.div 
          className={styles.howItWorks}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className={styles.sectionTitle}>How it works</h2>
          
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>01</span>
              <h3>Gather your people</h3>
              <p>Create a group and invite your closest friends. The ones who know you best—and aren't afraid to push you.</p>
            </div>
            
            <div className={styles.step}>
              <span className={styles.stepNumber}>02</span>
              <h3>Suggest challenges</h3>
              <p>Write challenges for each other. Things they'd love, things they need, or things they'd never choose themselves.</p>
            </div>
            
            <div className={styles.step}>
              <span className={styles.stepNumber}>03</span>
              <h3>Vote & finalize</h3>
              <p>Vote on the best challenges. Each person ends up with their custom list of friend-assigned missions.</p>
            </div>
            
            <div className={styles.step}>
              <span className={styles.stepNumber}>04</span>
              <h3>Complete or lose a pinky</h3>
              <p>Track progress throughout the year. Stakes make it real. Don't let your friends down.</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className={styles.categories}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className={styles.sectionTitle}>Challenge categories</h2>
          
          <div className={styles.categoryGrid}>
            <div className={styles.category} data-type="growth">
              <span className={styles.catIcon}>🌱</span>
              <h4>Growth</h4>
              <p>Something they'd love to do but need accountability for</p>
            </div>
            <div className={styles.category} data-type="hidden">
              <span className={styles.catIcon}>✨</span>
              <h4>Hidden potential</h4>
              <p>Something they'd do amazingly but would never consider</p>
            </div>
            <div className={styles.category} data-type="comfort">
              <span className={styles.catIcon}>🎪</span>
              <h4>Comfort zone</h4>
              <p>Push them where they wouldn't go themselves</p>
            </div>
            <div className={styles.category} data-type="neglected">
              <span className={styles.catIcon}>🔧</span>
              <h4>Neglected</h4>
              <p>Something they actually need to do but keep avoiding</p>
            </div>
            <div className={styles.category} data-type="shared">
              <span className={styles.catIcon}>🎁</span>
              <h4>Shared joy</h4>
              <p>Something everyone will enjoy the fruits of</p>
            </div>
          </div>
        </motion.div>
      </main>

    </div>
  )
}

function JoinCodeInput() {
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string
    if (code.trim()) {
      navigate(`/join/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <form className={styles.joinForm} onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="code"
        placeholder="Enter code..."
        className={styles.codeInput}
        maxLength={6}
      />
      <button type="submit" className={styles.joinBtn}>
        Join →
      </button>
    </form>
  )
}

