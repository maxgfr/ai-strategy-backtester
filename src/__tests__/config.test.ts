import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { buildDbModel, loadConfig, maxArraySizeForInterval } from '../config'

describe('maxArraySizeForInterval', () => {
  test('returns 1000 for 4h (reference timeframe)', () => {
    expect(maxArraySizeForInterval('4h')).toBe(1000)
  })

  test('returns more candles for shorter timeframes', () => {
    expect(maxArraySizeForInterval('1h')).toBe(4000)
    expect(maxArraySizeForInterval('15m')).toBe(16000)
    expect(maxArraySizeForInterval('1m')).toBe(240000)
  })

  test('returns 1000 minimum for longer timeframes', () => {
    expect(maxArraySizeForInterval('1d')).toBe(1000)
    expect(maxArraySizeForInterval('1w')).toBe(1000)
  })

  test('returns 1000 for unknown interval (defaults to 240)', () => {
    expect(maxArraySizeForInterval('99z' as '4h')).toBe(1000)
  })
})

describe('buildDbModel', () => {
  test('creates default schema with pair and interval', () => {
    const model = buildDbModel('ETHUSDT', '1h')

    expect(model.version).toBe(1)
    expect(model.initialParameters.pair).toBe('ETHUSDT')
    expect(model.initialParameters.period).toBe('1h')
    expect(model.historicPosition).toEqual([])
    expect(model.position.type).toBe('sell')
    expect(model.position.capital).toBe(0)
  })
})

describe('loadConfig', () => {
  const TMP = resolve(import.meta.dirname, '../../tmp/test-config')

  beforeEach(() => {
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  test('loads valid config file', () => {
    const configPath = resolve(TMP, 'valid.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        fees: 0.001,
        initialCapital: 5000,
        symbols: ['BTCUSDT'],
        dates: [{ start: '2023-01-01', end: '2024-01-01' }],
        strategies: {
          supertrend: { timeframes: ['4h'] },
        },
        paths: { dbFolder: 'db', dbFile: 'data', logFile: 'all.log' },
      }),
    )

    const config = loadConfig(configPath)

    expect(config.fees).toBe(0.001)
    expect(config.initialCapital).toBe(5000)
    expect(config.symbols).toEqual(['BTCUSDT'])
    expect(config.strategies.supertrend.timeframes).toEqual(['4h'])
    expect(config.fundingRate).toBe(0)
  })

  test('throws on invalid config', () => {
    const configPath = resolve(TMP, 'invalid.json')
    writeFileSync(configPath, JSON.stringify({ fees: 5 }))

    expect(() => loadConfig(configPath)).toThrow('Invalid config')
  })

  test('throws on missing file', () => {
    expect(() => loadConfig(resolve(TMP, 'nope.json'))).toThrow()
  })

  test('parses strategy stop_loss_pct and trailing_stop_pct', () => {
    const configPath = resolve(TMP, 'stops.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        fees: 0.0026,
        initialCapital: 10000,
        symbols: ['ETHUSDT'],
        dates: [{ start: '2023-01-01', end: '2024-01-01' }],
        strategies: {
          pmax: {
            timeframes: ['4h'],
            stop_loss_pct: 0.08,
            trailing_stop_pct: 0.12,
          },
        },
        paths: { dbFolder: 'db', dbFile: 'data', logFile: 'all.log' },
      }),
    )

    const config = loadConfig(configPath)

    expect(config.strategies.pmax.stop_loss_pct).toBe(0.08)
    expect(config.strategies.pmax.trailing_stop_pct).toBe(0.12)
  })

  test('parses fundingRate', () => {
    const configPath = resolve(TMP, 'funding.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        fees: 0.0026,
        fundingRate: 0.0001,
        initialCapital: 10000,
        symbols: ['BTCUSDT'],
        dates: [{ start: '2023-01-01', end: '2024-01-01' }],
        strategies: { supertrend: { timeframes: ['4h'] } },
        paths: { dbFolder: 'db', dbFile: 'data', logFile: 'all.log' },
      }),
    )

    const config = loadConfig(configPath)
    expect(config.fundingRate).toBe(0.0001)
  })
})
