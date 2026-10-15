import cat from '../../fixtures/tool-results/bash-cat'
import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { engine, nodeOf, replay, start, turn } from '../events/kit'
import { mount, node, seed, start as startUi, ui } from '../ui/kit'

const off = { options: { blindSpots: false } }
const edit = reference.events.find(e => e.event === 'tool.call' && (e.input as any).tool === 'Edit' && (e.result as any).result?.filePath)!
const runs = (on: any) => {
  const seen: string[][] = []
  on('process.run', (_$: any, e: any) => (seen.push([...e.argv]), { value: { exitCode: 0, stdout: '', stderr: '' } }))
  return seen
}

test('F07-AC26 with blindSpots off, an Edit, npm pkg set and cat raise no process.run, and cat still reads', off, async ($, on) => {
  const clock = mock.clock(on)
  const seen = runs(on)
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  const answer: any = engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: { ...(edit.result as any).result, filePath: '/w/src/auth/login.ts' } })
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Edit', file_path: '/w/src/auth/login.ts', old_string: 'a', new_string: 'b' }); await clock.advance(50)
  Object.assign(answer, { result: { stdout: '', stderr: '', interrupted: false } })
  await $.tool.call({ tool: 'Bash', command: 'npm pkg set description=probe' }); await clock.advance(50)
  Object.assign(answer, { result: cat.result, text: cat.text })
  await $.tool.call({ tool: 'Bash', command: 'cat src/auth/login.ts' }); await clock.advance(50)
  expect(seen).toEqual([])
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'read' })
})

test('F07-AC26 with blindSpots off, the list has no Blind spots section', off, async ($, on) => {
  ui(on); seed(on, node('src/a.ts', 1, { change: 'blind', reason: 'changed by `npm i`' }))
  await startUi($)
  const pane = await mount($, 'terminal')
  expect(await pane.findAll({ type: 'Text', text: /Blind spots|No blind spots|changed by/ })).toEqual([])
})

test('F14-AC4 with blindSpots off, a replay of the reference session raises no process.run', off, async ($, on) => {
  const clock = mock.clock(on)
  const seen = runs(on)
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  await replay($, on, 13); await clock.advance(100)
  expect(seen).toEqual([])
})
