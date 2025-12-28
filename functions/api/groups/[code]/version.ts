// GET /api/groups/:code/version - Get version from KV only (0 D1 reads!)
interface Env {
  CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = (context.params.code as string).toUpperCase()
  
  // Version is stored only in KV - no D1 read needed
  const version = await context.env.CACHE.get(`version:${code}`)
  
  if (!version) {
    // First time or cache expired - return version 0 to trigger full fetch
    return Response.json({ version: 0 })
  }

  return Response.json({ version: parseInt(version, 10) })
}
