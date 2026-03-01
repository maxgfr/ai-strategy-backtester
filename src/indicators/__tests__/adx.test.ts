import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { adx } from '../adx'

describe('adx', () => {
  const candles: CandleStick[] = Array.from({ length: 100 }, (_, i) => ({
    time: i,
    open: 100 + i * 0.5 + Math.random() * 5,
    high: 110 + i * 0.5 + Math.random() * 5,
    low: 90 + i * 0.5 - Math.random() * 5,
    close: 100 + i * 0.5 + Math.random() * 5,
    volume: 1000,
  }))

  it('calculates ADX values', () => {
    const result = adx(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('adx')
    expect(result[0]).toHaveProperty('pdi')
    expect(result[0]).toHaveProperty('mdi')
  })

  it('returns empty array for empty input', () => {
    const result = adx([])
    expect(result).toEqual([])
  })

  it('handles custom period', () => {
    const result = adx(candles, 10)

    expect(result.length).toBeGreaterThan(0)
  })

  it('ADX values are non-negative', () => {
    const result = adx(candles)

    for (const item of result) {
      expect(item.adx).toBeGreaterThanOrEqual(0)
      expect(item.pdi).toBeGreaterThanOrEqual(0)
      expect(item.mdi).toBeGreaterThanOrEqual(0)
    }
  })
})
