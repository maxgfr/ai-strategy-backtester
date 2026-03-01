import { describe, expect, it } from 'vitest'
import type { Candle } from '../primitives/types'
import { VWAP } from '../vwap'

describe('VWAP (core)', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates VWAP values', () => {
    const vwapInst = VWAP({ candles })
    const result = vwapInst.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const vwapInst = VWAP({ candles: [] })
    const result = vwapInst.result()
    expect(result).toEqual([])
  })

  it('VWAP is within price range', () => {
    const vwapInst = VWAP({ candles })
    const result = vwapInst.result()
    for (const item of result) {
      expect(item.value).toBeGreaterThan(90)
      expect(item.value).toBeLessThan(115)
    }
  })

  it('update adds new candle', () => {
    const vwapInst = VWAP({ candles })
    const initialLength = vwapInst.result().length
    const newCandle: Candle = {
      time: 20,
      high: 125,
      low: 115,
      close: 120,
      volume: 1000,
    }
    vwapInst.update(newCandle)
    expect(vwapInst.result().length).toBe(initialLength + 1)
  })
})
