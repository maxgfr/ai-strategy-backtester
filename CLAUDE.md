# CLAUDE.md — AI Strategy Backtester

## Maintenance Rule (CRITICAL)

**After every iteration that modifies code, verify that these files are still accurate:**
1. **`CLAUDE.md`** — architecture, strategy list, indicator count, config fields
2. **`README.md`** — strategy list, indicator count, feature descriptions, config documentation
3. **`STRATEGY_PROMPT.md`** — indicator tables, threshold reference, examples, JSON schema

**Special attention to `STRATEGY_PROMPT.md`**: This file is the reference for AI strategy generation AND manual strategy creation. It must always reflect the current state of the catalog (all indicators with exact parameters and fields), the JSON schema, value reference syntax, and all examples. If an indicator is added/removed/modified in `catalog.ts`, update `STRATEGY_PROMPT.md` immediately.

If files were added/removed, strategies changed, indicators added, config modified, commands updated, or architecture altered — update ALL THREE files immediately. An outdated doc causes compounding errors across sessions.

---

## Project Overview

Crypto strategy backtester using Binance historical data. Entry point is a plain script (no HTTP server). Fetches historical OHLCV data, applies technical analysis strategies, and runs backtests. Results are persisted locally as JSON files. AI can generate strategies from natural language.

**Active stack:** Node 24 · TypeScript 5.9 · pnpm 10.30 · tsx · Vitest · Biome · Zod 4 · Binance Historical API

---

## Architecture

```
strategies/                          # ALL strategies as JSON (no TS strategies, no prefixes)
├── rsi-macd-trend-ride.json         # RSI oversold + MACD, RSI > 80 exit ★ BEST
├── turtle.json                      # 200-period Donchian breakout + trailing stop
├── supertrend-pullback-momentum.json # Supertrend dip buyer
├── supertrend.json                  # ATR-based trend following
├── confluence.json                  # Multi-indicator scoring (PMAX + 9 scored conditions)
├── pmax.json                        # PMAX trend following
├── breakout-volume.json             # Donchian breakout + volume
├── stochrsi-trend-filter.json       # StochRSI + Supertrend + ADX
├── kdj-extreme-recovery.json        # KDJ J-line recovery
├── bollinger-squeeze.json           # BB squeeze breakout + MACD + ADX
├── ichimoku-cloud.json              # Ichimoku cloud trend following
├── fast-supertrend.json             # Fast Supertrend + RSI + ADX
├── vwap-momentum.json               # VWAP-gated momentum
├── cci-williams-momentum.json       # CCI zero-cross + Williams %R + Supertrend
├── hull-chop-momentum.json          # HMA + Choppiness filter + UO dip + ADX
├── vwma-chop-breakout.json          # VWMA/SMA divergence + Choppiness breakout
├── coppock-bottom.json              # Coppock Curve + McGinley Dynamic bottom picker
├── aroon-trend-rider.json           # Aroon trend + RSI pullback + ADX
├── keltner-breakout.json            # Keltner channel breakout + MACD + ADX
├── psar-momentum.json               # Parabolic SAR + ROC momentum + RSI
├── elder-impulse.json               # Elder Ray impulse + EMA trend + ADX
├── dpo-rsi-pullback.json            # DPO cycle + RSI pullback + close > Supertrend
├── adaptive-momentum-reversal.json  # Asymmetric long/short: RSI+MACD bottoms, Supertrend+MACD+ADX shorts
└── trend-momentum-rider.json        # Supertrend + MACD momentum, patient Supertrend exit ★ NEW CHAMPION
src/
├── backtest.ts             # Entry point: backtesting CLI (accepts --report, --config)
├── generate.ts             # CLI entry point for AI strategy generation
├── simulation.ts           # Simulation engine: worker pool, metrics, funding/liquidation/stops
├── simulation.worker.ts    # Worker process for parallel backtesting
├── report.ts               # Report orchestration: load results, classify, call report-html
├── report-html.ts          # HTML template generation (charts, tables, filters, styling)
├── config.ts               # Config loader (reads config.json → flat AppConfig)
├── data.ts                 # OHLCV data fetching (Binance) and caching to disk
├── database.ts             # Synchronous JSON file store (plain fs, no lowdb)
├── trade.ts                # Buy/sell/short/cover execution logic with leverage (used by simulation)
├── logger.ts               # Winston logger configuration
├── types.ts                # Core types (CandleStick, Position, DbSchema, BinanceInterval)
├── utils.ts                # Utilities (round, formatDate, addMonths)
├── timeframes.ts           # Shared TIMEFRAME_MINUTES map (imported by config.ts and engine.ts)
├── statistics.ts           # Statistical functions (tTest, monteCarloSimulation)
├── strategies/
│   ├── registry.ts         # Strategy discovery (JSON files), getStrategy() with timeframe
│   ├── types.ts            # StrategyFn, Signal, StrategyName types
│   └── custom/             # Declarative JSON strategy engine
│       ├── types.ts        # Schema types (CustomStrategyDef, SignalBlock, Condition)
│       ├── catalog.ts      # Indicator name → wrapper fn + metadata (51 indicators)
│       ├── engine.ts       # JSON → StrategyFn interpreter + validator + timeframe auto-scaling (uses timeframes.ts)
│       └── loader.ts       # Discover & load JSON files from strategies/
├── schemas/                # Zod validation schemas
│   ├── config.ts           # Config JSON schema (flat: fees, symbols, strategies, generation)
│   ├── strategy.ts         # Strategy JSON schema (name, indicators, signal blocks)
│   └── index.ts            # Re-exports
└── indicators/             # Technical analysis — pure functions, no side effects
    ├── index.ts            # Indicator exports
    ├── primitives/         # Internal building blocks (sma, ema, rma, stdev, etc.)
    └── *.ts                # 30+ indicators (see Indicators Reference below)
```

