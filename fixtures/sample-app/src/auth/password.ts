// Password hashing with PBKDF2 from the Web Crypto API.
const ITERATIONS = 100_000
const encoder = new TextEncoder()

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt)
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(hash).toString('hex')}`
}

// verify compares in constant time, so a wrong guess takes as long as a right one.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const hash = await derive(password, Buffer.from(saltHex, 'hex'))
  const expected = Buffer.from(hashHex, 'hex')
  let diff = hash.length ^ expected.length
  for (let i = 0; i < hash.length; i++) diff |= hash[i]! ^ (expected[i] ?? 0)
  return diff === 0
}
