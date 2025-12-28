// POST /api/groups - Create a new group
import { initVersion } from '../../lib/cache'

interface Env {
  DB: D1Database
  CACHE: KVNamespace
  TURNSTILE_SECRET_KEY: string
}

async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })
    
    const data = await res.json() as { success: boolean }
    return data.success
  } catch (e) {
    console.error('Turnstile verification failed:', e)
    return false
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { name, hostName, challengesPerPerson, turnstileToken } = await context.request.json() as any
  
  // Verify Turnstile token
  if (!turnstileToken) {
    return Response.json({ error: 'CAPTCHA verification required' }, { status: 400 })
  }
  
  const secretKey = context.env.TURNSTILE_SECRET_KEY || '***REMOVED***'
  const isValid = await verifyTurnstile(turnstileToken, secretKey)
  
  if (!isValid) {
    return Response.json({ error: 'CAPTCHA verification failed' }, { status: 403 })
  }
  
  const id = crypto.randomUUID().slice(0, 8)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const hostId = crypto.randomUUID().slice(0, 8)
  const token = crypto.randomUUID() // Magic link token
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO groups (id, code, name, phase, challenges_per_person, created_at)
       VALUES (?, ?, ?, 'gathering', ?, datetime('now'))`
    ).bind(id, code, name, challengesPerPerson),
    context.env.DB.prepare(
      `INSERT INTO participants (id, group_id, name, avatar, is_host, token)
       VALUES (?, ?, ?, ?, 1, ?)`
    ).bind(hostId, id, hostName, avatar, token),
  ])

  // Set initial version in KV (no full payload caching needed)
  await initVersion(context.env.CACHE, code)

  return Response.json({ 
    id, 
    code, 
    name, 
    phase: 'gathering',
    challengesPerPerson,
    version: 1,
    hostId,
    token,
    participants: [{ id: hostId, name: hostName, avatar, isHost: true }],
    challenges: [],
  })
}
