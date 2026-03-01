import { fork } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import { type AppConfig, buildDbModel, loadConfig } from './config'
import { cleanFilesOfFolder, readAndLoadData } from './data'
import { Database, type IDatabase } from './database'
import { logger } from './logger'
import { getStrategy, listStrategies } from './strategies/registry'
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
  const profitFactor =
    grossLoss === 0 ? Infinity : round(grossProfit / grossLoss)

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
): Promise<void> {
  const db = new Database(dbPath, buildDbModel(config))
  const historic: Array<CandleStick> = await readAndLoadData(
    interval,
    pair,
    startDate,
    endDate,
    `data/${pair}_${interval}_${formatDate(startDate)}_${formatDate(endDate)}.json`,
  )

  const { fees, initialCapital } = config.trading
  const { maxArraySize } = config.simulation
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

    const dataWindow = window.slice(Math.max(window.length - maxArraySize, 0))

    const signal = strategy(dataWindow)
    const lastPosition = db.get('position')

    if (signal === 'buy' && lastPosition.type !== 'buy') {
      executeBuy(price, date, db, fees)
    } else if (signal === 'sell' && lastPosition.type !== 'sell') {
      executeSell(price, date, db, fees)
    }

    window.push(candle)

    if (i === historic.length - 1) {
      let finalPosition = db.get('position')
      if (finalPosition.type === 'buy') {
        executeSell(price, date, db, fees)
      }
      finalPosition = db.get('position')
      const hodlAssets = db.get('hodlAssets') ?? 0
      const hodlMoney = hodlAssets * price
      db.set('hodlMoney', hodlMoney)
      db.set('lastPositionMoney', finalPosition.capital)
      db.set('profit', finalPosition.capital - hodlMoney)
      db.set(
        'percentageProfit',
        `${round(((finalPosition.capital - hodlMoney) / hodlMoney) * 100)}%`,
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
  await simulation(interval, pair, startDate, endDate, dbPath, strategy, config)
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

  async function lane(): Promise<void> {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex++]
      await spawnWorker(task)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxWorkers, tasks.length) }, () => lane()),
  )
}

export async function runSimulation(
  params?: SimulationParams,
  configPath?: string,
): Promise<void> {
  const config = loadConfig(configPath)
  logger.info('Running simulation')
  cleanFilesOfFolder([config.paths.dbFolder], ['.gitkeep', '.gitignore'])

  if (params) {
    const defaultStrategy =
      config.simulation.strategies[0] === '*'
        ? listStrategies()[0]
        : config.simulation.strategies[0]
    const strategyName = params.strategy ?? defaultStrategy
    await runSingleSimulation(
      params.interval,
      params.pair,
      params.startDate,
      params.endDate,
      `${config.paths.dbFolder}/${params.pair}_${params.interval}_${strategyName}_${formatDate(params.startDate)}_${formatDate(params.endDate)}.json`,
      strategyName,
      config,
    )
    logger.info(
      `Simulation with pair '${params.pair}', interval '${params.interval}', strategy '${strategyName}' finished`,
    )
  } else {
    const pair = config.trading.pair
    const strategies =
      config.simulation.strategies.length === 1 &&
      config.simulation.strategies[0] === '*'
        ? listStrategies()
        : config.simulation.strategies
    const combinations = strategies.flatMap((strategyName) =>
      config.simulation.periods.flatMap((period) =>
        config.simulation.dates.map((dates) => ({
          strategyName,
          period,
          dates,
        })),
      ),
    )

    // Pre-download unique data files to avoid race conditions between workers
    const uniqueData = new Map<
      string,
      { interval: BinanceInterval; pair: string; start: Date; end: Date }
    >()
    for (const { period, dates } of combinations) {
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

    logger.info(
      `Pre-downloading ${uniqueData.size} unique data files before worker dispatch`,
    )
    await Promise.all(
      Array.from(uniqueData.entries()).map(([key, d]) =>
        readAndLoadData(d.interval, d.pair, d.start, d.end, `data/${key}.json`),
      ),
    )

    const maxWorkers = availableParallelism()
    logger.info(
      `Dispatching ${combinations.length} simulations across ${Math.min(maxWorkers, combinations.length)} parallel processes`,
    )

    const workerTasks: WorkerData[] = combinations.map(
      ({ strategyName, period, dates }) => ({
        configPath,
        interval: period,
        pair,
        startDateIso: dates.start.toISOString(),
        endDateIso: dates.end.toISOString(),
        strategyName,
        dbPath: `${config.paths.dbFolder}/${pair}_${period}_${strategyName}_${formatDate(dates.start)}_${formatDate(dates.end)}.json`,
      }),
    )

    await runWorkerPool(workerTasks, maxWorkers)
  }

  logger.info('Simulation finished')
}