---

## Dev Commands

```bash
pnpm backtest                 # Backtest matrix — generates report but does NOT open it
pnpm backtest:report          # Backtest matrix — generates report AND opens it in browser
pnpm backtest BTCUSDT 4h 2021-01-01 2022-01-01 pmax  # Targeted backtest
pnpm backtest --report BTCUSDT 4h 2021-01-01 2022-01-01 pmax  # Targeted + open report
pnpm report                   # Regenerate HTML report from existing db/ results
pnpm generate-strategy "..."  # AI-generate a strategy from natural language

pnpm test                     # Vitest unit tests (run once)
pnpm test:watch               # Vitest watch mode

pnpm lint                     # Biome check (lint + format check)
pnpm format                   # Biome format --write (auto-fix formatting)
pnpm format:check             # Biome format read-only (used in CI)
pnpm typecheck                # tsc --noEmit (type errors only)
pnpm fix                      # Biome check --write (auto-fix lint + format)

pnpm clean                    # Clean all generated data (db + data)
pnpm clean:db                 # Clean database only
pnpm clean:data               # Clean simulation data only
```

---

## Code Quality Workflow (CRITICAL)

**After every iteration — ALWAYS run:**

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm typecheck
```

This is mandatory. All four must pass:
1. `pnpm test` — Vitest unit tests
2. `pnpm lint` — Biome linting (code quality, suspicious patterns, performance)
3. `pnpm format:check` — Biome formatting consistency
4. `pnpm typecheck` — TypeScript type checking

**Never skip this step.** Run it after every code change, even small ones. Run it before suggesting the user commit or push. A broken push wastes time and blocks the CI.

---

## Configuration (`config.json`)

All configuration is externalized in `config.json` at the project root. Loaded by `src/config.ts` into an `AppConfig` object. Validated at startup via Zod (`src/schemas/config.ts`). **Flat format** — no nested `trading` or `simulation.profiles` wrappers.

### Top-Level Fields

| Field | Required | Default | Range | Description |
|---|---|---|---|---|
| `fees` | **Yes** | — | 0–1 | Trading fees (e.g., `0.0026` = 0.26%) — used as fallback when `makerFee`/`takerFee` not set |
| `makerFee` | No | = `fees` | 0–1 | Maker fee for limit orders (entries: buy, short). Overrides `fees` for entries |
| `takerFee` | No | = `fees` | 0–1 | Taker fee for market orders (exits: sell, cover, stops, liquidations). Overrides `fees` for exits |
| `fundingRate` | No | `0` | 0–0.01 | Funding rate for perpetual futures (applied every 8h crossing during open positions). `0.0001` = 0.01% per 8h period |
| `slippage` | No | `0` | 0–0.1 | Slippage per trade. Buy/cover execute at `price*(1+slippage)`, sell/short at `price*(1-slippage)`. `0.001` = 0.1% |
| `initialCapital` | **Yes** | — | > 0 | Starting capital for each simulation run |
| `symbols` | **Yes** | — | string[] | Trading pairs (e.g., `["ETHUSDT", "SOLUSDT"]`). Simulation runs matrix across all symbols × strategies × timeframes |
| `dates` | **Yes** | — | DateRange[] | Date ranges for backtesting. Each entry: `{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}`. Special value `"now"` resolves to current date. Multiple ranges supported — each is backtested independently |

**Valid timeframes (BinanceInterval):** `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`

### Per-Strategy Configuration

Each strategy is configured individually under `strategies.<name>`. The key must match the JSON strategy filename (without `.json`).

| Field | Required | Default | Range | Description |
|---|---|---|---|---|
| `timeframes` | **Yes** | — | BinanceInterval[] | Timeframes to test (e.g., `["4h", "6h"]`). Each creates a separate simulation run |
| `stop_loss_pct` | No | _(none)_ | 0–1 | Stop loss: exit when price moves against entry by this percentage. Long: exit if `price <= entry * (1 - SL)`. Short: exit if `price >= entry * (1 + SL)`. `0.08` = 8% from entry. Applied intra-candle (checks high/low) |
| `trailing_stop_pct` | No | _(none)_ | 0–1 | Trailing stop: exit when price retraces from peak (long) or trough (short) by this percentage. Long: tracks highest price since entry, exits if `price <= peak * (1 - TS)`. Short: tracks lowest price since entry, exits if `price >= trough * (1 + TS)`. `0.12` = 12% retrace. Applied intra-candle |
| `max_drawdown_pct` | No | _(none)_ | 0–1 | Circuit breaker: permanently stops opening new positions when account drawdown from equity peak exceeds this threshold. `0.25` = 25% drawdown. Once tripped, no new trades for the rest of the simulation. Only checked when flat (not during open positions). Existing positions are NOT closed |
| `risk_per_trade` | No | _(none)_ | 0–1 | Fractional position sizing: only invest `min(1, risk_per_trade / stop_loss_pct)` of capital per trade. Remainder is held in reserve and re-added after exit. **Requires `stop_loss_pct` to be set** (ignored otherwise). `0.02` = risk 2% of capital per trade. With SL=8%: invests 25% of capital, reserves 75%. Reduces drawdown but also reduces gains |

**Interaction between parameters:**
- `stop_loss_pct` + `trailing_stop_pct` can both be active — whichever triggers first exits the position
- `risk_per_trade` needs `stop_loss_pct > 0` to compute the fraction; without SL it has no effect
- `max_drawdown_pct` is cumulative across all trades — once tripped, the strategy stops trading even if equity recovers
- Stop loss and trailing stop are checked **before** strategy signals each candle — they take priority over strategy exits
- All stops execute with slippage and taker fee

### Walk-Forward Validation

| Field | Required | Default | Range | Description |
|---|---|---|---|---|
| `walkForward.enabled` | Yes (if block present) | `false` | boolean | Enable walk-forward train/test split. When enabled, each date range is split into train and test periods. Only test period results are kept |
| `walkForward.trainRatio` | Yes (if block present) | `0.7` | 0.1–0.9 | Fraction of each date range used for training. `0.7` = first 70% is train, last 30% is test. Test period results only are saved |

**`maxArraySize`** is computed dynamically per interval via `maxArraySizeForInterval()`: `max(1000, round(1000 * 240 / intervalMinutes))`. Shorter timeframes get proportionally more candles.

### Generation (AI Strategy Generation)

| Field | Required | Default | Range | Description |
|---|---|---|---|---|
| `generation.enabled` | Yes (if block present) | `false` | boolean | Enable/disable AI strategy generation via `pnpm generate-strategy` |
| `generation.model` | Yes (if block present) | `mistral-small-latest` | string | OpenAI-compatible model name |
| `generation.baseUrl` | Yes (if block present) | `https://api.mistral.ai/v1` | URL | API endpoint (must be OpenAI-compatible) |
| `generation.maxTokens` | Yes (if block present) | `4096` | > 0 (int) | Max tokens for strategy generation response |
| `generation.temperature` | Yes (if block present) | `0.7` | 0–2 | Model temperature (higher = more creative/random strategies) |

