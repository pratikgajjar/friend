// POST /api/groups/:code/advance
interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first()
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  const phases = ['gathering', 'suggesting', 'voting', 'finalized', 'tracking']
  const currentIndex = phases.indexOf(group.phase as string)
  const nextPhase = phases[Math.min(currentIndex + 1, phases.length - 1)]

  await context.env.DB.prepare(
    `UPDATE groups SET phase = ? WHERE id = ?`
  ).bind(nextPhase, group.id).run()

  return Response.json({ phase: nextPhase })
}

