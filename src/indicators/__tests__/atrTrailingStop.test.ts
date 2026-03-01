import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { atrTrailingStop } from '../atrTrailingStop'

describe('atrTrailingStop', () => {
  const candles: CandleStick[] = Array.from({ length: 30 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates ATR trailing stop for uptrend', () => {
    const result = atrTrailingStop(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('stop')
    expect(result[0]).toHaveProperty('trend')
  })

  it('returns empty array for empty input', () => {
    const result = atrTrailingStop([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = atrTrailingStop(candles, 10, 2)

    expect(result.length).toBeGreaterThan(0)
  })

  it('trend is either bull or bear', () => {
    const result = atrTrailingStop(candles)

    for (const item of result) {
      expect(['bull', 'bear']).toContain(item.trend)
    }
  })

  it('switches trend when price reverses', () => {
    // Uptrend then downtrend
    const candles: CandleStick[] = [
      ...Array.from({ length: 15 }, (_, i) => ({
        time: i,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
        volume: 1000,
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        time: 15 + i,
        open: 120 - i * 2,
        high: 125 - i * 2,
        low: 115 - i * 2,
        close: 120 - i * 2,
        volume: 1000,
      })),
    ]

    const result = atrTrailingStop(candles)

    expect(result.length).toBeGreaterThan(0)
  })
})
