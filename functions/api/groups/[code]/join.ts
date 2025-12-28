// POST /api/groups/:code/join
import { bumpVersion } from '../../../lib/version'

interface Env {
  DB: D1Database
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
  const code = (context.params.code as string).toUpperCase()
  const { name, existingToken, turnstileToken } = await context.request.json() as any
  
  const group = await context.env.DB.prepare(
    `SELECT id, phase FROM groups WHERE code = ?`
  ).bind(code).first() as { id: string } | null
  
  if (!group) {
    return Response.json({ error: 'Group not found' }, { status: 404 })
  }

  // Check if rejoining with magic token
  if (existingToken) {
    const existing = await context.env.DB.prepare(
      `SELECT id, name FROM participants WHERE token = ? AND group_id = ?`
    ).bind(existingToken, group.id).first()
    
    if (existing) {
      return Response.json({ 
        participantId: existing.id, 
        token: existingToken,
        name: existing.name,
        rejoined: true 
      })
    }
  }

  // New user - verify Turnstile
  if (!turnstileToken) {
    return Response.json({ error: 'CAPTCHA verification required' }, { status: 400 })
  }
  
  const secretKey = context.env.TURNSTILE_SECRET_KEY || '***REMOVED***'
  const isValid = await verifyTurnstile(turnstileToken, secretKey)
  
  if (!isValid) {
    return Response.json({ error: 'CAPTCHA verification failed' }, { status: 403 })
  }

  const participantId = crypto.randomUUID().slice(0, 8)
  const token = crypto.randomUUID()
  const avatars = ['🔥', '⚡', '🌟', '🎯', '🚀', '💎', '🎪', '🌈', '🦊', '🐉', '🎸', '🎭']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]
  
  await context.env.DB.prepare(
    `INSERT INTO participants (id, group_id, name, avatar, is_host, token)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).bind(participantId, group.id, name, avatar, token).run()

  await bumpVersion(context.env.DB, code)

  return Response.json({ 
    participantId, 
    token,
    rejoined: false 
  })
}
