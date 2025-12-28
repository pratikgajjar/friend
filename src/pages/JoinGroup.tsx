import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSyncStore } from '../store/syncStore'
import styles from './JoinGroup.module.css'

export function JoinGroup() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const joinGroup = useSyncStore((s) => s.joinGroup)
  
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code || isJoining) return

    setIsJoining(true)
    setError('')

    try {
      const group = await joinGroup(code, name.trim())
      if (group) {
        navigate(`/room/${code}`)
      } else {
        setError('Group not found. Please check the code and try again.')
        setIsJoining(false)
      }
    } catch (err) {
      setError('Failed to join group. Please try again.')
      setIsJoining(false)
    }
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
          <p>Joining room <strong>{code}</strong></p>
        </div>

        <div className={styles.syncNote}>
          <span>🚀</span>
          <p>
            Enter your name to join. All data syncs in real-time 
            with your friends.
          </p>
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
              disabled={isJoining}
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
            disabled={!name.trim() || isJoining}
          >
            {isJoining ? 'Connecting...' : 'Join Group'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
