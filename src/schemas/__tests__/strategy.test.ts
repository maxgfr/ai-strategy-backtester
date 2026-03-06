import { describe, expect, it } from 'vitest'
import { StrategyDefSchema } from '../strategy'

const validStrategy = {
  name: 'test-strategy',
  description: 'A valid test strategy',
  indicators: { rsi: { period: 14 } },
  buy: { mode: 'all', conditions: [['rsi', '<', 30]] },
  sell: { mode: 'all', conditions: [['rsi', '>', 70]] },
}

describe('StrategyDefSchema', () => {
  it('validates a correct strategy', () => {
    expect(StrategyDefSchema.safeParse(validStrategy).success).toBe(true)
  })

  it('validates score mode with required and scored', () => {
    const scoreDef = {
      ...validStrategy,
      buy: {
        mode: 'score',
        threshold: 2,
        required: [['close', '>', 0]],
        scored: [
          ['rsi', '<', 40],
          ['close', '>', 50],
        ],
      },
    }
    expect(StrategyDefSchema.safeParse(scoreDef).success).toBe(true)
  })

  it('validates mode "any"', () => {
    const anyDef = {
      ...validStrategy,
      buy: {
        mode: 'any',
        conditions: [
          ['rsi', '<', 30],
          ['close', '<', 100],
        ],
      },
    }
    expect(StrategyDefSchema.safeParse(anyDef).success).toBe(true)
  })

  it('rejects empty name', () => {
    const bad = { ...validStrategy, name: '' }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects non-kebab-case name', () => {
    const bad = { ...validStrategy, name: 'MyStrategy' }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects indicator alias with numbers', () => {
    const bad = {
      ...validStrategy,
      indicators: { ema50: { period: 50 } },
    }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('allows _type aliasing', () => {
    const aliasDef = {
      ...validStrategy,
      indicators: {
        breakout: { _type: 'donchian', period: 200 },
      },
      buy: {
        mode: 'all',
        conditions: [['breakout.upper', '>', 0]],
      },
    }
    expect(StrategyDefSchema.safeParse(aliasDef).success).toBe(true)
  })

  it('rejects invalid operator', () => {
    const bad = {
      ...validStrategy,
      buy: { mode: 'all', conditions: [['rsi', '~', 30]] },
    }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects empty conditions array', () => {
    const bad = {
      ...validStrategy,
      buy: { mode: 'all', conditions: [] },
    }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects missing description', () => {
    const { description: _, ...noDesc } = validStrategy
    expect(StrategyDefSchema.safeParse(noDesc).success).toBe(false)
  })

  it('rejects score mode without threshold', () => {
    const bad = {
      ...validStrategy,
      buy: { mode: 'score', scored: [['rsi', '<', 30]] },
    }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects score mode without scored array', () => {
    const bad = {
      ...validStrategy,
      buy: { mode: 'score', threshold: 2 },
    }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('validates optional short and cover blocks', () => {
    const withShort = {
      ...validStrategy,
      short: { mode: 'all', conditions: [['rsi', '>', 80]] },
      cover: { mode: 'all', conditions: [['rsi', '<', 40]] },
    }
    expect(StrategyDefSchema.safeParse(withShort).success).toBe(true)
  })

  it('validates without short/cover (backward compatible)', () => {
    expect(StrategyDefSchema.safeParse(validStrategy).success).toBe(true)
  })

  it('validates leverage field', () => {
    const withLeverage = { ...validStrategy, leverage: 3 }
    expect(StrategyDefSchema.safeParse(withLeverage).success).toBe(true)
  })

  it('rejects leverage below 1', () => {
    const bad = { ...validStrategy, leverage: 0.5 }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects leverage above 125', () => {
    const bad = { ...validStrategy, leverage: 200 }
    expect(StrategyDefSchema.safeParse(bad).success).toBe(false)
  })

  it('validates short block with score mode', () => {
    const withScoreShort = {
      ...validStrategy,
      short: {
        mode: 'score',
        threshold: 2,
        scored: [
          ['rsi', '>', 70],
          ['close', '>', 100],
        ],
      },
      cover: { mode: 'all', conditions: [['rsi', '<', 30]] },
    }
    expect(StrategyDefSchema.safeParse(withScoreShort).success).toBe(true)
  })
})
