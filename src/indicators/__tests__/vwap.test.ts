import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { vwap } from '../vwap'

describe('vwap', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates VWAP values', () => {
    const result = vwap(candles)

    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty input', () => {
    const result = vwap([])
    expect(result).toEqual([])
  })

  it('VWAP is within price range', () => {
    const result = vwap(candles)

    for (const vwapValue of result) {
      expect(vwapValue).toBeGreaterThan(90)
      expect(vwapValue).toBeLessThan(115)
    }
  })
})
