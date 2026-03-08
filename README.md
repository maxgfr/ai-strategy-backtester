# AI Strategy Backtester

Crypto strategy backtester using Binance historical data. Define trading strategies as declarative JSON, backtest them across multiple timeframes and date ranges, and compare results in an HTML report. AI can generate strategies from natural language.

## Features

- **51 technical indicators** — RSI, MACD, Supertrend, Bollinger Bands, Ichimoku, KDJ, StochRSI, HMA, Choppiness Index, Ultimate Oscillator, and more
- **Declarative JSON strategies** — no code required, compose indicators with buy/sell/short/cover conditions
- **Timeframe auto-scaling** — indicator periods automatically adapt based on running timeframe (4h reference)
- **AI strategy generation** — describe a strategy in natural language, get a validated JSON file
- **Per-strategy configuration** — each strategy has its own timeframes, stop loss, and trailing stop settings
- **Shorting & leverage** — strategies can short sell with configurable leverage (1x-125x)
- **Funding fees & liquidation** — realistic perpetual futures simulation with 8h funding and intra-candle liquidation
- **Parallel execution** — worker pool dispatches simulations across all CPU cores
- **HTML report** — ranked results with category comparison (Long-Only vs Shorting), filter buttons, and key metrics

## Requirements

- Node.js >= 24
- pnpm >= 10

## Quick Start

```bash
pnpm install

# Full matrix backtest (all strategies x timeframes x symbols)
pnpm backtest

# Full matrix + open HTML report in browser
pnpm backtest:report

# Targeted backtest
pnpm backtest ETHUSDT 4h 2022-01-01 2026-02-01 rsi-macd-trend-ride

# Targeted + open report
pnpm backtest --report ETHUSDT 4h 2022-01-01 2026-02-01 rsi-macd-trend-ride
```

## Strategies

All strategies live as `.json` files in `strategies/`. They are auto-discovered on each run. No prefix conventions — all names are plain kebab-case.

### Available Strategies (22)

| Strategy | Description |
|----------|-------------|
| `rsi-macd-trend-ride` | RSI oversold + MACD, RSI > 80 exit (best performer) |
| `turtle` | 200-period Donchian breakout + trailing stop |
| `supertrend-pullback-momentum` | Supertrend dip buyer + RSI pullback |
| `supertrend` | ATR-based trend following |
| `confluence` | Multi-indicator score mode (PMAX + Supertrend + ADX + RSI + MACD) |
| `pmax` | EMA + ATR-based Supertrend |
| `breakout-volume` | Donchian breakout + ADX + volume |
| `stochrsi-trend-filter` | StochRSI crossover in Supertrend uptrend |
| `kdj-extreme-recovery` | KDJ J-line recovery in uptrend |
| `bollinger-squeeze` | BB squeeze breakout + MACD + ADX |
| `ichimoku-cloud` | Ichimoku cloud trend following |
| `fast-supertrend` | Fast Supertrend + RSI + ADX |
| `vwap-momentum` | VWAP-gated score mode |
| `cci-williams-momentum` | CCI zero-cross + Williams %R + Supertrend |
| `hull-chop-momentum` | HMA trend + Choppiness filter + UO oversold dip |
| `vwma-chop-breakout` | VWMA/SMA divergence + Choppiness breakout |
| `coppock-bottom` | Coppock Curve zero-cross + McGinley Dynamic bottom picker |
| `aroon-trend-rider` | Aroon trend detection + RSI pullback + ADX filter |
| `keltner-breakout` | Keltner channel breakout + MACD + ADX |
| `psar-momentum` | Parabolic SAR + ROC momentum + RSI filter |
| `elder-impulse` | Elder Ray bull/bear power + EMA trend + ADX |
| `dpo-rsi-pullback` | DPO cycle detection + RSI pullback + Supertrend |

### Creating a Strategy

Write a JSON file in `strategies/`:

```json
{
  "name": "my-strategy",
  "description": "Buy when RSI oversold and MACD positive",
  "leverage": 2,
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
  },
  "short": {
    "mode": "all",
    "conditions": [["rsi", ">", 75], ["macd.histogram", "<", 0]]
  },
  "cover": {
    "mode": "any",
    "conditions": [["rsi", "<", 35]]
  }
}
```

**Signal modes:** `all` (AND), `any` (OR), `score` (count-based with threshold + optional required conditions).

**Shorting:** Optional `short` + `cover` blocks (both required if either present). **Leverage:** Optional `leverage` field (1-125, default 1).

**Auto-scaling:** Tune indicator periods for 4h (reference timeframe). The engine automatically scales periods for other timeframes using sqrt dampening.

See [`STRATEGY_PROMPT.md`](STRATEGY_PROMPT.md) for the full specification: JSON schema, all 51 indicators with parameters, value reference syntax, anti-patterns, and examples.

### AI Generation

Set `generation.enabled` to `true` in `config.json` and add your API key to `.env`:

```
GENERATION_API_KEY=sk-...
```

```bash
pnpm generate-strategy "Buy when RSI is oversold and volume spikes above average"
```

## Configuration

All settings in `config.json` with a flat format:

- **`fees`** — trading fees (default 0.26%)
- **`fundingRate`** — perpetual futures funding rate (applied every 8h, default 0.01%)
- **`slippage`** — slippage per trade (default 0.1%)
- **`initialCapital`** — starting capital
- **`symbols`** — trading pairs to backtest across
- **`dates`** — date ranges for backtesting
- **`strategies.<name>`** — per-strategy timeframes, stop loss, and trailing stop

```json
{
  "strategies": {
    "rsi-macd-trend-ride": {
      "timeframes": ["4h", "6h"],
      "stop_loss_pct": 0.08,
      "trailing_stop_pct": 0.12
    }
  }
}
```

## Reports

```bash
# Regenerate HTML report from existing db/ results
pnpm report
```

The report includes:
- Best strategy cards (Long-Only vs Shorting comparison)
- Filter buttons to toggle by category
- Full rankings table with profit, win rate, max drawdown, Sharpe, Sortino, expectancy, recovery factor
- Equity curve overlay in chart modal
- Strategy averages across timeframes

## Development

```bash
pnpm test              # Vitest unit tests
pnpm lint              # Biome lint
pnpm format:check      # Biome format check
pnpm typecheck         # TypeScript type check
```

See `CLAUDE.md` for full architecture reference and AI assistance guidelines.
