export type CandleStick = {
  open: number
  high: number
  close: number
  low: number
  volume: number
  time: number
}

export type Position = 'buy' | 'sell'

export type LastPosition = {
  date: string | Date
  type: Position
  price: number
  capital: number
  assets: number
  tradeProfit?: number
}

export type BinanceInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'

export type InitialParameters = {
  readonly period: BinanceInterval
  readonly pair: string
}

export type DbSchema = {
  readonly version: number
  readonly initialParameters: InitialParameters
  historicPosition: LastPosition[]
  position: LastPosition
  initialCapital?: number
  hodlAssets?: number
  hodlMoney?: number
  lastPositionMoney?: number
  profit?: number
  percentageProfit?: string
  nbPosition?: number
  closePosition?: number
  successPosition?: number
  failedPosition?: number
  percentagePosition?: string
  profitFactor?: number
  maxDrawdown?: string
  sharpeRatio?: number
  avgTradeProfit?: number
}
