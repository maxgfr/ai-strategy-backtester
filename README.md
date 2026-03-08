# AI Strategy Backtester

Crypto strategy backtester using Binance historical data. Define trading strategies as declarative JSON, backtest them across multiple timeframes and date ranges, and compare results in an HTML report. AI can generate strategies from natural language.

## Features

- **51 technical indicators** — RSI, MACD, Supertrend, Bollinger Bands, Ichimoku, KDJ, StochRSI, HMA, Choppiness Index, Ultimate Oscillator, and more
- **Declarative JSON strategies** — no code required, compose indicators with buy/sell/short/cover conditions
- **Timeframe auto-scaling** — indicator periods automatically adapt based on running timeframe (4h reference)
- **AI strategy generation** — describe a strategy in natural language, get a validated JSON file
- **Per-strategy configuration** — each strategy has its own timeframes, stop loss, trailing stop, circuit breaker, and risk-per-trade settings
- **Shorting & leverage** — strategies can short sell with configurable leverage (1x-125x)
- **Maker/taker fee split** — separate fees for entries (maker/limit) and exits (taker/market)
- **Circuit breaker** — stop opening new positions when drawdown exceeds configurable threshold
- **Risk-per-trade position sizing** — fractional capital allocation based on risk% / stop_loss%, with reserve capital management
- **Funding fees & liquidation** — realistic perpetual futures simulation with 8h funding, funding-eroded margin for liquidation detection, intra-candle liquidation
- **Walk-forward validation** — automatic train/test date range splitting to detect overfitting
- **Data validation** — NaN/non-positive price filtering, OHLC consistency auto-fix, duplicate timestamp removal on both fetch and cache read
- **Buy & Hold benchmark** — alpha calculation (strategy return vs B&H), drawdown duration analysis, MAE/MFE tracking
- **Advanced metrics** — annualized Sharpe/Sortino/Calmar, Recovery Factor, Expectancy, consecutive W/L, long/short breakdown, MAE/MFE ratio
- **Sensitivity analysis** — estimated P&L impact if fees or slippage were doubled
- **Statistical analysis** — t-test significance, percentage-based Monte Carlo simulation (1000 iterations) with ruin probability
- **Parallel execution** — worker pool dispatches simulations across all CPU cores
- **HTML report** — ranked results with category comparison (Long-Only vs Shorting), filter buttons, Calmar column, detailed modal with funding/MAE-MFE/Monte Carlo

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

### Available Strategies (24)

| Strategy | Description |
|----------|-------------|
| `rsi-macd-trend-ride` | RSI oversold + MACD, RSI > 80 exit (best performer) |
| `turtle` | 200-period Donchian breakout + trailing stop |
| `supertrend-pullback-momentum` | Supertrend dip buyer + RSI pullback |
| `supertrend` | ATR-based trend following |
| `confluence` | Multi-indicator score mode (PMAX gate + 9 scored conditions, threshold 4) |
| `pmax` | EMA + ATR-based Supertrend |
| `breakout-volume` | Donchian breakout + ADX + volume |
| `stochrsi-trend-filter` | StochRSI K/D crossover + Supertrend + ADX + MACD |
| `kdj-extreme-recovery` | KDJ J-line recovery in uptrend |
| `bollinger-squeeze` | BB squeeze breakout + MACD + ADX |
| `ichimoku-cloud` | Ichimoku cloud trend following |
| `fast-supertrend` | Fast Supertrend + RSI + ADX |
| `vwap-momentum` | VWAP-gated score mode |
| `cci-williams-momentum` | CCI zero-cross + Williams %R + Supertrend |
| `hull-chop-momentum` | HMA trend + Choppiness filter + UO oversold dip + ADX |
| `vwma-chop-breakout` | VWMA/SMA divergence + Choppiness breakout |
| `coppock-bottom` | Coppock Curve zero-cross + McGinley Dynamic bottom picker |
| `aroon-trend-rider` | Aroon trend detection + RSI pullback + ADX filter |
| `keltner-breakout` | Keltner channel breakout + MACD + ADX |
| `psar-momentum` | Parabolic SAR + ROC momentum + RSI filter |
| `elder-impulse` | Elder Ray bull/bear power + EMA trend + ADX |
| `dpo-rsi-pullback` | DPO cycle detection + RSI pullback + close > Supertrend |
| `adaptive-momentum-reversal` | Asymmetric long/short: RSI+MACD bottoms + Supertrend+MACD+ADX shorts |
| `trend-momentum-rider` | Supertrend + MACD momentum filter, patient Supertrend-only exit (top performer) |

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

All settings in `config.json` with a flat format. Validated at startup via Zod.

### Top-Level Fields

