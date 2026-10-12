// The user API: sign up and read your own profile.
import { bearerToken, currentUser, registerUser, userCount } from '../auth/login'

export type Reply = { status: number; body: unknown }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function signUp(body: { email?: unknown; password?: unknown }): Promise<Reply> {
  const { email, password } = body
  if (typeof email !== 'string' || !EMAIL.test(email)) {
    return { status: 400, body: { error: 'A valid email is required.' } }
  }
  if (typeof password !== 'string' || password.length < 12) {
    return { status: 400, body: { error: 'The password needs at least 12 characters.' } }
  }
  const user = await registerUser(email, password)
  return { status: 201, body: { id: user.id, email: user.email } }
}

export async function me(authorization: string | undefined): Promise<Reply> {
  const user = await currentUser(bearerToken(authorization))
  if (!user) return { status: 401, body: { error: 'Not signed in.' } }
  return { status: 200, body: { id: user.id, email: user.email } }
}

export function stats(): Reply {
  return { status: 200, body: { users: userCount() } }
}

export const routes = {
  'POST /users': signUp,
  'GET /users/me': me,
  'GET /users/stats': stats,
}
export default routes
