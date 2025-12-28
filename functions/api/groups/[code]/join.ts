// POST /api/groups/:code/join
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const { name, existingToken } = await context.request.json() as any
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  // Check if rejoining with magic token
  if (existingToken) {
    const existing = await context.env.DB.prepare(
      `SELECT id, name FROM participants WHERE token = ? AND group_id = ?`
    ).bind(existingToken, group.id).first()
    
    if (existing) {
      return Response.json({ 
        participantId: existing.id, 
        token: existingToken,
        name: existing.name,
        rejoined: true 
      })
    }
  }

  // Add new participant
  const participantId = crypto.randomUUID().slice(0, 8)
  const token = crypto.randomUUID() // New magic link token
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await context.env.DB.prepare(
    `INSERT INTO participants (id, group_id, name, avatar, is_host, token)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).bind(participantId, group.id, name, avatar, token).run()

  return Response.json({ 
    participantId, 
    token, // Return token for magic link
    rejoined: false 
  })
}
