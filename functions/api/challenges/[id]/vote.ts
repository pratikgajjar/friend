// POST/DELETE /api/challenges/:id/vote - AUTHENTICATED USERS ONLY
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  // Require authentication via header (not body - can't be spoofed)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const challenge = await context.env.DB.prepare(
    `SELECT votes, group_id FROM challenges WHERE id = ?`
  ).bind(id).first() as { votes: string; group_id: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
  // Verify user is a participant in this group
  const participant = await context.env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND group_id = ?'
  ).bind(userId, challenge.group_id).first()
  
  if (!participant) {
    return Response.json({ error: 'Not a participant in this group' }, { status: 403 })
  }

  const votes = challenge.votes ? JSON.parse(challenge.votes) : []
  
  if (!votes.includes(userId)) {
    votes.push(userId)
    await context.env.DB.prepare(
      `UPDATE challenges SET votes = ? WHERE id = ?`
    ).bind(JSON.stringify(votes), id).run()
  }

  return Response.json({ votes })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  // Require authentication via header
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const challenge = await context.env.DB.prepare(
    `SELECT votes FROM challenges WHERE id = ?`
  ).bind(id).first() as { votes: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }

  // Only remove the authenticated user's own vote
  let votes = challenge.votes ? JSON.parse(challenge.votes) : []
  votes = votes.filter((v: string) => v !== userId)
  
  await context.env.DB.prepare(
    `UPDATE challenges SET votes = ? WHERE id = ?`
  ).bind(JSON.stringify(votes), id).run()

  return Response.json({ votes })
}
