// POST /api/challenges/:id/toggle - ASSIGNEE ONLY
interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  // Require authentication
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get challenge and verify user is the assignee
  const challenge = await context.env.DB.prepare(
    `SELECT c.for_participant_id, c.is_completed, g.code 
     FROM challenges c 
     JOIN groups g ON c.group_id = g.id 
     WHERE c.id = ?`
  ).bind(id).first() as { for_participant_id: string; is_completed: number; code: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
  // Only the person assigned this challenge can toggle it
  if (challenge.for_participant_id !== userId) {
    return Response.json({ error: 'Only the assignee can toggle this challenge' }, { status: 403 })
  }
  
  await context.env.DB.prepare(
    `UPDATE challenges SET is_completed = NOT is_completed WHERE id = ?`
  ).bind(id).run()

  // Invalidate cache
  await context.env.CACHE.delete(`group:${challenge.code}`)

  return Response.json({ isCompleted: !challenge.is_completed })
}
