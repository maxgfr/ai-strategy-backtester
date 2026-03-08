import { describe, expect, it } from 'vitest'
import { round } from '../utils'

describe('Buy & Hold benchmark', () => {
  it('computes Buy & Hold return correctly', () => {
    const initialCapital = 10000
    const fees = 0.0026
    const firstPrice = 100
    const lastPrice = 200

    const hodlAssets = (initialCapital - initialCapital * fees) / firstPrice
    const hodlMoney = hodlAssets * lastPrice

    const buyAndHoldReturn = round(hodlMoney - initialCapital)
    expect(buyAndHoldReturn).toBeCloseTo(9948, 0)

    const buyAndHoldPct = round(
      ((hodlMoney - initialCapital) / initialCapital) * 100,
    )
    expect(buyAndHoldPct).toBeCloseTo(99.48, 0)
  })

  it('computes alpha correctly', () => {
    const initialCapital = 10000
    const strategyFinal = 25000
    const hodlFinal = 20000

    const strategyReturn = (strategyFinal - initialCapital) / initialCapital
    const hodlReturn = (hodlFinal - initialCapital) / initialCapital
    const alpha = round(strategyReturn - hodlReturn, 4)

    // Strategy: +150%, B&H: +100%, Alpha = +50%
    expect(alpha).toBe(0.5)
  })

  it('alpha is negative when strategy underperforms', () => {
    const initialCapital = 10000
    const strategyFinal = 8000
    const hodlFinal = 20000

    const alpha = round(
      (strategyFinal - initialCapital) / initialCapital -
        (hodlFinal - initialCapital) / initialCapital,
      4,
    )

    expect(alpha).toBe(-1.2)
  })
})

describe('drawdown duration', () => {
  it('computes max drawdown duration from capital sequence', () => {
    const capitals = [
      10000, 11000, 10500, 10200, 10800, 11500, 11000, 10000, 10500, 11000,
      12000,
    ]

    let maxDrawdownDuration = 0
    let peak = capitals[0]
    let drawdownStart = -1

    for (let i = 0; i < capitals.length; i++) {
      if (capitals[i] > peak) {
        if (drawdownStart >= 0) {
          const duration = i - drawdownStart
          if (duration > maxDrawdownDuration) maxDrawdownDuration = duration
        }
        peak = capitals[i]
        drawdownStart = -1
      }
      const dd = (peak - capitals[i]) / peak
      if (dd > 0 && drawdownStart < 0) {
        drawdownStart = i
      }
    }

    // Longest drawdown: positions 6-10 (after peak 11500 at index 5)
    // Drawdown starts at 6, recovers at 10 (12000 > 11500)
    expect(maxDrawdownDuration).toBe(4)
  })
})

describe('MAE/MFE', () => {
  it('computes MAE correctly for long trade', () => {
    const entryPrice = 100
    const prices = [98, 95, 102, 110, 105]

    let mae = 0
    let mfe = 0
    for (const p of prices) {
      const pctMove = (p - entryPrice) / entryPrice
      if (pctMove < mae) mae = pctMove
      if (pctMove > mfe) mfe = pctMove
    }

    // Worst dip: 95 → -5%, Best: 110 → +10%
    expect(round(mae * 100)).toBe(-5)
    expect(round(mfe * 100)).toBe(10)
  })

  it('computes MAE correctly for short trade', () => {
    const entryPrice = 100
    const prices = [102, 105, 98, 90, 95]

    let mae = 0
    let mfe = 0
    for (const p of prices) {
      const pctMove = (entryPrice - p) / entryPrice
      if (pctMove < mae) mae = pctMove
      if (pctMove > mfe) mfe = pctMove
    }

    // Worst adverse: 105 → -5%, Best: 90 → +10%
    expect(round(mae * 100)).toBe(-5)
    expect(round(mfe * 100)).toBe(10)
  })

  it('MAE/MFE ratio indicates stop loss efficiency', () => {
    // If MAE is small relative to MFE, stops are well-placed
    const avgMAE = -3 // -3%
    const avgMFE = 12 // +12%
    const ratio = round(Math.abs(avgMAE) / avgMFE)

    // 0.25 = stops allow 1:4 risk:reward
    expect(ratio).toBe(0.25)
  })
})

describe('advanced metric edge cases', () => {
  it('handles single trade correctly', () => {
    const tradeProfits = [500]
    const mean = tradeProfits[0]
    expect(mean).toBe(500)

    const wins = tradeProfits.filter((p) => p > 0)
    const losses = tradeProfits.filter((p) => p < 0)
    const winRate = wins.length / tradeProfits.length
    expect(winRate).toBe(1)
    expect(losses.length).toBe(0)
  })

  it('handles all-loss scenario', () => {
    const tradeProfits = [-100, -200, -150]
    const wins = tradeProfits.filter((p) => p > 0)
    const losses = tradeProfits.filter((p) => p < 0)
    const grossProfit = wins.reduce((s, p) => s + p, 0)
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0))
    const profitFactor = grossLoss === 0 ? 9999 : round(grossProfit / grossLoss)
    expect(profitFactor).toBe(0)
    expect(wins.length).toBe(0)
  })

  it('handles all-win scenario', () => {
    const tradeProfits = [100, 200, 150]
    const wins = tradeProfits.filter((p) => p > 0)
    const losses = tradeProfits.filter((p) => p < 0)
    const grossProfit = wins.reduce((s, p) => s + p, 0)
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0))
    const profitFactor = grossLoss === 0 ? 9999 : round(grossProfit / grossLoss)
    expect(profitFactor).toBe(9999)
    expect(losses.length).toBe(0)
  })
})