### Paths

| Field | Required | Default | Description |
|---|---|---|---|
| `paths.dbFolder` | **Yes** | `"db"` | Directory for simulation results. Each run creates `{dbFolder}/{runId}/` |
| `paths.dbFile` | **Yes** | `"data"` | Base filename for result JSON files (mostly unused, kept for legacy) |
| `paths.logFile` | **Yes** | `"all.log"` | Winston log file name |

### Complete Config Example

```json
{
  "fees": 0.0026,
  "makerFee": 0.001,
  "takerFee": 0.003,
  "fundingRate": 0.0001,
  "slippage": 0.001,
  "initialCapital": 10000,
  "symbols": ["ETHUSDT", "SOLUSDT"],
  "dates": [
    { "start": "2022-01-01", "end": "2026-02-01" },
    { "start": "2024-01-01", "end": "now" }
  ],
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
    "enabled": true,
    "model": "mistral-small-latest",
    "baseUrl": "https://api.mistral.ai/v1",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "paths": {
    "dbFolder": "db",
    "dbFile": "data",
    "logFile": "all.log"
  }
}
```

---

## Environment Variables

Optional in `.env`:

```
GENERATION_API_KEY=   # API key for AI strategy generation (optional)
```

---

## Strategies (Declarative JSON — No TypeScript)

