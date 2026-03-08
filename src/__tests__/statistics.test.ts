import { describe, expect, it } from 'vitest'
import { monteCarloSimulation, tTest } from '../statistics'

describe('tTest', () => {
  it('returns not significant for empty array', () => {
    const result = tTest([])
    expect(result.tStatistic).toBe(0)
    expect(result.pValue).toBe(1)
    expect(result.isSignificant).toBe(false)
  })

  it('returns not significant for single value', () => {
    const result = tTest([100])
    expect(result.pValue).toBe(1)
    expect(result.isSignificant).toBe(false)
  })

  it('detects significant positive returns', () => {
    // Consistently positive profits
    const profits = [
      100, 150, 200, 120, 180, 90, 160, 130, 110, 140, 170, 105, 190, 115, 145,
      125, 155, 135, 165, 175, 185, 195, 205, 210, 215, 220, 225, 230, 235, 240,
    ]
    const result = tTest(profits)
    expect(result.tStatistic).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(0.05)
    expect(result.isSignificant).toBe(true)
  })

  it('detects not significant mixed returns', () => {
    // Random walk around zero
    const profits = [10, -10, 5, -5, 3, -3, 7, -7, 1, -1]
    const result = tTest(profits)
    expect(result.isSignificant).toBe(false)
  })

  it('handles all-zero profits', () => {
    const result = tTest([0, 0, 0, 0, 0])
    expect(result.tStatistic).toBe(0)
    expect(result.isSignificant).toBe(false)
  })

  it('handles identical positive values (zero variance)', () => {
    const result = tTest([100, 100, 100, 100])
    expect(result.tStatistic).toBe(9999)
    expect(result.isSignificant).toBe(true)
  })
})

describe('monteCarloSimulation', () => {
  it('returns zeros for empty profits', () => {
    const result = monteCarloSimulation([], 10000)
    expect(result.median).toBe(0)
    expect(result.p5).toBe(0)
    expect(result.p95).toBe(0)
    expect(result.ruinProbability).toBe(0)
  })

  it('produces reasonable results for profitable trades', () => {
    const profits = [500, 300, -200, 400, -100, 600, 200, -150, 350, 250]
    const result = monteCarloSimulation(profits, 10000, 500)

    // With net positive profits, median should be above initial capital
    expect(result.median).toBeGreaterThan(10000)
    // P95 should be >= median
    expect(result.p95).toBeGreaterThanOrEqual(result.median)
    // P5 should be <= median
    expect(result.p5).toBeLessThanOrEqual(result.median)
    // Low ruin probability with these profits
    expect(result.ruinProbability).toBeLessThan(0.1)
  })

  it('detects high ruin probability for losing trades', () => {
    // Mostly losing trades with large losses
    const profits = [-5000, -3000, -4000, 100, -6000, -2000, 50, -3500]
    const result = monteCarloSimulation(profits, 10000, 500)

    // High ruin probability expected
    expect(result.ruinProbability).toBeGreaterThan(0.5)
  })

  it('preserves total P&L regardless of order', () => {
    const profits = [100, -50, 200, -30, 150]
    const totalPnL = profits.reduce((s, p) => s + p, 0)
    const result = monteCarloSimulation(profits, 10000, 100)

    // Median should be close to initial + total PnL (within some variance)
    // Not exact because some paths may hit ruin
    expect(result.median).toBeGreaterThan(10000 + totalPnL * 0.5)
  })

  it('returns p5 < median < p95', () => {
    const profits = [200, -100, 300, -150, 250, -80, 400, -200, 350, -120]
    const result = monteCarloSimulation(profits, 10000, 500)

    expect(result.p5).toBeLessThanOrEqual(result.median)
    expect(result.median).toBeLessThanOrEqual(result.p95)
  })
})
