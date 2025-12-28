import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { create } from 'zustand'

// Types
export interface Challenge {
  id: string
  text: string
  forParticipantId: string
  suggestedByParticipantId: string
  votes: string[]
  isCompleted: boolean
  category?: 'growth' | 'fun' | 'comfort-zone' | 'neglected' | 'shared'
}

export interface Participant {
  id: string
  name: string
  avatar: string
  isHost: boolean
  isOnline?: boolean
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

// Room state per room code
interface RoomState {
  ydoc: Y.Doc
  indexeddbProvider: IndexeddbPersistence
  broadcastChannel: BroadcastChannel
  cleanup: () => void
}

const rooms = new Map<string, RoomState>()

// Avatar options
const avatarEmojis = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']

const generateId = () => Math.random().toString(36).substring(2, 9)
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

// BroadcastChannel-based sync (works across browser tabs, no server needed)
function setupBroadcastSync(roomCode: string, ydoc: Y.Doc): BroadcastChannel {
  const channel = new BroadcastChannel(`friend-challenge-${roomCode}`)
  
  // Send updates to other tabs
  ydoc.on('update', (update: Uint8Array, origin: any) => {
    if (origin !== 'broadcast') {
      channel.postMessage({
        type: 'sync',
        update: Array.from(update),
      })
    }
  })

  // Receive updates from other tabs
  channel.onmessage = (event) => {
    if (event.data.type === 'sync') {
      const update = new Uint8Array(event.data.update)
      Y.applyUpdate(ydoc, update, 'broadcast')
    } else if (event.data.type === 'request-state') {
      // New tab joined, send full state
      const state = Y.encodeStateAsUpdate(ydoc)
      channel.postMessage({
        type: 'full-state',
        state: Array.from(state),
      })
    } else if (event.data.type === 'full-state') {
      const state = new Uint8Array(event.data.state)
      Y.applyUpdate(ydoc, state, 'broadcast')
    }
  }

  // Request state from other tabs when joining
  channel.postMessage({ type: 'request-state' })

  return channel
}

// Get or create a room
function getOrCreateRoom(roomCode: string): RoomState {
  if (rooms.has(roomCode)) {
    return rooms.get(roomCode)!
  }

  const ydoc = new Y.Doc()
  
  // IndexedDB for local persistence
  const indexeddbProvider = new IndexeddbPersistence(`friend-challenge-${roomCode}`, ydoc)
  
  // BroadcastChannel for cross-tab sync
  const broadcastChannel = setupBroadcastSync(roomCode, ydoc)

  const cleanup = () => {
    broadcastChannel.close()
    ydoc.destroy()
  }

  const room: RoomState = { ydoc, indexeddbProvider, broadcastChannel, cleanup }
  rooms.set(roomCode, room)

  return room
}

// Zustand store for UI state
interface SyncState {
  currentUserId: string | null
  currentRoomCode: string | null
  group: Group | null
  connectedPeers: number
  isLoading: boolean
  
  // Actions
  createGroup: (name: string, hostName: string, challengesPerPerson: number) => Promise<Group>
  joinGroup: (code: string, name: string) => Promise<Group | null>
  leaveGroup: () => void
  
  addChallenge: (challenge: Omit<Challenge, 'id' | 'votes' | 'isCompleted'>) => void
  voteChallenge: (challengeId: string) => void
  removeVote: (challengeId: string) => void
  toggleChallengeComplete: (challengeId: string) => void
  
  advancePhase: () => void
  setDeadline: (deadline: string) => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  currentUserId: null,
  currentRoomCode: null,
  group: null,
  connectedPeers: 1,
  isLoading: false,

  createGroup: async (name, hostName, challengesPerPerson) => {
    const code = generateCode()
    const hostId = generateId()
    
    const room = getOrCreateRoom(code)
    
    // Wait for IndexedDB to sync
    await room.indexeddbProvider.whenSynced

    const yGroup = room.ydoc.getMap('group')
    const yParticipants = room.ydoc.getArray<Participant>('participants')

    // Initialize group data
    const groupData = {
      id: generateId(),
      name,
      code,
      phase: 'gathering' as const,
      challengesPerPerson,
      createdAt: new Date().toISOString(),
    }

    const host: Participant = {
      id: hostId,
      name: hostName,
      avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)],
      isHost: true,
      isOnline: true,
    }

    room.ydoc.transact(() => {
      yGroup.set('id', groupData.id)
      yGroup.set('name', groupData.name)
      yGroup.set('code', groupData.code)
      yGroup.set('phase', groupData.phase)
      yGroup.set('challengesPerPerson', groupData.challengesPerPerson)
      yGroup.set('createdAt', groupData.createdAt)
      yParticipants.push([host])
    })

    // Subscribe to changes
    subscribeToRoom(code, set)

    const group: Group = {
      ...groupData,
      participants: [host],
      challenges: [],
    }

    set({
      currentUserId: hostId,
      currentRoomCode: code,
      group,
      connectedPeers: 1,
    })

    // Save user ID to localStorage
    localStorage.setItem(`user-${code}`, hostId)

