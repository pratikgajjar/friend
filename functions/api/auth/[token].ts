// GET /api/auth/:token - Verify magic link token and return identity
interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = context.params.token as string
  
  const participant = await context.env.DB.prepare(
    `SELECT p.id, p.name, p.avatar, p.is_host, g.code 
     FROM participants p 
     JOIN groups g ON p.group_id = g.id 
     WHERE p.token = ?`
  ).bind(token).first()
  
  if (!participant) {
    return Response.json({ error: 'Invalid token' }, { status: 404 })
  }

  return Response.json({
    participantId: participant.id,
    name: participant.name,
    avatar: participant.avatar,
    isHost: participant.is_host === 1,
    roomCode: participant.code,
    valid: true,
  })
}

