// DELETE /api/challenges/:id - Delete a challenge (creator only)
interface Env {
  DB: D1Database
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const challengeId = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get challenge
  const challenge = await context.env.DB.prepare(
    'SELECT suggested_by_participant_id FROM challenges WHERE id = ?'
  ).bind(challengeId).first() as { suggested_by_participant_id: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
  // Check if user is the creator
  if (challenge.suggested_by_participant_id !== userId) {
    return Response.json({ error: 'Only the creator can delete this challenge' }, { status: 403 })
  }
  
  // Delete the challenge
  await context.env.DB.prepare(
    'DELETE FROM challenges WHERE id = ?'
  ).bind(challengeId).run()
  
  // Delete associated votes
  await context.env.DB.prepare(
    'DELETE FROM votes WHERE challenge_id = ?'
  ).bind(challengeId).run()
  
  return Response.json({ success: true })
}