| Field | Required | Default | Description |
|---|---|---|---|
| `fees` | Yes | — | Trading fees (e.g., `0.0026` = 0.26%). Fallback when `makerFee`/`takerFee` not set |
| `makerFee` | No | = `fees` | Maker fee for entries (buy, short). Overrides `fees` for limit orders |
| `takerFee` | No | = `fees` | Taker fee for exits (sell, cover, stops). Overrides `fees` for market orders |
| `fundingRate` | No | `0` | Perpetual futures funding rate, applied every 8h during open positions. `0.0001` = 0.01% |
| `slippage` | No | `0` | Slippage per trade. Buy/cover at `price*(1+slippage)`, sell/short at `price*(1-slippage)`. `0.001` = 0.1% |
| `initialCapital` | Yes | — | Starting capital for each simulation run |
| `symbols` | Yes | — | Trading pairs array (e.g., `["ETHUSDT", "SOLUSDT"]`). Matrix across all strategies |
| `dates` | Yes | — | Date ranges: `[{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}]`. Special value `"now"` = current date |

**Valid timeframes:** `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`

### Per-Strategy Configuration (`strategies.<name>`)

| Field | Required | Default | Description |
|---|---|---|---|
| `timeframes` | Yes | — | Timeframes to test (e.g., `["4h", "6h"]`) |
| `stop_loss_pct` | No | _(none)_ | Stop loss: exit when price moves against entry by this %. `0.08` = 8%. Checked intra-candle |
| `trailing_stop_pct` | No | _(none)_ | Trailing stop: exit when price retraces from peak/trough by this %. `0.12` = 12% retrace |
| `max_drawdown_pct` | No | _(none)_ | Circuit breaker: permanently stop opening new positions when drawdown exceeds threshold. `0.25` = 25%. Existing positions are NOT closed |
| `risk_per_trade` | No | _(none)_ | Fractional position sizing: invest `risk_per_trade / stop_loss_pct` of capital per trade. Remainder in reserve. **Requires `stop_loss_pct`**. `0.02` with SL=8% → 25% invested, 75% reserved |

**Parameter interactions:**
- `stop_loss_pct` + `trailing_stop_pct` can coexist — whichever triggers first exits
- `risk_per_trade` has no effect without `stop_loss_pct`
- `max_drawdown_pct` is cumulative — once tripped, no more trades even if equity recovers
- Stops are checked before strategy signals each candle and execute with slippage + taker fee

### Other Sections

| Section | Fields | Description |
|---|---|---|
| `walkForward` | `enabled` (bool), `trainRatio` (0.1–0.9) | Train/test date split. Only test period results are kept |
| `generation` | `enabled`, `model`, `baseUrl`, `maxTokens`, `temperature` (0–2) | AI strategy generation via `pnpm generate-strategy` |
| `paths` | `dbFolder`, `dbFile`, `logFile` | Output directories for results, data, and logs |

### Complete Example

```json
{
  "fees": 0.0026,
  "makerFee": 0.001,
  "takerFee": 0.003,
  "fundingRate": 0.0001,
  "slippage": 0.001,
  "initialCapital": 10000,
  "symbols": ["ETHUSDT", "SOLUSDT"],
  "dates": [{ "start": "2022-01-01", "end": "now" }],
  "strategies": {
    "trend-momentum-rider": {
      "timeframes": ["6h", "12h"],
      "stop_loss_pct": 0.1,
      "trailing_stop_pct": 0.15,
      "max_drawdown_pct": 0.3,
      "risk_per_trade": 0.02
    }
  },
  "walkForward": { "enabled": true, "trainRatio": 0.7 },
  "generation": {
    "enabled": false,
    "model": "mistral-small-latest",
    "baseUrl": "https://api.mistral.ai/v1",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "paths": { "dbFolder": "db", "dbFile": "data", "logFile": "all.log" }
}
```

## Reports

```bash
# Regenerate HTML report from existing db/ results
pnpm report
```

The report includes:
- Best strategy cards (Long-Only vs Shorting comparison, with Calmar Ratio + long/short breakdown)
- Filter buttons to toggle by category (All / Long-Only / Shorting)
- Full rankings table with Strategy Return, Buy & Hold, Alpha, Sharpe, Sortino, Calmar, significance
- Modal with Calmar, DD Duration, MAE/MFE ratio, consecutive W/L, long/short trades, funding paid, Monte Carlo range, ruin probability, sensitivity analysis
- Equity curve overlay (gold line) in chart modal with SHORT entry markers (purple arrows) and orange COVER markers
- Strategy averages across timeframes

## Development

```bash
pnpm test              # Vitest unit tests
pnpm lint              # Biome lint
pnpm format:check      # Biome format check
pnpm typecheck         # TypeScript type check
```

See `CLAUDE.md` for full architecture reference and AI assistance guidelines.
