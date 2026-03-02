import { exec } from 'node:child_process'
import 'dotenv/config'
import { logger } from './logger'
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

const profileFlagIndex = args.indexOf('--profile')
let profileFilter: string | undefined
if (profileFlagIndex !== -1) {
  profileFilter = args[profileFlagIndex + 1]
  args.splice(profileFlagIndex, 2)
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

const totalStart = Date.now()
await runSimulation(params, configPath, profileFilter)

logger.info('Generating report...')
const reportStart = Date.now()
const reportPath = generateReport()
const reportElapsed = ((Date.now() - reportStart) / 1000).toFixed(1)
if (reportPath) {
  logger.info(`Report generated in ${reportElapsed}s`)
}

const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
logger.info(`Total execution time: ${totalElapsed}s`)

if (reportPath && openReport) {
  exec(`open "${reportPath}"`)
}
