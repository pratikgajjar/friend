import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

// Demo page that creates sample data and redirects to the challenge board
export function Demo() {
  const navigate = useNavigate()
  const groups = useGameStore((s) => s.groups)
  const createGroup = useGameStore((s) => s.createGroup)
  const addChallenge = useGameStore((s) => s.addChallenge)

  useEffect(() => {
    // Check if we already have groups
    const existingGroups = Object.values(groups)
    if (existingGroups.length > 0) {
      navigate(`/group/${existingGroups[0].id}`)
      return
    }

    // Create a demo group
    const group = createGroup('The Moxie Crew 2025', 'Pratik', 6)
    
    // Manually add more participants by modifying the store
    const store = useGameStore.getState()
    const participants = [
      { id: 'demo-2', name: 'Sarah', avatar: '⚡', isHost: false },
      { id: 'demo-3', name: 'Marcus', avatar: '🌟', isHost: false },
      { id: 'demo-4', name: 'Luna', avatar: '🎯', isHost: false },
    ]
    
    const updatedGroup = {
      ...store.groups[group.id],
      participants: [...store.groups[group.id].participants, ...participants],
      phase: 'suggesting' as const,
    }
    
    useGameStore.setState({
      groups: { ...store.groups, [group.id]: updatedGroup }
    })

    // Add some demo challenges
    const challenges = [
      { text: 'Take a solo trip to a country where you don\'t speak the language', forParticipantId: store.currentUserId!, suggestedByParticipantId: 'demo-2' },
      { text: 'Perform a 5-minute stand-up comedy set at an open mic', forParticipantId: store.currentUserId!, suggestedByParticipantId: 'demo-3' },
      { text: 'Learn to play a new musical instrument and perform one song', forParticipantId: 'demo-2', suggestedByParticipantId: store.currentUserId! },
      { text: 'Complete a 30-day meditation challenge', forParticipantId: 'demo-2', suggestedByParticipantId: 'demo-4' },
      { text: 'Write and publish a short story', forParticipantId: 'demo-3', suggestedByParticipantId: store.currentUserId! },
      { text: 'Run a half marathon', forParticipantId: 'demo-3', suggestedByParticipantId: 'demo-2' },
      { text: 'Take a heroic dose of psilocybin (like Moxie)', forParticipantId: 'demo-4', suggestedByParticipantId: 'demo-3' },
      { text: 'Foster a dog for one month', forParticipantId: 'demo-4', suggestedByParticipantId: store.currentUserId! },
    ]

    challenges.forEach(challenge => {
      addChallenge(group.id, challenge)
    })

    navigate(`/group/${group.id}`)
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      color: 'var(--text-secondary)'
    }}>
      Creating demo group...
    </div>
  )
}

