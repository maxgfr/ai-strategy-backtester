import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../../types'
import { createCustomStrategy, validateStrategy } from '../engine'
import type { CustomStrategyDef } from '../types'

function makeCandles(count: number, closeBase = 100): CandleStick[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1700000000 + i * 3600,
    open: closeBase + Math.sin(i * 0.1) * 10,
    high: closeBase + 5 + Math.sin(i * 0.1) * 10,
    low: closeBase - 5 + Math.sin(i * 0.1) * 10,
    close: closeBase + Math.sin(i * 0.1) * 10,
    volume: 1000 + i * 10,
  }))
}

describe('createCustomStrategy', () => {
  it('returns null for empty data', () => {
    const def: CustomStrategyDef = {
      name: 'test',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    const fn = createCustomStrategy(def)
    expect(fn([])).toBe(null)
  })

  it('evaluates buy signal with mode "all"', () => {
    const def: CustomStrategyDef = {
      name: 'test-buy',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'all',
        conditions: [
          ['close', '>', 50],
          ['volume', '>', 100],
        ],
      },
      sell: { mode: 'all', conditions: [['close', '<', 10]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles)).toBe('buy')
  })

  it('sell takes priority over buy', () => {
    const def: CustomStrategyDef = {
      name: 'test-priority',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 0]] },
      sell: { mode: 'all', conditions: [['close', '>', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5)
    expect(fn(candles)).toBe('sell')
  })

  it('evaluates mode "any"', () => {
    const def: CustomStrategyDef = {
      name: 'test-any',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'any',
        conditions: [
          ['close', '<', 0],
          ['close', '>', 50],
        ],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles)).toBe('buy')
  })

  it('evaluates mode "score"', () => {
    const def: CustomStrategyDef = {
      name: 'test-score',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'score',
        threshold: 2,
        required: [['close', '>', 0]],
        scored: [
          ['close', '>', 50],
          ['volume', '>', 100],
          ['close', '<', 0],
        ],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    // close > 50 = true, volume > 100 = true, close < 0 = false → score 2 >= 2
    expect(fn(candles)).toBe('buy')
  })

  it('score mode fails when required conditions fail', () => {
    const def: CustomStrategyDef = {
      name: 'test-score-fail',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'score',
        threshold: 1,
        required: [['close', '<', 0]],
        scored: [['close', '>', 50]],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles)).toBe(null)
  })

  it('resolves candle fields', () => {
    const def: CustomStrategyDef = {
      name: 'test-candle',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'all',
        conditions: [
          ['high', '>', 'low'],
          ['open', '>', 0],
        ],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles)).toBe('buy')
  })

  it('resolves indicator with field access', () => {
    const def: CustomStrategyDef = {
      name: 'test-field',
      description: 'test',
      indicators: { adx: { period: 14 } },
      buy: {
        mode: 'all',
        conditions: [['adx.adx', '>=', 0]],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(100)
    const result = fn(candles)
    // ADX should compute and adx.adx >= 0 should be true
    expect(result).toBe('buy')
  })

  it('returns null when indicator has insufficient data', () => {
    const def: CustomStrategyDef = {
      name: 'test-nodata',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    const fn = createCustomStrategy(def)
    // Only 3 candles — RSI needs 14+
    const candles = makeCandles(3)
    expect(fn(candles)).toBe(null)
  })

  it('handles comparison operators correctly', () => {
    const def: CustomStrategyDef = {
      name: 'test-ops',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'all',
        conditions: [
          ['close', '!=', 0],
          ['close', '<=', 999],
          ['close', '>=', 1],
        ],
      },
      sell: { mode: 'all', conditions: [['close', '==', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles)).toBe('buy')
  })
})

describe('validateStrategy', () => {
  it('validates a correct strategy', () => {
    const def: CustomStrategyDef = {
      name: 'valid',
      description: 'A valid strategy',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('catches unknown indicators', () => {
    const def: CustomStrategyDef = {
      name: 'bad-indicator',
      description: 'test',
      indicators: { fakeindicator: { period: 14 } },
      buy: { mode: 'all', conditions: [['fakeindicator', '<', 30]] },
      sell: { mode: 'all', conditions: [['close', '>', 70]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Unknown indicator'))).toBe(
      true,
    )
  })

  it('catches invalid operators', () => {
    const def: CustomStrategyDef = {
      name: 'bad-op',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: {
        mode: 'all',
        conditions: [['rsi', '~' as '<', 30]],
      },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Invalid operator'))).toBe(true)
  })

  it('catches unknown fields on object indicators', () => {
    const def: CustomStrategyDef = {
      name: 'bad-field',
      description: 'test',
      indicators: { macd: { fast: 12, slow: 26, signal: 9 } },
      buy: {
        mode: 'all',
        conditions: [['macd.nonexistent', '>', 0]],
      },
      sell: { mode: 'all', conditions: [['close', '>', 70]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Unknown field'))).toBe(true)
  })

  it('catches missing name', () => {
    const def = {
      name: '',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 0]] },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    } as CustomStrategyDef
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('validates score block requires threshold', () => {
    const def = {
      name: 'score-no-threshold',
      description: 'test',
      indicators: {},
      buy: {
        mode: 'score',
        scored: [['close', '>', 0]],
      },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    } as unknown as CustomStrategyDef
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('threshold'))).toBe(true)
  })
})
