# AI Strategy Backtester

Crypto strategy backtester using Binance historical data. Define trading strategies as declarative JSON, backtest them across multiple timeframes and date ranges, and compare results in an HTML report. AI can generate strategies from natural language.

## Features

- **35 technical indicators** — RSI, MACD, Supertrend, Bollinger Bands, Ichimoku, KDJ, StochRSI, and more
- **Declarative JSON strategies** — no code required, compose indicators with buy/sell conditions
- **AI strategy generation** — describe a strategy in natural language, get a validated JSON file
- **Simulation profiles** — separate long-term (4h/6h/8h) and short-term (15m/30m/1h) backtests
- **Parallel execution** — worker pool dispatches simulations across all CPU cores
- **HTML report** — ranked results with category comparison, filter buttons, and key metrics

## Requirements

- Node.js >= 24
- pnpm >= 10

## Quick Start

```bash
pnpm install

# Full matrix backtest (all profiles, all strategies)
pnpm backtest

# Full matrix + open HTML report in browser
pnpm backtest:report

# Targeted backtest
pnpm backtest ETHUSDT 4h 2022-01-01 2026-02-01 rsi-macd-buy

# Targeted + open report
pnpm backtest --report ETHUSDT 4h 2022-01-01 2026-02-01 rsi-macd-buy
```

## Strategies

All strategies live as `.json` files in `strategies/`. They are auto-discovered on each run.

### Long-Term (4h/6h/8h)

Standard kebab-case names. Optimized for multi-day holds with standard indicator periods.

| Strategy | Description |
|----------|-------------|
| `rsi-macd-buy` | RSI oversold + MACD momentum |
| `supertrend` | ATR-based trend following |
| `turtle` | Donchian breakout + trailing stop |
| `confluence` | Multi-indicator score mode |
| `pmax` | EMA + ATR Supertrend |
| `breakout-volume` | Donchian breakout + ADX + volume |
| `supertrend-pullback-momentum` | Buy-the-dip in uptrend |
| `stochrsi-trend-filter` | StochRSI crossover in trend |
| `atr-trailing-vortex` | Vortex crossover + ATR trailing stop |
| `kdj-extreme-recovery` | KDJ J-line recovery in uptrend |
| `williams-extreme-momentum` | Williams %R extreme oversold + MACD |
| `dual-supertrend` | Dual Supertrend confirmation |
| `triple-trend-gate` | PMAX + Supertrend + Aroon gate |
| `volume-breakout-cmf` | CMF flow + volume + Supertrend |

### Short-Term (15m/30m/1h)

Prefixed with `st-`. Shorter indicator periods for faster signals.

| Strategy | Description |
|----------|-------------|
| `st-scalp-rsi-bb` | BB mean reversion + RSI oversold |
| `st-fast-supertrend` | Fast Supertrend + MACD + ADX |
| `st-vwap-momentum` | VWAP gate + score mode |
| `st-stochrsi-keltner` | StochRSI + Keltner lower band |
| `st-donchian-micro` | Micro Donchian breakout |
| `st-psar-roc` | PSAR + ROC + CMF |
| `st-kdj-ema-scalp` | KDJ + EMA crossover |

### Creating a Strategy

Write a JSON file in `strategies/`:

```json
{
  "name": "my-strategy",
  "description": "Buy when RSI oversold and MACD positive",
  "indicators": {
    "rsi": { "period": 14 },
    "macd": { "fast": 12, "slow": 26, "signal": 9 }
  },
  "buy": {
    "mode": "all",
    "conditions": [["rsi", "<", 30], ["macd.histogram", ">", 0]]
  },
  "sell": {
    "mode": "any",
    "conditions": [["rsi", ">", 70]]
  }
}
```

**Signal modes:** `all` (AND), `any` (OR), `score` (count-based with threshold + optional required conditions).

See [`STRATEGY_PROMPT.md`](STRATEGY_PROMPT.md) for the full specification: JSON schema, all 35 indicators with parameters, value reference syntax, anti-patterns, and examples. Copy-paste it to any LLM to generate strategies.

### AI Generation

Set `generation.enabled` to `true` in `config.json` and add your API key to `.env`:

```
GENERATION_API_KEY=sk-...
```

Generate a strategy from natural language:

```bash
# Long-term strategy (4h/6h/8h)
pnpm generate-strategy "Buy when RSI is oversold and volume spikes above average"

# Short-term strategy (15m/30m/1h)
pnpm generate-strategy --short-term "Scalp mean reversion on Bollinger lower band"
```

## Configuration

All settings in `config.json`:

- **`trading`** — pair, fees, initial capital
- **`simulation.profiles`** — named profiles with different timeframes, strategies, and date ranges
- **`generation`** — AI model endpoint and parameters

### Simulation Profiles

The backtest matrix runs separate profiles for long-term and short-term strategies:

| Profile | Periods | Strategies | maxArraySize |
|---------|---------|------------|--------------|
| `longTerm` | 4h, 6h, 8h | `*` (all non-st-) | 1000 |
| `shortTerm` | 15m, 30m, 1h | `st-*` | 3000 |

## Reports

```bash
# Regenerate HTML report from existing db/ results
pnpm report
```

The report includes:
- Best strategy cards (overall, long-term, short-term)
- Filter buttons to toggle by category
- Full rankings table with profit, win rate, max drawdown, Sharpe ratio
- Strategy averages across timeframes

## Development

```bash
pnpm test              # Vitest unit tests
pnpm lint              # Biome lint
pnpm format:check      # Biome format check
pnpm typecheck         # TypeScript type check
```

See `CLAUDE.md` for full architecture reference and AI assistance guidelines.
