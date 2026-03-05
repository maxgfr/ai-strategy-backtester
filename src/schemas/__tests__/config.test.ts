import { describe, expect, it } from 'vitest'
import { RawConfigSchema } from '../config'

const validConfig = {
  trading: {
    pairs: ['ETHUSDT', 'BTCUSDT'],
    fees: 0.0026,
    initialCapital: 10000,
  },
  simulation: {
    profiles: {
      longTerm: {
        periods: ['4h', '6h'],
        strategies: ['*'],
        dates: [{ start: '2022-01-01', end: '2026-02-01' }],
      },
    },
  },
  paths: { dbFolder: 'db', dbFile: 'data', logFile: 'all.log' },
}

describe('RawConfigSchema', () => {
  it('validates a correct config with profiles', () => {
    expect(RawConfigSchema.safeParse(validConfig).success).toBe(true)
  })

  it('validates a flat simulation config (backward compat)', () => {
    const flat = {
      ...validConfig,
      simulation: {
        periods: ['4h'],
        strategies: ['*'],
        dates: [{ start: '2022-01-01', end: '2023-01-01' }],
      },
    }
    expect(RawConfigSchema.safeParse(flat).success).toBe(true)
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

  it('accepts legacy from/to format', () => {
    const legacy = {
      ...validConfig,
      trading: { from: 'ETH', to: 'USDT', fees: 0.0026, initialCapital: 10000 },
    }
    expect(RawConfigSchema.safeParse(legacy).success).toBe(true)
  })

  it('rejects empty pairs array', () => {
    const bad = {
      ...validConfig,
      trading: { pairs: [], fees: 0.0026, initialCapital: 10000 },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects invalid interval in periods', () => {
    const bad = {
      ...validConfig,
      simulation: {
        profiles: {
          test: {
            periods: ['99z'],
            strategies: ['*'],
            dates: [{ start: '2022-01-01', end: '2023-01-01' }],
          },
        },
      },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects fees > 1', () => {
    const bad = {
      ...validConfig,
      trading: { pairs: ['ETHUSDT'], fees: 1.5, initialCapital: 10000 },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects negative initialCapital', () => {
    const bad = {
      ...validConfig,
      trading: { pairs: ['ETHUSDT'], fees: 0.001, initialCapital: -100 },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects empty periods array', () => {
    const bad = {
      ...validConfig,
      simulation: {
        profiles: {
          test: {
            periods: [],
            strategies: ['*'],
            dates: [{ start: '2022-01-01', end: '2023-01-01' }],
          },
        },
      },
    }
    const result = RawConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects missing paths', () => {
    const { paths: _, ...noPaths } = validConfig
    const result = RawConfigSchema.safeParse(noPaths)
    expect(result.success).toBe(false)
  })
})
