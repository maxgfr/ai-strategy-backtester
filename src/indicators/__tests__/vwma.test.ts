import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { vwma } from '../vwma'

describe('vwma', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('returns array of same length as input', () => {
    const result = vwma(candles)
    expect(result.length).toBe(candles.length)
  })

  it('returns zeros for empty input', () => {
    expect(vwma([])).toEqual([])
  })

  it('equals SMA when volume is constant', () => {
    // With equal volume, VWMA = SMA
    const result = vwma(candles, 10)
    // At the last bar, VWMA should equal the mean of the last 10 closes
    const last10 = candles.slice(-10)
    const sma = last10.reduce((s, c) => s + c.close, 0) / 10
    expect(result[result.length - 1]).toBeCloseTo(sma, 5)
  })

  it('weights higher volume bars more', () => {
    // Create candles where high-volume bar has higher price
    const weighted: CandleStick[] = [
      { time: 0, open: 100, high: 105, low: 95, close: 100, volume: 100 },
      { time: 1, open: 100, high: 105, low: 95, close: 200, volume: 900 },
    ]
    const result = vwma(weighted, 2)
    // VWMA should be closer to 200 (high volume bar) than SMA (150)
    expect(result[1]).toBeGreaterThan(150)
  })
})
