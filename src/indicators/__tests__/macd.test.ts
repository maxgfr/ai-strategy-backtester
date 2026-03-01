import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { macd } from '../macd'

describe('macd', () => {
  const candles: CandleStick[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates MACD values', () => {
    const result = macd(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('macd')
    expect(result[0]).toHaveProperty('signal')
    expect(result[0]).toHaveProperty('histogram')
  })

  it('returns empty array for empty input', () => {
    const result = macd([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = macd(candles, 5, 10, 5)

    expect(result.length).toBeGreaterThan(0)
  })

  it('histogram equals macd - signal when signal is defined', () => {
    const result = macd(candles)

    for (const item of result) {
      if (item.signal !== undefined && item.histogram !== undefined) {
        expect(item.histogram).toBeCloseTo(item.macd - item.signal, 5)
      }
    }
  })
})
