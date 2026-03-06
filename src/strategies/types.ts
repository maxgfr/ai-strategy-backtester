import type { CandleStick } from '../types'

export type Signal = 'buy' | 'sell' | 'short' | 'cover'

export type PositionType = 'buy' | 'sell' | 'short'

export type StrategyFn = (
  data: CandleStick[],
  positionType?: PositionType,
) => Signal | null

export type ResolvedStrategy = {
  fn: StrategyFn
  leverage: number
}

// Builtin strategies: 'pmax' | 'supertrend' | 'turtle' | 'confluence'
// Custom strategies loaded from strategies/*.json are also valid
export type StrategyName = string