**All strategies are JSON-only.** No hardcoded TypeScript strategies, no prefix conventions. Each strategy is a `.json` file in `strategies/` that composes indicators from the catalog. Indicator periods auto-scale based on timeframe.

### All Strategies

| Strategy | File | Description |
|----------|------|-------------|
| **RSI-MACD Trend Ride** | `rsi-macd-trend-ride.json` | RSI oversold + MACD positive entry, RSI > 80 exit ★ BEST |
| **Turtle** | `turtle.json` | 200-period Donchian breakout + trailing stop exit (`_type` aliasing) |
| **Supertrend Pullback Momentum** | `supertrend-pullback-momentum.json` | Supertrend dip buyer + RSI pullback + MACD + ADX |
| **Supertrend** | `supertrend.json` | ATR-based trend-following |
| **Confluence** | `confluence.json` | Multi-indicator scoring (PMAX gate + 9 scored conditions, threshold 4) |
| **PMAX** | `pmax.json` | EMA + ATR-based Supertrend trend following |
| **Breakout Volume** | `breakout-volume.json` | Donchian breakout + ADX + volume confirmation |
| **StochRSI Trend Filter** | `stochrsi-trend-filter.json` | StochRSI K/D crossover + Supertrend + ADX + MACD |
| **KDJ Extreme Recovery** | `kdj-extreme-recovery.json` | KDJ J-line recovery in Supertrend uptrend |
| **Bollinger Squeeze** | `bollinger-squeeze.json` | BB squeeze breakout + MACD + ADX |
| **Ichimoku Cloud** | `ichimoku-cloud.json` | Ichimoku cloud trend following |
| **Fast Supertrend** | `fast-supertrend.json` | Fast Supertrend + RSI + ADX |
| **VWAP Momentum** | `vwap-momentum.json` | VWAP-gated score mode momentum |
| **CCI Williams Momentum** | `cci-williams-momentum.json` | CCI zero-cross + Williams %R oversold + Supertrend |
| **Hull Chop Momentum** | `hull-chop-momentum.json` | HMA trend + Choppiness filter + UO oversold dip + ADX |
| **VWMA Chop Breakout** | `vwma-chop-breakout.json` | VWMA/SMA divergence + Choppiness breakout |
| **Coppock Bottom** | `coppock-bottom.json` | Coppock Curve zero-cross + McGinley Dynamic bottom picker |
| **Aroon Trend Rider** | `aroon-trend-rider.json` | Aroon trend detection + RSI pullback + ADX filter |
| **Keltner Breakout** | `keltner-breakout.json` | Keltner channel breakout + MACD + ADX |
| **PSAR Momentum** | `psar-momentum.json` | Parabolic SAR + ROC momentum + RSI filter |
| **Elder Impulse** | `elder-impulse.json` | Elder Ray bull/bear power + EMA trend + ADX |
| **DPO RSI Pullback** | `dpo-rsi-pullback.json` | DPO cycle detection + RSI pullback + close > Supertrend |
| **Adaptive Momentum Reversal** | `adaptive-momentum-reversal.json` | Asymmetric long/short: contrarian RSI+MACD bottoms + trend-following Supertrend+MACD+ADX shorts |
| **Trend Momentum Rider** | `trend-momentum-rider.json` | Supertrend + MACD momentum filter, patient Supertrend-only exit ★ NEW CHAMPION |

The registry (`src/strategies/registry.ts`) discovers JSON files from `strategies/` — no builtin factories, no pattern matching. Each returns `Signal = 'buy' | 'sell' | 'short' | 'cover'`.

### JSON Strategy Format

```json
{
  "name": "kebab-case-name",
  "description": "What this strategy does",
  "leverage": 2,
  "indicators": { "rsi": { "period": 14 }, "macd": { "fast": 12, "slow": 26, "signal": 9 } },
  "buy": { "mode": "all", "conditions": [["rsi", "<", 35], ["macd.histogram", ">", 0]] },
  "sell": { "mode": "any", "conditions": [["rsi", ">", 70]] },
  "short": { "mode": "all", "conditions": [["rsi", ">", 80]] },
  "cover": { "mode": "all", "conditions": [["rsi", "<", 40]] }
}
```

**Value references:** numbers (`35`), candle fields (`"close"`, `"high"`), indicators (`"rsi"`), object fields (`"macd.histogram"`), previous bar (`"rsi[-1]"`).

**Signal modes:** `all` (AND), `any` (OR), `score` (count-based with threshold + optional required conditions).

