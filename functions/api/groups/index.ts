// POST /api/groups - Create a new group
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { name, hostName, challengesPerPerson } = await context.request.json() as any
  
  const id = crypto.randomUUID().slice(0, 8)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const hostId = crypto.randomUUID().slice(0, 8)
  const token = crypto.randomUUID() // Magic link token
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO groups (id, code, name, phase, challenges_per_person, created_at)
       VALUES (?, ?, ?, 'gathering', ?, datetime('now'))`
    ).bind(id, code, name, challengesPerPerson),
    context.env.DB.prepare(
      `INSERT INTO participants (id, group_id, name, avatar, is_host, token)
       VALUES (?, ?, ?, ?, 1, ?)`
    ).bind(hostId, id, hostName, avatar, token),
  ])

  return Response.json({ 
    id, 
    code, 
    name, 
    phase: 'gathering',
    challengesPerPerson,
    hostId,
    token, // Return token for magic link
    participants: [{ id: hostId, name: hostName, avatar, isHost: true }],
    challenges: [],
  })
}
