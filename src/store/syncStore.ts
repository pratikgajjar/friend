import { create } from 'zustand'

// API base URL - Pages Functions serve from same origin
const API_BASE = '/api'

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
  currentUserName: string | null
  magicToken: string | null
  currentRoomCode: string | null
  group: Group | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createGroup: (name: string, hostName: string, challengesPerPerson: number) => Promise<Group>
  joinGroup: (code: string, name: string) => Promise<Group | null>
  joinWithToken: (token: string) => Promise<{ roomCode: string; name: string } | null>
  fetchGroup: (code: string) => Promise<Group | null>
  leaveGroup: () => void
  
  addChallenge: (challenge: Omit<Challenge, 'id' | 'votes' | 'isCompleted'>) => Promise<void>
  deleteChallenge: (challengeId: string) => Promise<void>
  voteChallenge: (challengeId: string) => Promise<void>
  removeVote: (challengeId: string) => Promise<void>
  toggleChallengeComplete: (challengeId: string) => Promise<void>
  
  advancePhase: () => Promise<void>
  setDeadline: (deadline: string) => Promise<void>
  
  // Magic link helpers
  getMagicLink: () => string | null
  restoreFromStorage: (code: string) => boolean
  getParticipantTokens: () => Promise<{ id: string; name: string; avatar: string; token: string }[] | null>
  
  // Polling for updates
  startPolling: () => void
  stopPolling: () => void
}

let pollInterval: ReturnType<typeof setInterval> | null = null

// Storage keys
const getTokenKey = (code: string) => `magic-${code}`
const getUserKey = (code: string) => `user-${code}`
const getNameKey = (code: string) => `name-${code}`

export const useSyncStore = create<SyncState>((set, get) => ({
  currentUserId: null,
  currentUserName: null,
  magicToken: null,
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
      
      const data = await res.json()
      
      // Save magic token and user info to localStorage
      localStorage.setItem(getTokenKey(data.code), data.token)
      localStorage.setItem(getUserKey(data.code), data.hostId)
      localStorage.setItem(getNameKey(data.code), hostName)
      
      const group: Group = {
        id: data.id,
        code: data.code,
        name: data.name,
        phase: data.phase,
        challengesPerPerson: data.challengesPerPerson,
        participants: data.participants,
        challenges: data.challenges || [],
        createdAt: new Date().toISOString(),
      }
      
      set({
        currentUserId: data.hostId,
        currentUserName: hostName,
        magicToken: data.token,
        currentRoomCode: data.code,
        group,
        isLoading: false,
      })
      
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
      // Check if we have a stored token for this room
      const existingToken = localStorage.getItem(getTokenKey(code))
      
      const res = await fetch(`${API_BASE}/groups/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, existingToken }),
      })
      
      if (!res.ok) {
        if (res.status === 404) {
          set({ isLoading: false, error: 'Group not found' })
          return null
        }
        throw new Error('Failed to join group')
      }
      
      const data = await res.json()
      
      // Save magic token and user info
      localStorage.setItem(getTokenKey(code), data.token)
      localStorage.setItem(getUserKey(code), data.participantId)
      localStorage.setItem(getNameKey(code), data.name || name)
      
      // Fetch full group data
      const group = await get().fetchGroup(code)
      
      if (group) {
        set({
          currentUserId: data.participantId,
          currentUserName: data.name || name,
          magicToken: data.token,
          currentRoomCode: code,
          group,
          isLoading: false,
        })
        
        get().startPolling()
      }
      
      return group
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
      throw error
    }
  },

  joinWithToken: async (token) => {
    set({ isLoading: true, error: null })
    
    try {
      const res = await fetch(`${API_BASE}/auth/${token}`)
      
      if (!res.ok) {
        set({ isLoading: false, error: 'Invalid magic link' })
        return null
      }
      
      const data = await res.json()
      
      // Save to localStorage
      localStorage.setItem(getTokenKey(data.roomCode), token)
      localStorage.setItem(getUserKey(data.roomCode), data.participantId)
      localStorage.setItem(getNameKey(data.roomCode), data.name)
      
      set({
        currentUserId: data.participantId,
        currentUserName: data.name,
        magicToken: token,
        currentRoomCode: data.roomCode,
        isLoading: false,
      })
      
      return { roomCode: data.roomCode, name: data.name }
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message })
      return null
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
      currentUserName: null,
      magicToken: null,
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
      
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to toggle challenge:', error)
    }
  },

  deleteChallenge: async (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': currentUserId,
        },
      })
      
      if (!res.ok) throw new Error('Failed to delete challenge')
      
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to delete challenge:', error)
    }
  },

  getParticipantTokens: async () => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return null
    
    try {
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/tokens`, {
        headers: {
          'X-User-Id': currentUserId,
        },
      })
      
      if (!res.ok) return null
      
      const data = await res.json()
      return data.participants
    } catch (error) {
      console.error('Failed to get participant tokens:', error)
      return null
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
      
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to advance phase:', error)
    }
  },

  setDeadline: async (deadline) => {
    console.log('Set deadline:', deadline)
  },

  getMagicLink: () => {
    const { magicToken, currentRoomCode } = get()
    if (!magicToken || !currentRoomCode) return null
    
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://friend-challenge.pages.dev'
    
    return `${baseUrl}/join/${currentRoomCode}?token=${magicToken}`
  },

  restoreFromStorage: (code) => {
    const token = localStorage.getItem(getTokenKey(code))
    const userId = localStorage.getItem(getUserKey(code))
    const userName = localStorage.getItem(getNameKey(code))
    
    if (token && userId) {
      set({
        currentUserId: userId,
        currentUserName: userName,
        magicToken: token,
        currentRoomCode: code,
      })
      return true
    }
    return false
  },

  startPolling: () => {
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
