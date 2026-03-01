import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { ichimoku, ichimokuSignal } from '../ichimoku'

describe('ichimoku', () => {
  const candles: CandleStick[] = Array.from({ length: 60 }, (_, i) => ({
    time: i,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }))

  it('calculates Ichimoku values', () => {
    const result = ichimoku(candles)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('conversion')
    expect(result[0]).toHaveProperty('base')
    expect(result[0]).toHaveProperty('spanA')
    expect(result[0]).toHaveProperty('spanB')
    expect(result[0]).toHaveProperty('chikou')
    expect(result[0]).toHaveProperty('cloudTop')
    expect(result[0]).toHaveProperty('cloudBottom')
    expect(result[0]).toHaveProperty('time')
  })

  it('returns empty array for empty input', () => {
    const result = ichimoku([])
    expect(result).toEqual([])
  })

  it('handles custom parameters', () => {
    const result = ichimoku(candles, 5, 10, 20)

    expect(result.length).toBeGreaterThan(0)
  })

  it('cloudTop is max of spanA and spanB', () => {
    const result = ichimoku(candles)

    for (const item of result) {
      expect(item.cloudTop).toBe(Math.max(item.spanA, item.spanB))
    }
  })

  it('cloudBottom is min of spanA and spanB', () => {
    const result = ichimoku(candles)

    for (const item of result) {
      expect(item.cloudBottom).toBe(Math.min(item.spanA, item.spanB))
    }
  })
})

describe('ichimokuSignal', () => {
  const mockLine = {
    time: 0,
    conversion: 105,
    base: 100,
    spanA: 102,
    spanB: 98,
    chikou: 100,
    cloudTop: 102,
    cloudBottom: 98,
  }

  it('returns bullish signal', () => {
    const signal = ichimokuSignal(mockLine, 105)

    expect(signal).toBe('bullish')
  })

  it('returns bearish signal', () => {
    const bearishLine = {
      ...mockLine,
      conversion: 95,
      base: 100,
      spanA: 98,
      spanB: 102,
      cloudTop: 102,
      cloudBottom: 98,
    }
    const signal = ichimokuSignal(bearishLine, 95)

    expect(signal).toBe('bearish')
  })

  it('returns neutral signal for mixed conditions', () => {
    const signal = ichimokuSignal(mockLine, 100)

    expect(signal).toBe('neutral')
  })

  it('valid signal types', () => {
    const signal = ichimokuSignal(mockLine, 100)

    expect(['bullish', 'bearish', 'neutral']).toContain(signal)
  })
})
