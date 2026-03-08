import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../types'
import { getStrategy, listStrategies } from '../registry'

const makeCandle = (
  close: number,
  high = close + 2,
  low = close - 2,
  open = close,
  volume = 100,
  time = 0,
): CandleStick => ({ open, high, low, close, volume, time })

describe('JSON strategies via registry', () => {
  it('lists all available strategies', () => {
    const names = listStrategies()
    expect(names).toContain('pmax')
    expect(names).toContain('supertrend')
    expect(names).toContain('turtle')
    expect(names).toContain('confluence')
    expect(names).toContain('rsi-macd-trend-ride')
    expect(names).toContain('breakout-volume')
    expect(names).toContain('cci-williams-momentum')
    expect(names).toContain('hull-chop-momentum')
    expect(names).toContain('vwma-chop-breakout')
    expect(names).toContain('coppock-bottom')
    expect(names).toContain('aroon-trend-rider')
    expect(names).toContain('keltner-breakout')
    expect(names).toContain('psar-momentum')
    expect(names).toContain('elder-impulse')
    expect(names).toContain('dpo-rsi-pullback')
  })

  it('throws for unknown strategy', () => {
    expect(() => getStrategy('nonexistent')).toThrow('Unknown strategy')
  })

  describe('pmax', () => {
    const { fn: strategy } = getStrategy('pmax')

    it('returns null with empty data', () => {
      expect(strategy([])).toBeNull()
    })

    it('returns buy on clear uptrend', () => {
      const data = Array.from({ length: 100 }, (_, i) =>
        makeCandle(100 + i * 3, 103 + i * 3, 99 + i * 3, 100 + i * 3, 100, i),
      )
      expect(strategy(data)).toBe('buy')
    })

    it('returns sell after trend reversal', () => {
      const uptrend = Array.from({ length: 60 }, (_, i) =>
        makeCandle(100 + i * 3, 103 + i * 3, 99 + i * 3, 100 + i * 3, 100, i),
      )
      const peak = 100 + 59 * 3
      const downtrend = Array.from({ length: 40 }, (_, i) =>
        makeCandle(
          peak - i * 8,
          peak - i * 8 + 2,
          peak - i * 8 - 2,
          peak - i * 8,
          100,
          60 + i,
        ),
      )
      expect(strategy([...uptrend, ...downtrend], 'buy')).toBe('sell')
    })
  })

  describe('supertrend', () => {
    const { fn: strategy } = getStrategy('supertrend')

    it('returns null with empty data', () => {
      expect(strategy([])).toBeNull()
    })

    it('returns buy on clear uptrend', () => {
      const data = Array.from({ length: 100 }, (_, i) =>
        makeCandle(100 + i * 3, 103 + i * 3, 99 + i * 3, 100 + i * 3, 100, i),
      )
      expect(strategy(data)).toBe('buy')
    })

    it('returns sell after trend reversal', () => {
      const uptrend = Array.from({ length: 40 }, (_, i) =>
        makeCandle(100 + i * 3, 103 + i * 3, 99 + i * 3, 100 + i * 3, 100, i),
      )
      const peak = 100 + 39 * 3
      const downtrend = Array.from({ length: 40 }, (_, i) =>
        makeCandle(
          peak - i * 8,
          peak - i * 8 + 2,
          peak - i * 8 - 2,
          peak - i * 8,
          100,
          40 + i,
        ),
      )
      expect(strategy([...uptrend, ...downtrend], 'buy')).toBe('sell')
    })
  })

  describe('turtle', () => {
    const { fn: strategy } = getStrategy('turtle')

    it('returns null with empty data', () => {
      expect(strategy([])).toBeNull()
    })

    it('returns null with insufficient data', () => {
      const data = Array.from({ length: 200 }, (_, i) =>
        makeCandle(120, 150, 100, 120, 100, i),
      )
      expect(strategy(data)).toBeNull()
    })

    it('returns buy on breakout above 200-period high', () => {
      const range = Array.from({ length: 201 }, (_, i) =>
        makeCandle(120, 150, 100, 120, 100, i),
      )
      const breakoutCandle = makeCandle(160, 162, 158, 155, 100, 201)
      expect(strategy([...range, breakoutCandle])).toBe('buy')
    })

    it('returns sell when close drops below 10-period low', () => {
      const range = Array.from({ length: 201 }, (_, i) =>
        makeCandle(110, 115, 100, 108, 100, i),
      )
      const dropCandle = makeCandle(90, 92, 88, 95, 100, 201)
      expect(strategy([...range, dropCandle], 'buy')).toBe('sell')
    })

    it('returns null when price stays within channels', () => {
      const data = Array.from({ length: 202 }, (_, i) =>
        makeCandle(120, 150, 100, 120, 100, i),
      )
      expect(strategy(data)).toBeNull()
    })
  })

  describe('confluence', () => {
    const { fn: strategy } = getStrategy('confluence')

    it('returns null with empty data', () => {
      expect(strategy([])).toBeNull()
    })

    it('returns null with insufficient data', () => {
      const data = Array.from({ length: 5 }, (_, i) =>
        makeCandle(100 + i, 102 + i, 98 + i, 100 + i, 100, i),
      )
      expect(strategy(data)).toBeNull()
    })

    it('returns a valid signal with sufficient data', () => {
      const data = Array.from({ length: 200 }, (_, i) =>
        makeCandle(100 + i * 2, 103 + i * 2, 99 + i * 2, 100 + i * 2, 1000, i),
      )
      const result = strategy(data)
      expect(result === 'buy' || result === 'sell' || result === null).toBe(
        true,
      )
    })
  })
})
