# AI Strategy Backtester

Crypto strategy backtester on Binance historical data. Describe a trading strategy in plain English and let AI generate it, then backtest it against 30+ technical indicators across multiple timeframes and date ranges.

## Features

- **AI Strategy Generation** — describe a strategy in natural language, get a validated JSON strategy file ready to backtest
- **30+ Technical Indicators** — RSI, MACD, Bollinger Bands, Supertrend, Ichimoku, ADX, PMAX, Donchian, and many more
- **Declarative JSON Strategies** — no code needed, compose indicators with buy/sell conditions in JSON
- **Parallel Backtesting** — matrix simulation across strategies, timeframes, and date ranges using worker pools
- **HTML Reports** — auto-generated reports ranking strategies by profit, Sharpe ratio, win rate, max drawdown

## Quick Start

```bash
pnpm install
```

## Usage

### Backtest

```bash
# Full matrix (all strategies x periods x dates)
pnpm backtest

# Full matrix + open HTML report in browser
pnpm backtest:report

# Targeted backtest
pnpm backtest ETHUSDT 4h 2024-01-01 2025-01-01 supertrend

# Targeted + open report
pnpm backtest --report ETHUSDT 4h 2024-01-01 2025-01-01 supertrend
```

### Generate a Strategy with AI

Set `generation.enabled` to `true` in `config.json` and add your API key to `.env`:

```
GENERATION_API_KEY=sk-...
```

Then generate a strategy from natural language:

```bash
pnpm generate-strategy "Buy when RSI < 30 and MACD histogram crosses above 0, sell when RSI > 70"
```

The AI validates the generated strategy against the indicator catalog before saving it to `strategies/`. You can immediately backtest it.

### Reports

```bash
# Regenerate HTML report from existing results
pnpm report
```

## Built-in Strategies

| Strategy | Description |
|----------|-------------|
| **PMAX** | EMA + ATR-based Supertrend trend following |
| **Supertrend** | ATR-based trend following |
| **Turtle** | Donchian breakout entry with trailing stop exit |
| **Confluence** | Multi-indicator scoring (PMAX + Supertrend + ADX + RSI + MACD + Volume) |
| **RSI-MACD Reversal** | RSI oversold + MACD momentum entry, RSI overbought exit |
| **Breakout Volume** | Donchian breakout + ADX trending + volume confirmation |

## JSON Strategy Format

Strategies are plain JSON files in `strategies/`. No TypeScript required.

```json
{
  "name": "my-strategy",
  "description": "What this strategy does",
  "indicators": {
    "rsi": { "period": 14 },
    "macd": { "fast": 12, "slow": 26, "signal": 9 }
  },
  "buy": {
    "mode": "all",
    "conditions": [["rsi", "<", 35], ["macd.histogram", ">", 0]]
  },
  "sell": {
    "mode": "any",
    "conditions": [["rsi", ">", 70]]
  }
}
```

**Signal modes:** `all` (AND), `any` (OR), `score` (count-based with threshold).

## Configuration

All settings live in `config.json`:

- **Trading** — pair, timeframe, fees, initial capital
- **Simulation** — periods, strategies, date ranges
- **Generation** — AI model, endpoint, temperature

See `CLAUDE.md` for full configuration reference.

## Development

```bash
pnpm test              # Run tests
pnpm lint              # Biome lint
pnpm format:check      # Biome format check
pnpm typecheck         # TypeScript type check
```