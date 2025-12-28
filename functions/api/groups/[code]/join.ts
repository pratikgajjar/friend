// POST /api/groups/:code/join
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const { name, existingId } = await context.request.json() as any
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  // Check if rejoining
  if (existingId) {
    const existing = await context.env.DB.prepare(
      `SELECT id FROM participants WHERE id = ? AND group_id = ?`
    ).bind(existingId, group.id).first()
    
    if (existing) {
      return Response.json({ participantId: existingId, rejoined: true })
    }
  }

  // Add new participant
  const participantId = crypto.randomUUID().slice(0, 8)
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await context.env.DB.prepare(
    `INSERT INTO participants (id, group_id, name, avatar, is_host)
     VALUES (?, ?, ?, ?, 0)`
  ).bind(participantId, group.id, name, avatar).run()

  return Response.json({ participantId, rejoined: false })
}

