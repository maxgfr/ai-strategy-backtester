import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const TEST_DIR = resolve(import.meta.dirname, '../../tmp/test-report')
const DB_DIR = resolve(TEST_DIR, 'db')
const DATA_DIR = resolve(TEST_DIR, 'data')
const REPORTS_DIR = resolve(TEST_DIR, 'reports')

beforeEach(() => {
  mkdirSync(resolve(DB_DIR, 'run1'), { recursive: true })
  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(REPORTS_DIR, { recursive: true })
  vi.spyOn(process, 'cwd').mockReturnValue(TEST_DIR)
})

afterEach(() => {
  vi.restoreAllMocks()
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
})

describe('generateReport', () => {
  test('returns null when no runs exist', async () => {
    rmSync(DB_DIR, { recursive: true })
    const { generateReport } = await import('../report')

    const result = generateReport()
    expect(result).toBeNull()
  })

  test('returns null when run folder has no results', async () => {
    const { generateReport } = await import('../report')

    const result = generateReport('run1')
    expect(result).toBeNull()
  })

  test('generates HTML report from simulation results', async () => {
    const resultFile = 'BTCUSDT_4h_supertrend_2023-01-01_2024-01-01.json'
    writeFileSync(
      resolve(DB_DIR, 'run1', resultFile),
      JSON.stringify({
        version: 1,
        initialParameters: { period: '4h', pair: 'BTCUSDT' },
        historicPosition: [
          {
            date: '2023-02-01',
            type: 'buy',
            price: 23000,
            capital: 9974,
            assets: 0.433,
          },
          {
            date: '2023-06-01',
            type: 'sell',
            price: 30000,
            capital: 12974,
            assets: 0,
            tradeProfit: 3000,
          },
        ],
        position: {
          date: '2023-06-01',
          type: 'sell',
          price: 30000,
          capital: 12974,
          assets: 0,
        },
        initialCapital: 10000,
        lastPositionMoney: 12974,
        profit: 2974,
        percentageProfit: '29.74',
        nbPosition: 2,
        closePosition: 1,
        successPosition: 1,
        failedPosition: 0,
        percentagePosition: '100.00',
        profitFactor: 999,
        maxDrawdown: '0.00',
        sharpeRatio: 1.5,
        avgTradeProfit: 3000,
      }),
    )

    const { generateReport } = await import('../report')
    const result = generateReport('run1')

    expect(result).not.toBeNull()
    expect(result).toContain('reports/')
    expect(result).toMatch(/\.html$/)
    expect(existsSync(result as string)).toBe(true)
  })
})
