// Shared cache utilities for all API endpoints

/**
 * Bump version in KV to trigger client sync
 * This is the core of the Linear-style sync - no D1 writes for version!
 */
export async function bumpVersion(cache: KVNamespace, code: string) {
  const current = await cache.get(`version:${code}`)
  const next = (parseInt(current || '0', 10) + 1).toString()
  await cache.put(`version:${code}`, next)
  await cache.delete(`group:${code}`) // Invalidate group cache
}

/**
 * Get current version from KV
 */
export async function getVersion(cache: KVNamespace, code: string): Promise<number> {
  const version = await cache.get(`version:${code}`)
  return version ? parseInt(version, 10) : 0
}

/**
 * Set initial version for a new group
 */
export async function initVersion(cache: KVNamespace, code: string) {
  await cache.put(`version:${code}`, '1')
}