**Shorting support:** Strategies can optionally define `"short"` and `"cover"` blocks (both must be present or both absent). When flat, `buy` is checked first, then `short`. When holding long, only `sell` is checked. When holding short, only `cover` is checked. Short trades profit from price decreases.

**Leverage:** Optional `"leverage"` field (1–125, default 1). Amplifies position size: `assets = capital * leverage / price`. On long exit, borrowed amount `capital * (leverage - 1)` is deducted. On short exit, PnL is naturally amplified through the larger position. Capital clamped at 0 (liquidation).

**`_type` aliasing:** Use `{"_type": "donchian", "period": 200}` to create multiple instances of the same indicator under different aliases (e.g., turtle uses `"breakout"` and `"exit"` both backed by donchian).

**51 indicators available** in the catalog (`src/strategies/custom/catalog.ts`): rsi, ema, supertrend, bollingerBands, obv, vwap, cmf, williamsR, cci, roc, ad, mfi, psar, ao, movingAverage, trix, volumeOscillator, macd, pmax, adx, donchian, stochastic, aroon, ichimoku, vortex, chandelier, keltner, starcBands, movingAverageEnvelope, atrTrailingStop, pmo, kdj, stochRsi, volumeSma, atrRatio, elderRay, ravi, hma, choppinessIndex, ultimateOscillator, chaikinOscillator, linearRegressionSlope, fisherTransform, coppockCurve, forceIndex, dpo, vwma, rvi, massIndex, emv, mcginleyDynamic.

**Timeframe auto-scaling:** Indicator periods automatically scale based on the running timeframe relative to the 4h reference. Uses sqrt dampening: `scale = sqrt(240 / tfMinutes)`. Only period-like params (period, fast, slow, signal, etc.) are scaled; multiplier/stdDev stay fixed. Minimum period is 2.

**AI generation:** `pnpm generate-strategy "Buy when RSI < 30 and MACD histogram > 0"` — generates a strategy. Indicator periods should be tuned for 4h (the reference timeframe); auto-scaling handles other timeframes.

**Manual generation:** When the user asks to create or generate a strategy (without using `pnpm generate-strategy`), follow the spec in `STRATEGY_PROMPT.md` at the project root. It contains the full JSON schema, all 51 indicators with parameters and fields, value reference syntax, and examples. Write the JSON file directly to `strategies/` — it will be auto-discovered on the next backtest.

---

## Backtesting Architecture

- **Single backtest**: `pnpm backtest PAIR INTERVAL START END STRATEGY` — runs in main process
- **Full matrix**: `pnpm backtest` (no args) — iterates over `config.strategies` map, crosses each strategy's `timeframes` with `symbols` and `dates`, dispatches to a worker pool (`child_process.fork()`) with concurrency = CPU core count
- Each worker receives `maxArraySize` computed dynamically from interval, plus per-strategy `stop_loss_pct`, `trailing_stop_pct`, `max_drawdown_pct`, `risk_per_trade`
- Each run creates `db/{runId}/` with results as `{pair}_{interval}_{strategy}_{start}_{end}.json`
- `runId` is an auto-generated timestamp (`YYYYMMDD_HHmmss`) — concurrent runs never collide
- **Simulation features**: funding fees (8h periods, erodes margin for liquidation), liquidation detection (intra-candle via high/low, accounts for funding), stop loss, trailing stop, slippage, maker/taker fee split, circuit breaker (drawdown-based), risk-per-trade position sizing (with reserve capital), separate long/short trade metrics, Buy & Hold benchmark (alpha), drawdown duration analysis, MAE/MFE tracking (including on liquidations), statistical significance (t-test), Monte Carlo simulation (1000 iterations, percentage-based returns), sensitivity analysis (fees 2x / slippage 2x impact)
- **Walk-forward validation**: optional train/test date split via `walkForward.trainRatio` — each date range is split, only test period results are kept
- **Data validation**: candles validated on fetch and cache read (NaN, non-positive prices, OHLC consistency, duplicate/out-of-order timestamps filtered)
- **Metrics**: Sharpe (annualized), Sortino (downside-only denominator), Calmar (uses peak at max drawdown), Recovery Factor, Expectancy, MAE/MFE ratio, max consecutive wins/losses, long/short breakdown, funding paid, sensitivity (returnIfFees2x, returnIfSlippage2x)
- Report generated as `reports/report_<timestamp>.html` (unique per run, no overwrite) with:
  - **Category comparison cards** (best Long-Only vs best Shorting side by side, with benchmark comparison)
  - **Filter buttons** (All / Long-Only / Shorting) to toggle rankings and averages tables
  - **Category badges**: Long-Only (green), Shorting (purple)
  - Classification is data-driven: `shortTrades > 0` = Shorting, else Long-Only
  - **Rankings table**: Strategy Return, Buy & Hold, Alpha, Calmar, Significant columns
  - **Equity curve** (gold line) overlaid on chart modal
  - **Modal details**: Calmar, DD duration, MAE/MFE + ratio, consecutive wins/losses, long/short breakdown, funding paid, Monte Carlo range, ruin probability, sensitivity analysis
  - Chart markers: purple arrows for SHORT entries, red for SELL, orange for COVER

