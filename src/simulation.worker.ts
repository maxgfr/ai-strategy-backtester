import { loadConfig } from './config'
import { runSingleSimulation } from './simulation'
import type { BinanceInterval } from './types'
import { getErrorMessage } from './utils'

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

process.on('message', (data: WorkerData) => {
  const config = loadConfig(data.configPath)
  const strategyConfig = {
    timeframes: [data.interval as BinanceInterval],
    stop_loss_pct: data.stopLossPct,
    trailing_stop_pct: data.trailingStopPct,
  }

  runSingleSimulation(
    data.interval as BinanceInterval,
    data.pair,
    new Date(data.startDateIso),
    new Date(data.endDateIso),
    data.dbPath,
    data.strategyName,
    config,
    strategyConfig,
  )
    .then(() => {
      process.send?.({ type: 'done' })
      process.disconnect()
    })
    .catch((err) => {
      process.send?.({
        type: 'error',
        message: getErrorMessage(err),
      })
      process.disconnect()
    })
})
