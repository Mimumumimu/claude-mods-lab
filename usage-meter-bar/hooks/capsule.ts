// SVG capsules for the AbovePrompt band. Pure functions: no engine calls.

export type Tone = 'green' | 'purple' | 'red' | 'blue' | 'yellow' | 'gray'

const COLORS: Record<Tone, string> = {
  green: '#22c55e',
  purple: '#a855f7',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  gray: '#8b8f99',
}

export type Icon = 'meter' | 'calendar' | 'clock' | 'up' | 'down' | 'stack' | 'coin' | 'cloud' | 'laptop'

const H = 24
const FONT = 'font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="12" font-weight="600"'
// Text width is estimated (an SVG cannot measure itself): digits and most letters at 12px
const CHAR_W = 7

function textW(s: string): number {
  return Math.ceil(s.length * CHAR_W)
}

// 14x14 icons drawn at (x, 5)
function icon(kind: Icon, x: number, c: string): string {
  const g = (body: string) =>
    '<g transform="translate(' + x + ' 5)" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</g>'
  switch (kind) {
    case 'meter':
      return g('<path d="M2 11a6 6 0 1 1 10 0"/><path d="M7 8l2.5-3"/>')
    case 'calendar':
      return g('<rect x="1.5" y="2.5" width="11" height="10" rx="2"/><path d="M1.5 6h11M4.5 1v3M9.5 1v3"/>')
    case 'clock':
      return g('<circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.2l2 1.3"/>')
    case 'up':
      return g('<path d="M7 12V2M3 6l4-4 4 4"/>')
    case 'down':
      return g('<path d="M7 2v10M3 8l4 4 4-4"/>')
    case 'stack':
      return g('<path d="M7 1.5l5.5 3L7 7.5 1.5 4.5z"/><path d="M1.5 7.5L7 10.5l5.5-3"/><path d="M1.5 10l5.5 3 5.5-3"/>')
    case 'cloud':
      return g('<path d="M4 11.5a3 3 0 0 1-.3-6A4 4 0 0 1 11.4 5a3.2 3.2 0 0 1-.4 6.5z"/>')
    case 'laptop':
      return g('<rect x="2.5" y="2.5" width="9" height="7" rx="1"/><path d="M1 12h12"/>')
    case 'coin':
      return g('<circle cx="7" cy="7" r="5.5"/><path d="M7 4v6M5.2 5.6c0-1 3.6-1 3.6 0s-3.6 1-3.6 2.2 3.6 1.2 3.6 0"/>')
  }
}

type Part =
  | { t: 'icon'; icon: Icon }
  | { t: 'text'; text: string; slot?: number }
  | { t: 'bar'; percent: number }
  | { t: 'sep' }

export const text = (s: string, slot?: number): Part => ({ t: 'text', text: s, slot })
export const iconPart = (i: Icon): Part => ({ t: 'icon', icon: i })
export const bar = (percent: number): Part => ({ t: 'bar', percent })
export const sep: Part = { t: 'sep' }

const BAR_W = 56

export type Capsule = { source: string; width: number; height: number }

export function capsule(tone: Tone, parts: Part[]): Capsule {
  const c = COLORS[tone]
  const PAD = 10
  const GAP = 6
  let x = PAD
  let body = ''
  parts.forEach((p, i) => {
    if (i > 0) x += GAP
    if (p.t === 'icon') {
      body += icon(p.icon, x, c)
      x += 14
    } else if (p.t === 'text') {
      body += '<text x="' + x + '" y="16" fill="' + c + '" ' + FONT + '>' + esc(p.text) + '</text>'
      x += p.slot != null ? p.slot : textW(p.text)
    } else if (p.t === 'bar') {
      const pct = Math.max(0, Math.min(100, p.percent))
      const fillW = Math.round((BAR_W * pct) / 100)
      body += '<rect x="' + x + '" y="10" width="' + BAR_W + '" height="4" rx="2" fill="' + c + '" fill-opacity="0.25"/>'
      if (fillW > 0) body += '<rect x="' + x + '" y="10" width="' + Math.max(fillW, 4) + '" height="4" rx="2" fill="' + c + '"/>'
      // the vertical tick: the halfway mark
      body += '<rect x="' + (x + BAR_W / 2 - 0.5) + '" y="7" width="1" height="10" fill="' + c + '" fill-opacity="0.7"/>'
      x += BAR_W
    } else {
      body += '<rect x="' + x + '" y="6" width="1" height="12" fill="' + c + '" fill-opacity="0.4"/>'
      x += 1
    }
  })
  const width = x + PAD
  const source =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + H + '" viewBox="0 0 ' + width + ' ' + H + '">' +
    '<rect width="' + width + '" height="' + H + '" rx="' + H / 2 + '" fill="' + c + '" fill-opacity="0.16"/>' +
    body +
    '</svg>'
  return { source, width, height: H }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 15600 -> 15.6k, 954200 -> 954.2k, 1200000 -> 1.2M
export function compact(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 1000000) return (n / 1000).toFixed(1) + 'k'
  return (n / 1000000).toFixed(1) + 'M'
}

// 2h 40m, 1d 7h, 35m; '' when unknown or already past
export function remaining(resetsAt: string | undefined, now: number): string {
  if (resetsAt == null) return ''
  const minutes = Math.round((new Date(resetsAt).getTime() - now) / 60000)
  if (isNaN(minutes) || !(minutes > 0)) return ''
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  if (d) return d + 'd ' + h + 'h'
  if (h) return h + 'h ' + m + 'm'
  return m + 'm'
}
