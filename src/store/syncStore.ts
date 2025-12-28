import { create } from 'zustand'
import {
  generateKey,
  encrypt,
  decrypt,
  storeRoomKey,
  getRoomKey,
  buildInviteUrl,
  buildMagicLinkUrl,
  getKeyFromUrl,
} from '../lib/crypto'

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
  version: number
  deadline?: string
  createdAt: string
}

interface SyncState {
  currentUserId: string | null
  currentUserName: string | null
  magicToken: string | null
  currentRoomCode: string | null
  encryptionKey: string | null
  group: Group | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createGroup: (name: string, hostName: string, challengesPerPerson: number, turnstileToken: string) => Promise<Group>
  joinGroup: (code: string, name: string, turnstileToken?: string) => Promise<Group | null>
  joinWithToken: (token: string) => Promise<{ roomCode: string; name: string } | null>
  fetchGroup: (code: string) => Promise<Group | null>
  leaveGroup: () => void
  
  addChallenge: (challenge: Omit<Challenge, 'id' | 'votes' | 'isCompleted' | 'suggestedByParticipantId'>) => Promise<void>
  deleteChallenge: (challengeId: string) => Promise<void>
  voteChallenge: (challengeId: string) => Promise<void>
  removeVote: (challengeId: string) => Promise<void>
  toggleChallengeComplete: (challengeId: string) => Promise<void>
  
  advancePhase: () => Promise<void>
  setDeadline: (deadline: string) => Promise<void>
  
  // Magic link helpers
  getMagicLink: () => string | null
  getInviteLink: () => string | null
  restoreFromStorage: (code: string) => boolean
  setEncryptionKeyFromUrl: () => boolean
  getParticipantTokens: () => Promise<{ id: string; name: string; avatar: string; token: string }[] | null>
  
  // Polling for updates
  startPolling: () => void
  stopPolling: () => void
}

let pollInterval: ReturnType<typeof setTimeout> | null = null
let localVersion = 0
let visibilityHandler: (() => void) | null = null

// Fixed 3s polling interval (Linear-style sync makes this cheap)
const POLL_INTERVAL = 3000

// Storage keys
const getTokenKey = (code: string) => `magic-${code.toUpperCase()}`
const getUserKey = (code: string) => `user-${code.toUpperCase()}`
const getNameKey = (code: string) => `name-${code.toUpperCase()}`

// Encrypt sensitive data before sending to API
async function encryptForApi(data: { name?: string; text?: string; hostName?: string }, key: string) {
  const result: Record<string, string> = {}
  if (data.name) result.name = await encrypt(data.name, key)
  if (data.text) result.text = await encrypt(data.text, key)
  if (data.hostName) result.hostName = await encrypt(data.hostName, key)
  return result
}

