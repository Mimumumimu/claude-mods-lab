import { describe, expect, test } from 'claude-code/testing'

import { capsule, compact, iconPart, remaining, text } from './capsule'

describe('capsule helpers', () => {
  test('compact', async () => {
    expect(compact(15600)).toBe('15.6k')
    expect(compact(954200)).toBe('954.2k')
    expect(compact(12)).toBe('12')
  })

  test('remaining', async () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(remaining('2026-01-01T02:40:00Z', now)).toBe('2h 40m')
    expect(remaining('2026-01-02T07:00:00Z', now)).toBe('1d 7h')
    expect(remaining(undefined, now)).toBe('')
    expect(remaining('2025-12-31T00:00:00Z', now)).toBe('')
  })

  test('capsule is a well-formed svg within the size limit', async () => {
    const c = capsule('yellow', [iconPart('coin'), text('$4.32')])
    expect(c.source.startsWith('<svg')).toBe(true)
    expect(c.source.length < 131072).toBe(true)
  })
})
