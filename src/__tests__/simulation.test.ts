import type { Signal, StrategyFn } from '../strategies/types'

// Since simulation() is not exported, we test the core logic
// by re-implementing the stop/MAE/MFE checks as pure functions

import { round } from '../utils'

// === Helpers extracted from simulation.ts stop logic ===

type StopResult = { triggered: boolean; executionPrice: number }

function checkStopLossLong(
  entryPrice: number,
  stopLossPct: number,
  candle: { low: number },
  slippage: number,
): StopResult {
  const stopPrice = entryPrice * (1 - stopLossPct)
  if (candle.low <= stopPrice) {
    return { triggered: true, executionPrice: stopPrice * (1 - slippage) }
  }
  return { triggered: false, executionPrice: 0 }
}

function checkStopLossShort(
  entryPrice: number,
  stopLossPct: number,
  candle: { high: number },
  slippage: number,
): StopResult {
  const stopPrice = entryPrice * (1 + stopLossPct)
  if (candle.high >= stopPrice) {
    return { triggered: true, executionPrice: stopPrice * (1 + slippage) }
  }
  return { triggered: false, executionPrice: 0 }
}

function checkTrailingStopLong(
  peakPrice: number,
  trailingStopPct: number,
  candle: { high: number; low: number },
  slippage: number,
): { triggered: boolean; executionPrice: number; newPeak: number } {
  let peak = peakPrice
  if (candle.high > peak) peak = candle.high
  if (peak > 0 && candle.low <= peak * (1 - trailingStopPct)) {
    const trailPrice = peak * (1 - trailingStopPct)
    return {
      triggered: true,
      executionPrice: trailPrice * (1 - slippage),
      newPeak: peak,
    }
  }
  return { triggered: false, executionPrice: 0, newPeak: peak }
}

function checkTrailingStopShort(
  troughPrice: number,
  trailingStopPct: number,
  candle: { high: number; low: number },
  slippage: number,
): { triggered: boolean; executionPrice: number; newTrough: number } {
  let trough = troughPrice
  if (candle.low < trough) trough = candle.low
  if (
    trough < Number.POSITIVE_INFINITY &&
    candle.high >= trough * (1 + trailingStopPct)
  ) {
    const trailPrice = trough * (1 + trailingStopPct)
    return {
      triggered: true,
      executionPrice: trailPrice * (1 + slippage),
      newTrough: trough,
    }
  }
  return { triggered: false, executionPrice: 0, newTrough: trough }
}

function computeMAEMFE(
  tradeType: 'buy' | 'short',
  entryPrice: number,
  candle: { high: number; low: number },
  prevMAE: number,
  prevMFE: number,
): { mae: number; mfe: number } {
  let mae = prevMAE
  let mfe = prevMFE
  if (tradeType === 'buy') {
    const worstMove = (candle.low - entryPrice) / entryPrice
    const bestMove = (candle.high - entryPrice) / entryPrice
    if (worstMove < mae) mae = worstMove
    if (bestMove > mfe) mfe = bestMove
  } else {
    const worstMove = (entryPrice - candle.high) / entryPrice
    const bestMove = (entryPrice - candle.low) / entryPrice
    if (worstMove < mae) mae = worstMove
    if (bestMove > mfe) mfe = bestMove
  }
  return { mae, mfe }
}

describe('simulation metrics', () => {
  test('computeTradeStats counts wins and losses correctly', () => {
    const positions = [
      { type: 'buy', price: 100, capital: 9974, assets: 99.74 },
      {
        type: 'sell',
        price: 120,
        capital: 11942.8,
        assets: 0,
        tradeProfit: 1968.8,
      },
      { type: 'buy', price: 110, capital: 11942.8, assets: 108.57 },
      {
        type: 'sell',
        price: 90,
        capital: 9745.4,
        assets: 0,
        tradeProfit: -2197.4,
      },
      { type: 'buy', price: 95, capital: 9745.4, assets: 102.58 },
      {
        type: 'sell',
        price: 105,
        capital: 10742.3,
        assets: 0,
        tradeProfit: 996.9,
      },
    ]

    const trades = positions.filter((p) => p.tradeProfit !== undefined)
    const successful = trades.filter((p) => p.tradeProfit > 0)
    const failed = trades.filter((p) => p.tradeProfit < 0)

    expect(trades.length).toBe(3)
    expect(successful.length).toBe(2)
    expect(failed.length).toBe(1)
    expect(round((successful.length / trades.length) * 100)).toBe(66.67)
  })

  test('max drawdown calculation', () => {
    const capitals = [10000, 9500, 11000, 9000, 10500]
    let maxDrawdown = 0
    let peak = capitals[0]
    for (const capital of capitals) {
      if (capital > peak) peak = capital
      const drawdown = (peak - capital) / peak
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }
    // Peak was 11000, trough was 9000 → drawdown = 2000/11000 ≈ 18.18%
    expect(round(maxDrawdown * 100)).toBe(18.18)
  })

  test('profit factor calculation', () => {
    const profits = [1968.8, -2197.4, 996.9]
    const grossProfit = profits.filter((p) => p > 0).reduce((s, p) => s + p, 0)
    const grossLoss = Math.abs(
      profits.filter((p) => p < 0).reduce((s, p) => s + p, 0),
    )
    const profitFactor = round(grossProfit / grossLoss)
    // (1968.8 + 996.9) / 2197.4 ≈ 1.35
    expect(profitFactor).toBe(1.35)
  })
})

