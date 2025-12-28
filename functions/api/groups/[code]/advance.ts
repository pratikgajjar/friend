// POST /api/groups/:code/advance - HOST ONLY
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  const userId = context.request.headers.get('X-User-Id')
  
  // Require authentication
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first() as { id: string; phase: string } | null
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  // Verify user is host
  const participant = await context.env.DB.prepare(
    'SELECT is_host FROM participants WHERE id = ? AND group_id = ?'
  ).bind(userId, group.id).first() as { is_host: number } | null
  
  if (!participant?.is_host) {
    return Response.json({ error: 'Only host can advance phase' }, { status: 403 })
  }

  const phases = ['gathering', 'suggesting', 'voting', 'finalized', 'tracking']
  const currentIndex = phases.indexOf(group.phase)
  const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)]

  await context.env.DB.prepare(
    `UPDATE groups SET phase = ? WHERE id = ?`
  ).bind(nextPhase, group.id).run()

  return Response.json({ phase: nextPhase })
}
