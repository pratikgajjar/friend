// POST/DELETE /api/challenges/:id/vote
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const { participantId } = await context.request.json() as any
  
  const challenge = await context.env.DB.prepare(
    `SELECT votes FROM challenges WHERE id = ?`
  ).bind(id).first()
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }

  const votes = challenge.votes ? JSON.parse(challenge.votes as string) : []
  
  if (!votes.includes(participantId)) {
    votes.push(participantId)
    await context.env.DB.prepare(
      `UPDATE challenges SET votes = ? WHERE id = ?`
    ).bind(JSON.stringify(votes), id).run()
  }

  return Response.json({ votes })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const { participantId } = await context.request.json() as any
  
  const challenge = await context.env.DB.prepare(
    `SELECT votes FROM challenges WHERE id = ?`
  ).bind(id).first()
  
  if (!challenge) {
    return Response.json({ error: 'Challenge not found' }, { status: 404 })
  }

  let votes = challenge.votes ? JSON.parse(challenge.votes as string) : []
  votes = votes.filter((v: string) => v !== participantId)
  
  await context.env.DB.prepare(
    `UPDATE challenges SET votes = ? WHERE id = ?`
  ).bind(JSON.stringify(votes), id).run()

  return Response.json({ votes })
}

