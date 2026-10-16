import out from '../../fixtures/output/outputs'
import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { nodeOf, graphOf, observe, turn } from '../events/kit'
import { mount, ui } from '../ui/kit'

// RS-2, RS-3: the reference session's first process, step by step, with the queue drained after each call. `git` answers
// what each step left on disk: the statuses are the captures (fixtures/output), the one after step 8 joins them (DERIVED: no
// capture holds the Write and the Edit together), and `grep` answers the captured importers of login.ts.
const cwd = (reference.events[0]!.input as any).cwd as string
const npmInstall = out['git-status-after-npm-install'].stdout
const disk: Record<number, string> = { 6: '?? src/middleware/rateLimit.ts\0', 8: '?? src/middleware/rateLimit.ts\0 M src/auth/login.ts\0', 9: `${npmInstall} M src/auth/login.ts\0` }

async function upTo($: any, on: any, last: number) {
  const clock = mock.clock(on)
  ui(on)
  observe(on)
  let status = ''
  on('process.run', (_$: any, e: any) => {
    const [, sub, arg] = e.argv
    const stdout = sub === 'rev-parse' ? (arg === 'HEAD' ? `${'a'.repeat(40)}\n` : `${cwd}\n`) : sub === 'grep' ? out['git-grep-importers-login'].stdout : status
    return { value: { exitCode: sub === 'grep' && !e.argv.some((a: string) => a.includes('login')) ? 1 : 0, stdout, stderr: '' } }
  })
  let answer: any // each call answered with its own recorded result, nothing left over from the one before
  on('turn.start', (_$: any, e: any) => ({ turnId: e.turnId }))
  on('tool.call', () => answer)
  await $.session.start({ ...(reference.events[0]!.input as any) }); await clock.advance(50)
  await turn($); await clock.advance(50)
  for (const c of reference.events)
    if (c.event === 'tool.call' && c.process === 1 && c.step! <= last) {
      status = disk[c.step!] ?? status
      answer = c.result
      await $.tool.call(c.input); await clock.advance(50)
    }
}

test('RS-2 after step 8 and its queued work, api/users.ts is a ghost with a blind edge to login.ts, named in the footer; routes/index.ts has no blind mark', async ($, on) => {
  await upTo($, on, 8)
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ state: 'ghost' })
  const edges = (await graphOf())!.edges
  expect(edges).toContainEqual(expect.objectContaining({ from: 'src/api/users.ts', to: 'src/auth/login.ts', blind: true }))
  expect(edges.filter(e => e.from === 'src/routes/index.ts' && e.blind)).toEqual([])
  const pane = await mount($, 'terminal', 120)
  expect((await pane.findAll({ type: 'Text', text: /^src\/.*never opened$/ })).map((t: any) => t.text)).toEqual(['src/api/users.ts  imports login.ts, never opened'])
})

test('RS-3 after step 9, package.json and package-lock.json are unread and blind, naming the command; login.ts and rateLimit.ts carry no blind mark', async ($, on) => {
  await upTo($, on, 9)
  for (const p of ['package.json', 'package-lock.json'])
    expect(await nodeOf(p)).toMatchObject({ state: 'unread', change: 'blind', reason: 'changed by `npm install rate-limiter-flexible`' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited' })
  expect(await nodeOf('src/middleware/rateLimit.ts')).toMatchObject({ change: 'created' })
})
