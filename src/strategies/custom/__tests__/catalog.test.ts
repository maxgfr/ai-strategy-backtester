import { describe, expect, it } from 'vitest'
import type { CandleStick } from '../../../types'
import { catalog } from '../catalog'

function makeCandles(count: number): CandleStick[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1700000000 + i * 3600,
    open: 100 + Math.sin(i * 0.1) * 10,
    high: 105 + Math.sin(i * 0.1) * 10,
    low: 95 + Math.sin(i * 0.1) * 10,
    close: 102 + Math.sin(i * 0.1) * 10,
    volume: 1000 + i * 10,
  }))
}

describe('catalog', () => {
  const candles = makeCandles(200)

  for (const [name, entry] of Object.entries(catalog)) {
    it(`${name} produces output with default params`, () => {
      const defaults: Record<string, number> = {}
      for (const p of entry.params) {
        defaults[p.name] = p.default
      }

      const result = entry.compute(candles, defaults)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Find a non-undefined/non-null value
      const validItem = result.find((v) => v != null)
      if (validItem === undefined) return // some indicators may need more data

      if (entry.outputType === 'number') {
        expect(typeof validItem).toBe('number')
      } else {
        expect(typeof validItem).toBe('object')
        if (entry.fields) {
          for (const field of entry.fields) {
            expect(field in (validItem as Record<string, unknown>)).toBe(true)
          }
        }
      }
    })
  }
})
