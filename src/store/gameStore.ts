import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Challenge {
  id: string
  text: string
  forParticipantId: string
  suggestedByParticipantId: string
  votes: string[] // participant IDs who voted for this
  isFinalized: boolean
  isCompleted: boolean
  category?: 'growth' | 'fun' | 'comfort-zone' | 'neglected' | 'shared'
}

export interface Participant {
  id: string
  name: string
  avatar: string
  isHost: boolean
}

export interface Group {
  id: string
  name: string
  code: string
  phase: 'gathering' | 'suggesting' | 'voting' | 'finalized' | 'tracking'
  participants: Participant[]
  challenges: Challenge[]
  challengesPerPerson: number
  deadline?: string
  createdAt: string
}

interface GameState {
  currentUserId: string | null
  currentGroupId: string | null
  groups: Record<string, Group>
  
  setCurrentUser: (id: string) => void
  createGroup: (name: string, hostName: string, challengesPerPerson: number) => Group
  joinGroup: (code: string, name: string) => Group | null
  addChallenge: (groupId: string, challenge: Omit<Challenge, 'id' | 'votes' | 'isFinalized' | 'isCompleted'>) => void
  voteChallenge: (groupId: string, challengeId: string, participantId: string) => void
  removeVote: (groupId: string, challengeId: string, participantId: string) => void
  advancePhase: (groupId: string) => void
  finalizeChallenge: (groupId: string, challengeId: string) => void
  toggleChallengeComplete: (groupId: string, challengeId: string) => void
  setDeadline: (groupId: string, deadline: string) => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

const avatarEmojis = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      currentGroupId: null,
      groups: {},

      setCurrentUser: (id) => set({ currentUserId: id }),

      createGroup: (name, hostName, challengesPerPerson) => {
        const groupId = generateId()
        const hostId = generateId()
        const code = generateCode()
        
        const group: Group = {
          id: groupId,
          name,
          code,
          phase: 'gathering',
          participants: [{
            id: hostId,
            name: hostName,
            avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)],
            isHost: true,
          }],
          challenges: [],
          challengesPerPerson,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          groups: { ...state.groups, [groupId]: group },
          currentUserId: hostId,
          currentGroupId: groupId,
        }))

        return group
      },

      joinGroup: (code, name) => {
        const groups = get().groups
        const group = Object.values(groups).find((g) => g.code === code)
        
        if (!group) return null
        if (group.phase !== 'gathering') return null

        const participantId = generateId()
        const participant: Participant = {
          id: participantId,
          name,
          avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)],
          isHost: false,
        }

        set((state) => ({
          groups: {
            ...state.groups,
            [group.id]: {
              ...group,
              participants: [...group.participants, participant],
            },
          },
          currentUserId: participantId,
          currentGroupId: group.id,
        }))

        return { ...group, participants: [...group.participants, participant] }
      },

      addChallenge: (groupId, challenge) => {
        const id = generateId()
        set((state) => ({
          groups: {
            ...state.groups,
            [groupId]: {
              ...state.groups[groupId],
              challenges: [
                ...state.groups[groupId].challenges,
                { ...challenge, id, votes: [], isFinalized: false, isCompleted: false },
              ],
            },
          },
        }))
      },

      voteChallenge: (groupId, challengeId, participantId) => {
        set((state) => {
          const group = state.groups[groupId]
          const challenges = group.challenges.map((c) =>
            c.id === challengeId && !c.votes.includes(participantId)
              ? { ...c, votes: [...c.votes, participantId] }
              : c
          )
          return {
            groups: { ...state.groups, [groupId]: { ...group, challenges } },
          }
        })
      },

      removeVote: (groupId, challengeId, participantId) => {
        set((state) => {
          const group = state.groups[groupId]
          const challenges = group.challenges.map((c) =>
            c.id === challengeId
              ? { ...c, votes: c.votes.filter((v) => v !== participantId) }
              : c
          )
          return {
            groups: { ...state.groups, [groupId]: { ...group, challenges } },
          }
        })
      },

      advancePhase: (groupId) => {
        set((state) => {
          const group = state.groups[groupId]
          const phases: Group['phase'][] = ['gathering', 'suggesting', 'voting', 'finalized', 'tracking']
          const currentIndex = phases.indexOf(group.phase)
          const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)]
          return {
            groups: { ...state.groups, [groupId]: { ...group, phase: nextPhase } },
          }
        })
      },

      finalizeChallenge: (groupId, challengeId) => {
        set((state) => {
          const group = state.groups[groupId]
          const challenges = group.challenges.map((c) =>
            c.id === challengeId ? { ...c, isFinalized: true } : c
          )
          return {
            groups: { ...state.groups, [groupId]: { ...group, challenges } },
          }
        })
      },

      toggleChallengeComplete: (groupId, challengeId) => {
        set((state) => {
          const group = state.groups[groupId]
          const challenges = group.challenges.map((c) =>
            c.id === challengeId ? { ...c, isCompleted: !c.isCompleted } : c
          )
          return {
            groups: { ...state.groups, [groupId]: { ...group, challenges } },
          }
        })
      },

      setDeadline: (groupId, deadline) => {
        set((state) => ({
          groups: {
            ...state.groups,
            [groupId]: { ...state.groups[groupId], deadline },
          },
        }))
      },
    }),
    {
      name: 'friend-challenge-storage',
    }
  )
)

