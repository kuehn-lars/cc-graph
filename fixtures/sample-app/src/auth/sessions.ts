// Session tokens, kept in the store with a time to live.
import * as store from '../db/redis'

const TTL_SECONDS = 60 * 60
const PREFIX = 'session:'

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Buffer.from(bytes).toString('base64url')
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken()
  await store.set(PREFIX + token, userId, TTL_SECONDS)
  return token
}

export async function userForSession(token: string): Promise<string | null> {
  return token === '' ? null : store.get(PREFIX + token)
}

export async function endSession(token: string): Promise<void> {
  await store.del(PREFIX + token)
}

export async function refreshSession(token: string): Promise<boolean> {
  const userId = await userForSession(token)
  if (userId === null) return false
  await store.set(PREFIX + token, userId, TTL_SECONDS)
  return true
}
