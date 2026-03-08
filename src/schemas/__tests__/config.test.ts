import { describe, expect, it } from 'vitest'
import { RawConfigSchema } from '../config'

const validConfig = {
  fees: 0.0026,
  initialCapital: 10000,
  symbols: ['ETHUSDT', 'BTCUSDT'],
  dates: [{ start: '2022-01-01', end: '2026-03-01' }],
  strategies: {
    supertrend: { timeframes: ['4h', '6h'] },
  },
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

  it('validates config with defaults', () => {
    const withDefaults = {
      ...validConfig,
      defaults: {
        timeframes: ['6h'],
        stop_loss_pct: 0.1,
        trailing_stop_pct: 0.15,
      },
      strategies: {
        supertrend: {},
        pmax: { timeframes: ['4h'] },
      },
    }
    expect(RawConfigSchema.safeParse(withDefaults).success).toBe(true)
  })

  it('validates config with empty strategy (relies on defaults)', () => {
    const withDefaults = {
      ...validConfig,
      defaults: { timeframes: ['6h'] },
      strategies: { supertrend: {} },
    }
    expect(RawConfigSchema.safeParse(withDefaults).success).toBe(true)
  })
})
