import type { IDatabase } from './database'

export const executeBuy = (
  price: number,
  date: Date,
  db: IDatabase,
  fees: number,
  leverage = 1,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.capital === 0) return
  const capital = lastPosition.capital - fees * lastPosition.capital
  const assets = (capital * leverage) / price
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
  leverage = 1,
  fundingCost = 0,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.assets === 0) return
  const grossValue = price * lastPosition.assets
  const borrowed = lastPosition.capital * (leverage - 1)
  let capital = grossValue - borrowed
  capital = capital - fees * grossValue - fundingCost
  if (capital < 0) capital = 0
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

export const executeShort = (
  price: number,
  date: Date,
  db: IDatabase,
  fees: number,
  leverage = 1,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.capital === 0) return
  const capital = lastPosition.capital - fees * lastPosition.capital
  const assets = (capital * leverage) / price
  const position = {
    date: date.toISOString(),
    type: 'short' as const,
    price,
    capital,
    assets,
  }
  db.set('position', position)
  db.push('historicPosition', position)
}

export const executeCover = (
  price: number,
  date: Date,
  db: IDatabase,
  fees: number,
  _leverage = 1,
  fundingCost = 0,
): void => {
  const lastPosition = db.get('position')
  if (lastPosition.assets === 0) return
  let capital =
    lastPosition.capital + (lastPosition.price - price) * lastPosition.assets
  capital = capital - fees * price * lastPosition.assets - fundingCost
  if (capital < 0) capital = 0
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