    return group
  },

  joinGroup: async (code, name) => {
    set({ isLoading: true })
    
    const room = getOrCreateRoom(code)
    
    // Wait for IndexedDB sync
    await room.indexeddbProvider.whenSynced
    
    // Give BroadcastChannel a moment to sync with other tabs
    await new Promise(resolve => setTimeout(resolve, 500))

    const yGroup = room.ydoc.getMap('group')
    const yParticipants = room.ydoc.getArray<Participant>('participants')

    // Check if group exists
    const groupId = yGroup.get('id') as string | undefined
    if (!groupId) {
      set({ isLoading: false })
      return null
    }

    // Check if already a participant
    const existingUserId = localStorage.getItem(`user-${code}`)
    const participants = yParticipants.toArray()
    const existingParticipant = existingUserId 
      ? participants.find(p => p.id === existingUserId)
      : null

    let participantId: string

    if (existingParticipant) {
      // Rejoin as existing participant
      participantId = existingParticipant.id
    } else {
      // Add new participant
      participantId = generateId()
      const newParticipant: Participant = {
        id: participantId,
        name,
        avatar: avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)],
        isHost: false,
        isOnline: true,
      }
      yParticipants.push([newParticipant])
      localStorage.setItem(`user-${code}`, participantId)
    }

    // Subscribe to changes
    subscribeToRoom(code, set)

    const group = buildGroupFromYDoc(room.ydoc)

    set({
      currentUserId: participantId,
      currentRoomCode: code,
      group,
      connectedPeers: 1,
      isLoading: false,
    })

    return group
  },

  leaveGroup: () => {
    const { currentRoomCode } = get()
    if (currentRoomCode && rooms.has(currentRoomCode)) {
      const room = rooms.get(currentRoomCode)!
      room.cleanup()
      rooms.delete(currentRoomCode)
    }
    set({
      currentUserId: null,
      currentRoomCode: null,
      group: null,
      connectedPeers: 0,
    })
  },

  addChallenge: (challenge) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const yChallenges = room.ydoc.getArray<Challenge>('challenges')
    
    const newChallenge: Challenge = {
      ...challenge,
      id: generateId(),
      votes: [],
      isCompleted: false,
    }

    yChallenges.push([newChallenge])
  },

  voteChallenge: (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const yChallenges = room.ydoc.getArray<Challenge>('challenges')
    const challenges = yChallenges.toArray()
    const index = challenges.findIndex(c => c.id === challengeId)
    
    if (index === -1) return

    const challenge = challenges[index]
    if (challenge.votes.includes(currentUserId)) return

    room.ydoc.transact(() => {
      yChallenges.delete(index, 1)
      yChallenges.insert(index, [{
        ...challenge,
        votes: [...challenge.votes, currentUserId],
      }])
    })
  },

  removeVote: (challengeId) => {
    const { currentRoomCode, currentUserId } = get()
    if (!currentRoomCode || !currentUserId) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const yChallenges = room.ydoc.getArray<Challenge>('challenges')
    const challenges = yChallenges.toArray()
    const index = challenges.findIndex(c => c.id === challengeId)
    
    if (index === -1) return

    const challenge = challenges[index]

    room.ydoc.transact(() => {
      yChallenges.delete(index, 1)
      yChallenges.insert(index, [{
        ...challenge,
        votes: challenge.votes.filter(v => v !== currentUserId),
      }])
    })
  },

  toggleChallengeComplete: (challengeId) => {
    const { currentRoomCode } = get()
    if (!currentRoomCode) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const yChallenges = room.ydoc.getArray<Challenge>('challenges')
    const challenges = yChallenges.toArray()
    const index = challenges.findIndex(c => c.id === challengeId)
    
    if (index === -1) return

    const challenge = challenges[index]

    room.ydoc.transact(() => {
      yChallenges.delete(index, 1)
      yChallenges.insert(index, [{
        ...challenge,
        isCompleted: !challenge.isCompleted,
      }])
    })
  },

  advancePhase: () => {
    const { currentRoomCode, group } = get()
    if (!currentRoomCode || !group) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const phases: Group['phase'][] = ['gathering', 'suggesting', 'voting', 'finalized', 'tracking']
    const currentIndex = phases.indexOf(group.phase)
    const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)]

    const yGroup = room.ydoc.getMap('group')
    yGroup.set('phase', nextPhase)
  },

  setDeadline: (deadline) => {
    const { currentRoomCode } = get()
    if (!currentRoomCode) return

    const room = rooms.get(currentRoomCode)
    if (!room) return

    const yGroup = room.ydoc.getMap('group')
    yGroup.set('deadline', deadline)
  },
}))

// Helper to build group object from Y.Doc
function buildGroupFromYDoc(ydoc: Y.Doc): Group {
  const yGroup = ydoc.getMap('group')
  const yParticipants = ydoc.getArray<Participant>('participants')
  const yChallenges = ydoc.getArray<Challenge>('challenges')

  return {
    id: yGroup.get('id') as string || '',
    name: yGroup.get('name') as string || '',
    code: yGroup.get('code') as string || '',
    phase: yGroup.get('phase') as Group['phase'] || 'gathering',
    challengesPerPerson: yGroup.get('challengesPerPerson') as number || 6,
    deadline: yGroup.get('deadline') as string | undefined,
    createdAt: yGroup.get('createdAt') as string || '',
    participants: yParticipants.toArray(),
    challenges: yChallenges.toArray(),
  }
}

// Subscribe to Y.Doc changes
function subscribeToRoom(code: string, set: (state: Partial<SyncState>) => void) {
  const room = rooms.get(code)
  if (!room) return

  const updateGroup = () => {
    set({ group: buildGroupFromYDoc(room.ydoc) })
  }

  room.ydoc.getMap('group').observe(updateGroup)
  room.ydoc.getArray('participants').observe(updateGroup)
  room.ydoc.getArray('challenges').observe(updateGroup)
}

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).rooms = rooms
}
