import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSyncStore } from '../store/syncStore'
import { Turnstile } from '../components/Turnstile'
import { getKeyFromUrl, getRoomKey } from '../lib/crypto'
import styles from './JoinGroup.module.css'

export function JoinGroup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { code, token: pathToken } = useParams<{ code?: string; token?: string }>()
  const [searchParams] = useSearchParams()
  const token = pathToken || searchParams.get('token')
  
  const joinGroup = useSyncStore((s) => s.joinGroup)
  const joinWithToken = useSyncStore((s) => s.joinWithToken)
  
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [tokenVerified, setTokenVerified] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [hasEncryptionKey, setHasEncryptionKey] = useState(true)

  // Check for encryption key
  useEffect(() => {
    const keyFromUrl = getKeyFromUrl()
    const keyFromStorage = code ? getRoomKey(code) : null
    
    if (!keyFromUrl && !keyFromStorage && !token) {
      setHasEncryptionKey(false)
      setError('Missing encryption key. Please use the full invite link shared with you.')
    } else {
      setHasEncryptionKey(true)
      setError('')
    }
  }, [code, token, location.hash])

  // Handle magic link token
  useEffect(() => {
    if (token && !tokenVerified) {
      const keyFromUrl = getKeyFromUrl()
      if (!keyFromUrl) {
        setError('Missing encryption key in magic link. Please use the complete link.')
        return
      }
      
      setIsJoining(true)
      joinWithToken(token).then((result) => {
        if (result) {
          setTokenVerified(true)
          // Redirect to room with encryption key in hash (Base64URL - no encoding needed)
          navigate(`/room/${result.roomCode}#key=${keyFromUrl}`, { replace: true })
        } else {
          setError('Invalid or expired magic link. Please join with your name.')
          setIsJoining(false)
        }
      })
    }
  }, [token, tokenVerified, joinWithToken, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code || !turnstileToken || isJoining || !hasEncryptionKey) return

    setIsJoining(true)
    setError('')

    try {
      const group = await joinGroup(code, name.trim(), turnstileToken)
      if (group) {
        navigate(`/room/${code}`)
      } else {
        setError('Failed to join. Make sure you have the complete invite link.')
        setIsJoining(false)
        setTurnstileToken(null)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to join group. Please try again.')
      setIsJoining(false)
      setTurnstileToken(null)
    }
  }

  // Show loading if processing magic link
  if (token && isJoining && !error) {
    return (
      <div className={styles.container}>
        <motion.div 
          className={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <span className={styles.icon}>🔐</span>
            <h1>Magic Link</h1>
            <p>Verifying your identity...</p>
          </div>
          <div className={styles.loading}>
            <span>✨</span>
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
          <p>Joining room <strong>{code}</strong></p>
        </div>

        <div className={styles.syncNote}>
          <span>🔐</span>
          <p>
            End-to-end encrypted. Enter your name to join - you'll get 
            a magic link to access from any device.
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

          <Turnstile 
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={!name.trim() || !turnstileToken || isJoining || !hasEncryptionKey}
          >
            {isJoining ? 'Connecting...' : 'Join Group'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
