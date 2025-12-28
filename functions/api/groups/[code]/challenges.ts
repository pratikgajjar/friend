// POST /api/groups/:code/challenges - AUTHENTICATED USERS ONLY
import { bumpVersion } from '../../../lib/cache'

interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { text, forParticipantId } = await context.request.json() as any
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first() as { id: string; phase: string } | null
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }
  
  if (group.phase !== 'suggesting') {
    return Response.json({ error: 'Can only add challenges during suggesting phase' }, { status: 400 })
  }
  
  const participant = await context.env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND group_id = ?'
  ).bind(userId, group.id).first()
  
  if (!participant) {
    return Response.json({ error: 'Not a participant in this group' }, { status: 403 })
  }
  
  const targetParticipant = await context.env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND group_id = ?'
  ).bind(forParticipantId, group.id).first()
  
  if (!targetParticipant) {
    return Response.json({ error: 'Target participant not found in group' }, { status: 400 })
  }
  
  if (forParticipantId === userId) {
    return Response.json({ error: 'Cannot suggest challenges for yourself' }, { status: 400 })
  }

  const id = crypto.randomUUID().slice(0, 8)
  
  await context.env.DB.prepare(
    `INSERT INTO challenges (id, group_id, text, for_participant_id, suggested_by_id, votes, is_completed)
     VALUES (?, ?, ?, ?, ?, '[]', 0)`
  ).bind(id, group.id, text, forParticipantId, userId).run()

  await bumpVersion(context.env.CACHE, code)

  return Response.json({ 
    id, 
    text, 
    forParticipantId, 
    suggestedByParticipantId: userId,
    votes: [], 
    isCompleted: false 
  })
}
