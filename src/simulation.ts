import { fork } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  type AppConfig,
  buildDbModel,
  loadConfig,
  maxArraySizeForInterval,
  type StrategyConfig,
} from './config'
import { readAndLoadData } from './data'
import { Database, type IDatabase } from './database'
import { logger } from './logger'
import { monteCarloSimulation, tTest } from './statistics'
import { getStrategy } from './strategies/registry'
import type { StrategyFn } from './strategies/types'
import { executeBuy, executeCover, executeSell, executeShort } from './trade'
import type { BinanceInterval, CandleStick } from './types'
import { formatDate, formatTimestamp, round } from './utils'

export type SimulationParams = {
  pair: string
  interval: BinanceInterval
  startDate: Date
  endDate: Date
  strategy?: string
}

type WorkerData = {
  configPath?: string
  interval: string
  pair: string
  startDateIso: string
  endDateIso: string
  strategyName: string
  dbPath: string
  stopLossPct?: number
  trailingStopPct?: number
  maxDrawdownPct?: number
  riskPerTrade?: number
}

function countFundingPeriods(prevTimeSec: number, currTimeSec: number): number {
  const period = 8 * 3600 // 8 hours in seconds
  return Math.floor(currTimeSec / period) - Math.floor(prevTimeSec / period)
}

function computeTradeStats(db: IDatabase): void {
  const allPosition = db.get('historicPosition')
  let closePosition = 0
  let successPosition = 0
  let failedPosition = 0
  let longTrades = 0
  let shortTrades = 0
  let longWins = 0
  let shortWins = 0
  let longProfit = 0
  let shortProfit = 0

  for (let i = 0; i < allPosition.length; i++) {
    const pos = allPosition[i]
    if (pos.tradeProfit !== undefined) {
      closePosition++
      pos.tradeProfit > 0 ? successPosition++ : failedPosition++

      // Determine if this was a long or short trade by looking at the previous position
      const prevPos = i > 0 ? allPosition[i - 1] : undefined
      if (prevPos?.type === 'short') {
        shortTrades++
        shortProfit += pos.tradeProfit
        if (pos.tradeProfit > 0) shortWins++
      } else {
        longTrades++
        longProfit += pos.tradeProfit
        if (pos.tradeProfit > 0) longWins++
      }
    }
  }
  db.set('nbPosition', allPosition.length)
  db.set('closePosition', closePosition)
  db.set('successPosition', successPosition)
  db.set('failedPosition', failedPosition)
  db.set(
    'percentagePosition',
    closePosition === 0
      ? '0%'
      : `${round((successPosition / closePosition) * 100)}%`,
  )
  db.set('longTrades', longTrades)
  db.set('shortTrades', shortTrades)
  db.set('longWins', longWins)
  db.set('shortWins', shortWins)
  db.set('longProfit', round(longProfit))
  db.set('shortProfit', round(shortProfit))
}

