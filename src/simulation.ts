import { fork } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  type AppConfig,
  buildDbModel,
  loadConfig,
  maxArraySizeForInterval,
  type SimulationProfile,
} from './config'
import { readAndLoadData } from './data'
import { Database, type IDatabase } from './database'
import { logger } from './logger'
import { getStrategy, listStrategiesByPattern } from './strategies/registry'
import type { StrategyFn } from './strategies/types'
import { executeBuy, executeSell } from './trade'
import type { BinanceInterval, CandleStick } from './types'
import { formatDate, round } from './utils'

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
}

function computeTradeStats(db: IDatabase): void {
  const allPosition = db.get('historicPosition')
  let closePosition = 0
  let successPosition = 0
  let failedPosition = 0
  for (let i = 0; i < allPosition.length; i++) {
    if (allPosition[i].tradeProfit) {
      closePosition++
      allPosition[i].tradeProfit > 0 ? successPosition++ : failedPosition++
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

async function simulation(
  interval: BinanceInterval,
  pair: string,
  startDate: Date,
  endDate: Date,
  dbPath: string,
  strategy: StrategyFn,
  config: AppConfig,
  maxArraySize: number,
): Promise<void> {
  const db = new Database(dbPath, buildDbModel(pair, interval))
  const historic: Array<CandleStick> = await readAndLoadData(
    interval,
    pair,
    startDate,
    endDate,
    `data/${pair}_${interval}_${formatDate(startDate)}_${formatDate(endDate)}.json`,
  )

  const { fees, initialCapital } = config.trading
  const window: CandleStick[] = []

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
    }

    window.push(candle)

    const dataWindow = window.slice(Math.max(window.length - maxArraySize, 0))

    const lastPosition = db.get('position')
    const signal = strategy(dataWindow, lastPosition.type)

    if (signal === 'buy' && lastPosition.type !== 'buy') {
      executeBuy(price, date, db, fees)
    } else if (signal === 'sell' && lastPosition.type !== 'sell') {
      executeSell(price, date, db, fees)
    }

    if (i === historic.length - 1) {
      if (db.get('position').type === 'buy') {
        executeSell(price, date, db, fees)
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
): Promise<void> {
  const strategy = getStrategy(strategyName)
  await simulation(
    interval,
    pair,
    startDate,
    endDate,
    dbPath,
    strategy,
    config,
    maxArraySizeForInterval(interval),
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
        `[${completed}/${total}] ${task.strategyName} (${task.interval}) completed in ${elapsed}s`,
      )
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxWorkers, tasks.length) }, () => lane()),
  )
}

function resolveStrategiesForProfile(profile: SimulationProfile): string[] {
  return listStrategiesByPattern(profile.strategies)
}

function generateRunId(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export async function runSimulation(
  params?: SimulationParams,
  configPath?: string,
  profileFilter?: string,
): Promise<string> {
  const config = loadConfig(configPath)
  const simulationStart = Date.now()
  const runId = generateRunId()
  const runFolder = `${config.paths.dbFolder}/${runId}`
  mkdirSync(runFolder, { recursive: true })
  logger.info(`Starting simulation (run: ${runId})`)

  if (params) {
    const firstProfile = config.simulation.profiles[0]
    const defaultStrategy = resolveStrategiesForProfile(firstProfile)[0]
    const strategyName = params.strategy ?? defaultStrategy
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
    )
    const singleElapsed = ((Date.now() - singleStart) / 1000).toFixed(1)
    logger.info(
      `Backtest ${strategyName} (${params.pair} ${params.interval}) completed in ${singleElapsed}s`,
    )
  } else {
    const pairs = config.trading.pairs
    const allCombinations: WorkerData[] = []

    const uniqueData = new Map<
      string,
      { interval: BinanceInterval; pair: string; start: Date; end: Date }
    >()

    const profiles = profileFilter
      ? config.simulation.profiles.filter((p) => p.name === profileFilter)
      : config.simulation.profiles

    if (profileFilter && profiles.length === 0) {
      const available = config.simulation.profiles.map((p) => p.name).join(', ')
      logger.error(
        `Profile "${profileFilter}" not found. Available profiles: ${available}`,
      )
      return
    }

    if (profileFilter) {
      logger.info(`Filtering to profile: ${profileFilter}`)
    }

    logger.info(`Trading pairs: ${pairs.join(', ')}`)

    for (const profile of profiles) {
      const strategies = resolveStrategiesForProfile(profile)

      if (strategies.length === 0) {
        logger.warn(
          `Profile "${profile.name}": no strategies matched patterns [${profile.strategies.join(', ')}]`,
        )
        continue
      }

      logger.info(
        `Profile "${profile.name}": ${strategies.length} strategies x ${profile.periods.length} periods (${profile.periods.join(', ')}) x ${pairs.length} pairs x ${profile.dates.length} date ranges`,
      )
      logger.info(`  Strategies: ${strategies.join(', ')}`)

      const combinations = pairs.flatMap((pair) =>
        strategies.flatMap((strategyName) =>
          profile.periods.flatMap((period) =>
            profile.dates.map((dates) => ({
              pair,
              strategyName,
              period,
              dates,
            })),
          ),
        ),
      )

      for (const { pair, period, dates } of combinations) {
        const key = `${pair}_${period}_${formatDate(dates.start)}_${formatDate(dates.end)}`
        if (!uniqueData.has(key)) {
          uniqueData.set(key, {
            interval: period,
            pair,
            start: dates.start,
            end: dates.end,
          })
        }
      }

      for (const { pair, strategyName, period, dates } of combinations) {
        allCombinations.push({
          configPath,
          interval: period,
          pair,
          startDateIso: dates.start.toISOString(),
          endDateIso: dates.end.toISOString(),
          strategyName,
          dbPath: `${runFolder}/${pair}_${period}_${strategyName}_${formatDate(dates.start)}_${formatDate(dates.end)}.json`,
        })
      }
    }

    if (allCombinations.length === 0) {
      logger.warn('No simulation combinations generated from any profile')
      return
    }

    // Pre-download unique data files to avoid race conditions between workers
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
