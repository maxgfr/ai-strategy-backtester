import { describe, expect, it } from 'vitest'
import type { Candle } from '../primitives/types'
import { TRIX } from '../trix'

describe('TRIX (core)', () => {
  const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
    time: i,
    close: 100 + i,
  }))

  it('calculates TRIX values', () => {
    const trixInst = TRIX({ candles, period: 14 })
    const result = trixInst.result()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('time')
    expect(result[0]).toHaveProperty('value')
  })

  it('returns empty array for empty input', () => {
    const trixInst = TRIX({ candles: [], period: 14 })
    const result = trixInst.result()
    expect(result).toEqual([])
  })

  it('positive TRIX for uptrend', () => {
    const trixInst = TRIX({ candles, period: 14 })
    const result = trixInst.result()
    expect(result[result.length - 1].value).toBeGreaterThan(0)
  })

  it('update adds new candle', () => {
    const trixInst = TRIX({ candles, period: 14 })
    const initialLength = trixInst.result().length
    const newCandle: Candle = { time: 50, close: 150 }
    trixInst.update(newCandle)
    expect(trixInst.result().length).toBe(initialLength + 1)
  })
})