---

## Types

Core types in `src/types.ts`:

```typescript
type Position = 'buy' | 'sell' | 'short'
type Signal = 'buy' | 'sell' | 'short' | 'cover' // in strategies/types.ts
type ResolvedStrategy = { fn: StrategyFn, leverage: number }  // returned by getStrategy()
type CandleStick = { open, high, close, low, volume, time }
type LastPosition = { date, type, price, capital, assets, tradeProfit? }
type DbSchema = { version, initialParameters, historicPosition, position, ...metrics,
                  longTrades?, shortTrades?, longWins?, shortWins?, longProfit?, shortProfit?, totalFundingPaid?,
                  sortino?, calmarRatio?, recoveryFactor?, avgWin?, avgLoss?, maxConsecutiveWins?, maxConsecutiveLosses?, expectancy?,
                  buyAndHoldReturn?, buyAndHoldPct?, strategyReturn?, strategyReturnPct?, alpha?,
                  maxDrawdownDuration?, avgDrawdownDuration?, timeToRecovery?,
                  avgMAE?, avgMFE?, maeToMfeRatio?,
                  tStatistic?, pValue?, isSignificant?,
                  monteCarloMedian?, monteCarlo5th?, monteCarlo95th?, ruinProbability?,
                  feesPerTrade?, totalFeesEstimate?, returnIfFees2x?, returnIfSlippage2x? }
type StrategyConfig = { timeframes, stop_loss_pct?, trailing_stop_pct?, max_drawdown_pct?, risk_per_trade? }  // in config.ts
type AppConfig = { fees, makerFee, takerFee, fundingRate, slippage, initialCapital, symbols, dates, strategies: Record<string, StrategyConfig>, generation, walkForward?, paths }
```

---

## Strategy Design Guidelines

When creating or reviewing strategies, apply these proven insights:

### Anti-Patterns (Avoid)
- **Too many AND conditions** (5+) on buy = 0 trades. Keep buy to 2-4 conditions max.
- **Overlapping buy/sell thresholds** (buy RSI < 50, sell RSI > 45) — sell takes priority, blocks buys.
- **Aggressive sell exits** (RSI > 60) cut winners short. Use RSI > 70-75 for sell.
- **Score threshold imbalance** — too low (3/10) = noisy, too high (4/5) = no trades. Use ~50%.
- **Missing trend filter** on RSI strategies — add Supertrend or ADX gate to survive bear markets.
- **No volume confirmation** on breakout strategies — add `volumeSma` or `cmf`.
- **Same RSI for buy/sell** (buy < 30, sell > 30) = whipsaw. Use asymmetric thresholds.
- **Chandelier exit as trailing stop** — cuts profits too early. Prefer `atrTrailingStop` or Supertrend.

### Design Principles
- **Simple > Complex**: best strategy (249% profit) has 2 buy + 1 sell condition.
- **Rare signals win**: 9 trades in 4 years but catches exact bottoms.
- **ADX > 20** filters out ranging/choppy markets.
- **6h often outperforms 4h** for long-term strategies (filters intraday whipsaws).
- **Buy-the-dip in uptrend**: Supertrend UP + RSI pullback + MACD positive.
- **Let winners run**: tight sell conditions kill great entries.

### Overfitting Warning
- **No walk-forward / out-of-sample framework**: all backtests run on the full date range. If you tune `stop_loss_pct`, `trailing_stop_pct`, or indicator parameters to maximize returns on a single period, results will be overfit and likely fail on new data.
- **Mitigation**: always validate promising strategies on a **different date range or symbol** before trusting the results. For example, optimize on 2022-2024, validate on 2024-2026.
- **Multiple comparison risk**: testing 23 strategies × multiple timeframes produces ~100+ results. Some will look good by chance. Look for strategies that are significant (`pValue < 0.05`) AND have a logical edge — not just high returns.
- **Timeframe auto-scaling reduces overfitting**: indicator periods are not tuned per timeframe, which forces generalization. This is a deliberate design choice.

