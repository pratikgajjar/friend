import { create } from 'zustand'

// API base URL - uses Vite proxy in dev, direct URL in prod
const API_BASE = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL || '/api'

// Types
export interface Challenge {
  id: string
  text: string
  forParticipantId: string
  suggestedByParticipantId: string
  votes: string[]
  isCompleted: boolean
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

interface SyncState {
  currentUserId: string | null
  currentRoomCode: string | null
  group: Group | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createGroup: (name: string, hostName: string, challengesPerPerson: number) => Promise<Group>
  joinGroup: (code: string, name: string) => Promise<Group | null>
  fetchGroup: (code: string) => Promise<Group | null>
  leaveGroup: () => void
  
  addChallenge: (challenge: Omit<Challenge, 'id' | 'votes' | 'isCompleted'>) => Promise<void>
  voteChallenge: (challengeId: string) => Promise<void>
  removeVote: (challengeId: string) => Promise<void>
  toggleChallengeComplete: (challengeId: string) => Promise<void>
  
  advancePhase: () => Promise<void>
  setDeadline: (deadline: string) => Promise<void>
  
  // Polling for updates
  startPolling: () => void
  stopPolling: () => void
}

let pollInterval: ReturnType<typeof setInterval> | null = null

export const useSyncStore = create<SyncState>((set, get) => ({
  currentUserId: null,
  currentRoomCode: null,
  group: null,
  isLoading: false,
  error: null,

  createGroup: async (name, hostName, challengesPerPerson) => {
    set({ isLoading: true, error: null })
    
    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hostName, challengesPerPerson }),
      })
      
      if (!res.ok) throw new Error('Failed to create group')
      
      const group = await res.json()
      
      // Save user ID to localStorage
      localStorage.setItem(`user-${group.code}`, group.hostId)
      
      set({
        currentUserId: group.hostId,
        currentRoomCode: group.code,
        group,
        isLoading: false,
      })
      
      // Start polling for updates
      get().startPolling()
      
      return group
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
      throw error
    }
  },

  joinGroup: async (code, name) => {
    set({ isLoading: true, error: null })
    
    try {
      const existingId = localStorage.getItem(`user-${code}`)
      
      const res = await fetch(`${API_BASE}/groups/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, existingId }),
      })
      
      if (!res.ok) {
        if (res.status === 404) {
          set({ isLoading: false, error: 'Group not found' })
          return null
        }
        throw new Error('Failed to join group')
      }
      
      const { participantId } = await res.json()
      
      // Save user ID
      localStorage.setItem(`user-${code}`, participantId)
      
      // Fetch full group data
      const group = await get().fetchGroup(code)
      
      if (group) {
        set({
          currentUserId: participantId,
          currentRoomCode: code,
          group,
          isLoading: false,
        })
        
        // Start polling for updates
        get().startPolling()
      }
      
      return group
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
      throw error
    }
  },

  fetchGroup: async (code) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${code}`)
      
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Failed to fetch group')
      }
      
      const group = await res.json()
      set({ group })
      return group
    } catch (error) {
      console.error('Failed to fetch group:', error)
      return null
    }
  },

  leaveGroup: () => {
    get().stopPolling()
    set({
      currentUserId: null,
      currentRoomCode: null,
      group: null,
    })
  },

  addChallenge: async ({ text, forParticipantId, suggestedByParticipantId }) => {
    const { currentRoomCode } = get()
    if (!currentRoomCode) return
    
    try {
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, forParticipantId, suggestedByParticipantId }),
      })
      
      if (!res.ok) throw new Error('Failed to add challenge')
      
      // Refresh group data
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to add challenge:', error)
    }
  },

  voteChallenge: async (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: currentUserId }),
      })
      
      if (!res.ok) throw new Error('Failed to vote')
      
      // Refresh group data
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to vote:', error)
    }
  },

  removeVote: async (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}/vote`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: currentUserId }),
      })
      
      if (!res.ok) throw new Error('Failed to remove vote')
      
      // Refresh group data
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to remove vote:', error)
    }
  },

  toggleChallengeComplete: async (challengeId) => {
    const { currentRoomCode } = get()
    if (!currentRoomCode) return
    
    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}/toggle`, {
        method: 'POST',
      })
      
      if (!res.ok) throw new Error('Failed to toggle challenge')
      
      // Refresh group data
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to toggle challenge:', error)
    }
  },

  advancePhase: async () => {
    const { currentRoomCode } = get()
    if (!currentRoomCode) return
    
    try {
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/advance`, {
        method: 'POST',
      })
      
      if (!res.ok) throw new Error('Failed to advance phase')
      
      // Refresh group data
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to advance phase:', error)
    }
  },

  setDeadline: async (deadline) => {
    // TODO: Implement deadline setting
    console.log('Set deadline:', deadline)
  },

  startPolling: () => {
    // Poll every 3 seconds for updates
    if (pollInterval) return
    
    pollInterval = setInterval(() => {
      const { currentRoomCode } = get()
      if (currentRoomCode) {
        get().fetchGroup(currentRoomCode)
      }
    }, 3000)
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  },
}))
