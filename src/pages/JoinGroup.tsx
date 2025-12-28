import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import styles from './JoinGroup.module.css'

export function JoinGroup() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const joinGroup = useGameStore((s) => s.joinGroup)
  const groups = useGameStore((s) => s.groups)
  
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  // Find the group by code
  const existingGroup = Object.values(groups).find((g) => g.code === code)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code) return

    const group = joinGroup(code, name.trim())
    if (group) {
      navigate(`/group/${group.id}`)
    } else {
      setError('Could not join group. It may be full or already started.')
    }
  }

  if (!existingGroup) {
    return (
      <div className={styles.container}>
        <motion.div 
          className={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>🤔</span>
            <h1>Group not found</h1>
            <p>The code <strong>{code}</strong> doesn't match any active group.</p>
            <Link to="/" className={styles.homeLink}>
              ← Go back home
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← Back
      </Link>

      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <span className={styles.icon}>🎉</span>
          <h1>Join the Challenge</h1>
          <p>You're joining <strong>{existingGroup.name}</strong></p>
        </div>

        <div className={styles.participants}>
          <span className={styles.participantsLabel}>Already in:</span>
          <div className={styles.avatarList}>
            {existingGroup.participants.map((p) => (
              <div key={p.id} className={styles.avatar} title={p.name}>
                {p.avatar}
              </div>
            ))}
            <div className={styles.avatarPlus}>+You?</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What do your friends call you?"
              className={styles.input}
              autoFocus
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={!name.trim()}
          >
            Join Group
          </button>
        </form>
      </motion.div>
    </div>
  )
}

