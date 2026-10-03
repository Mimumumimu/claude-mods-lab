// usage-meter-bar: plan limits, tokens and cost in view.
// - Desktop: a band above the prompt of rounded capsules (SVG)
// - Terminal: the same figures as one text line in the status line
// - /meter: prints the text line on demand

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snap, Tokens } from '../types'
import { bar, capsule, compact, iconPart, remaining, sep, text } from './capsule'
import type { Capsule } from './capsule'

const snapAtom = atom({ plugin: 'usage-meter-bar', key: 'snap' } as const, null)
const tokensAtom = atom({ plugin: 'usage-meter-bar', key: 'tokens' } as const, { input: 0, output: 0, cache: 0 })

// ---- terminal: the same figures as the band, as one text line ----

function line(snap: Snap | null, tokens: Tokens, now: number, isCloud: boolean): string {
  if (!snap) return 'まだ計測されていません'
  const parts: string[] = [isCloud ? 'Cloud' : 'Local']
  for (const r of snap.rateLimits) {
    const isFive = r.kind === 'five_hour'
    if (!isFive && r.kind !== 'seven_day') continue
    const left = remaining(r.resetsAt, now)
    parts.push((isFive ? '5h ' : '7d ') + Math.round(r.percentUsed) + '%' + (left ? ' (' + left + ')' : ''))
  }
  parts.push('↑' + compact(tokens.input) + ' ↓' + compact(tokens.output) + ' cache ' + compact(tokens.cache))
  if (snap.usd != null) parts.push('$' + snap.usd.toFixed(2))
  return parts.join(' | ')
}

async function isCloudSession($: EngineInterface): Promise<boolean> {
  // no API names where the engine runs; the cloud container sets this variable
  return (await $.env.get('CLAUDE_CODE_REMOTE')) === 'true'
}

// ---- desktop: the capsules ----

function capsules(snap: Snap, tokens: Tokens, now: number, isCloud: boolean): Capsule[] {
  const out: Capsule[] = []
  out.push(capsule('gray', [iconPart(isCloud ? 'cloud' : 'laptop'), text(isCloud ? 'Cloud' : 'Local')]))
  for (const r of snap.rateLimits) {
    const isFive = r.kind === 'five_hour'
    if (!isFive && r.kind !== 'seven_day') continue
    const left = remaining(r.resetsAt, now)
    const parts = [
      iconPart(isFive ? 'meter' : 'calendar'),
      text(isFive ? '5h' : '7d'),
      bar(r.percentUsed),
      text(Math.round(r.percentUsed) + '%', 28),
    ]
    if (left) parts.push(sep, iconPart('clock'), text(left))
    out.push(capsule(isFive ? 'green' : 'purple', parts))
  }
  out.push(capsule('red', [iconPart('up'), text(compact(tokens.input))]))
  out.push(capsule('green', [iconPart('down'), text(compact(tokens.output))]))
  out.push(capsule('blue', [iconPart('stack'), text(compact(tokens.cache))]))
  if (snap.usd != null) out.push(capsule('yellow', [iconPart('coin'), text('$' + snap.usd.toFixed(2))]))
  return out
}

async function refresh($: EngineInterface): Promise<void> {
  try {
    const u = await $.session.usage()
    const snap: Snap = {
      rateLimits: (u.rateLimits || []).map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
      usd: u.cost ? u.cost.usd : null,
    }
    await update($, snapAtom, () => snap)
    // the desktop draws the band; only a terminal gets the text line
    const surfaces = await $.session.surfaces()
    if (surfaces.includes('terminal')) {
      $.ui.status(line(snap, await read($, tokensAtom), await $.clock.now(), await isCloudSession($)))
    }
  } catch (err) {
    // keep the old figures if the read fails
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'meter',
      description: '使用量メーターを表示',
    })
    await refresh($)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  // Token counts have no session total in the API: add each turn's up
  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u) {
      await update($, tokensAtom, t => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cache: t.cache + u.cache_read_input_tokens + u.cache_creation_input_tokens,
      }))
    }
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'desktop') return next(e)
    const snap = await read($, snapAtom)
    if (snap === null) return next(e)
    const tokens = await read($, tokensAtom)
    const { Box, Svg } = $.ui.resolve(e)
    const now = await $.clock.now()
    const isCloud = await isCloudSession($)
    return (
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {capsules(snap, tokens, now, isCloud).map((c, i) => (
          <Svg key={'c' + i} source={c.source} alt="使用量" width={c.width} height={c.height} />
        ))}
      </Box>
    )
  })

  on('command.run', { command: 'meter' }, async ($) => {
    const snap = await read($, snapAtom)
    return { text: line(snap, await read($, tokensAtom), await $.clock.now(), await isCloudSession($)) }
  })
}
