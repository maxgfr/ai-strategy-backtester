export type Op = '>' | '<' | '>=' | '<=' | '==' | '!='

export type ValueRef = number | string

export type Condition = [ValueRef, Op, ValueRef]

export type SimpleSignalBlock = {
  readonly mode: 'all' | 'any'
  readonly conditions: Condition[]
}

export type ScoreSignalBlock = {
  readonly mode: 'score'
  readonly threshold: number
  readonly required?: Condition[]
  readonly scored: Condition[]
}

export type SignalBlock = SimpleSignalBlock | ScoreSignalBlock

// Indicator params. Use _type to alias a catalog indicator under a different name
// e.g. { "_type": "donchian", "period": 200 } registers as the alias key, computes as donchian
export type IndicatorParams = { readonly _type?: string } & Record<
  string,
  number | string | undefined
>

export type CustomStrategyDef = {
  readonly name: string
  readonly description: string
  readonly leverage?: number
  readonly indicators: Record<string, IndicatorParams>
  readonly buy: SignalBlock
  readonly sell: SignalBlock
  readonly short?: SignalBlock
  readonly cover?: SignalBlock
}
