import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore, Challenge, Participant } from '../store/syncStore'
import styles from './ChallengeBoard.module.css'

export function ChallengeBoard() {
  const { code } = useParams<{ code: string }>()
  
  const group = useSyncStore((s) => s.group)
  const currentUserId = useSyncStore((s) => s.currentUserId)
  const advancePhase = useSyncStore((s) => s.advancePhase)
  const fetchGroup = useSyncStore((s) => s.fetchGroup)
  const startPolling = useSyncStore((s) => s.startPolling)
  const stopPolling = useSyncStore((s) => s.stopPolling)
  const isLoading = useSyncStore((s) => s.isLoading)
  
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Fetch group data and start polling
  useEffect(() => {
    if (code) {
      // Restore user ID from localStorage
      const storedUserId = localStorage.getItem(`user-${code}`)
      if (storedUserId) {
        useSyncStore.setState({ currentUserId: storedUserId, currentRoomCode: code })
      }
      
      fetchGroup(code)
      startPolling()
    }
    
    return () => {
      stopPolling()
    }
  }, [code, fetchGroup, startPolling, stopPolling])

  if (!group && isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <span>🔄</span>
          <h1>Loading...</h1>
          <p>Fetching group data...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <span>🤔</span>
          <h1>Group not found</h1>
          <p>This group doesn't exist or the code is invalid.</p>
          <Link to="/">Go home</Link>
        </div>
      </div>
    )
  }

  const currentUser = group.participants.find((p) => p.id === currentUserId)
  const isHost = currentUser?.isHost

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.logoLink}>🤙</Link>
          <div className={styles.groupInfo}>
            <h1>{group.name}</h1>
            <div className={styles.phaseIndicator}>
              <PhaseSteps currentPhase={group.phase} />
            </div>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.peerStatus}>
            <span className={styles.peerDot} />
            <span>live</span>
          </div>
          
          <button 
            className={styles.inviteBtn}
            onClick={() => setShowInviteModal(true)}
          >
            <span>👥</span> Invite
          </button>
          
          {isHost && group.phase !== 'tracking' && (
            <button 
              className={styles.advanceBtn}
              onClick={advancePhase}
            >
              {getNextPhaseLabel(group.phase)} →
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {group.phase === 'gathering' && (
          <GatheringPhase 
            group={group} 
            onInvite={() => setShowInviteModal(true)} 
          />
        )}

        {(group.phase === 'suggesting' || group.phase === 'voting') && (
          <BoardPhase 
            group={group}
            currentUserId={currentUserId}
            phase={group.phase}
          />
        )}

        {(group.phase === 'finalized' || group.phase === 'tracking') && (
          <TrackingPhase 
            group={group}
            currentUserId={currentUserId}
          />
        )}
      </main>

      <AnimatePresence>
        {showInviteModal && (
          <InviteModal 
            code={group.code} 
            onClose={() => setShowInviteModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PhaseSteps({ currentPhase }: { currentPhase: string }) {
  const phases = [
    { key: 'gathering', label: 'Gather', icon: '👥' },
    { key: 'suggesting', label: 'Suggest', icon: '💡' },
    { key: 'voting', label: 'Vote', icon: '🗳️' },
    { key: 'finalized', label: 'Final', icon: '✅' },
    { key: 'tracking', label: 'Track', icon: '🎯' },
  ]
  
  const currentIndex = phases.findIndex((p) => p.key === currentPhase)

  return (
    <div className={styles.phases}>
      {phases.map((phase, index) => (
        <div 
          key={phase.key}
          className={`${styles.phase} ${index <= currentIndex ? styles.phaseActive : ''} ${index === currentIndex ? styles.phaseCurrent : ''}`}
        >
          <span className={styles.phaseIcon}>{phase.icon}</span>
          <span className={styles.phaseLabel}>{phase.label}</span>
        </div>
      ))}
    </div>
  )
}

function getNextPhaseLabel(phase: string) {
  switch (phase) {
    case 'gathering': return 'Start Suggesting'
    case 'suggesting': return 'Start Voting'
    case 'voting': return 'Finalize Challenges'
    case 'finalized': return 'Begin Tracking'
    default: return 'Next'
  }
}

function GatheringPhase({ group, onInvite }: { group: any; onInvite: () => void }) {
  return (
    <motion.div 
      className={styles.gatheringPhase}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.gatheringHeader}>
        <h2>Waiting for friends to join...</h2>
        <p>Share the invite code with your crew</p>
      </div>

      <div className={styles.participantGrid}>
        {group.participants.map((p: Participant) => (
          <motion.div 
            key={p.id}
            className={styles.participantCard}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className={styles.participantAvatar}>{p.avatar}</span>
            <span className={styles.participantName}>{p.name}</span>
            {p.isHost && <span className={styles.hostBadge}>Host</span>}
          </motion.div>
        ))}
        
        <motion.button 
          className={styles.addParticipant}
          onClick={onInvite}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>+</span>
          <span>Invite Friend</span>
        </motion.button>
      </div>

      <div className={styles.gatheringInfo}>
        <p>
          <strong>{group.challengesPerPerson}</strong> challenges per person · 
          <strong> {group.participants.length}</strong> people so far
        </p>
      </div>
    </motion.div>
  )
}

function BoardPhase({ 
  group, 
  currentUserId, 
  phase 
}: { 
  group: any
  currentUserId: string | null
  phase: 'suggesting' | 'voting'
}) {
  const addChallenge = useSyncStore((s) => s.addChallenge)
  const voteChallenge = useSyncStore((s) => s.voteChallenge)
  const removeVote = useSyncStore((s) => s.removeVote)
  
  const [newChallenge, setNewChallenge] = useState('')
  const [showAddForm, setShowAddForm] = useState<string | null>(null)

  const handleAddChallenge = (forParticipantId: string) => {
    if (!newChallenge.trim() || !currentUserId) return
    
    addChallenge({
      text: newChallenge.trim(),
      forParticipantId,
      suggestedByParticipantId: currentUserId,
    })
    
    setNewChallenge('')
    setShowAddForm(null)
  }

  const handleVote = (challengeId: string) => {
    if (!currentUserId) return
    
    const challenge = group.challenges.find((c: Challenge) => c.id === challengeId)
    if (challenge?.votes.includes(currentUserId)) {
      removeVote(challengeId)
    } else {
      voteChallenge(challengeId)
    }
  }

  // Filter participants to show (excluding current user for suggestions)
  const otherParticipants = group.participants.filter(
    (p: Participant) => p.id !== currentUserId
  )

  return (
    <div className={styles.boardPhase}>
      <div className={styles.boardHeader}>
        <h2>{phase === 'suggesting' ? '💡 Suggest challenges for your friends' : '🗳️ Vote on the best challenges'}</h2>
        <p>
          {phase === 'suggesting' 
            ? "Write challenges for others. Things they'd love, things they need, or things they'd never do themselves."
            : 'Vote on which challenges should make the final cut. Top voted challenges win.'}
        </p>
      </div>

      <div className={styles.board}>
        {otherParticipants.map((participant: Participant) => {
          const challenges = group.challenges.filter(
            (c: Challenge) => c.forParticipantId === participant.id
          )
          
          return (
            <motion.div 
              key={participant.id}
              className={styles.column}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.columnHeader}>
                <span className={styles.columnAvatar}>{participant.avatar}</span>
                <span className={styles.columnName}>{participant.name}</span>
                <span className={styles.challengeCount}>
                  {challenges.length}/{group.challengesPerPerson}
                </span>
              </div>

              <div className={styles.challengeList}>
                <AnimatePresence>
                  {challenges
                    .sort((a: Challenge, b: Challenge) => b.votes.length - a.votes.length)
                    .map((challenge: Challenge) => {
                      const isMyVote = currentUserId && challenge.votes.includes(currentUserId)
                      const suggestedBy = group.participants.find(
                        (p: Participant) => p.id === challenge.suggestedByParticipantId
                      )
                      
                      return (
                        <motion.div
                          key={challenge.id}
                          className={`${styles.challengeCard} ${isMyVote ? styles.voted : ''}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          layout
                        >
                          <p className={styles.challengeText}>{challenge.text}</p>
                          <div className={styles.challengeMeta}>
                            <span className={styles.suggestedBy}>
                              by {suggestedBy?.avatar || '?'}
                            </span>
                            
                            {phase === 'voting' && (
                              <button
                                className={`${styles.voteBtn} ${isMyVote ? styles.voteBtnActive : ''}`}
                                onClick={() => handleVote(challenge.id)}
                              >
                                <span>👍</span>
                                <span>{challenge.votes.length}</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                </AnimatePresence>

                {phase === 'suggesting' && showAddForm !== participant.id && (
                  <button
                    className={styles.addChallengeBtn}
                    onClick={() => setShowAddForm(participant.id)}
                  >
                    + Add challenge
                  </button>
                )}

                {phase === 'suggesting' && showAddForm === participant.id && (
                  <motion.div 
                    className={styles.addForm}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <textarea
                      value={newChallenge}
                      onChange={(e) => setNewChallenge(e.target.value)}
                      placeholder={`Challenge for ${participant.name}...`}
                      className={styles.challengeInput}
                      autoFocus
                      rows={3}
                    />
                    <div className={styles.addFormActions}>
                      <button 
                        className={styles.cancelBtn}
                        onClick={() => {
                          setShowAddForm(null)
                          setNewChallenge('')
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className={styles.submitChallengeBtn}
                        onClick={() => handleAddChallenge(participant.id)}
                        disabled={!newChallenge.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function TrackingPhase({ group, currentUserId }: { group: any; currentUserId: string | null }) {
  const toggleChallengeComplete = useSyncStore((s) => s.toggleChallengeComplete)

  // Get finalized challenges sorted by votes for each participant
  const getFinalizedChallenges = (participantId: string) => {
    return group.challenges
      .filter((c: Challenge) => c.forParticipantId === participantId)
      .sort((a: Challenge, b: Challenge) => b.votes.length - a.votes.length)
      .slice(0, group.challengesPerPerson)
  }

  return (
    <div className={styles.trackingPhase}>
      <div className={styles.trackingHeader}>
        <h2>🎯 The Challenges Are Set</h2>
        <p>Complete them all... or face the consequences</p>
        
        {group.deadline && (
          <div className={styles.deadline}>
            <span>⏰</span>
            Deadline: {new Date(group.deadline).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className={styles.trackingGrid}>
        {group.participants.map((participant: Participant) => {
          const challenges = getFinalizedChallenges(participant.id)
          const completed = challenges.filter((c: Challenge) => c.isCompleted).length
          const progress = challenges.length > 0 ? (completed / challenges.length) * 100 : 0
          const isMe = participant.id === currentUserId

          return (
            <motion.div
              key={participant.id}
              className={`${styles.trackingCard} ${isMe ? styles.trackingCardMe : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.trackingCardHeader}>
                <div className={styles.trackingPerson}>
                  <span className={styles.trackingAvatar}>{participant.avatar}</span>
                  <span className={styles.trackingName}>
                    {participant.name}
                    {isMe && <span className={styles.youBadge}>you</span>}
                  </span>
                </div>
                <div className={styles.progressInfo}>
                  <span className={styles.progressText}>{completed}/{challenges.length}</span>
                  <div className={styles.progressBar}>
                    <motion.div 
                      className={styles.progressFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.trackingChallenges}>
                {challenges.map((challenge: Challenge, index: number) => (
                  <div 
                    key={challenge.id}
                    className={`${styles.trackingChallenge} ${challenge.isCompleted ? styles.completed : ''}`}
                  >
                    <button
                      className={styles.checkBtn}
                      onClick={() => isMe && toggleChallengeComplete(challenge.id)}
                      disabled={!isMe}
                    >
                      {challenge.isCompleted ? '✓' : (index + 1)}
                    </button>
                    <span className={styles.trackingChallengeText}>
                      {challenge.text}
                    </span>
                  </div>
                ))}

                {challenges.length === 0 && (
                  <p className={styles.noChallenges}>No challenges yet</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function InviteModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  
  const inviteUrl = `${window.location.origin}/join/${code}`
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div 
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.modalClose} onClick={onClose}>×</button>
        
        <h2>Invite Friends</h2>
        <p>Share this code or link with your friends</p>

        <div className={styles.inviteCode}>
          <span className={styles.codeLabel}>Room Code</span>
          <span className={styles.codeValue}>{code}</span>
        </div>

        <div className={styles.inviteLink}>
          <input 
            type="text" 
            value={inviteUrl}
            readOnly 
            className={styles.linkInput}
          />
          <button 
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <div className={styles.syncStatus}>
          <span className={styles.peerDot} />
          <span>Live sync enabled</span>
          <span className={styles.syncHint}>
            Changes sync automatically every 3 seconds
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
