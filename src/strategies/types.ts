import type { CandleStick } from '../types'

export type Signal = 'buy' | 'sell'

export type PositionType = 'buy' | 'sell'

export type StrategyFn = (
  data: CandleStick[],
  positionType?: PositionType,
) => Signal | null

// Builtin strategies: 'pmax' | 'supertrend' | 'turtle' | 'confluence'
// Custom strategies loaded from strategies/*.json are also valid
export type StrategyName = string
