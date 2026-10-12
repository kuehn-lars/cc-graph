export default {
  "tool": "Read",
  "tool_use_id": "toolu_01AhgkpU6fFS335FgcJSoaJ3",
  "input": {
    "file_path": "/private/tmp/claude-501/rec-k0nL/sample-app/src/auth/login.ts"
  },
  "result": {
    "type": "text",
    "file": {
      "filePath": "/private/tmp/claude-501/rec-k0nL/sample-app/src/auth/login.ts",
      "content": "// Login and logout: checks a password, then opens or closes a session.\nimport { hashPassword, verifyPassword } from './password'\nimport { createSession, endSession, userForSession } from './sessions'\n\nexport type User = { id: string; email: string; passwordHash: string }\n\nexport type LoginResult =\n  | { ok: true; token: string; user: User }\n  | { ok: false; reason: 'unknown-user' | 'wrong-password' }\n\nconst users = new Map<string, User>()\n\nexport async function registerUser(email: string, password: string): Promise<User> {\n  const id = `u${users.size + 1}`\n  const user = { id, email: email.toLowerCase(), passwordHash: await hashPassword(password) }\n  users.set(user.email, user)\n  return user\n}\n\nexport async function login(email: string, password: string): Promise<LoginResult> {\n  const user = users.get(email.toLowerCase())\n  if (!user) return { ok: false, reason: 'unknown-user' }\n  if (!(await verifyPassword(password, user.passwordHash))) {\n    return { ok: false, reason: 'wrong-password' }\n  }\n  const token = await createSession(user.id)\n  return { ok: true, token, user }\n}\n\nexport async function logout(token: string): Promise<void> {\n  await endSession(token)\n}\n\nexport async function currentUser(token: string): Promise<User | null> {\n  const id = await userForSession(token)\n  if (id === null) return null\n  for (const user of users.values()) {\n    if (user.id === id) return user\n  }\n  return null\n}\n\nexport function bearerToken(header: string | undefined): string {\n  if (!header) return ''\n  const [scheme, token] = header.split(' ')\n  return scheme === 'Bearer' && token ? token : ''\n}\nexport const userCount = () => users.size\n",
      "numLines": 49,
      "startLine": 1,
      "totalLines": 49
    }
  }
}