// Decrypt group data from API
async function decryptGroup(group: Group, key: string): Promise<Group> {
  try {
    const decryptedName = await decrypt(group.name, key)
    
    const decryptedParticipants = await Promise.all(
      group.participants.map(async (p) => ({
        ...p,
        name: await decrypt(p.name, key).catch(() => p.name),
      }))
    )
    
    const decryptedChallenges = await Promise.all(
      group.challenges.map(async (c) => ({
        ...c,
        text: await decrypt(c.text, key).catch(() => c.text),
      }))
    )
    
    return {
      ...group,
      name: decryptedName,
      participants: decryptedParticipants,
      challenges: decryptedChallenges,
    }
  } catch (error) {
    console.warn('Decryption failed, returning raw data:', error)
    return group
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  currentUserId: null,
  currentUserName: null,
  magicToken: null,
  currentRoomCode: null,
  encryptionKey: null,
  group: null,
  isLoading: false,
  error: null,

  createGroup: async (name, hostName, challengesPerPerson, turnstileToken) => {
    set({ isLoading: true, error: null })
    
    try {
      // Generate encryption key for this group
      const encryptionKey = await generateKey()
      
      // Encrypt sensitive data
      const encryptedData = await encryptForApi({ name, hostName }, encryptionKey)
      
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: encryptedData.name, 
          hostName: encryptedData.hostName, 
          challengesPerPerson, 
          turnstileToken 
        }),
      })
      
      if (!res.ok) throw new Error('Failed to create group')
      
      const data = await res.json()
      
      // Save encryption key, magic token, and user info
      storeRoomKey(data.code, encryptionKey)
      localStorage.setItem(getTokenKey(data.code), data.token)
      localStorage.setItem(getUserKey(data.code), data.hostId)
      localStorage.setItem(getNameKey(data.code), hostName) // Store plaintext locally
      
      const group: Group = {
        id: data.id,
        code: data.code,
        name: name, // Use plaintext for display
        phase: data.phase,
        challengesPerPerson: data.challengesPerPerson,
        version: data.version || 1,
        participants: [{
          id: data.hostId,
          name: hostName, // Plaintext
          avatar: data.participants?.[0]?.avatar || '🙂',
          isHost: true,
        }],
        challenges: [],
        createdAt: new Date().toISOString(),
      }
      
      // Set local version for delta sync
      localVersion = group.version
      
      set({
        currentUserId: data.hostId,
        currentUserName: hostName,
        magicToken: data.token,
        currentRoomCode: data.code,
        encryptionKey,
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

  joinGroup: async (code, name, turnstileToken) => {
    set({ isLoading: true, error: null })
    
    try {
      // Get encryption key from URL or storage
      let encryptionKey = getKeyFromUrl() || getRoomKey(code)
      
      if (!encryptionKey) {
        set({ isLoading: false, error: 'Missing encryption key. Please use the full invite link.' })
        return null
      }
      
      // Store key if from URL
      storeRoomKey(code, encryptionKey)
      
      // Check if we have a stored token for this room
      const existingToken = localStorage.getItem(getTokenKey(code))
      
      // Encrypt name before sending
      const encryptedName = await encrypt(name, encryptionKey)
      
      const res = await fetch(`${API_BASE}/groups/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: encryptedName, existingToken, turnstileToken }),
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
      localStorage.setItem(getNameKey(code), name) // Store plaintext locally
      
      set({
        currentUserId: data.participantId,
        currentUserName: name,
        magicToken: data.token,
        currentRoomCode: code,
        encryptionKey,
      })
      
      // Fetch full group data
      const group = await get().fetchGroup(code)
      
      if (group) {
        set({ group, isLoading: false })
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
      // Get encryption key from URL
      const encryptionKey = getKeyFromUrl()
      
      if (!encryptionKey) {
        set({ isLoading: false, error: 'Missing encryption key. Please use the full magic link.' })
        return null
      }
      
      const res = await fetch(`${API_BASE}/auth/${token}`)
      
      if (!res.ok) {
        set({ isLoading: false, error: 'Invalid magic link' })
        return null
      }
      
      const data = await res.json()
      
      // Store encryption key
      storeRoomKey(data.roomCode, encryptionKey)
      
      // Decrypt name from API response
      let decryptedName = data.name
      try {
        decryptedName = await decrypt(data.name, encryptionKey)
      } catch {
        // Name might not be encrypted (legacy)
      }
      
      // Save to localStorage
      localStorage.setItem(getTokenKey(data.roomCode), token)
      localStorage.setItem(getUserKey(data.roomCode), data.participantId)
      localStorage.setItem(getNameKey(data.roomCode), decryptedName)
      
      set({
        currentUserId: data.participantId,
        currentUserName: decryptedName,
        magicToken: token,
        currentRoomCode: data.roomCode,
        encryptionKey,
        isLoading: false,
      })
      
      return { roomCode: data.roomCode, name: decryptedName }
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
      
      const rawGroup = await res.json()
      
      // Get encryption key
      const encryptionKey = get().encryptionKey || getRoomKey(code)
      
      if (encryptionKey) {
        const decryptedGroup = await decryptGroup(rawGroup, encryptionKey)
        set({ group: decryptedGroup })
        return decryptedGroup
      }
      
      set({ group: rawGroup })
      return rawGroup
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
      encryptionKey: null,
      group: null,
    })
  },

  addChallenge: async ({ text, forParticipantId }) => {
    const { currentRoomCode, currentUserId, encryptionKey } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      // Encrypt challenge text
      let encryptedText = text
      if (encryptionKey) {
        encryptedText = await encrypt(text, encryptionKey)
      }
      
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/challenges`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId,
        },
        body: JSON.stringify({ text: encryptedText, forParticipantId }),
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
        headers: { 'X-User-Id': currentUserId },
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
        headers: { 'X-User-Id': currentUserId },
      })
      
      if (!res.ok) throw new Error('Failed to remove vote')
      
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to remove vote:', error)
    }
  },

  toggleChallengeComplete: async (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}/toggle`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUserId },
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
        headers: { 'X-User-Id': currentUserId },
      })
      
      if (!res.ok) throw new Error('Failed to delete challenge')
      
      await get().fetchGroup(currentRoomCode)
    } catch (error) {
      console.error('Failed to delete challenge:', error)
    }
  },

  getParticipantTokens: async () => {
    const { currentRoomCode, currentUserId, encryptionKey } = get()
    if (!currentRoomCode || !currentUserId) return null
    
    try {
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/tokens`, {
        headers: { 'X-User-Id': currentUserId },
      })
      
      if (!res.ok) return null
      
      const data = await res.json()
      
      // Decrypt participant names
      if (encryptionKey && data.participants) {
        const decrypted = await Promise.all(
          data.participants.map(async (p: any) => ({
            ...p,
            name: await decrypt(p.name, encryptionKey).catch(() => p.name),
          }))
        )
        return decrypted
      }
      
      return data.participants
    } catch (error) {
      console.error('Failed to get participant tokens:', error)
      return null
    }
  },

  advancePhase: async () => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return
    
    try {
      const res = await fetch(`${API_BASE}/groups/${currentRoomCode}/advance`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUserId },
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
    const { magicToken, currentRoomCode, encryptionKey } = get()
    if (!magicToken || !currentRoomCode) return null
    
    const key = encryptionKey || getRoomKey(currentRoomCode)
    if (!key) return null
    
    return buildMagicLinkUrl(magicToken, key)
  },

  getInviteLink: () => {
    const { currentRoomCode, encryptionKey } = get()
    if (!currentRoomCode) return null
    
    const key = encryptionKey || getRoomKey(currentRoomCode)
    if (!key) return null
    
    return buildInviteUrl(currentRoomCode, key)
  },

  restoreFromStorage: (code) => {
    const token = localStorage.getItem(getTokenKey(code))
    const userId = localStorage.getItem(getUserKey(code))
    const userName = localStorage.getItem(getNameKey(code))
    const encryptionKey = getRoomKey(code)
    
    if (token && userId) {
      set({
        currentUserId: userId,
        currentUserName: userName,
        magicToken: token,
        currentRoomCode: code,
        encryptionKey,
      })
      return true
    }
    return false
  },

  setEncryptionKeyFromUrl: () => {
    const key = getKeyFromUrl()
    const { currentRoomCode } = get()
    
    if (key) {
      set({ encryptionKey: key })
      if (currentRoomCode) {
        storeRoomKey(currentRoomCode, key)
      }
      return true
    }
    return false
  },

  startPolling: () => {
    if (pollInterval) return
    
    // Linear-style sync: check version first, fetch only if changed
    const checkAndSync = async () => {
      const { currentRoomCode: code } = get()
      if (!code) return
      
      // Skip if tab is not visible
      if (document.hidden) return
      
      try {
        // Step 1: Check version (very cheap - 1 KV read or 1 D1 read)
        const versionRes = await fetch(`${API_BASE}/groups/${code}/version`)
        if (!versionRes.ok) return
        
        const { version: serverVersion } = await versionRes.json()
        
        // Step 2: Only fetch full data if version changed
        if (serverVersion !== localVersion) {
          console.log(`[Sync] Version changed: ${localVersion} → ${serverVersion}`)
          await get().fetchGroup(code)
          localVersion = serverVersion
        }
      } catch (error) {
        console.error('[Sync] Error checking version:', error)
      }
    }
    
    // Initial fetch
    const { currentRoomCode } = get()
    if (currentRoomCode) {
      get().fetchGroup(currentRoomCode).then(() => {
        // Set initial local version from fetched group
        const fetchedGroup = get().group
        if (fetchedGroup?.version) {
          localVersion = fetchedGroup.version
        }
      })
    }
    
    // Poll every 3 seconds (cheap with version checking)
    pollInterval = setInterval(checkAndSync, POLL_INTERVAL)
    
    // Fetch immediately when tab becomes visible
    visibilityHandler = () => {
      if (!document.hidden) {
        checkAndSync()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
    localVersion = 0
  },
}))
