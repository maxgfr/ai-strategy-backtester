import { exec } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './logger'
import type { SimulationResult } from './report-html'
import { generateHtml } from './report-html'
import type { CandleStick, DbSchema } from './types'
import { formatDate, pad2 } from './utils'

type ParsedFilename = {
  pair: string
  interval: string
  strategy: string
  startDate: string
  endDate: string
}

type Category = 'Long-Only' | 'Shorting'

function classifyResult(data: DbSchema): Category {
  // If there were any short trades, it's a shorting strategy
  const shortTrades = data.shortTrades ?? 0
  return shortTrades > 0 ? 'Shorting' : 'Long-Only'
}

function parseFilename(filename: string): ParsedFilename | null {
  const name = filename.replace('.json', '')
  // Format: PAIR_INTERVAL_STRATEGY_STARTDATE_ENDDATE
  // Strategy names may contain hyphens/underscores, so match dates from the end
  // Dates are YYYY-MM-DD (with hyphens) or YYYYMMDD (without)
  const match = name.match(
    /^([A-Z0-9]+)_(\w+?)_(.+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/,
  )
  if (!match) return null

  return {
    pair: match[1],
    interval: match[2],
    strategy: match[3],
    startDate: match[4],
    endDate: match[5],
  }
}

function loadResults(dbFolder: string): SimulationResult[] {
  const files = readdirSync(dbFolder).filter((f) => f.endsWith('.json'))
  const results: SimulationResult[] = []

  for (const file of files) {
    const parsed = parseFilename(file)
    if (!parsed) continue

    try {
      const raw = readFileSync(resolve(dbFolder, file), 'utf-8')
      const data = JSON.parse(raw) as DbSchema
      if (data.lastPositionMoney === undefined) continue
      results.push({
        ...parsed,
        data,
        category: classifyResult(data),
      })
    } catch {
      logger.warn(`Skipping unreadable file: ${file}`)
    }
  }

  return results
}

function loadCandleData(
  dataFolder: string,
  results: SimulationResult[],
): Record<string, number[][]> {
  const uniqueKeys = new Set<string>()
  for (const r of results) {
    uniqueKeys.add(`${r.pair}_${r.interval}_${r.startDate}_${r.endDate}`)
  }

  const candleData: Record<string, number[][]> = {}
  for (const key of uniqueKeys) {
    const filePath = resolve(dataFolder, `${key}.json`)
    if (!existsSync(filePath)) {
      logger.warn(`Candle data not found: ${filePath}`)
      continue
    }
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const candles = JSON.parse(raw) as CandleStick[]

      const seen = new Set<number>()
      const deduped: number[][] = []
      for (const c of candles) {
        if (!seen.has(c.time)) {
          seen.add(c.time)
          deduped.push([
            c.time,
            c.open,
            c.high,
            c.low,
            c.close,
            Math.round(c.volume),
          ])
        }
      }
      candleData[key] = deduped
    } catch {
      logger.warn(`Failed to read candle data: ${filePath}`)
    }
  }

  return candleData
}

function buildReportFilename(): string {
  const now = new Date()
  const date = formatDate(now)
  const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  return `report_${date}_${time}.html`
}

function findLatestRunFolder(dbRoot: string): string | null {
  if (!existsSync(dbRoot)) return null
  const entries = readdirSync(dbRoot)
    .filter((e) => statSync(resolve(dbRoot, e)).isDirectory())
    .sort()
  return entries.length > 0 ? entries[entries.length - 1] : null
}

export function generateReport(runId?: string): string | null {
  const dbRoot = resolve(process.cwd(), 'db')
  const resolvedRunId = runId ?? findLatestRunFolder(dbRoot)
  if (!resolvedRunId) {
    logger.error('No simulation runs found in db/. Run pnpm backtest first.')
    return null
  }
  const dbFolder = resolve(dbRoot, resolvedRunId)
  if (!existsSync(dbFolder)) {
    logger.error(`Run folder not found: ${dbFolder}`)
    return null
  }
  const dataFolder = resolve(process.cwd(), 'data')
  const outputDir = resolve(process.cwd(), 'reports')
  const outputPath = resolve(outputDir, buildReportFilename())
  logger.info(`Using run: ${resolvedRunId}`)

  logger.info('Loading simulation results...')
  const results = loadResults(dbFolder)

  if (results.length === 0) {
    logger.error('No simulation results found in db/. Run pnpm backtest first.')
    return null
  }

  logger.info(`Found ${results.length} simulation results`)

  logger.info('Loading candle data for charts...')
  const candleData = loadCandleData(dataFolder, results)
  logger.info(
    `Loaded ${Object.keys(candleData).length} candle datasets for charts`,
  )

  mkdirSync(outputDir, { recursive: true })
  const html = generateHtml(results, candleData)
  writeFileSync(outputPath, html)
  logger.info(`Report generated: ${outputPath}`)
  return outputPath
}

// Allow direct execution via `pnpm report`
const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]).replace(/\.ts$/, '') ===
    fileURLToPath(import.meta.url).replace(/\.ts$/, '')

if (isDirectExecution) {
  const reportPath = generateReport()
  if (reportPath) {
    exec(`open "${reportPath}"`)
  }
}
