// The HTTP server: one route table and a dispatcher.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { bearerToken, currentUser, login, logout } from '../auth/login'

type Handler = (req: IncomingMessage, body: unknown) => Promise<Reply> | Reply
type Reply = { status: number; body?: unknown; headers?: Record<string, string> }

// Bodies are small JSON; anything larger is refused.
const MAX_BODY_BYTES = 64 * 1024

const json = (status: number, body: unknown): Reply => ({ status, body })
const notFound = (): Reply => json(404, { error: 'Not found.' })

function field(body: unknown, name: string): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const value = (body as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : undefined
}

const health: Handler = () => json(200, { ok: true, uptime: Math.round(process.uptime()) })

const postLogin: Handler = async (_req, body) => {
  const email = field(body, 'email')
  const password = field(body, 'password')
  if (!email || !password) {
    return json(400, { error: 'Email and password are required.' })
  }
  const result = await login(email, password)
  if (!result.ok) {
    return json(401, { error: 'Wrong email or password.' })
  }
  return json(200, { token: result.token, user: { id: result.user.id } })
}

const postLogout: Handler = async req => {
  const token = bearerToken(req.headers.authorization)
  if (token === '') return json(401, { error: 'Not signed in.' })
  await logout(token)
  return { status: 204 }
}

const getSession: Handler = async req => {
  const user = await currentUser(bearerToken(req.headers.authorization))
  if (!user) return json(401, { error: 'Not signed in.' })
  return json(200, { user: { id: user.id, email: user.email } })
}

const routes: Record<string, Handler> = {
  'GET /health': health,
  'POST /login': postLogin,
  'POST /logout': postLogout,
  'GET /session': getSession,
}

function routeKey(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://localhost')
  return `${req.method ?? 'GET'} ${url.pathname}`
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large.')
    chunks.push(chunk)
  }
  if (size === 0) return undefined
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'Body is not valid JSON.')
  }
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function send(res: ServerResponse, reply: Reply): void {
  const headers: Record<string, string> = { ...reply.headers }
  if (reply.body === undefined) {
    res.writeHead(reply.status, headers).end()
    return
  }
  headers['content-type'] = 'application/json; charset=utf-8'
  res.writeHead(reply.status, headers).end(JSON.stringify(reply.body))
}

export async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const started = Date.now()
  let reply: Reply
  try {
    const handler = routes[routeKey(req)]
    reply = handler ? await handler(req, await readBody(req)) : notFound()
  } catch (error) {
    if (error instanceof HttpError) {
      reply = json(error.status, { error: error.message })
    } else {
      console.error('Unhandled error', error)
      reply = json(500, { error: 'Something went wrong.' })
    }
  }
  send(res, reply)
  log(req, reply.status, Date.now() - started)
}

function log(req: IncomingMessage, status: number, ms: number): void {
  if (process.env.LOG_LEVEL === 'error') return
  console.log(`${req.method} ${req.url} ${status} ${ms}ms`)
}

export function start(port = Number(process.env.PORT ?? 3000)) {
  const server = createServer((req, res) => void handle(req, res))
  server.listen(port, () => console.log(`Listening on http://127.0.0.1:${port}`))
  return server
}
