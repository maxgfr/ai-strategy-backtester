import { loadConfig } from './config'
import { runSingleSimulation } from './simulation'
import type { BinanceInterval } from './types'

type WorkerData = {
  configPath?: string
  interval: string
  pair: string
  startDateIso: string
  endDateIso: string
  strategyName: string
  dbPath: string
}

process.on('message', (data: WorkerData) => {
  const config = loadConfig(data.configPath)

  runSingleSimulation(
    data.interval as BinanceInterval,
    data.pair,
    new Date(data.startDateIso),
    new Date(data.endDateIso),
    data.dbPath,
    data.strategyName,
    config,
  )
    .then(() => {
      process.send?.({ type: 'done' })
      process.disconnect()
    })
    .catch((err) => {
      process.send?.({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      process.disconnect()
    })
})
