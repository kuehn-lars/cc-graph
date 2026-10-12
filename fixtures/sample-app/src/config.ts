// Application settings, read once from the environment.

export type Config = {
  port: number
  host: string
  redisUrl: string
  passwordIterations: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

function number(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got "${raw}"`)
  }
  return value
}

function text(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw === undefined || raw === '' ? fallback : raw
}

function level(raw: string): Config['logLevel'] {
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return 'info'
}

// Read at import time: restart the server after changing the environment.
export const config: Config = {
  port: number('PORT', 3000),
  host: text('HOST', '127.0.0.1'),
  redisUrl: text('REDIS_URL', 'redis://127.0.0.1:6379'),
  passwordIterations: number('PASSWORD_ITERATIONS', 100_000),
  logLevel: level(text('LOG_LEVEL', 'info')),
}
