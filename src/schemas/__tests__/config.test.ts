import { describe, expect, it } from 'vitest'
import { RawConfigSchema } from '../config'

const validConfig = {
  fees: 0.0026,
  initialCapital: 10000,
  symbols: ['ETHUSDT', 'BTCUSDT'],
  dates: [{ start: '2022-01-01', end: '2026-02-01' }],
  strategies: {
    supertrend: { timeframes: ['4h', '6h'] },
  },
  paths: { dbFolder: 'db', dbFile: 'data', logFile: 'all.log' },
}

describe('RawConfigSchema', () => {
  it('validates a correct config', () => {
    expect(RawConfigSchema.safeParse(validConfig).success).toBe(true)
  })

  it('validates config with strategy stop loss and trailing stop', () => {
    const withStops = {
      ...validConfig,
      strategies: {
        supertrend: {
          timeframes: ['4h', '6h'],
          stop_loss_pct: 0.08,
          trailing_stop_pct: 0.12,
        },
      },
    }
    expect(RawConfigSchema.safeParse(withStops).success).toBe(true)
  })

  it('validates config with funding rate', () => {
    const withFunding = { ...validConfig, fundingRate: 0.0001 }
    expect(RawConfigSchema.safeParse(withFunding).success).toBe(true)
  })

  it('validates config with generation section', () => {
    const withGen = {
      ...validConfig,
      generation: {
        enabled: true,
        model: 'mistral-small-latest',
        baseUrl: 'https://api.mistral.ai/v1',
        maxTokens: 4096,
        temperature: 0.7,
      },
    }
    expect(RawConfigSchema.safeParse(withGen).success).toBe(true)
  })

  it('rejects empty symbols array', () => {
    const bad = { ...validConfig, symbols: [] }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects invalid interval in timeframes', () => {
    const bad = {
      ...validConfig,
      strategies: { test: { timeframes: ['99z'] } },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects fees > 1', () => {
    const bad = { ...validConfig, fees: 1.5 }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects negative initialCapital', () => {
    const bad = { ...validConfig, initialCapital: -100 }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects empty dates array', () => {
    const bad = { ...validConfig, dates: [] }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects missing paths', () => {
    const { paths: _, ...noPaths } = validConfig
    const result = RawConfigSchema.safeParse(noPaths)
    expect(result.success).toBe(false)
  })

  it('rejects stop_loss_pct > 1', () => {
    const bad = {
      ...validConfig,
      strategies: { test: { timeframes: ['4h'], stop_loss_pct: 1.5 } },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects funding rate > 0.01', () => {
    const bad = { ...validConfig, fundingRate: 0.05 }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })
})
