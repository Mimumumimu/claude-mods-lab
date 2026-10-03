// usage-meter: keeps context usage and plan limits in view.
// - Status line under the prompt: always shows one short line
// - /meter: prints the same line on demand

import type { EngineInterface, Register, SessionUsage } from 'claude-code'

const LABELS: Record<string, string> = { five_hour: 'セッション', seven_day: '今週' }

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

// five_hour shows the time of day it resets (0:00); every other window shows the time left (5D3H)
function resetText(kind: string, resetsAt: string | undefined): string {
  if (resetsAt == null) return ''
  const at = new Date(resetsAt)
  const minutes = Math.round((at.getTime() - Date.now()) / 60000)
  if (isNaN(minutes) || !(minutes > 0)) return ''
  if (kind === 'five_hour') {
    return ' (リセット ' + at.getHours() + ':' + pad(at.getMinutes()) + ')'
  }
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  const text = d ? d + 'D' + (h ? h + 'H' : '') : h ? h + 'H' : m + 'M'
  return ' (リセット' + text + ')'
}

function full(u: SessionUsage | null): string {
  if (!u) return 'まだ計測されていません'
  const parts: string[] = []
  if (u.context && u.context.percent != null) {
    parts.push('会話' + Math.round(u.context.percent) + '%')
  }
  for (const r of u.rateLimits || []) {
    parts.push((LABELS[r.kind] || r.kind) + ' ' + Math.round(r.percentUsed) + '%' + resetText(r.kind, r.resetsAt))
  }
  return parts.join(' | ')
}

// Pins the latest numbers as the status line under the prompt
async function refresh($: EngineInterface): Promise<void> {
  try {
    $.ui.status(full(await $.session.usage()))
  } catch (err) {
    // keep the old line if the read fails
  }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'meter',
      description: '会話の長さとレート制限を表示',
    })
    await refresh($)
    return next(e)
  })

  // After each turn, and whenever a plan limit's percent used changes
  on('session.measure', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('command.run', { command: 'meter' }, async ($) => {
    let u: SessionUsage | null = null
    try {
      u = await $.session.usage()
    } catch (err) {
      // fall through with nothing
    }
    return { text: full(u) }
  })
}
