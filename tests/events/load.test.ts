import { expect, test } from 'claude-code/testing'

// No criterion yet: `claude plugin test` exits 1 on an empty suite. Delete with the first real test.
test('M0 placeholder: the test kit runs', async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  expect(await $.session.start({ cwd: '/work', surface: null, isInteractive: false })).toEqual({ cwd: '/work' })
})
