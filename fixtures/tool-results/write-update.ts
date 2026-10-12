export default {
  "tool": "Write",
  "tool_use_id": "toolu_0181pk6sj9Rgv9KEsiQ8M9GR",
  "input": {
    "file_path": "/private/tmp/claude-501/rec-k0nL/sample-app/src/api/users.ts",
    "content": "// Users API.\n// The user API: sign up and read your own profile.\nimport { bearerToken, currentUser, registerUser, userCount } from '../auth/login'\n\nexport type Reply = { status: number; body: unknown }\n\nconst EMAIL = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/\n\nexport async function signUp(body: { email?: unknown; password?: unknown }): Promise<Reply> {\n  const { email, password } = body\n  if (typeof email !== 'string' || !EMAIL.test(email)) {\n    return { status: 400, body: { error: 'A valid email is required.' } }\n  }\n  if (typeof password !== 'string' || password.length < 12) {\n    return { status: 400, body: { error: 'The password needs at least 12 characters.' } }\n  }\n  const user = await registerUser(email, password)\n  return { status: 201, body: { id: user.id, email: user.email } }\n}\n\nexport async function me(authorization: string | undefined): Promise<Reply> {\n  const user = await currentUser(bearerToken(authorization))\n  if (!user) return { status: 401, body: { error: 'Not signed in.' } }\n  return { status: 200, body: { id: user.id, email: user.email } }\n}\n\nexport function stats(): Reply {\n  return { status: 200, body: { users: userCount() } }\n}\n\nexport const routes = {\n  'POST /users': signUp,\n  'GET /users/me': me,\n  'GET /users/stats': stats,\n}\nexport default routes\n"
  },
  "result": {
    "type": "update",
    "filePath": "/private/tmp/claude-501/rec-k0nL/sample-app/src/api/users.ts",
    "content": "// Users API.\n// The user API: sign up and read your own profile.\nimport { bearerToken, currentUser, registerUser, userCount } from '../auth/login'\n\nexport type Reply = { status: number; body: unknown }\n\nconst EMAIL = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/\n\nexport async function signUp(body: { email?: unknown; password?: unknown }): Promise<Reply> {\n  const { email, password } = body\n  if (typeof email !== 'string' || !EMAIL.test(email)) {\n    return { status: 400, body: { error: 'A valid email is required.' } }\n  }\n  if (typeof password !== 'string' || password.length < 12) {\n    return { status: 400, body: { error: 'The password needs at least 12 characters.' } }\n  }\n  const user = await registerUser(email, password)\n  return { status: 201, body: { id: user.id, email: user.email } }\n}\n\nexport async function me(authorization: string | undefined): Promise<Reply> {\n  const user = await currentUser(bearerToken(authorization))\n  if (!user) return { status: 401, body: { error: 'Not signed in.' } }\n  return { status: 200, body: { id: user.id, email: user.email } }\n}\n\nexport function stats(): Reply {\n  return { status: 200, body: { users: userCount() } }\n}\n\nexport const routes = {\n  'POST /users': signUp,\n  'GET /users/me': me,\n  'GET /users/stats': stats,\n}\nexport default routes\n",
    "structuredPatch": [
      {
        "oldStart": 1,
        "oldLines": 3,
        "newStart": 1,
        "newLines": 4,
        "lines": [
          "+// Users API.",
          " // The user API: sign up and read your own profile.",
          " import { bearerToken, currentUser, registerUser, userCount } from '../auth/login'",
          " "
        ]
      }
    ],
    "originalFile": "// The user API: sign up and read your own profile.\nimport { bearerToken, currentUser, registerUser, userCount } from '../auth/login'\n\nexport type Reply = { status: number; body: unknown }\n\nconst EMAIL = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/\n\nexport async function signUp(body: { email?: unknown; password?: unknown }): Promise<Reply> {\n  const { email, password } = body\n  if (typeof email !== 'string' || !EMAIL.test(email)) {\n    return { status: 400, body: { error: 'A valid email is required.' } }\n  }\n  if (typeof password !== 'string' || password.length < 12) {\n    return { status: 400, body: { error: 'The password needs at least 12 characters.' } }\n  }\n  const user = await registerUser(email, password)\n  return { status: 201, body: { id: user.id, email: user.email } }\n}\n\nexport async function me(authorization: string | undefined): Promise<Reply> {\n  const user = await currentUser(bearerToken(authorization))\n  if (!user) return { status: 401, body: { error: 'Not signed in.' } }\n  return { status: 200, body: { id: user.id, email: user.email } }\n}\n\nexport function stats(): Reply {\n  return { status: 200, body: { users: userCount() } }\n}\n\nexport const routes = {\n  'POST /users': signUp,\n  'GET /users/me': me,\n  'GET /users/stats': stats,\n}\nexport default routes\n",
    "userModified": false
  }
}
