import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { twiggs } from '../twiggs'

describe('twiggs', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000 + i * 100,
  }))

  it('calculates Twiggs Money Flow', () => {
    const result = twiggs(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = twiggs([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = twiggs(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns one less value than input candles', () => {
    const result = twiggs(candles)

    expect(result.length).toBe(candles.length - 1)
  })
})
