// Cloudflare Worker with D1 database
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'friend-challenge-api' }))

// Create a new group
app.post('/api/groups', async (c) => {
  const { name, hostName, challengesPerPerson } = await c.req.json()
  
  const id = crypto.randomUUID().slice(0, 8)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const hostId = crypto.randomUUID().slice(0, 8)
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO groups (id, code, name, phase, challenges_per_person, created_at)
       VALUES (?, ?, ?, 'gathering', ?, datetime('now'))`
    ).bind(id, code, name, challengesPerPerson),
    c.env.DB.prepare(
      `INSERT INTO participants (id, group_id, name, avatar, is_host)
       VALUES (?, ?, ?, ?, 1)`
    ).bind(hostId, id, hostName, avatar),
  ])

  return c.json({ 
    id, 
    code, 
    name, 
    phase: 'gathering',
    challengesPerPerson,
    hostId,
    participants: [{ id: hostId, name: hostName, avatar, isHost: true }],
    challenges: [],
  })
})

// Get group by code
app.get('/api/groups/:code', async (c) => {
  const code = c.req.param('code').toUpperCase()
  
  const group = await c.env.DB.prepare(
    `SELECT id, code, name, phase, challenges_per_person, deadline, created_at 
     FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  const participants = await c.env.DB.prepare(
    `SELECT id, name, avatar, is_host FROM participants WHERE group_id = ?`
  ).bind(group.id).all()

  const challenges = await c.env.DB.prepare(
    `SELECT id, text, for_participant_id, suggested_by_id, votes, is_completed 
     FROM challenges WHERE group_id = ?`
  ).bind(group.id).all()

  return c.json({
    id: group.id,
    code: group.code,
    name: group.name,
    phase: group.phase,
    challengesPerPerson: group.challenges_per_person,
    deadline: group.deadline,
    createdAt: group.created_at,
    participants: participants.results.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host === 1,
    })),
    challenges: challenges.results.map((ch: any) => ({
      id: ch.id,
      text: ch.text,
      forParticipantId: ch.for_participant_id,
      suggestedByParticipantId: ch.suggested_by_id,
      votes: ch.votes ? JSON.parse(ch.votes) : [],
      isCompleted: ch.is_completed === 1,
    })),
  })
})

// Join a group
app.post('/api/groups/:code/join', async (c) => {
  const code = c.req.param('code').toUpperCase()
  const { name, oddsay: existingId } = await c.req.json()
  
  const group = await c.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  // Check if rejoining
  if (existingId) {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM participants WHERE id = ? AND group_id = ?`
    ).bind(existingId, group.id).first()
    
    if (existing) {
      return c.json({ participantId: existingId, rejoined: true })
    }
  }

  // Add new participant
  const participantId = crypto.randomUUID().slice(0, 8)
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await c.env.DB.prepare(
    `INSERT INTO participants (id, group_id, name, avatar, is_host)
     VALUES (?, ?, ?, ?, 0)`
  ).bind(participantId, group.id, name, avatar).run()

  return c.json({ participantId, rejoined: false })
})

// Advance phase
app.post('/api/groups/:code/advance', async (c) => {
  const code = c.req.param('code').toUpperCase()
  
  const group = await c.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  const phases = ['gathering', 'suggesting', 'voting', 'finalized', 'tracking']
  const currentIndex = phases.indexOf(group.phase as string)
  const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)]

  await c.env.DB.prepare(
    `UPDATE groups SET phase = ? WHERE id = ?`
  ).bind(nextPhase, group.id).run()

  return c.json({ phase: nextPhase })
})

// Add challenge
app.post('/api/groups/:code/challenges', async (c) => {
  const code = c.req.param('code').toUpperCase()
  const { text, forParticipantId, suggestedByParticipantId } = await c.req.json()
  
  const group = await c.env.DB.prepare(
    `SELECT id FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return c.json({ error: 'Group not found' }, 404)
  }

  const id = crypto.randomUUID().slice(0, 8)
  
  await c.env.DB.prepare(
    `INSERT INTO challenges (id, group_id, text, for_participant_id, suggested_by_id, votes, is_completed)
     VALUES (?, ?, ?, ?, ?, '[]', 0)`
  ).bind(id, group.id, text, forParticipantId, suggestedByParticipantId).run()

  return c.json({ 
    id, 
    text, 
    forParticipantId, 
    suggestedByParticipantId, 
    votes: [], 
    isCompleted: false 
  })
})

// Vote on challenge
app.post('/api/challenges/:id/vote', async (c) => {
  const id = c.req.param('id')
  const { participantId } = await c.req.json()
  
  const challenge = await c.env.DB.prepare(
    `SELECT votes FROM challenges WHERE id = ?`
  ).bind(id).first()
  
  if (!challenge) {
    return c.json({ error: 'Challenge not found' }, 404)
  }

  const votes = challenge.votes ? JSON.parse(challenge.votes as string) : []
  
  if (!votes.includes(participantId)) {
    votes.push(participantId)
    await c.env.DB.prepare(
      `UPDATE challenges SET votes = ? WHERE id = ?`
    ).bind(JSON.stringify(votes), id).run()
  }

  return c.json({ votes })
})

// Remove vote
app.delete('/api/challenges/:id/vote', async (c) => {
  const id = c.req.param('id')
  const { participantId } = await c.req.json()
  
  const challenge = await c.env.DB.prepare(
    `SELECT votes FROM challenges WHERE id = ?`
  ).bind(id).first()
  
  if (!challenge) {
    return c.json({ error: 'Challenge not found' }, 404)
  }

  let votes = challenge.votes ? JSON.parse(challenge.votes as string) : []
  votes = votes.filter((v: string) => v !== participantId)
  
  await c.env.DB.prepare(
    `UPDATE challenges SET votes = ? WHERE id = ?`
  ).bind(JSON.stringify(votes), id).run()

  return c.json({ votes })
})

// Toggle challenge complete
app.post('/api/challenges/:id/toggle', async (c) => {
  const id = c.req.param('id')
  
  await c.env.DB.prepare(
    `UPDATE challenges SET is_completed = NOT is_completed WHERE id = ?`
  ).bind(id).run()

  const challenge = await c.env.DB.prepare(
    `SELECT is_completed FROM challenges WHERE id = ?`
  ).bind(id).first()

  return c.json({ isCompleted: challenge?.is_completed === 1 })
})

export default app

