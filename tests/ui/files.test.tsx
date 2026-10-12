import { expect, test } from 'claude-code/testing'
import { SURFACES, mount, node, seed, start, ui } from './kit'

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
const drawn = async (pane: any): Promise<string[]> => (await pane.findAll({ type: 'Text' })).map((r: any) => r.text)

/** The file rows' widths as drawn: a Button with a hotkey draws "N: " (3 columns) before its text. */
const rowWidths = async (pane: any) => {
  const buttons = (await pane.findAll({ type: 'Button' })).filter((b: any) => !b.key.startsWith('view-'))
  return (await rows(pane)).map((r, i) => cols(r) + (buttons[i].props.hotkey ? 3 : 0))
}

test('F08-AC3 at bodyColumns 40, no drawn row is wider than 40 columns, its "N: " label counted', async ($, on) => {
  ui(on)
  seed(on,
    node('src/middleware/rateLimit.ts', 1, { change: 'created', added: 12 }),
    node('src/auth/a-very-long-directory-name/sessions.ts', 2, { change: 'edited', added: 3, removed: 1 }),
    node('docs/日本語のドキュメント/設計書.md', 3, { tokens: null, seen: 'image' }),
    node('a.ts', 4),
    ...Array.from({ length: 7 }, (_, i) => node(`src/some/deep/folder/file-number-${i}.ts`, 5 + i, { change: 'edited', added: 30, removed: 10 })),
  )
  await start($)
  const pane = await mount($, 'terminal', 40)
  const widths = await rowWidths(pane)
  expect(widths).toHaveLength(11)
  for (const w of widths) expect(w).toBeLessThanOrEqual(40)
})

for (const bodyColumns of [20, 30, 40]) {
  test(`F08-R6 at bodyColumns ${bodyColumns} the header (view buttons, "Files", "Nothing read yet.") is not wider than the pane`, async ($, on) => {
    ui(on)
    await start($)
    const pane = await mount($, 'terminal', bodyColumns)
    // The two view Buttons share one row, each drawing "l: " / "g: " (3 columns) before its label.
    const buttons = (await pane.findAll({ type: 'Button' })).filter((b: any) => b.key.startsWith('view-'))
    expect(buttons).toHaveLength(2)
    expect(buttons.reduce((w: number, b: any) => w + cols(b.text) + 3, 0)).toBeLessThanOrEqual(bodyColumns)
    for (const t of await drawn(pane)) expect(cols(t)).toBeLessThanOrEqual(bodyColumns)
  })
}

test('F08-AC10 at bodyColumns 30, rateLimit.ts shows a path that starts with "…" and ends with rateLimit.ts', async ($, on) => {
  ui(on)
  seed(on, node('src/middleware/rateLimit.ts', 1, { change: 'created', added: 12 }))
  await start($)
  const r = (await rows(await mount($, 'terminal', 30)))[0] ?? ''
  expect(r.slice(2).split('  ')[0]).toMatch(/^….*rateLimit\.ts$/)
  expect(cols(r)).toBeLessThanOrEqual(30)
})

/** What the mod wrote to state: every `state.set`, by key. */
function writes(on: any) {
  const seen: { key: string; value: any }[] = []
  on('state.set', (_$: any, e: any, next: any) => (seen.push({ key: e.key, value: e.value }), next(e)))
  return seen
}
/** The row Buttons, in drawn order: the ones not keyed `view-*`. */
const rowButtons = async (pane: any) => (await pane.findAll({ type: 'Button' })).filter((b: any) => !b.key.startsWith('view-'))

test('F08-AC6 pressing 3 sets selected to the third file row path', async ($, on) => {
  ui(on)
  seed(on, node('a.ts', 1), node('b.ts', 2), node('c.ts', 3), node('d.ts', 4))
  const seen = writes(on)
  await start($)
  const pane = await mount($, 'terminal')
  const third = (await rowButtons(pane)).find((b: any) => b.props.hotkey === '3')
  expect(third?.key).toBe('b.ts')
  await pane.press({ key: third.key })
  expect(seen).toEqual([{ key: 'selected', value: 'b.ts' }])
})

test('F08-AC9 pressing the row Button keyed src/auth/login.ts sets selected to src/auth/login.ts', async ($, on) => {
  ui(on)
  seed(on, node('src/auth/login.ts', 1), node('src/config.ts', 2))
  const seen = writes(on)
  await start($)
  const pane = await mount($, 'terminal')
  await pane.press({ key: 'src/auth/login.ts' })
  // D3: the press writes `selected` and nothing else, `graph` least of all.
  expect(seen).toEqual([{ key: 'selected', value: 'src/auth/login.ts' }])
})

test('NFR-A2 each of 1 to 9 is pressed by a UI test; only the first nine rows carry a hotkey', async ($, on) => {
  ui(on)
  seed(on, ...Array.from({ length: 11 }, (_, i) => node(`f${i + 1}.ts`, i + 1)))
  const seen = writes(on)
  await start($)
  const pane = await mount($, 'terminal')
  const buttons = await rowButtons(pane)
  expect(buttons.map((b: any) => b.props.hotkey)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', undefined, undefined])
  for (const k of '123456789') await pane.press({ key: buttons.find((b: any) => b.props.hotkey === k).key })
  expect(seen.map(w => w.value)).toEqual(['f11.ts', 'f10.ts', 'f9.ts', 'f8.ts', 'f7.ts', 'f6.ts', 'f5.ts', 'f4.ts', 'f3.ts'])
})

test('F08-R8 each row is a plain Button, and a hotkey row still fits bodyColumns with its "1: " label', async ($, on) => {
  ui(on)
  seed(on, node('src/auth/a-very-long-directory-name/sessions.ts', 1, { change: 'edited', added: 3, removed: 1 }))
  await start($)
  const pane = await mount($, 'terminal', 30)
  const [b] = await rowButtons(pane)
  expect(b?.props.plain).toBe(true)
  // A plain Button draws "1: " before its text, so the text gets 3 columns less.
  for (const r of await rows(pane)) expect(cols(r) + 3).toBeLessThanOrEqual(30)
})

/** The marker slot at the front of each file row: "▸ " on the selected one, two spaces on the rest. */
const slots = async (pane: any): Promise<string[]> =>
  (await pane.findAll({ type: 'Text', text: /^(▸| ) $/ })).map((t: any) => t.text)

test('F08-AC11 after pressing 3 only the third row begins with the marker; pressing 1 moves it to the first', async ($, on) => {
  ui(on)
  seed(on, node('a.ts', 1), node('b.ts', 2), node('c.ts', 3), node('d.ts', 4))
  await start($)
  const pane = await mount($, 'terminal')
  expect(await slots(pane)).toEqual(['  ', '  ', '  ', '  '])
  const press = async (hotkey: string) =>
    pane.press({ key: (await rowButtons(pane)).find((b: any) => b.props.hotkey === hotkey).key })
  await press('3')
  expect(await slots(pane)).toEqual(['  ', '  ', '▸ ', '  '])
  await press('1')
  expect(await slots(pane)).toEqual(['▸ ', '  ', '  ', '  '])
})
