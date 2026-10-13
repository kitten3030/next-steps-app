import { describe, expect, test } from 'claude-code/testing'

const PLUGIN = 'next-steps-app'
const LONG_ANSWER = 'x'.repeat(200)

type Fork = { isAnswered: true; text: string; usage: never }

// `$` and `on` are the test kit's; their full types are long, and the tests
// only use the few calls below.
type Kit = any

function fork(on: Kit, text: string, commands: { name: string }[] = []): void {
  on('turn.complete', async () => ({ text: '' }))
  on('model.fork', async () => ({ value: { isAnswered: true, text, usage: {} } as unknown as Fork }))
  on('command.list', async () => ({
    value: commands.map(c => ({ name: c.name, description: 'd', source: 'plugin' })),
  }))
  // Nothing beneath the plugin draws the band; an empty box stands for the engine's own.
  on('ui.render', async ($$: Kit, e: Kit) => {
    const { Box } = $$.ui.resolve(e)
    return (globalThis as Kit).h(Box, {})
  })
  on('ui.log', async () => ({ value: undefined as never }))
}

async function complete($: Kit, answer = LONG_ANSWER, turnId = 't1'): Promise<void> {
  await $.turn.complete({ reason: 'answer', answer, durationMs: 1, isAborted: false, turnId })
}

// The suggestions are asked for detached from the turn, so give the fork's
// promise chain a few ticks, then read what the band draws.
async function band($: Kit): Promise<string[]> {
  for (let i = 0; i < 50; i++) await Promise.resolve()
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80 },
  })
  const buttons = await ui.findAll({ type: 'Button' })
  await ui.unmount()
  return buttons.map((b: { text?: string }) => b.text ?? '')
}

const items = (...prompts: string[]) =>
  JSON.stringify(prompts.map(p => ({ label: p, prompt: p })))

describe('parseSuggestions', () => {
  test('keeps at most three suggestions, plus the dismiss row', async ($: Kit, on: Kit) => {
    fork(on, items('one', 'two', 'three', 'four'))
    await complete($)
    const texts = await band($)
    expect(texts.length).toBe(4)
    expect(texts[0]).toContain('one')
    expect(texts[2]).toContain('three')
    expect(texts.join('|')).not.toContain('four')
  })

  test('finds the JSON array inside surrounding prose', async ($: Kit, on: Kit) => {
    fork(on, `Sure! ${items('run the tests')} Hope that helps.`)
    await complete($)
    expect((await band($))[0]).toContain('run the tests')
  })

  test('shows nothing for a reply that is not a JSON array', async ($: Kit, on: Kit) => {
    fork(on, 'no list here')
    await complete($)
    expect(await band($)).toEqual([])
  })

  test('falls back to the prompt when the label is missing', async ($: Kit, on: Kit) => {
    fork(on, JSON.stringify([{ prompt: 'commit the changes' }, { label: 'x' }]))
    await complete($)
    const texts = await band($)
    expect(texts[0]).toContain('commit the changes')
    expect(texts.length).toBe(2)
  })

  test('drops a slash prompt that names an unknown command', async ($: Kit, on: Kit) => {
    fork(on, items('/ghost now', '/real now', 'plain prompt'), [{ name: 'real' }])
    await complete($)
    const joined = (await band($)).join('|')
    expect(joined).not.toContain('ghost')
    expect(joined).toContain('/real now')
    expect(joined).toContain('plain prompt')
  })
})

describe('clean', () => {
  test('strips escape sequences, control characters and extra spaces', async ($: Kit, on: Kit) => {
    fork(on, JSON.stringify([{ label: '\u001b[31mred\u001b[0m\u0007   text\n\tend', prompt: 'p' }]))
    await complete($)
    const first = (await band($))[0] ?? ''
    expect(first).toContain('red text end')
    expect(first).not.toContain('\u001b')
  })

  test('refuses text that carries Unicode tag characters', async ($: Kit, on: Kit) => {
    const hidden = 'hi' + String.fromCodePoint(0xe0041)
    fork(on, JSON.stringify([{ label: 'ok', prompt: hidden }, { label: 'fine', prompt: 'fine' }]))
    await complete($)
    const texts = await band($)
    expect(texts.length).toBe(2)
    expect(texts[0]).toContain('fine')
  })

  test('cuts a long label to 48 characters with an ellipsis', async ($: Kit, on: Kit) => {
    fork(on, JSON.stringify([{ label: 'a'.repeat(100), prompt: 'p' }]))
    await complete($)
    const first = (await band($))[0] ?? ''
    expect(first).toContain('a'.repeat(47) + '…')
    expect(first).not.toContain('a'.repeat(48))
  })
})

describe('options', () => {
  test('skips suggestions after an answer shorter than minAnswerChars', async ($: Kit, on: Kit) => {
    fork(on, items('one'))
    await complete($, 'short')
    expect(await band($)).toEqual([])
  })
})
