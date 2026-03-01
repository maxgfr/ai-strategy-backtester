import { exec } from 'node:child_process'
import 'dotenv/config'
import { generateReport } from './report'
import { runSimulation } from './simulation'
import type { BinanceInterval } from './types'

// Usage: pnpm backtest [pair] [interval] [startDate] [endDate] [strategy] [--config path]
// Example: pnpm backtest BTCUSDT 4h 2020-01-09 2021-01-12 pmax
// Without args: runs the full matrix from config (strategies x periods x dates)

const args = process.argv.slice(2)

const reportFlagIndex = args.indexOf('--report')
const openReport = reportFlagIndex !== -1
if (reportFlagIndex !== -1) {
  args.splice(reportFlagIndex, 1)
}

const configFlagIndex = args.indexOf('--config')
let configPath: string | undefined
if (configFlagIndex !== -1) {
  configPath = args[configFlagIndex + 1]
  args.splice(configFlagIndex, 2)
}

const [pair, interval, startDateStr, endDateStr, strategy] = args

const params =
  pair && interval && startDateStr && endDateStr
    ? {
        pair: pair.toUpperCase(),
        interval: interval as BinanceInterval,
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
        strategy: strategy,
      }
    : undefined

await runSimulation(params, configPath)

const reportPath = generateReport()
if (reportPath && openReport) {
  exec(`open "${reportPath}"`)
}