function computeAdvancedMetrics(
  db: IDatabase,
  initialCapital: number,
  backtestDays: number,
): void {
  const allPosition = db.get('historicPosition')
  const tradeProfits = allPosition
    .filter((p) => p.tradeProfit !== undefined)
    .map((p) => p.tradeProfit as number)

  if (tradeProfits.length === 0) {
    db.set('profitFactor', 0)
    db.set('maxDrawdown', '0%')
    db.set('sharpeRatio', 0)
    db.set('avgTradeProfit', 0)
    db.set('sortino', 0)
    db.set('calmarRatio', 0)
    db.set('recoveryFactor', 0)
    db.set('avgWin', 0)
    db.set('avgLoss', 0)
    db.set('maxConsecutiveWins', 0)
    db.set('maxConsecutiveLosses', 0)
    db.set('expectancy', 0)
    db.set('maxDrawdownDuration', 0)
    db.set('avgDrawdownDuration', 0)
    db.set('timeToRecovery', 0)
    db.set('avgMAE', 0)
    db.set('avgMFE', 0)
    db.set('maeToMfeRatio', 0)
    db.set('tStatistic', 0)
    db.set('pValue', 1)
    db.set('isSignificant', false)
    db.set('monteCarloMedian', 0)
    db.set('monteCarlo5th', 0)
    db.set('monteCarlo95th', 0)
    db.set('ruinProbability', 0)
    return
  }

  const wins = tradeProfits.filter((p) => p > 0)
  const losses = tradeProfits.filter((p) => p < 0)
  const grossProfit = wins.reduce((s, p) => s + p, 0)
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0))
  const profitFactor = grossLoss === 0 ? 9999 : round(grossProfit / grossLoss)

  // Max drawdown + drawdown duration analysis
  let maxDrawdown = 0
  let maxDrawdownPeak = initialCapital
  let peak = initialCapital
  let drawdownStart = -1
  let maxDrawdownDuration = 0
  let currentDrawdownDuration = 0
  let totalDrawdownDuration = 0
  let drawdownCount = 0
  let longestRecovery = 0
  let recoveryStart = -1

  for (let i = 0; i < allPosition.length; i++) {
    const pos = allPosition[i]
    if (pos.capital > peak) {
      // New peak — end of drawdown
      if (drawdownStart >= 0) {
        const duration = i - drawdownStart
        totalDrawdownDuration += duration
        drawdownCount++
        if (recoveryStart >= 0) {
          const recovery = i - recoveryStart
          if (recovery > longestRecovery) longestRecovery = recovery
        }
      }
      peak = pos.capital
      drawdownStart = -1
      recoveryStart = -1
    }
    const drawdown = (peak - pos.capital) / peak
    if (drawdown > 0 && drawdownStart < 0) {
      drawdownStart = i
      recoveryStart = i
    }
    if (drawdown > 0) {
      currentDrawdownDuration = i - (drawdownStart >= 0 ? drawdownStart : i)
      if (currentDrawdownDuration > maxDrawdownDuration) {
        maxDrawdownDuration = currentDrawdownDuration
      }
    }
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPeak = peak
    }
  }
  // If still in drawdown at end
  if (drawdownStart >= 0) {
    const duration = allPosition.length - drawdownStart
    totalDrawdownDuration += duration
    drawdownCount++
    if (duration > maxDrawdownDuration) maxDrawdownDuration = duration
  }

  const avgDrawdownDuration =
    drawdownCount === 0 ? 0 : round(totalDrawdownDuration / drawdownCount)

  const mean = tradeProfits.reduce((s, p) => s + p, 0) / tradeProfits.length
  const variance =
    tradeProfits.reduce((s, p) => s + (p - mean) ** 2, 0) / tradeProfits.length
  const stdDev = Math.sqrt(variance)

  // Annualized Sharpe: multiply by sqrt(trades per year)
  const backtestYears = backtestDays / 365
  const tradesPerYear =
    backtestYears > 0
      ? tradeProfits.length / backtestYears
      : tradeProfits.length
  const annualizationFactor = Math.sqrt(tradesPerYear)
  const sharpe = stdDev === 0 ? 0 : round((mean / stdDev) * annualizationFactor)

  // Sortino: downside deviation only (denominator = number of losing trades)
  const downsideReturns = tradeProfits.filter((p) => p < 0)
  const downsideVariance =
    downsideReturns.length === 0
      ? 0
      : downsideReturns.reduce((s, p) => s + p ** 2, 0) / downsideReturns.length
  const downsideDev = Math.sqrt(downsideVariance)
  const sortino =
    downsideDev === 0
      ? mean > 0
        ? 9999
        : 0
      : round((mean / downsideDev) * annualizationFactor)

  // Total return for Calmar/Recovery
  const finalCapital = db.get('position').capital
  const totalReturn = finalCapital - initialCapital

  // Calmar Ratio: annualized return / max drawdown (dollar from the peak that produced it)
  const maxDrawdownDollar = maxDrawdown * maxDrawdownPeak
  const annualizedReturn =
    backtestYears > 0 ? totalReturn / backtestYears : totalReturn
  const calmarRatio =
    maxDrawdownDollar === 0 ? 0 : round(annualizedReturn / maxDrawdownDollar)

  // Recovery Factor: total return / max drawdown (dollar)
  const recoveryFactor =
    maxDrawdownDollar === 0 ? 0 : round(totalReturn / maxDrawdownDollar)

  // Avg win / avg loss
  const avgWin = wins.length === 0 ? 0 : round(grossProfit / wins.length)
  const avgLoss = losses.length === 0 ? 0 : round(grossLoss / losses.length)

  // Max consecutive wins/losses
  let maxConsWins = 0
  let maxConsLosses = 0
  let consWins = 0
  let consLosses = 0
  for (const p of tradeProfits) {
    if (p > 0) {
      consWins++
      consLosses = 0
      if (consWins > maxConsWins) maxConsWins = consWins
    } else if (p < 0) {
      consLosses++
      consWins = 0
      if (consLosses > maxConsLosses) maxConsLosses = consLosses
    }
    // breakeven (p === 0): don't affect streaks
  }

  // Expectancy: (avgWin × winRate) - (avgLoss × lossRate)
  const winRate = wins.length / tradeProfits.length
  const lossRate = losses.length / tradeProfits.length
  const expectancy = round(avgWin * winRate - avgLoss * lossRate)

  // Statistical significance (t-test on trade profits)
  const { tStatistic, pValue, isSignificant } = tTest(tradeProfits)

  // Monte Carlo simulation
  const mc = monteCarloSimulation(tradeProfits, initialCapital)

  db.set('profitFactor', profitFactor)
  db.set('maxDrawdown', `${round(maxDrawdown * 100)}%`)
  db.set('sharpeRatio', sharpe)
  db.set('avgTradeProfit', round(mean))
  db.set('sortino', sortino)
  db.set('calmarRatio', calmarRatio)
  db.set('recoveryFactor', recoveryFactor)
  db.set('avgWin', avgWin)
  db.set('avgLoss', avgLoss)
  db.set('maxConsecutiveWins', maxConsWins)
  db.set('maxConsecutiveLosses', maxConsLosses)
  db.set('expectancy', expectancy)
  db.set('maxDrawdownDuration', maxDrawdownDuration)
  db.set('avgDrawdownDuration', avgDrawdownDuration)
  db.set('timeToRecovery', longestRecovery)
  db.set('tStatistic', tStatistic)
  db.set('pValue', pValue)
  db.set('isSignificant', isSignificant)
  db.set('monteCarloMedian', mc.median)
  db.set('monteCarlo5th', mc.p5)
  db.set('monteCarlo95th', mc.p95)
  db.set('ruinProbability', mc.ruinProbability)
}

