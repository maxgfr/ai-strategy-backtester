import type { IDatabase } from './database'

export const executeBuy = (
  price: number,
  date: Date,
  db: IDatabase,
  fees: number,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.capital === 0) return
  const capital = lastPosition.capital - fees * lastPosition.capital
  const assets = capital / price
  const position = {
    date: date.toISOString(),
    type: 'buy' as const,
    price,
    capital,
    assets,
  }
  db.set('position', position)
  db.push('historicPosition', position)
}

export const executeSell = (
  price: number,
  date: Date,
  db: IDatabase,
  fees: number,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.assets === 0) return
  let capital = price * lastPosition.assets
  capital = capital - fees * capital
  const tradeProfit = capital - lastPosition.capital
  const position = {
    date: date.toISOString(),
    type: 'sell' as const,
    price,
    capital,
    assets: 0,
    tradeProfit,
  }
  db.set('position', position)
  db.push('historicPosition', position)
}
