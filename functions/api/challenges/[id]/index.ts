// DELETE /api/challenges/:id - Delete a challenge (creator only)
interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const challengeId = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get challenge with group code
  const challenge = await context.env.DB.prepare(
    `SELECT c.suggested_by_id, g.code 
     FROM challenges c 
     JOIN groups g ON c.group_id = g.id 
     WHERE c.id = ?`
  ).bind(challengeId).first() as { suggested_by_id: string; code: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
  // Check if user is the creator
  if (challenge.suggested_by_id !== userId) {
    return Response.json({ error: 'Only the creator can delete this challenge' }, { status: 403 })
  }
  
  // Delete the challenge
  await context.env.DB.prepare(
    'DELETE FROM challenges WHERE id = ?'
  ).bind(challengeId).run()
  
  // Invalidate cache
  await context.env.CACHE.delete(`group:${challenge.code}`)
  
  return Response.json({ success: true })
}
