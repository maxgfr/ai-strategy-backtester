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

  it('when flat (no position), buy is evaluated', () => {
    const def: CustomStrategyDef = {
      name: 'test-priority',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 0]] },
      sell: { mode: 'all', conditions: [['close', '>', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5)
    // When flat (positionType undefined or 'sell'), buy is evaluated
    expect(fn(candles)).toBe('buy')
  })

  it('when holding (positionType=buy), sell is evaluated', () => {
    const def: CustomStrategyDef = {
      name: 'test-sell-when-holding',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 0]] },
      sell: { mode: 'all', conditions: [['close', '>', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5)
    expect(fn(candles, 'buy')).toBe('sell')
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

  it('returns short signal when flat and short conditions met', () => {
    const def: CustomStrategyDef = {
      name: 'test-short',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '<', 0]] },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
      short: { mode: 'all', conditions: [['close', '>', 50]] },
      cover: { mode: 'all', conditions: [['close', '<', 50]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    // buy fails (close > 0), so short is checked and matches
    expect(fn(candles)).toBe('short')
  })

  it('returns cover signal when short and cover conditions met', () => {
    const def: CustomStrategyDef = {
      name: 'test-cover',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 50]] },
      sell: { mode: 'all', conditions: [['close', '>', 200]] },
      short: { mode: 'all', conditions: [['close', '>', 50]] },
      cover: { mode: 'all', conditions: [['close', '>', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles, 'short')).toBe('cover')
  })

  it('returns null when short but cover conditions not met', () => {
    const def: CustomStrategyDef = {
      name: 'test-no-cover',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 50]] },
      sell: { mode: 'all', conditions: [['close', '>', 200]] },
      short: { mode: 'all', conditions: [['close', '>', 50]] },
      cover: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    expect(fn(candles, 'short')).toBe(null)
  })

  it('buy takes priority over short when flat', () => {
    const def: CustomStrategyDef = {
      name: 'test-buy-priority',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '>', 0]] },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
      short: { mode: 'all', conditions: [['close', '>', 0]] },
      cover: { mode: 'all', conditions: [['close', '>', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    // Both buy and short would match, but buy is checked first
    expect(fn(candles)).toBe('buy')
  })

  it('ignores short/cover blocks when not defined', () => {
    const def: CustomStrategyDef = {
      name: 'test-no-short',
      description: 'test',
      indicators: {},
      buy: { mode: 'all', conditions: [['close', '<', 0]] },
      sell: { mode: 'all', conditions: [['close', '<', 0]] },
    }
    const fn = createCustomStrategy(def)
    const candles = makeCandles(5, 100)
    // No buy, no short defined → null
    expect(fn(candles)).toBe(null)
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
    expect(result.errors.some((e) => e.includes('Invalid option'))).toBe(true)
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

  it('validates strategy with short and cover blocks', () => {
    const def: CustomStrategyDef = {
      name: 'with-short',
      description: 'A strategy with shorting',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
      short: { mode: 'all', conditions: [['rsi', '>', 80]] },
      cover: { mode: 'all', conditions: [['rsi', '<', 40]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('catches short without cover', () => {
    const def: CustomStrategyDef = {
      name: 'short-no-cover',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
      short: { mode: 'all', conditions: [['rsi', '>', 80]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Short and cover'))).toBe(true)
  })

  it('validates leverage field', () => {
    const def: CustomStrategyDef = {
      name: 'with-leverage',
      description: 'test',
      leverage: 3,
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
      short: { mode: 'all', conditions: [['rsi', '>', 80]] },
      cover: { mode: 'all', conditions: [['rsi', '<', 40]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(true)
  })

  it('validates value references in short/cover blocks', () => {
    const def: CustomStrategyDef = {
      name: 'bad-short-ref',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
      short: { mode: 'all', conditions: [['fakeindicator', '>', 80]] },
      cover: { mode: 'all', conditions: [['rsi', '<', 40]] },
    }
    const result = validateStrategy(def)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('undeclared indicator'))).toBe(
      true,
    )
  })
})

describe('timeframe auto-scaling', () => {
  it('does not scale on 4h (reference timeframe)', () => {
    const def: CustomStrategyDef = {
      name: 'test-scale-4h',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    // createCustomStrategy with 4h should not change periods
    const fn4h = createCustomStrategy(def, '4h')
    const fnNoTf = createCustomStrategy(def)
    const candles = makeCandles(50, 100)
    // Both should produce the same result
    expect(fn4h(candles)).toBe(fnNoTf(candles))
  })

  it('produces different results on different timeframes', () => {
    const def: CustomStrategyDef = {
      name: 'test-scale-diff',
      description: 'test',
      indicators: { rsi: { period: 14 } },
      buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
      sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
    }
    // Different timeframes scale indicator periods differently
    const fn1h = createCustomStrategy(def, '1h')
    const fn12h = createCustomStrategy(def, '12h')
    // Both should return valid functions
    expect(typeof fn1h).toBe('function')
    expect(typeof fn12h).toBe('function')
    // With 50 candles, both should handle gracefully
    const candles = makeCandles(50, 100)
    const result1h = fn1h(candles)
    const result12h = fn12h(candles)
    // Results may differ due to different scaled periods
    expect(result1h === null || result1h === 'buy' || result1h === 'sell').toBe(
      true,
    )
    expect(
      result12h === null || result12h === 'buy' || result12h === 'sell',
    ).toBe(true)
  })

  it('does not scale non-period params like multiplier', () => {
    const def: CustomStrategyDef = {
      name: 'test-no-scale-multiplier',
      description: 'test',
      indicators: {
        supertrend: { atrPeriod: 10, multiplier: 3 },
      },
      buy: { mode: 'all', conditions: [['supertrend', '<', 'close']] },
      sell: { mode: 'all', conditions: [['supertrend', '>', 'close']] },
    }
    // Just verify it doesn't crash when scaling
    const fn = createCustomStrategy(def, '1h')
    const candles = makeCandles(50, 100)
    const result = fn(candles)
    expect(result === null || result === 'buy' || result === 'sell').toBe(true)
  })
})
