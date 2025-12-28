// POST /api/groups/:code/challenges
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const { text, forParticipantId, suggestedByParticipantId } = await context.request.json() as any
  
  const group = await context.env.DB.prepare(
    `SELECT id FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  const id = crypto.randomUUID().slice(0, 8)
  
  await context.env.DB.prepare(
    `INSERT INTO challenges (id, group_id, text, for_participant_id, suggested_by_id, votes, is_completed)
     VALUES (?, ?, ?, ?, ?, '[]', 0)`
  ).bind(id, group.id, text, forParticipantId, suggestedByParticipantId).run()

  return Response.json({ 
    id, 
    text, 
    forParticipantId, 
    suggestedByParticipantId, 
    votes: [], 
    isCompleted: false 
  })
}

