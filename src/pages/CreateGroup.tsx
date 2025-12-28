import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import styles from './CreateGroup.module.css'

export function CreateGroup() {
  const navigate = useNavigate()
  const createGroup = useGameStore((s) => s.createGroup)
  const formRef = useRef<HTMLFormElement>(null)
  
  const [challengesPerPerson, setChallengesPerPerson] = useState(6)
  const [isValid, setIsValid] = useState(false)

  const handleInputChange = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const groupName = formData.get('groupName') as string
      const hostName = formData.get('hostName') as string
      setIsValid(Boolean(groupName?.trim() && hostName?.trim()))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    
    const formData = new FormData(formRef.current)
    const groupName = formData.get('groupName') as string
    const hostName = formData.get('hostName') as string
    
    if (!groupName?.trim() || !hostName?.trim()) return

    const group = createGroup(groupName.trim(), hostName.trim(), challengesPerPerson)
    navigate(`/group/${group.id}`)
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

        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="groupName">Group name</label>
            <input
              id="groupName"
              name="groupName"
              type="text"
              onChange={handleInputChange}
              placeholder="The Pinky Promise Crew"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="hostName">Your name</label>
            <input
              id="hostName"
              name="hostName"
              type="text"
              onChange={handleInputChange}
              placeholder="What do your friends call you?"
              className={styles.input}
              required
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
          >
            Create Group
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
      </motion.div>
    </div>
  )
}