### Threshold Quick Reference
| Indicator | Oversold | Overbought | Trending |
|-----------|----------|------------|----------|
| `rsi` | < 30 (agg: < 35) | > 70 | 40-60 neutral |
| `stochRsi.k` | < 20 | > 80 | — |
| `williamsR` | < -80 | > -20 | — |
| `adx.adx` | — | — | > 20 trend, > 25 strong |
| `cmf` | < -0.1 | > 0.05 | — |
| `kdj.j` | < 0 (ext: < 20) | > 80 | — |
| `bollingerBands.bbr` | < 0 | > 1 | 0.5 = middle |

---

## Important Notes for AI Assistance

- **No HTTP server** — Entry point is a plain script. State persisted locally in `./db/{runId}/*.json`
- **All simulation data** is written to `./data/` and DB state to `./db/` — both ignored by git
- **Reports** are written to `./reports/` — also ignored by git
- **Immutability**: always create new objects, never mutate
- **No `console.log`**: use `logger` from `./logger` (winston)
- **Database** is a plain `fs.readFileSync`/`writeFileSync` JSON store (`src/database.ts`), no external DB dependency
- **Data fetching** uses `binance-historical` package to download OHLCV klines
- **Data validation** (`src/data.ts`): candles validated on fetch and cache read — NaN/non-positive prices skipped, OHLC consistency auto-fixed, duplicate/out-of-order timestamps filtered
- **NaN guard in strategy engine**: condition evaluation rejects NaN values explicitly (prevents silent false evaluations)
- **Validation**: Config validated at startup via Zod (`src/schemas/config.ts`). Strategy JSON validated structurally via Zod (`src/schemas/strategy.ts`) + semantically in `engine.ts` (catalog existence, field resolution)

### Code Quality Rules (Biome-enforced)
- **No `!` non-null assertions** — use `?? fallback` instead (`lint/style/noNonNullAssertion`)
- **No `[...acc, x]` in `.reduce()`** — use `for` loop + `.push()` for O(n) performance (`lint/performance/noAccumulatingSpread`)
- **No `.toFixed()` on indicator values** — causes precision loss in downstream calculations
- **No truthy/falsy checks on numbers** — use explicit `!== undefined` or `?? 0` (zero is a valid value)
- **Division-by-zero** must always be handled (return 0, or 0.5 for BBR)

### Indicator Implementation Rules (matching Python NautilusTrader)
- **SMA seeding** for EMA/RMA: buffer `period` values, compute SMA as seed, then apply exponential formula
- **EMA alpha** = `2 / (period + 1)`
- **RMA/Wilder's alpha** = `1 / period`
- **PMAX EMA input** is `hl2 = (high + low) / 2`, not `close`
- **KDJ** uses SMA for K and D smoothing (not EMA)
- **Supertrend** first bar defaults to basic bands (not 0)
- **Strategy evaluation is position-aware**: when long (`positionType='buy'`), only sell is checked; when short (`positionType='short'`), only cover is checked; when flat (`positionType='sell'` or undefined), buy is checked first, then short

---

## File Conventions

- `src/indicators/` — pure TA functions, no side effects, fully testable. Each indicator file contains the factory (stateful, `.result()`/`.update()`) and a simpler wrapper. Shared primitives (SMA, RMA, etc.) live in `primitives/`
- `src/strategies/` — orchestrate indicator results into buy/sell signals
- Tests live in `src/**/__tests__/` directories

---

## Indicators Reference

All indicators follow a **factory pattern** with stateful `.result()` / `.update()` methods. Most also export a simpler wrapper function for one-shot usage.

```typescript
// Factory: stateful, incremental updates
const indicator = IndicatorName({ candles, period })
indicator.result()        // → ResultItem[]
indicator.update(candle)  // → ResultItem | undefined

// Wrapper: one-shot array in → array out
indicatorName(candles, period) // → number[] or object[]
```

### Trend Indicators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **EMA** | `ema.ts` | `period` |
| **SMA** | `primitives/sma.ts` | `period` |
| **WMA** | `primitives/wma.ts` | `period` |
| **WWMA** | `primitives/wwma.ts` | `period` |
| **MACD** | `macd.ts` | `fastPeriod=12`, `slowPeriod=26`, `signalPeriod=9` |
| **ADX** | `adx.ts` | `period=14` |
| **Supertrend** | `supertrend.ts` | `period=10`, `multiplier=3` |
| **PMAX** | `pmax.ts` | `emaPeriod=10`, `atrPeriod=10`, `multiplier=3` |
| **Aroon** | `aroon.ts` | `period=25` |
| **Ichimoku** | `ichimoku.ts` | `conversionPeriod=9`, `basePeriod=26`, `spanPeriod=52` |
| **TRIX** | `trix.ts` | `period` |
| **Vortex** | `vortex.ts` | `period=14` |
| **Heikin Ashi** | `heikinAshi.ts` | (none) |
| **PSAR** | `psar.ts` | `step=0.02`, `max=0.2` |
| **HMA** | `hma.ts` | `period=16` |
| **Linear Regression Slope** | `linearRegressionSlope.ts` | `period=14` |
| **McGinley Dynamic** | `mcginleyDynamic.ts` | `period=14` |
| **Coppock Curve** | `coppockCurve.ts` | `rocPeriod1=14`, `rocPeriod2=11`, `wmaPeriod=10` |
| **DPO** | `dpo.ts` | `period=20` |

