// POST/DELETE /api/challenges/:id/vote - AUTHENTICATED USERS ONLY
import { bumpVersion } from '../../../lib/version'

interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const challenge = await context.env.DB.prepare(
    `SELECT c.votes, c.group_id, g.code 
     FROM challenges c 
     JOIN groups g ON c.group_id = g.id 
     WHERE c.id = ?`
  ).bind(id).first() as { votes: string; group_id: string; code: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }
  
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
    
    await bumpVersion(context.env.DB, challenge.code)
  }

  return Response.json({ votes })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const userId = context.request.headers.get('X-User-Id')
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const challenge = await context.env.DB.prepare(
    `SELECT c.votes, g.code 
     FROM challenges c 
     JOIN groups g ON c.group_id = g.id 
     WHERE c.id = ?`
  ).bind(id).first() as { votes: string; code: string } | null
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }

  let votes = challenge.votes ? JSON.parse(challenge.votes) : []
  const hadVote = votes.includes(userId)
  votes = votes.filter((v: string) => v !== userId)
  
  if (hadVote) {
    await context.env.DB.prepare(
      `UPDATE challenges SET votes = ? WHERE id = ?`
    ).bind(JSON.stringify(votes), id).run()

    await bumpVersion(context.env.DB, challenge.code)
  }

  return Response.json({ votes })
}