type SimulationOptions = {
  leverage: number
  stopLossPct?: number
  trailingStopPct?: number
  maxDrawdownPct?: number
  riskPerTrade?: number
  fundingRate: number
  slippage: number
  makerFee: number
  takerFee: number
}

async function simulation(
  interval: BinanceInterval,
  pair: string,
  startDate: Date,
  endDate: Date,
  dbPath: string,
  strategy: StrategyFn,
  config: AppConfig,
  maxArraySize: number,
  opts: SimulationOptions,
): Promise<void> {
  const db = new Database(dbPath, buildDbModel(pair, interval))
  const historic: Array<CandleStick> = await readAndLoadData(
    interval,
    pair,
    startDate,
    endDate,
    `data/${pair}_${interval}_${formatDate(startDate)}_${formatDate(endDate)}.json`,
  )

  const { initialCapital } = config
  const {
    leverage,
    stopLossPct,
    trailingStopPct,
    maxDrawdownPct,
    riskPerTrade,
    fundingRate,
    slippage,
    makerFee,
    takerFee,
  } = opts
  const window: CandleStick[] = []

  let peakPrice = 0
  let troughPrice = Number.POSITIVE_INFINITY
  let accumulatedFunding = 0
  let totalFundingPaid = 0
  let prevTime = 0

  // Circuit breaker: stop opening new positions after max drawdown
  let equityPeak = initialCapital
  let circuitBreakerTripped = false

  // Risk-per-trade: reserve capital not invested
  let reserveCapital = 0

  // MAE/MFE tracking per trade
  let tradeEntryPrice = 0
  let tradeMAE = 0 // max adverse excursion (worst unrealized loss %)
  let tradeMFE = 0 // max favorable excursion (best unrealized gain %)
  let tradeType: 'buy' | 'short' | null = null
  const maeValues: number[] = []
  const mfeValues: number[] = []

  for (let i = 0; i < historic.length; i++) {
    const candle = historic[i]
    const price = candle.close
    const date = new Date(candle.time * 1000)

    if (i === 0) {
      const initialAssets = (initialCapital - initialCapital * makerFee) / price
      db.set('initialCapital', initialCapital)
      db.set('position', {
        date: '',
        type: 'sell',
        price,
        assets: 0,
        capital: initialCapital,
      })
      db.set('hodlAssets', initialAssets)
      db.set('historicPosition', [])
      prevTime = candle.time
    }

    window.push(candle)
    const dataWindow = window.slice(Math.max(window.length - maxArraySize, 0))

    const lastPosition = db.get('position')

    // === Funding fees (every 8h for leveraged positions) ===
    if (
      fundingRate > 0 &&
      leverage > 1 &&
      lastPosition.type !== 'sell' &&
      i > 0
    ) {
      const periods = countFundingPeriods(prevTime, candle.time)
      if (periods > 0) {
        const fundingFee = lastPosition.assets * price * fundingRate * periods
        accumulatedFunding += fundingFee
        totalFundingPaid += fundingFee
      }
    }
    prevTime = candle.time

    // === MAE/MFE tracking (before liquidation/stops so final candle is captured) ===
    if (tradeType === 'buy' && tradeEntryPrice > 0) {
      const pctMove = (price - tradeEntryPrice) / tradeEntryPrice
      if (pctMove < tradeMAE) tradeMAE = pctMove
      if (pctMove > tradeMFE) tradeMFE = pctMove
    } else if (tradeType === 'short' && tradeEntryPrice > 0) {
      const pctMove = (tradeEntryPrice - price) / tradeEntryPrice
      if (pctMove < tradeMAE) tradeMAE = pctMove
      if (pctMove > tradeMFE) tradeMFE = pctMove
    }

    // === Liquidation check (leverage only, funding erodes margin) ===
    if (leverage > 1 && lastPosition.type === 'buy') {
      const effectiveMargin = lastPosition.capital - accumulatedFunding
      const liqPrice =
        effectiveMargin > 0
          ? lastPosition.price *
            (1 - effectiveMargin / (lastPosition.capital * leverage))
          : lastPosition.price // margin already depleted by funding
      if (candle.low <= liqPrice) {
        const liqCapital = reserveCapital // invested capital lost, reserve preserved
        const position = {
          date: date.toISOString(),
          type: 'sell' as const,
          price: liqPrice,
          capital: liqCapital,
          assets: 0,
          tradeProfit: -lastPosition.capital,
        }
        db.set('position', position)
        db.push('historicPosition', position)
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        reserveCapital = 0
        peakPrice = 0
        accumulatedFunding = 0
        continue
      }
    }
    if (leverage > 1 && lastPosition.type === 'short') {
      const effectiveMarginShort = lastPosition.capital - accumulatedFunding
      const liqPriceShort =
        effectiveMarginShort > 0
          ? lastPosition.price *
            (1 + effectiveMarginShort / (lastPosition.capital * leverage))
          : lastPosition.price
      if (candle.high >= liqPriceShort) {
        const liqCapitalShort = reserveCapital
        const position = {
          date: date.toISOString(),
          type: 'sell' as const,
          price: liqPriceShort,
          capital: liqCapitalShort,
          assets: 0,
          tradeProfit: -lastPosition.capital,
        }
        db.set('position', position)
        db.push('historicPosition', position)
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        reserveCapital = 0
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Stop loss check (apply slippage to execution price) ===
    if (stopLossPct !== undefined && lastPosition.type === 'buy') {
      if (price <= lastPosition.price * (1 - stopLossPct)) {
        const slippedPrice = price * (1 - slippage)
        executeSell(
          slippedPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        // Add reserve back after exit
        if (reserveCapital > 0) {
          const pos = db.get('position')
          db.set('position', { ...pos, capital: pos.capital + reserveCapital })
          reserveCapital = 0
        }
        peakPrice = 0
        accumulatedFunding = 0
        continue
      }
    }
    if (stopLossPct !== undefined && lastPosition.type === 'short') {
      if (price >= lastPosition.price * (1 + stopLossPct)) {
        const slippedPrice = price * (1 + slippage)
        executeCover(
          slippedPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        if (reserveCapital > 0) {
          const pos = db.get('position')
          db.set('position', { ...pos, capital: pos.capital + reserveCapital })
          reserveCapital = 0
        }
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Trailing stop check (apply slippage to execution price) ===
    if (lastPosition.type === 'buy') {
      if (price > peakPrice) peakPrice = price
      if (
        trailingStopPct !== undefined &&
        peakPrice > 0 &&
        price <= peakPrice * (1 - trailingStopPct)
      ) {
        const slippedPrice = price * (1 - slippage)
        executeSell(
          slippedPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        if (reserveCapital > 0) {
          const pos = db.get('position')
          db.set('position', { ...pos, capital: pos.capital + reserveCapital })
          reserveCapital = 0
        }
        peakPrice = 0
        accumulatedFunding = 0
        continue
      }
    }
    if (lastPosition.type === 'short') {
      if (price < troughPrice) troughPrice = price
      if (
        trailingStopPct !== undefined &&
        troughPrice < Number.POSITIVE_INFINITY &&
        price >= troughPrice * (1 + trailingStopPct)
      ) {
        const slippedPrice = price * (1 + slippage)
        executeCover(
          slippedPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
          tradeType = null
        }
        if (reserveCapital > 0) {
          const pos = db.get('position')
          db.set('position', { ...pos, capital: pos.capital + reserveCapital })
          reserveCapital = 0
        }
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Circuit breaker: track equity and stop opening new positions ===
    if (maxDrawdownPct !== undefined && lastPosition.type === 'sell') {
      const currentEquity = lastPosition.capital + reserveCapital
      if (currentEquity > equityPeak) equityPeak = currentEquity
      if (
        equityPeak > 0 &&
        (equityPeak - currentEquity) / equityPeak >= maxDrawdownPct
      ) {
        circuitBreakerTripped = true
      }
    }

    // === Strategy signal ===
    const signal = strategy(dataWindow, lastPosition.type)

    if (
      signal === 'buy' &&
      lastPosition.type !== 'buy' &&
      !circuitBreakerTripped
    ) {
      const buyPrice = price * (1 + slippage)
      // Risk-per-trade: only invest a fraction of capital
      if (
        riskPerTrade !== undefined &&
        stopLossPct !== undefined &&
        stopLossPct > 0
      ) {
        const fraction = Math.min(1, riskPerTrade / stopLossPct)
        const totalCapital = lastPosition.capital
        const investCapital = totalCapital * fraction
        reserveCapital = totalCapital - investCapital
        db.set('position', { ...lastPosition, capital: investCapital })
      }
      executeBuy(buyPrice, date, db, makerFee, leverage)
      peakPrice = buyPrice
      troughPrice = Number.POSITIVE_INFINITY
      accumulatedFunding = 0
      tradeEntryPrice = buyPrice
      tradeMAE = 0
      tradeMFE = 0
      tradeType = 'buy'
    } else if (signal === 'sell' && lastPosition.type !== 'sell') {
      if (tradeType !== null) {
        maeValues.push(tradeMAE)
        mfeValues.push(tradeMFE)
      }
      const sellPrice = price * (1 - slippage)
      executeSell(sellPrice, date, db, takerFee, leverage, accumulatedFunding)
      // Add reserve back after exit
      if (reserveCapital > 0) {
        const pos = db.get('position')
        db.set('position', { ...pos, capital: pos.capital + reserveCapital })
        reserveCapital = 0
      }
      peakPrice = 0
      accumulatedFunding = 0
      tradeType = null
    } else if (
      signal === 'short' &&
      lastPosition.type !== 'short' &&
      !circuitBreakerTripped
    ) {
      const shortPrice = price * (1 - slippage)
      // Risk-per-trade for shorts
      if (
        riskPerTrade !== undefined &&
        stopLossPct !== undefined &&
        stopLossPct > 0
      ) {
        const fraction = Math.min(1, riskPerTrade / stopLossPct)
        const totalCapital = lastPosition.capital
        const investCapital = totalCapital * fraction
        reserveCapital = totalCapital - investCapital
        db.set('position', { ...lastPosition, capital: investCapital })
      }
      executeShort(shortPrice, date, db, makerFee, leverage)
      troughPrice = shortPrice
      peakPrice = 0
      accumulatedFunding = 0
      tradeEntryPrice = shortPrice
      tradeMAE = 0
      tradeMFE = 0
      tradeType = 'short'
    } else if (signal === 'cover' && lastPosition.type === 'short') {
      if (tradeType !== null) {
        maeValues.push(tradeMAE)
        mfeValues.push(tradeMFE)
      }
      const coverPrice = price * (1 + slippage)
      executeCover(coverPrice, date, db, takerFee, leverage, accumulatedFunding)
      if (reserveCapital > 0) {
        const pos = db.get('position')
        db.set('position', { ...pos, capital: pos.capital + reserveCapital })
        reserveCapital = 0
      }
      troughPrice = Number.POSITIVE_INFINITY
      accumulatedFunding = 0
      tradeType = null
    }

    // === Final candle: close positions and compute metrics ===
    if (i === historic.length - 1) {
      const finalType = db.get('position').type
      if (finalType === 'buy') {
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
        }
        const finalSellPrice = price * (1 - slippage)
        executeSell(
          finalSellPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        tradeType = null
      } else if (finalType === 'short') {
        if (tradeType !== null) {
          maeValues.push(tradeMAE)
          mfeValues.push(tradeMFE)
        }
        const finalCoverPrice = price * (1 + slippage)
        executeCover(
          finalCoverPrice,
          date,
          db,
          takerFee,
          leverage,
          accumulatedFunding,
        )
        tradeType = null
      }
      // Add any remaining reserve
      if (reserveCapital > 0) {
        const pos = db.get('position')
        db.set('position', { ...pos, capital: pos.capital + reserveCapital })
        reserveCapital = 0
      }
      const finalPosition = db.get('position')
      const hodlAssets = db.get('hodlAssets') ?? 0
      const hodlGross = hodlAssets * price
      const hodlMoney = hodlGross - hodlGross * takerFee

      // Buy & Hold benchmark
      const buyAndHoldReturn = round(hodlMoney - initialCapital)
      const buyAndHoldPct =
        initialCapital === 0
          ? '0%'
          : `${round(((hodlMoney - initialCapital) / initialCapital) * 100)}%`
      const strategyReturn = round(finalPosition.capital - initialCapital)
      const strategyReturnPct =
        initialCapital === 0
          ? '0%'
          : `${round(((finalPosition.capital - initialCapital) / initialCapital) * 100)}%`
      const alpha = round(
        (finalPosition.capital - initialCapital) / initialCapital -
          (hodlMoney - initialCapital) / initialCapital,
        4,
      )

      db.set('hodlMoney', hodlMoney)
      db.set('lastPositionMoney', finalPosition.capital)
      db.set('profit', finalPosition.capital - hodlMoney)
      db.set(
        'percentageProfit',
        hodlMoney === 0
          ? '0%'
          : `${round(((finalPosition.capital - hodlMoney) / hodlMoney) * 100)}%`,
      )
      db.set('totalFundingPaid', round(totalFundingPaid))

      // Buy & Hold fields
      db.set('buyAndHoldReturn', buyAndHoldReturn)
      db.set('buyAndHoldPct', buyAndHoldPct)
      db.set('strategyReturn', strategyReturn)
      db.set('strategyReturnPct', strategyReturnPct)
      db.set('alpha', alpha)

      // MAE/MFE
      const avgMAE =
        maeValues.length === 0
          ? 0
          : round(
              (maeValues.reduce((s, v) => s + v, 0) / maeValues.length) * 100,
            )
      const avgMFE =
        mfeValues.length === 0
          ? 0
          : round(
              (mfeValues.reduce((s, v) => s + v, 0) / mfeValues.length) * 100,
            )
      const maeToMfeRatio = avgMFE === 0 ? 0 : round(Math.abs(avgMAE) / avgMFE)
      db.set('avgMAE', avgMAE)
      db.set('avgMFE', avgMFE)
      db.set('maeToMfeRatio', maeToMfeRatio)

      computeTradeStats(db)

      // Sensitivity analysis: estimate impact of doubling fees/slippage
      const nbClosedTrades = db.get('closePosition') ?? 0
      const avgFee = (makerFee + takerFee) / 2
      const feesPerTrade = round(avgFee * initialCapital * 2, 4) // entry + exit
      const totalFeesEstimate = round(nbClosedTrades * feesPerTrade)
      const returnIfFees2x = round(strategyReturn - totalFeesEstimate)
      const slippageCostPerTrade = slippage * initialCapital * 2
      const returnIfSlippage2x = round(
        strategyReturn - nbClosedTrades * slippageCostPerTrade,
      )
      db.set('feesPerTrade', feesPerTrade)
      db.set('totalFeesEstimate', totalFeesEstimate)
      db.set('returnIfFees2x', returnIfFees2x)
      db.set('returnIfSlippage2x', returnIfSlippage2x)

      const backtestDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      computeAdvancedMetrics(db, initialCapital, backtestDays)
    }
  }

  db.flush()
}

export async function runSingleSimulation(
  interval: BinanceInterval,
  pair: string,
  startDate: Date,
  endDate: Date,
  dbPath: string,
  strategyName: string,
  config: AppConfig,
  strategyConfig?: StrategyConfig,
): Promise<void> {
  const { fn, leverage } = getStrategy(strategyName, interval)
  await simulation(
    interval,
    pair,
    startDate,
    endDate,
    dbPath,
    fn,
    config,
    maxArraySizeForInterval(interval),
    {
      leverage,
      stopLossPct: strategyConfig?.stop_loss_pct,
      trailingStopPct: strategyConfig?.trailing_stop_pct,
      maxDrawdownPct: strategyConfig?.max_drawdown_pct,
      riskPerTrade: strategyConfig?.risk_per_trade,
      fundingRate: config.fundingRate,
      slippage: config.slippage,
      makerFee: config.makerFee,
      takerFee: config.takerFee,
    },
  )
}

function spawnWorker(data: WorkerData): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = fileURLToPath(
      new URL('./simulation.worker.ts', import.meta.url),
    )
    const child = fork(workerPath, [], {
      execArgv: ['--import', 'tsx'],
    })
    let settled = false
    child.on('message', (msg: { type: string; message?: string }) => {
      if (settled) return
      if (msg.type === 'done') {
        settled = true
        resolve()
      }
      if (msg.type === 'error') {
        settled = true
        reject(new Error(msg.message))
      }
    })
    child.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
    child.on('exit', (code) => {
      if (!settled && code !== 0) {
        settled = true
        reject(new Error(`Worker exited with code ${code}`))
      }
    })
    child.send(data)
  })
}

async function runWorkerPool(
  tasks: WorkerData[],
  maxWorkers: number,
): Promise<void> {
  let nextIndex = 0
  let completed = 0
  const total = tasks.length

  async function lane(): Promise<void> {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex++]
      const taskStart = Date.now()
      await spawnWorker(task)
      completed++
      const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)
      logger.info(
        `[${completed}/${total}] ${task.strategyName} (${task.pair} ${task.interval}) completed in ${elapsed}s`,
      )
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxWorkers, tasks.length) }, () => lane()),
  )
}

function generateRunId(): string {
  return formatTimestamp(new Date())
}

export async function runSimulation(
  params?: SimulationParams,
  configPath?: string,
): Promise<string> {
  const config = loadConfig(configPath)
  const simulationStart = Date.now()
  const runId = generateRunId()
  const runFolder = `db/${runId}`
  mkdirSync(runFolder, { recursive: true })
  logger.info(`Starting simulation (run: ${runId})`)

  if (params) {
    const strategyName = params.strategy ?? Object.keys(config.strategies)[0]
    const strategyConfig = config.strategies[strategyName]
    logger.info(
      `Running single backtest: ${strategyName} on ${params.pair} ${params.interval}`,
    )
    const singleStart = Date.now()
    await runSingleSimulation(
      params.interval,
      params.pair,
      params.startDate,
      params.endDate,
      `${runFolder}/${params.pair}_${params.interval}_${strategyName}_${formatDate(params.startDate)}_${formatDate(params.endDate)}.json`,
      strategyName,
      config,
      strategyConfig,
    )
    const singleElapsed = ((Date.now() - singleStart) / 1000).toFixed(1)
    logger.info(
      `Backtest ${strategyName} (${params.pair} ${params.interval}) completed in ${singleElapsed}s`,
    )
  } else {
    const { symbols, dates, strategies, walkForward } = config
    const allCombinations: WorkerData[] = []
    const uniqueData = new Map<
      string,
      { interval: BinanceInterval; pair: string; start: Date; end: Date }
    >()

    // Walk-forward: split each date range into train/test periods
    const effectiveDates = walkForward?.enabled
      ? dates.flatMap((d) => {
          const totalMs = d.end.getTime() - d.start.getTime()
          const splitMs = d.start.getTime() + totalMs * walkForward.trainRatio
          const splitDate = new Date(splitMs)
          return [
            { start: d.start, end: splitDate },
            { start: splitDate, end: d.end },
          ]
        })
      : dates

    if (walkForward?.enabled) {
      logger.info(
        `Walk-forward enabled: ${(walkForward.trainRatio * 100).toFixed(0)}% train / ${((1 - walkForward.trainRatio) * 100).toFixed(0)}% test`,
      )
    }

    const strategyNames = Object.keys(strategies)
    logger.info(`Symbols: ${symbols.join(', ')}`)
    logger.info(`Strategies: ${strategyNames.length}`)

    for (const [strategyName, strategyConfig] of Object.entries(strategies)) {
      const {
        timeframes,
        stop_loss_pct,
        trailing_stop_pct,
        max_drawdown_pct,
        risk_per_trade,
      } = strategyConfig
      logger.info(
        `  ${strategyName}: ${timeframes.join(', ')}${stop_loss_pct !== undefined ? ` SL=${(stop_loss_pct * 100).toFixed(0)}%` : ''}${trailing_stop_pct !== undefined ? ` TS=${(trailing_stop_pct * 100).toFixed(0)}%` : ''}${max_drawdown_pct !== undefined ? ` CB=${(max_drawdown_pct * 100).toFixed(0)}%` : ''}${risk_per_trade !== undefined ? ` RPT=${(risk_per_trade * 100).toFixed(0)}%` : ''}`,
      )

      for (const pair of symbols) {
        for (const tf of timeframes) {
          for (const dateRange of effectiveDates) {
            const dataKey = `${pair}_${tf}_${formatDate(dateRange.start)}_${formatDate(dateRange.end)}`
            if (!uniqueData.has(dataKey)) {
              uniqueData.set(dataKey, {
                interval: tf,
                pair,
                start: dateRange.start,
                end: dateRange.end,
              })
            }
            allCombinations.push({
              configPath,
              interval: tf,
              pair,
              startDateIso: dateRange.start.toISOString(),
              endDateIso: dateRange.end.toISOString(),
              strategyName,
              dbPath: `${runFolder}/${pair}_${tf}_${strategyName}_${formatDate(dateRange.start)}_${formatDate(dateRange.end)}.json`,
              stopLossPct: stop_loss_pct,
              trailingStopPct: trailing_stop_pct,
              maxDrawdownPct: max_drawdown_pct,
              riskPerTrade: risk_per_trade,
            })
          }
        }
      }
    }

    if (allCombinations.length === 0) {
      logger.warn('No simulation combinations generated')
      return runId
    }

    // Walk-forward needs original full-range data files too (sub-periods read from them)
    if (walkForward?.enabled) {
      for (const pair of symbols) {
        for (const [, strategyConfig] of Object.entries(strategies)) {
          for (const tf of strategyConfig.timeframes) {
            for (const dateRange of dates) {
              const fullKey = `${pair}_${tf}_${formatDate(dateRange.start)}_${formatDate(dateRange.end)}`
              if (!uniqueData.has(fullKey)) {
                uniqueData.set(fullKey, {
                  interval: tf,
                  pair,
                  start: dateRange.start,
                  end: dateRange.end,
                })
              }
            }
          }
        }
      }
    }

    logger.info(`Downloading ${uniqueData.size} unique data files...`)
    const downloadStart = Date.now()
    await Promise.all(
      Array.from(uniqueData.entries()).map(([key, d]) =>
        readAndLoadData(d.interval, d.pair, d.start, d.end, `data/${key}.json`),
      ),
    )
    const downloadElapsed = ((Date.now() - downloadStart) / 1000).toFixed(1)
    logger.info(`Data download completed in ${downloadElapsed}s`)

    const maxWorkers = availableParallelism()
    logger.info(
      `Dispatching ${allCombinations.length} simulations across ${Math.min(maxWorkers, allCombinations.length)} parallel processes`,
    )

    await runWorkerPool(allCombinations, maxWorkers)
  }

  const totalElapsed = ((Date.now() - simulationStart) / 1000).toFixed(1)
  logger.info(`Simulation finished in ${totalElapsed}s (run: ${runId})`)
  return runId
}
