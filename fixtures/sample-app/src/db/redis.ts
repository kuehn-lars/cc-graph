// An in-memory stand-in for Redis: enough for sessions in development.
import { config } from '../config'

type Entry = { value: string; expiresAt: number }

const entries = new Map<string, Entry>()

export const url = config.redisUrl

export async function get(key: string): Promise<string | null> {
  const entry = entries.get(key)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.value
}

export async function set(key: string, value: string, ttlSeconds: number): Promise<void> {
  entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export async function del(key: string): Promise<void> {
  entries.delete(key)
}
