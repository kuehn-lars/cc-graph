// Small helpers shared by the tests.

export const email = (n: number) => `user${n}@example.com`

export const password = 'correct horse battery'

export function bearer(token: string): string {
  return `Bearer ${token}`
}

export async function times<T>(count: number, run: (i: number) => Promise<T>): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < count; i++) results.push(await run(i))
  return results
}

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))
