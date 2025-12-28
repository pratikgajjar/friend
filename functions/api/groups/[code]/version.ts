// GET /api/groups/:code/version - Get version from D1 (strongly consistent!)
import { getVersion } from '../../../lib/version'

interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  
  // D1 is strongly consistent - no propagation delay
  const version = await getVersion(context.env.DB, code)
  
  if (version === 0) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  return Response.json({ version })
}
