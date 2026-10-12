import { expect, test } from 'claude-code/testing'
import { PANE_ID, SURFACES, node, paneProps, seed, ui } from './kit'

const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })
const mount = ($: any, surface: any) =>
  $.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: PANE_ID, props: paneProps() })
/** The file rows: Text elements that begin with a state glyph. */
const rows = async (pane: any): Promise<string[]> =>
  (await pane.findAll({ type: 'Text', text: /^[●◐◌○!⋯] / })).map((r: any) => r.text)

// DERIVED: only F02 produces `search`, so the graph is seeded as it stands after step 6 of the reference session
// (touched order: routes, login, password, sessions, redis, config, rateLimit). F02's tickets switch this to a replay.
for (const surface of SURFACES) {
  test(`F08-AC2 after steps 1 to 6 the Files section lists the rows newest first on ${surface}`, async ($, on) => {
    ui(on)
    seed(on,
      node('src/routes/index.ts', 1, { state: 'partial' }),
      node('src/auth/login.ts', 3),
      node('src/auth/password.ts', 4, { state: 'search' }),
      node('src/auth/sessions.ts', 5),
      node('src/db/redis.ts', 6),
      node('src/config.ts', 7),
      node('src/middleware/rateLimit.ts', 8, { change: 'created', added: 12 }),
    )
    await start($)
    const got = (await rows(await mount($, surface))).map(r => r.split('  ')[0])
    expect(got).toEqual([
      '● src/middleware/rateLimit.ts', '● src/config.ts', '● src/db/redis.ts', '● src/auth/sessions.ts',
      '◌ src/auth/password.ts', '● src/auth/login.ts', '◐ src/routes/index.ts',
    ])
  })
}

test('NFR-A1 each of the six states shows its glyph and each of the four changes its badge word', async ($, on) => {
  ui(on)
  seed(on,
    node('a/ghost', 1, { state: 'ghost' }),
    node('a/search', 2, { state: 'search' }),
    node('a/partial', 3, { state: 'partial' }),
    node('a/read', 4),
    node('a/compacted', 5, { state: 'compacted' }),
    node('a/unread', 6, { state: 'unread' }),
    node('b/edited', 7, { change: 'edited', added: 3, removed: 1 }),
    node('b/created', 8, { change: 'created', added: 12 }),
    node('b/external', 9, { change: 'external' }),
    node('b/blind', 10, { change: 'blind' }),
  )
  await start($)
  const got = await rows(await mount($, 'terminal'))
  const row = (p: string) => got.find(r => r.includes(` ${p}`))
  for (const [p, glyph] of [['ghost', '⋯'], ['search', '◌'], ['partial', '◐'], ['read', '●'], ['compacted', '○'], ['unread', '!']])
    expect(row(`a/${p}`)?.startsWith(`${glyph} `)).toBe(true)
  expect(row('b/edited')).toContain('edited +3 −1')
  expect(row('b/created')).toContain('created +12')
  expect(row('b/external')).toContain('external')
  expect(row('b/blind')).toContain('blind')
})

test('F08-R5 a row reads "≈tokens · seen", and "≈?" when tokens is null', async ($, on) => {
  ui(on)
  seed(on, node('a.ts', 1, { tokens: 414, seen: '49 lines' }), node('b.png', 2, { tokens: null, seen: 'image' }))
  await start($)
  const [b, a] = await rows(await mount($, 'terminal'))
  expect(b).toContain('b.png')
  expect(b).toContain('≈? · image')
  expect(a).toContain('a.ts')
  expect(a).toContain('≈414 · 49 lines')
})

/** Terminal columns of a string: 2 for CJK and fullwidth, 1 otherwise. Written apart from the code under test. */
const cols = (s: string) => [...s].reduce((w, c) => w + (/[ᄀ-ᅟ⺀-꓏가-힣＀-｠]/.test(c) ? 2 : 1), 0)
const mountAt = ($: any, bodyColumns: number) =>
  $.ui.mount({ plugin: 'cc-graph', surface: 'terminal', component: 'Pane', requestId: PANE_ID, props: paneProps(bodyColumns) })
const drawn = async (pane: any): Promise<string[]> => (await pane.findAll({ type: 'Text' })).map((r: any) => r.text)

test('F08-AC3 at bodyColumns 40, no drawn row is wider than 40 columns', async ($, on) => {
  ui(on)
  seed(on,
    node('src/middleware/rateLimit.ts', 1, { change: 'created', added: 12 }),
    node('src/auth/a-very-long-directory-name/sessions.ts', 2, { change: 'edited', added: 3, removed: 1 }),
    node('docs/日本語のドキュメント/設計書.md', 3, { tokens: null, seen: 'image' }),
    node('a.ts', 4),
  )
  await start($)
  const got = await drawn(await mountAt($, 40))
  expect(got.length).toBeGreaterThan(4)
  for (const r of got) expect(cols(r)).toBeLessThanOrEqual(40)
})

test('F08-AC10 at bodyColumns 30, rateLimit.ts shows a path that starts with "…" and ends with rateLimit.ts', async ($, on) => {
  ui(on)
  seed(on, node('src/middleware/rateLimit.ts', 1, { change: 'created', added: 12 }))
  await start($)
  const r = (await rows(await mountAt($, 30)))[0] ?? ''
  expect(r.slice(2).split('  ')[0]).toMatch(/^….*rateLimit\.ts$/)
  expect(cols(r)).toBeLessThanOrEqual(30)
})
