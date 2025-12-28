// POST /api/challenges/:id/toggle - ASSIGNEE ONLY
interface Env {
  DB: D1Database
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
    `SELECT for_participant_id, is_completed FROM challenges WHERE id = ?`
  ).bind(id).first() as { for_participant_id: string; is_completed: number } | null
  
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

  return Response.json({ isCompleted: !challenge.is_completed })
}