### Momentum / Oscillators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **RSI** | `rsi.ts` | `period=14` |
| **Stochastic** | `stochastic.ts` | `period=14`, `kPeriod=3`, `dPeriod=3` |
| **Stochastic RSI** | `stochRsi.ts` | `rsiPeriod`, `stochasticPeriod`, `kPeriod`, `dPeriod` |
| **Williams %R** | `williamsr.ts` | `period=14` |
| **Williams Vix** | `williams.ts` | `lookBackPeriodStDevHigh=22`, `bbLength=20` |
| **CCI** | `cci.ts` | `period=20` |
| **ROC** | `roc.ts` | `period` |
| **AO** | `ao.ts` | `fastPeriod=5`, `slowPeriod=34` |
| **KDJ** | `kdj.ts` | `rsvPeriod=9`, `kPeriod=3`, `dPeriod=3` |
| **PMO** | `pmo.ts` | `period` |
| **Pring Special K** | `pringSpecialK.ts` | (internal periods) |
| **RAVI** | `ravi.ts` | `fastPeriod=7`, `slowPeriod=65` |
| **Ultimate Oscillator** | `ultimateOscillator.ts` | `period1=7`, `period2=14`, `period3=28` |
| **Fisher Transform** | `fisherTransform.ts` | `period=10` → {fisher, signal} |
| **RVI** | `rvi.ts` | `period=10` → {rvi, signal} |

### Volatility / Bands

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **ATR** | `atr.ts` | `period=14` |
| **Bollinger Bands** | `bollingerBands.ts` | `period=20`, `stdDev=2` → {upper, middle, lower, bbr} |
| **Keltner** | `keltner.ts` | `emaPeriod=20`, `atrPeriod=10`, `multiplier=1` |
| **Donchian** | `donchian.ts` | `period=20` |
| **STARC Bands** | `starcBands.ts` | `smaPeriod=5`, `atrPeriod=15`, `multiplier=1.33` |
| **Chandelier** | `chandelier.ts` | `period=22`, `multiplier=3` |
| **ATR Trailing Stop** | `atrTrailingStop.ts` | `period=14`, `multiplier=3` |
| **MA Envelope** | `movingAverageEnvelope.ts` | `period=20`, `percentage=2.5` |
| **Choppiness Index** | `choppinessIndex.ts` | `period=14` |
| **Mass Index** | `massIndex.ts` | `emaPeriod=9`, `sumPeriod=25` |

### Volume Indicators

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **OBV** | `obv.ts` | (none) |
| **MFI** | `mfi.ts` | `period=14` |
| **CMF** | `cmf.ts` | `period=20` |
| **AD** | `ad.ts` | (none) |
| **VWAP** | `vwap.ts` | (none) |
| **Volume Oscillator** | `volumeOscillator.ts` | `fastPeriod=5`, `slowPeriod=10` |
| **Chaikin Oscillator** | `chaikinOscillator.ts` | `fastPeriod=3`, `slowPeriod=10` |
| **Force Index** | `forceIndex.ts` | `period=13` |
| **EMV** | `emv.ts` | `period=14` |
| **VWMA** | `vwma.ts` | `period=20` |

### Catalog-Only (Composite Indicators)

These indicators exist only in the strategy catalog (`src/strategies/custom/catalog.ts`), not as standalone indicator files. They compose primitives for use in JSON strategies.

| Indicator | Catalog Name | Key Parameters | Output |
|-----------|-------------|----------------|--------|
| **Volume SMA** | `volumeSma` | `period=20` | SMA applied to volume (not close price) |
| **ATR Ratio** | `atrRatio` | `atrPeriod=14`, `smaPeriod=50` | ATR / SMA(ATR) — volatility regime filter |

### Other

| Indicator | File | Key Parameters |
|-----------|------|----------------|
| **Candlestick** | `candlestick.ts` | (none) — pattern recognition (hammer, engulfing, kicker, etc.) |
| **Elder Ray** | `elderRay.ts` | `period=13` |
| **Shinohara** | `shinohara.ts` | `period=26` |
| **Twiggs** | `twiggs.ts` | `period` |
| **Lowest Low** | `lowestLow.ts` | `period` |
| **Moving Average** | `movingAverage.ts` | `period=20`, `type='ema'` |
