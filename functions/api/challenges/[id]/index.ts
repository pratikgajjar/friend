// DELETE /api/challenges/:id - Delete a challenge (creator only)
import { bumpVersion } from '../../../lib/cache'

interface Env {
  DB: D1Database
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const challengeId = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const challenge = await context.env.DB.prepare(
    `SELECT c.suggested_by_id, g.code 
     FROM challenges c 
     JOIN groups g ON c.group_id = g.id 
     WHERE c.id = ?`
  ).bind(challengeId).first() as { suggested_by_id: string; code: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
  if (challenge.suggested_by_id !== userId) {
    return Response.json({ error: 'Only the creator can delete this challenge' }, { status: 403 })
  }
  
  await context.env.DB.prepare(
    'DELETE FROM challenges WHERE id = ?'
  ).bind(challengeId).run()
  
  await bumpVersion(context.env.DB, challenge.code)
  
  return Response.json({ success: true })
}
