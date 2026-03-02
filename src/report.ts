import { exec } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from './logger'
import type { SimulationResult } from './report-html'
import { generateHtml } from './report-html'
import type { CandleStick, DbSchema } from './types'

type ParsedFilename = {
  pair: string
  interval: string
  strategy: string
  startDate: string
  endDate: string
}

const SHORT_TERM_INTERVALS = new Set([
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
])

function classifyInterval(interval: string): 'Short-Term' | 'Long-Term' {
  return SHORT_TERM_INTERVALS.has(interval) ? 'Short-Term' : 'Long-Term'
}

function parseFilename(filename: string): ParsedFilename | null {
  const name = filename.replace('.json', '')
  const parts = name.split('_')
  if (parts.length !== 5) return null

  return {
    pair: parts[0],
    interval: parts[1],
    strategy: parts[2],
    startDate: parts[3],
    endDate: parts[4],
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
        category: classifyInterval(parsed.interval),
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

      // Deduplicate by timestamp — Binance API sometimes returns duplicate candles
      // which causes lightweight-charts to crash (requires strictly increasing times)
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

export function generateReport(): string | null {
  const dbFolder = resolve(process.cwd(), 'db')
  const dataFolder = resolve(process.cwd(), 'data')
  const outputDir = resolve(process.cwd(), 'reports')
  const outputPath = resolve(outputDir, 'report.html')

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
