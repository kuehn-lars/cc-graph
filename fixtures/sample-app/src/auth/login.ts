// Login and logout: checks a password, then opens or closes a session.
import { hashPassword, verifyPassword } from './password'
import { createSession, endSession, userForSession } from './sessions'

export type User = { id: string; email: string; passwordHash: string }

export type LoginResult =
  | { ok: true; token: string; user: User }
  | { ok: false; reason: 'unknown-user' | 'wrong-password' }

const users = new Map<string, User>()

export async function registerUser(email: string, password: string): Promise<User> {
  const id = `u${users.size + 1}`
  const user = { id, email: email.toLowerCase(), passwordHash: await hashPassword(password) }
  users.set(user.email, user)
  return user
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = users.get(email.toLowerCase())
  if (!user) return { ok: false, reason: 'unknown-user' }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, reason: 'wrong-password' }
  }
  const token = await createSession(user.id)
  return { ok: true, token, user }
}

export async function logout(token: string): Promise<void> {
  await endSession(token)
}

export async function currentUser(token: string): Promise<User | null> {
  const id = await userForSession(token)
  if (id === null) return null
  for (const user of users.values()) {
    if (user.id === id) return user
  }
  return null
}

export function bearerToken(header: string | undefined): string {
  if (!header) return ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token : ''
}
export const userCount = () => users.size
