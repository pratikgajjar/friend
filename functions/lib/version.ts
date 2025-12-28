// Shared utilities for version management
// Version stored in D1 for strong consistency

/**
 * Bump version in D1 - strongly consistent, instant for all users
 */
export async function bumpVersion(db: D1Database, code: string): Promise<void> {
  await db.prepare(
    `UPDATE groups SET version = version + 1 WHERE code = ?`
  ).bind(code).run()
}

/**
 * Get version from D1 - 1 read, 1 row (minimal cost)
 */
export async function getVersion(db: D1Database, code: string): Promise<number> {
  const result = await db.prepare(
    `SELECT version FROM groups WHERE code = ?`
  ).bind(code).first() as { version: number } | null
  
  return result?.version ?? 0
}

