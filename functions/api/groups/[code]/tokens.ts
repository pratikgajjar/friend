// GET /api/groups/:code/tokens - Get all participant tokens (host only)
interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = context.params.code as string
  const hostId = context.request.headers.get('X-User-Id')
  
  if (!hostId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get group
  const group = await context.env.DB.prepare(
    'SELECT id FROM groups WHERE code = ?'
  ).bind(code).first() as { id: string } | null
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }
  
  // Check if requester is host
  const requester = await context.env.DB.prepare(
    'SELECT is_host FROM participants WHERE id = ? AND group_id = ?'
  ).bind(hostId, group.id).first() as { is_host: number } | null
  
  if (!requester?.is_host) {
    return Response.json({ error: 'Only host can access tokens' }, { status: 403 })
  }
  
  // Get all participant tokens
  const participants = await context.env.DB.prepare(
    'SELECT id, name, avatar, token FROM participants WHERE group_id = ?'
  ).bind(group.id).all()
  
  return Response.json({
    participants: participants.results.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      token: p.token,
    }))
  })
}

