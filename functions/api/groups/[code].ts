// GET /api/groups/:code - Get group by code (with KV caching)
interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

const CACHE_TTL = 60 // 60 seconds cache

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const cacheKey = `group:${code}`
  
  // Try cache first (0 D1 reads!)
  const cached = await context.env.CACHE.get(cacheKey, 'json')
  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' }
    })
  }
  
  // Cache miss - query D1
  const group = await context.env.DB.prepare(
    `SELECT id, code, name, phase, challenges_per_person, deadline, created_at 
     FROM groups WHERE code = ?`
  ).bind(code).first()
  
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

  const result = {
    id: group.id,
    code: group.code,
    name: group.name,
    phase: group.phase,
    challengesPerPerson: group.challenges_per_person,
    deadline: group.deadline,
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
  }
  
  // Store in cache (don't await - fire and forget)
  context.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL })
  
  return Response.json(result, {
    headers: { 'X-Cache': 'MISS' }
  })
}
