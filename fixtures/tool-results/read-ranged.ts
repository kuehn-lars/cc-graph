export default {
  "tool": "Read",
  "tool_use_id": "toolu_01VhLiWCLHqEQMSfRMgXewki",
  "input": {
    "file_path": "/private/tmp/claude-501/rec-k0nL/sample-app/src/routes/index.ts",
    "offset": 1,
    "limit": 40
  },
  "result": {
    "type": "text",
    "file": {
      "filePath": "/private/tmp/claude-501/rec-k0nL/sample-app/src/routes/index.ts",
      "content": "// The HTTP server: one route table and a dispatcher.\nimport { createServer, type IncomingMessage, type ServerResponse } from 'node:http'\nimport { bearerToken, currentUser, login, logout } from '../auth/login'\n\ntype Handler = (req: IncomingMessage, body: unknown) => Promise<Reply> | Reply\ntype Reply = { status: number; body?: unknown; headers?: Record<string, string> }\n\n// Bodies are small JSON; anything larger is refused.\nconst MAX_BODY_BYTES = 64 * 1024\n\nconst json = (status: number, body: unknown): Reply => ({ status, body })\nconst notFound = (): Reply => json(404, { error: 'Not found.' })\n\nfunction field(body: unknown, name: string): string | undefined {\n  if (typeof body !== 'object' || body === null) return undefined\n  const value = (body as Record<string, unknown>)[name]\n  return typeof value === 'string' ? value : undefined\n}\n\nconst health: Handler = () => json(200, { ok: true, uptime: Math.round(process.uptime()) })\n\nconst postLogin: Handler = async (_req, body) => {\n  const email = field(body, 'email')\n  const password = field(body, 'password')\n  if (!email || !password) {\n    return json(400, { error: 'Email and password are required.' })\n  }\n  const result = await login(email, password)\n  if (!result.ok) {\n    return json(401, { error: 'Wrong email or password.' })\n  }\n  return json(200, { token: result.token, user: { id: result.user.id } })\n}\n\nconst postLogout: Handler = async req => {\n  const token = bearerToken(req.headers.authorization)\n  if (token === '') return json(401, { error: 'Not signed in.' })\n  await logout(token)\n  return { status: 204 }\n}",
      "numLines": 40,
      "startLine": 1,
      "totalLines": 121
    }
  }
}
