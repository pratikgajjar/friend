// GET /api/groups/:code - Get group by code
interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  
  // No KV caching of full data - browser has it if version matches
  // This endpoint only called when version changed
  
  const group = await context.env.DB.prepare(
    `SELECT id, code, name, phase, challenges_per_person, deadline, created_at 
     FROM groups WHERE code = ?`
  ).bind(code).first() as any
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  const participants = await context.env.DB.prepare(
    `SELECT id, name, avatar, is_host FROM participants WHERE group_id = ?`
  ).bind(group.id).all()

  const challenges = await context.env.DB.prepare(
    `SELECT id, text, for_participant_id, suggested_by_id, votes, is_completed 
     FROM challenges WHERE group_id = ?`
  ).bind(group.id).all()

  // Get version from KV
  const kvVersion = await context.env.CACHE.get(`version:${code}`)
  const version = kvVersion ? parseInt(kvVersion, 10) : 1

  return Response.json({
    id: group.id,
    code: group.code,
    name: group.name,
    phase: group.phase,
    challengesPerPerson: group.challenges_per_person,
    deadline: group.deadline,
    version,
    createdAt: group.created_at,
    participants: participants.results.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host === 1,
    })),
    challenges: challenges.results.map((ch: any) => ({
      id: ch.id,
      text: ch.text,
      forParticipantId: ch.for_participant_id,
      suggestedByParticipantId: ch.suggested_by_id,
      votes: ch.votes ? JSON.parse(ch.votes) : [],
      isCompleted: ch.is_completed === 1,
    })),
  })
}
