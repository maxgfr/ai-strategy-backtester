import { describe, expect, it } from 'vitest'
import { RMA } from '../primitives/rma'
import type { Candle } from '../primitives/types'

describe('RMA (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates RMA values', () => {
    const rma = RMA({ candles, period: 5 })
    const result = rma.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const rma = RMA({ candles: [], period: 5 })
    const result = rma.result()
    expect(result).toEqual([])
  })

  it('RMA values are non-negative for positive input', () => {
    const rma = RMA({ candles, period: 5 })
    const result = rma.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('update adds new candle', () => {
    const rma = RMA({ candles, period: 5 })
    const initialLength = rma.result().length
    const newCandle: Candle = { time: 20, close: 120 }
    rma.update(newCandle)
    expect(rma.result().length).toBe(initialLength + 1)
  })
})