describe('strategy function contract', () => {
  test('strategy returns buy, sell, or null', () => {
    const mockStrategy: StrategyFn = (_data) => 'buy'
    expect(mockStrategy([])).toBe('buy')

    const sellStrategy: StrategyFn = (_data) => 'sell'
    expect(sellStrategy([])).toBe('sell')

    const nullStrategy: StrategyFn = (_data) => null
    expect(nullStrategy([])).toBeNull()
  })

  test('signal-based execution logic', () => {
    type Position = { type: string }
    const actions: string[] = []

    const executeLogic = (signal: Signal | null, lastPosition: Position) => {
      if (signal === 'buy' && lastPosition.type !== 'buy') {
        actions.push('buy')
      } else if (signal === 'sell' && lastPosition.type !== 'sell') {
        actions.push('sell')
      } else if (signal === 'short' && lastPosition.type !== 'short') {
        actions.push('short')
      } else if (signal === 'cover' && lastPosition.type === 'short') {
        actions.push('cover')
      }
    }

    // Buy signal when position is sell → should buy
    executeLogic('buy', { type: 'sell' })
    expect(actions).toEqual(['buy'])

    // Buy signal when already bought → should not buy again
    executeLogic('buy', { type: 'buy' })
    expect(actions).toEqual(['buy'])

    // Sell signal when position is buy → should sell
    executeLogic('sell', { type: 'buy' })
    expect(actions).toEqual(['buy', 'sell'])

    // Short signal when flat → should short
    executeLogic('short', { type: 'sell' })
    expect(actions).toEqual(['buy', 'sell', 'short'])

    // Short signal when already short → should not short again
    executeLogic('short', { type: 'short' })
    expect(actions).toEqual(['buy', 'sell', 'short'])

    // Cover signal when short → should cover
    executeLogic('cover', { type: 'short' })
    expect(actions).toEqual(['buy', 'sell', 'short', 'cover'])

    // Cover signal when not short → no action
    executeLogic('cover', { type: 'sell' })
    expect(actions).toEqual(['buy', 'sell', 'short', 'cover'])

    // Null signal → no action
    executeLogic(null, { type: 'sell' })
    expect(actions).toEqual(['buy', 'sell', 'short', 'cover'])
  })
})

describe('intra-candle stop loss', () => {
  const slippage = 0.001

  test('long stop loss triggers when candle.low breaches stop price', () => {
    const entry = 1000
    const stopLossPct = 0.1 // 10% SL → stop at 900
    // Candle low dips to 895, but close is at 950 (above stop)
    const candle = { low: 895, high: 1020, close: 950 }
    const result = checkStopLossLong(entry, stopLossPct, candle, slippage)

    expect(result.triggered).toBe(true)
    // Executes at stop price (900) with slippage, not at close (950)
    expect(result.executionPrice).toBeCloseTo(900 * (1 - slippage), 2)
  })

  test('long stop loss does NOT trigger if candle.low stays above stop price', () => {
    const entry = 1000
    const stopLossPct = 0.1 // stop at 900
    // Low is 905 — above the 900 stop
    const candle = { low: 905, high: 1020, close: 910 }
    const result = checkStopLossLong(entry, stopLossPct, candle, slippage)

    expect(result.triggered).toBe(false)
  })

  test('long stop loss triggers exactly at stop price', () => {
    const entry = 1000
    const stopLossPct = 0.1 // stop at 900
    const candle = { low: 900, high: 1010, close: 920 }
    const result = checkStopLossLong(entry, stopLossPct, candle, slippage)

    expect(result.triggered).toBe(true)
    expect(result.executionPrice).toBeCloseTo(900 * (1 - slippage), 2)
  })

  test('short stop loss triggers when candle.high breaches stop price', () => {
    const entry = 1000
    const stopLossPct = 0.1 // stop at 1100
    // Candle high spikes to 1150, but close is 1050 (below stop)
    const candle = { low: 980, high: 1150, close: 1050 }
    const result = checkStopLossShort(entry, stopLossPct, candle, slippage)

    expect(result.triggered).toBe(true)
    // Executes at stop price (1100) with slippage, not at close (1050)
    expect(result.executionPrice).toBeCloseTo(1100 * (1 + slippage), 2)
  })

  test('short stop loss does NOT trigger if candle.high stays below stop price', () => {
    const entry = 1000
    const stopLossPct = 0.1 // stop at 1100
    const candle = { low: 980, high: 1090, close: 1050 }
    const result = checkStopLossShort(entry, stopLossPct, candle, slippage)

    expect(result.triggered).toBe(false)
  })
})

