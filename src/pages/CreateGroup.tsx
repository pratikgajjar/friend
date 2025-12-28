import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSyncStore } from '../store/syncStore'
import styles from './CreateGroup.module.css'

export function CreateGroup() {
  const navigate = useNavigate()
  const createGroup = useSyncStore((s) => s.createGroup)
  
  const groupNameRef = useRef<HTMLInputElement>(null)
  const hostNameRef = useRef<HTMLInputElement>(null)
  
  const [challengesPerPerson, setChallengesPerPerson] = useState(6)
  const [isCreating, setIsCreating] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)

  // Check form validity on any input
  useEffect(() => {
    const checkValidity = () => {
      const groupName = groupNameRef.current?.value || ''
      const hostName = hostNameRef.current?.value || ''
      setCanSubmit(groupName.trim().length > 0 && hostName.trim().length > 0)
    }

    const groupInput = groupNameRef.current
    const hostInput = hostNameRef.current

    groupInput?.addEventListener('input', checkValidity)
    hostInput?.addEventListener('input', checkValidity)

    return () => {
      groupInput?.removeEventListener('input', checkValidity)
      hostInput?.removeEventListener('input', checkValidity)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const groupName = groupNameRef.current?.value || ''
    const hostName = hostNameRef.current?.value || ''
    
    if (!groupName.trim() || !hostName.trim() || isCreating) return

    setIsCreating(true)
    try {
      const group = await createGroup(groupName.trim(), hostName.trim(), challengesPerPerson)
      navigate(`/room/${group.code}`)
    } catch (error) {
      console.error('Failed to create group:', error)
      setIsCreating(false)
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
          <span className={styles.icon}>🔥</span>
          <h1>Start a Challenge Group</h1>
          <p>Gather your friends and make resolutions for each other</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="groupName">Group name</label>
            <input
              ref={groupNameRef}
              id="groupName"
              type="text"
              placeholder="The Pinky Promise Crew"
              className={styles.input}
              disabled={isCreating}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="hostName">Your name</label>
            <input
              ref={hostNameRef}
              id="hostName"
              type="text"
              placeholder="What do your friends call you?"
              className={styles.input}
              disabled={isCreating}
            />
          </div>

          <div className={styles.field}>
            <label>Challenges per person</label>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                min={3}
                max={10}
                value={challengesPerPerson}
                onChange={(e) => setChallengesPerPerson(Number(e.target.value))}
                className={styles.slider}
                disabled={isCreating}
              />
              <span className={styles.sliderValue}>{challengesPerPerson}</span>
            </div>
            <p className={styles.hint}>
              Moxie did 6 challenges. More = more commitment. Choose wisely.
            </p>
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </form>

        <div className={styles.warning}>
          <span className={styles.warningIcon}>🤙</span>
          <p>
            <strong>Remember:</strong> Completion is mandatory. Moxie's crew said 
            anyone who fails loses a pinky finger. We're not that extreme... 
            but define your stakes.
          </p>
        </div>

        <div className={styles.syncInfo}>
          <span>🔄</span>
          <p>
            <strong>P2P Sync:</strong> Data syncs directly between browsers. 
            No server needed - as long as one person is online, others can join.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
