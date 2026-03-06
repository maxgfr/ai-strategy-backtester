import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { readJsonData } from '../data'
import type { CandleStick } from '../types'

const TEST_DIR = resolve(import.meta.dirname, '../../tmp/test-data')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
})

describe('readJsonData', () => {
  test('reads and parses candle data from JSON file', () => {
    const filePath = resolve(TEST_DIR, 'candles.json')
    const candles: CandleStick[] = [
      {
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 1000,
        time: 1672531200,
      },
      {
        open: 105,
        high: 115,
        low: 100,
        close: 112,
        volume: 1200,
        time: 1672545600,
      },
    ]
    writeFileSync(filePath, JSON.stringify(candles))

    const result = readJsonData(filePath)

    expect(result).toHaveLength(2)
    expect(result[0].open).toBe(100)
    expect(result[0].close).toBe(105)
    expect(result[1].volume).toBe(1200)
  })

  test('throws on non-existent file', () => {
    expect(() => readJsonData(resolve(TEST_DIR, 'nope.json'))).toThrow()
  })
})