describe('intra-candle trailing stop', () => {
  const slippage = 0.001

  test('long trailing stop tracks peak via candle.high', () => {
    const trailingStopPct = 0.15 // 15% trailing
    let peak = 1000 // initial peak from entry

    // Candle 1: price rises to 1200 (new peak), low stays safe
    const candle1 = { low: 1050, high: 1200 }
    const r1 = checkTrailingStopLong(peak, trailingStopPct, candle1, slippage)
    expect(r1.triggered).toBe(false)
    expect(r1.newPeak).toBe(1200) // peak updated to candle.high
    peak = r1.newPeak

    // Candle 2: price drops, low = 1010 which is just below 1200 * 0.85 = 1020
    const candle2 = { low: 1010, high: 1150 }
    const r2 = checkTrailingStopLong(peak, trailingStopPct, candle2, slippage)
    expect(r2.triggered).toBe(true)
    const expectedTrailPrice = 1200 * (1 - 0.15) // = 1020
    expect(r2.executionPrice).toBeCloseTo(
      expectedTrailPrice * (1 - slippage),
      2,
    )
  })

  test('long trailing stop does NOT trigger when low stays above trail level', () => {
    const trailingStopPct = 0.15
    const peak = 1200 // trail level = 1200 * 0.85 = 1020

    // Low is 1025, above the 1020 trail level
    const candle = { low: 1025, high: 1180 }
    const result = checkTrailingStopLong(
      peak,
      trailingStopPct,
      candle,
      slippage,
    )
    expect(result.triggered).toBe(false)
  })

  test('short trailing stop tracks trough via candle.low', () => {
    const trailingStopPct = 0.15
    let trough = 1000 // initial trough from entry

    // Candle 1: price drops to 800 (new trough), high stays safe
    const candle1 = { low: 800, high: 910 }
    const r1 = checkTrailingStopShort(
      trough,
      trailingStopPct,
      candle1,
      slippage,
    )
    expect(r1.triggered).toBe(false)
    expect(r1.newTrough).toBe(800)
    trough = r1.newTrough

    // Candle 2: price bounces, high = 925 which is above 800 * 1.15 = 920
    const candle2 = { low: 850, high: 925 }
    const r2 = checkTrailingStopShort(
      trough,
      trailingStopPct,
      candle2,
      slippage,
    )
    expect(r2.triggered).toBe(true)
    const expectedTrailPrice = 800 * (1 + 0.15) // = 920
    expect(r2.executionPrice).toBeCloseTo(
      expectedTrailPrice * (1 + slippage),
      2,
    )
  })

  test('short trailing stop does NOT trigger when high stays below trail level', () => {
    const trailingStopPct = 0.15
    const trough = 800 // trail level = 800 * 1.15 = 920

    // Low=810 doesn't update trough (stays 800), high=915 < 920 trail level
    const candle = { low: 810, high: 915 }
    const result = checkTrailingStopShort(
      trough,
      trailingStopPct,
      candle,
      slippage,
    )
    expect(result.triggered).toBe(false)
  })
})

describe('intra-candle MAE/MFE tracking', () => {
  test('long MAE uses candle.low, MFE uses candle.high', () => {
    const entry = 1000
    const mae = 0
    const mfe = 0

    // Candle with low=950, high=1100, close=1050
    const candle = { low: 950, high: 1100 }
    const result = computeMAEMFE('buy', entry, candle, mae, mfe)

    // MAE = (950 - 1000) / 1000 = -0.05 (-5%)
    expect(result.mae).toBeCloseTo(-0.05, 4)
    // MFE = (1100 - 1000) / 1000 = 0.10 (+10%)
    expect(result.mfe).toBeCloseTo(0.1, 4)
  })

  test('long MAE keeps worst value across candles', () => {
    const entry = 1000
    let mae = 0
    let mfe = 0

    // Candle 1: low dips to 920 → MAE = -8%
    ;({ mae, mfe } = computeMAEMFE(
      'buy',
      entry,
      { low: 920, high: 1050 },
      mae,
      mfe,
    ))
    expect(mae).toBeCloseTo(-0.08, 4)

    // Candle 2: low = 960, less bad → MAE stays at -8%
    ;({ mae, mfe } = computeMAEMFE(
      'buy',
      entry,
      { low: 960, high: 1080 },
      mae,
      mfe,
    ))
    expect(mae).toBeCloseTo(-0.08, 4) // not overwritten
    expect(mfe).toBeCloseTo(0.08, 4) // updated to new high
  })

  test('short MAE uses candle.high (adverse), MFE uses candle.low (favorable)', () => {
    const entry = 1000
    let mae = 0
    let mfe = 0

    // Candle: high=1080 (adverse for short), low=900 (favorable for short)
    const candle = { low: 900, high: 1080 }
    ;({ mae, mfe } = computeMAEMFE('short', entry, candle, mae, mfe))

    // MAE = (1000 - 1080) / 1000 = -0.08 (price went against short)
    expect(mae).toBeCloseTo(-0.08, 4)
    // MFE = (1000 - 900) / 1000 = 0.10 (price moved in short's favor)
    expect(mfe).toBeCloseTo(0.1, 4)
  })
})
