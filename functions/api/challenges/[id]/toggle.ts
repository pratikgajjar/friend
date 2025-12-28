// POST /api/challenges/:id/toggle
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  
  await context.env.DB.prepare(
    `UPDATE challenges SET is_completed = NOT is_completed WHERE id = ?`
  ).bind(id).run()

  const challenge = await context.env.DB.prepare(
    `SELECT is_completed FROM challenges WHERE id = ?`
  ).bind(id).first()

  return Response.json({ isCompleted: challenge?.is_completed === 1 })
}

