import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateStrategy } from '../strategies/custom/engine'
import type { CustomStrategyDef } from '../strategies/custom/types'

function loadStrategy(name: string): CustomStrategyDef {
  const path = resolve(process.cwd(), 'strategies', `${name}.json`)
  return JSON.parse(readFileSync(path, 'utf-8')) as CustomStrategyDef
}

describe('strategy fixes validation', () => {
  it('dpo-rsi-pullback uses valid supertrend params and fields', () => {
    const def = loadStrategy('dpo-rsi-pullback')

    // Should use atrPeriod, not period
    expect(def.indicators.supertrend).toHaveProperty('atrPeriod')
    expect(def.indicators.supertrend).not.toHaveProperty('period')

    // Should use close > supertrend, not supertrend.direction
    const buyConditions = def.buy.mode === 'all' ? def.buy.conditions : []
    const hasSupertrend = buyConditions.some(
      (c) => c[0] === 'close' && c[2] === 'supertrend',
    )
    expect(hasSupertrend).toBe(true)

    // Should NOT reference supertrend.direction
    const allConditionRefs = [
      ...buyConditions.flatMap((c) => [c[0], c[2]]),
      ...(def.sell.mode !== 'score'
        ? def.sell.conditions.flatMap((c) => [c[0], c[2]])
        : []),
    ]
    const hasDirection = allConditionRefs.some(
      (ref) => typeof ref === 'string' && ref.includes('direction'),
    )
    expect(hasDirection).toBe(false)

    // Validate passes
    const { valid, errors } = validateStrategy(def)
    expect(errors).toEqual([])
    expect(valid).toBe(true)
  })

  it('confluence has no duplicate MACD conditions', () => {
    const def = loadStrategy('confluence')
    expect(def.buy.mode).toBe('score')
    if (def.buy.mode !== 'score') return

    const scored = def.buy.scored
    // Count MACD-related conditions
    const macdConditions = scored.filter(
      (c) =>
        (typeof c[0] === 'string' && c[0].startsWith('macd')) ||
        (typeof c[2] === 'string' && String(c[2]).startsWith('macd')),
    )
    // Should only have one MACD condition now
    expect(macdConditions.length).toBe(1)

    // Threshold should be adjusted
    expect(def.buy.threshold).toBe(4)
  })

  it('stochrsi-trend-filter has 4 conditions (not 5)', () => {
    const def = loadStrategy('stochrsi-trend-filter')
    expect(def.buy.mode).toBe('all')
    if (def.buy.mode !== 'all') return

    expect(def.buy.conditions.length).toBe(4)

    // Should NOT have the redundant K[-1] < D[-1] crossover check
    const hasOldCrossover = def.buy.conditions.some(
      (c) =>
        typeof c[0] === 'string' &&
        c[0].includes('[-1]') &&
        typeof c[2] === 'string' &&
        String(c[2]).includes('[-1]'),
    )
    expect(hasOldCrossover).toBe(false)
  })

  it('vwma-chop-breakout uses RSI > 55 and choppiness > 60', () => {
    const def = loadStrategy('vwma-chop-breakout')

    // Buy: RSI > 55 (not 50)
    if (def.buy.mode === 'all') {
      const rsiCondition = def.buy.conditions.find(
        (c) => c[0] === 'rsi' && c[1] === '>',
      )
      expect(rsiCondition).toBeDefined()
      expect(rsiCondition?.[2]).toBe(55)
    }

    // Sell: choppiness > 60 (not 61.8)
    if (def.sell.mode !== 'score') {
      const chopCondition = def.sell.conditions.find(
        (c) => c[0] === 'choppinessIndex' && c[1] === '>',
      )
      expect(chopCondition).toBeDefined()
      expect(chopCondition?.[2]).toBe(60)
    }
  })

  it('hull-chop-momentum has ADX filter', () => {
    const def = loadStrategy('hull-chop-momentum')

    // Should have adx indicator
    expect(def.indicators).toHaveProperty('adx')

    // Should have adx.adx > 20 in buy conditions
    if (def.buy.mode === 'all') {
      const adxCondition = def.buy.conditions.find(
        (c) => c[0] === 'adx.adx' && c[1] === '>' && c[2] === 18,
      )
      expect(adxCondition).toBeDefined()
      expect(def.buy.conditions.length).toBe(4)
    }
  })

  it('all strategies pass validation', () => {
    const strategies = [
      'rsi-macd-trend-ride',
      'turtle',
      'supertrend-pullback-momentum',
      'supertrend',
      'confluence',
      'pmax',
      'breakout-volume',
      'stochrsi-trend-filter',
      'kdj-extreme-recovery',
      'bollinger-squeeze',
      'ichimoku-cloud',
      'fast-supertrend',
      'vwap-momentum',
      'cci-williams-momentum',
      'hull-chop-momentum',
      'vwma-chop-breakout',
      'coppock-bottom',
      'aroon-trend-rider',
      'keltner-breakout',
      'psar-momentum',
      'elder-impulse',
      'dpo-rsi-pullback',
    ]

    for (const name of strategies) {
      const def = loadStrategy(name)
      const { valid, errors } = validateStrategy(def)
      expect(
        errors,
        `Strategy "${name}" has errors: ${errors.join(', ')}`,
      ).toEqual([])
      expect(valid, `Strategy "${name}" is invalid`).toBe(true)
    }
  })
})
