export default {
  "tool": "Edit",
  "tool_use_id": "toolu_01A34JMYzUuhNWVRZqhUUT9v",
  "input": {
    "replace_all": true,
    "file_path": "/private/tmp/claude-501/rec-k0nL/sample-app/src/auth/login.ts",
    "old_string": "users",
    "new_string": "accounts"
  },
  "result": {
    "filePath": "/private/tmp/claude-501/rec-k0nL/sample-app/src/auth/login.ts",
    "oldString": "users",
    "newString": "accounts",
    "originalFile": "// Login and logout: checks a password, then opens or closes a session.\nimport { hashPassword, verifyPassword } from './password'\nimport { createSession, endSession, userForSession } from './sessions'\n\nexport type User = { id: string; email: string; passwordHash: string }\n\nexport type LoginResult =\n  | { ok: true; token: string; user: User }\n  | { ok: false; reason: 'unknown-user' | 'wrong-password' }\n\nconst users = new Map<string, User>()\n\nexport async function registerUser(email: string, password: string): Promise<User> {\n  const id = `u${users.size + 1}`\n  const user = { id, email: email.toLowerCase(), passwordHash: await hashPassword(password) }\n  users.set(user.email, user)\n  return user\n}\n\nexport async function login(email: string, password: string): Promise<LoginResult> {\n  const user = users.get(email.toLowerCase())\n  if (!user) return { ok: false, reason: 'unknown-user' }\n  if (!(await verifyPassword(password, user.passwordHash))) {\n    return { ok: false, reason: 'wrong-password' }\n  }\n  const token = await createSession(user.id)\n  return { ok: true, token, user }\n}\n\nexport async function logout(token: string): Promise<void> {\n  await endSession(token)\n}\n\nexport async function currentUser(token: string): Promise<User | null> {\n  const id = await userForSession(token)\n  if (id === null) return null\n  for (const user of users.values()) {\n    if (user.id === id) return user\n  }\n  return null\n}\n\nexport function bearerToken(header: string | undefined): string {\n  if (!header) return ''\n  const [scheme, token] = header.split(' ')\n  return scheme === 'Bearer' && token ? token : ''\n}\nexport const userCount = () => users.size\n",
    "structuredPatch": [
      {
        "oldStart": 8,
        "oldLines": 17,
        "newStart": 8,
        "newLines": 17,
        "lines": [
          "   | { ok: true; token: string; user: User }",
          "   | { ok: false; reason: 'unknown-user' | 'wrong-password' }",
          " ",
          "-const users = new Map<string, User>()",
          "+const accounts = new Map<string, User>()",
          " ",
          " export async function registerUser(email: string, password: string): Promise<User> {",
          "-  const id = `u${users.size + 1}`",
          "+  const id = `u${accounts.size + 1}`",
          "   const user = { id, email: email.toLowerCase(), passwordHash: await hashPassword(password) }",
          "-  users.set(user.email, user)",
          "+  accounts.set(user.email, user)",
          "   return user",
          " }",
          " ",
          " export async function login(email: string, password: string): Promise<LoginResult> {",
          "-  const user = users.get(email.toLowerCase())",
          "+  const user = accounts.get(email.toLowerCase())",
          "   if (!user) return { ok: false, reason: 'unknown-user' }",
          "   if (!(await verifyPassword(password, user.passwordHash))) {",
          "     return { ok: false, reason: 'wrong-password' }"
        ]
      },
      {
        "oldStart": 34,
        "oldLines": 7,
        "newStart": 34,
        "newLines": 7,
        "lines": [
          " export async function currentUser(token: string): Promise<User | null> {",
          "   const id = await userForSession(token)",
          "   if (id === null) return null",
          "-  for (const user of users.values()) {",
          "+  for (const user of accounts.values()) {",
          "     if (user.id === id) return user",
          "   }",
          "   return null"
        ]
      },
      {
        "oldStart": 45,
        "oldLines": 4,
        "newStart": 45,
        "newLines": 4,
        "lines": [
          "   const [scheme, token] = header.split(' ')",
          "   return scheme === 'Bearer' && token ? token : ''",
          " }",
          "-export const userCount = () => users.size",
          "+export const userCount = () => accounts.size"
        ]
      }
    ],
    "userModified": false,
    "replaceAll": true
  }
}
