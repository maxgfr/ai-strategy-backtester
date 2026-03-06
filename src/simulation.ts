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

function computeAdvancedMetrics(db: IDatabase, initialCapital: number): void {
  const allPosition = db.get('historicPosition')
  const tradeProfits = allPosition
    .filter((p) => p.tradeProfit !== undefined)
    .map((p) => p.tradeProfit as number)

  if (tradeProfits.length === 0) {
    db.set('profitFactor', 0)
    db.set('maxDrawdown', '0%')
    db.set('sharpeRatio', 0)
    db.set('avgTradeProfit', 0)
    return
  }

  const grossProfit = tradeProfits
    .filter((p) => p > 0)
    .reduce((s, p) => s + p, 0)
  const grossLoss = Math.abs(
    tradeProfits.filter((p) => p < 0).reduce((s, p) => s + p, 0),
  )
  const profitFactor = grossLoss === 0 ? 9999 : round(grossProfit / grossLoss)

  let maxDrawdown = 0
  let peak = initialCapital
  for (const pos of allPosition) {
    if (pos.capital > peak) peak = pos.capital
    const drawdown = (peak - pos.capital) / peak
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  const mean = tradeProfits.reduce((s, p) => s + p, 0) / tradeProfits.length
  const variance =
    tradeProfits.reduce((s, p) => s + (p - mean) ** 2, 0) / tradeProfits.length
  const stdDev = Math.sqrt(variance)

  db.set('profitFactor', profitFactor)
  db.set('maxDrawdown', `${round(maxDrawdown * 100)}%`)
  db.set('sharpeRatio', stdDev === 0 ? 0 : round(mean / stdDev))
  db.set('avgTradeProfit', round(mean))
}

type SimulationOptions = {
  leverage: number
  stopLossPct?: number
  trailingStopPct?: number
  fundingRate: number
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

  const { fees, initialCapital } = config
  const { leverage, stopLossPct, trailingStopPct, fundingRate } = opts
  const window: CandleStick[] = []

  let peakPrice = 0
  let troughPrice = Number.POSITIVE_INFINITY
  let accumulatedFunding = 0
  let totalFundingPaid = 0
  let prevTime = 0

  for (let i = 0; i < historic.length; i++) {
    const candle = historic[i]
    const price = candle.close
    const date = new Date(candle.time * 1000)

    if (i === 0) {
      const initialAssets = (initialCapital - initialCapital * fees) / price
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

    // === Liquidation check (leverage only) ===
    if (leverage > 1 && lastPosition.type === 'buy') {
      // Long liquidation: price <= entry * (1 - 1/leverage)
      const liqPrice = lastPosition.price * (1 - 1 / leverage)
      if (candle.low <= liqPrice) {
        // Liquidated — capital = 0
        const position = {
          date: date.toISOString(),
          type: 'sell' as const,
          price: liqPrice,
          capital: 0,
          assets: 0,
          tradeProfit: -lastPosition.capital,
        }
        db.set('position', position)
        db.push('historicPosition', position)
        peakPrice = 0
        accumulatedFunding = 0
        continue
      }
    }
    if (leverage > 1 && lastPosition.type === 'short') {
      // Short liquidation: price >= entry * (1 + 1/leverage)
      const liqPrice = lastPosition.price * (1 + 1 / leverage)
      if (candle.high >= liqPrice) {
        const position = {
          date: date.toISOString(),
          type: 'sell' as const,
          price: liqPrice,
          capital: 0,
          assets: 0,
          tradeProfit: -lastPosition.capital,
        }
        db.set('position', position)
        db.push('historicPosition', position)
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Stop loss check ===
    if (stopLossPct !== undefined && lastPosition.type === 'buy') {
      if (price <= lastPosition.price * (1 - stopLossPct)) {
        executeSell(price, date, db, fees, leverage, accumulatedFunding)
        peakPrice = 0
        accumulatedFunding = 0
        continue
      }
    }
    if (stopLossPct !== undefined && lastPosition.type === 'short') {
      if (price >= lastPosition.price * (1 + stopLossPct)) {
        executeCover(price, date, db, fees, leverage, accumulatedFunding)
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Trailing stop check ===
    if (lastPosition.type === 'buy') {
      if (price > peakPrice) peakPrice = price
      if (
        trailingStopPct !== undefined &&
        peakPrice > 0 &&
        price <= peakPrice * (1 - trailingStopPct)
      ) {
        executeSell(price, date, db, fees, leverage, accumulatedFunding)
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
        executeCover(price, date, db, fees, leverage, accumulatedFunding)
        troughPrice = Number.POSITIVE_INFINITY
        accumulatedFunding = 0
        continue
      }
    }

    // === Strategy signal ===
    const signal = strategy(dataWindow, lastPosition.type)

    if (signal === 'buy' && lastPosition.type !== 'buy') {
      executeBuy(price, date, db, fees, leverage)
      peakPrice = price
      troughPrice = Number.POSITIVE_INFINITY
      accumulatedFunding = 0
    } else if (signal === 'sell' && lastPosition.type !== 'sell') {
      executeSell(price, date, db, fees, leverage, accumulatedFunding)
      peakPrice = 0
      accumulatedFunding = 0
    } else if (signal === 'short' && lastPosition.type !== 'short') {
      executeShort(price, date, db, fees, leverage)
      troughPrice = price
      peakPrice = 0
      accumulatedFunding = 0
    } else if (signal === 'cover' && lastPosition.type === 'short') {
      executeCover(price, date, db, fees, leverage, accumulatedFunding)
      troughPrice = Number.POSITIVE_INFINITY
      accumulatedFunding = 0
    }

    // === Final candle: close positions and compute metrics ===
    if (i === historic.length - 1) {
      const finalType = db.get('position').type
      if (finalType === 'buy') {
        executeSell(price, date, db, fees, leverage, accumulatedFunding)
      } else if (finalType === 'short') {
        executeCover(price, date, db, fees, leverage, accumulatedFunding)
      }
      const finalPosition = db.get('position')
      const hodlAssets = db.get('hodlAssets') ?? 0
      const hodlMoney = hodlAssets * price
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
      computeTradeStats(db)
      computeAdvancedMetrics(db, initialCapital)
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
      fundingRate: config.fundingRate,
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
  const runFolder = `${config.paths.dbFolder}/${runId}`
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
    const { symbols, dates, strategies } = config
    const allCombinations: WorkerData[] = []
    const uniqueData = new Map<
      string,
      { interval: BinanceInterval; pair: string; start: Date; end: Date }
    >()

    const strategyNames = Object.keys(strategies)
    logger.info(`Symbols: ${symbols.join(', ')}`)
    logger.info(`Strategies: ${strategyNames.length}`)

    for (const [strategyName, strategyConfig] of Object.entries(strategies)) {
      const { timeframes, stop_loss_pct, trailing_stop_pct } = strategyConfig
      logger.info(
        `  ${strategyName}: ${timeframes.join(', ')}${stop_loss_pct !== undefined ? ` SL=${(stop_loss_pct * 100).toFixed(0)}%` : ''}${trailing_stop_pct !== undefined ? ` TS=${(trailing_stop_pct * 100).toFixed(0)}%` : ''}`,
      )

      for (const pair of symbols) {
        for (const tf of timeframes) {
          for (const dateRange of dates) {
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
            })
          }
        }
      }
    }

    if (allCombinations.length === 0) {
      logger.warn('No simulation combinations generated')
      return runId
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
