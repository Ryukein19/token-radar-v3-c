[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Ryukein19/token-radar-v3-c/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Ryukein19/token-radar-v3-c/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Radar v3-c

A pre-token launch radar for the [token-radar-01](https://make.fun/bounty/token-radar-01) competition on make.fun. It reads a sealed DefiLlama snapshot (758 protocols, 2026-11-14), ranks the 198 protocols that record no token by implied value, and gives each one a costed farm plan.

## The model (all fitted at runtime, nothing hardcoded)

- **Implied value = size curve × category factor × token odds.**
- Size curve: log-log regression on the 128 comparables with a usable market cap — `ln(mcap) = 6.965 + 0.522 · ln(TVL)`, R² 0.194.
- Category factor: shrunk median residual per category (k=32, n≥3).
- Token odds: logistic on no-token age, fitted on the 645 peers with a listed date (327 record a token); kin rows (a sibling token already trades) get a stated heuristic ×0.5 discount. The odds are the peers' record, not a forecast — this page never says a token will launch, or when.
- Every term is kept only if it lowers the held-out miss in **both** the leave-one-out and walk-forward tests (by more than noise: ×0.02 miss, 0.002 Brier). Five held-out tests in all: leave-one-out ×3.33, walk-forward ×2.89, by-category ×3.78, by-size ×4.33, ten-fold ×3.52 — all below the flat 0.25× baseline (×4.91 / ×4.14). Relative momentum, age, and chain count were tested in the value term and not kept; a negative-control term (growth of another row) must not help, and does not.
- Odds Brier 0.216 vs 0.250 base rate (walk-forward 0.232 vs 0.321).
- Ranges are conformal intervals priced per kind: categories with ≥8 comps use their own leave-one-out residuals, the rest use the global band. P25–P75 covers 50.8% of held-out caps (stated 50%), P10–P90 covers 79.7% (stated 80%).

## The ledger

All 758 protocols in exactly one group: 198 ranked (40 watchlist + 138 early below the $50M floor + 20 off-list above it) + 128 token trades (priced comps) + 288 token on record with no usable cap + 144 set aside for one stated reason (CEX 42, Liquid Staking 38, Bridge 28, Canonical Bridge 15, versioned 11, wrapped/staked word 5, Liquid Restaking 3, Restaked BTC 2).

## Farm economics

Six category-specific steps per row at minimum viable capital, sized from TVL ($50 below $100M, $100 at $100M+, $150 at $1B+, $250 at $5B+), held 60/45/30 days by age. Slice = implied value × drop share × (ticket / TVL); net = slice − fees − time at $25/hour. Default ticket is the plan size (0.02% of TVL), drop share 10%; flat tickets $100–$10,000 and drop shares 3.5%/7%/14% are selectable. Verdicts: FARM if net > $25 and net/hour > $25; MARGINAL if net > $0; otherwise SKIP. At the default scenario: 25 FARM / 36 MARGINAL / 137 SKIP.

## Run it

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

Node 22+, standard library only. Two runs write byte-identical output. The dashboard is static with no network: `dashboard/index.html` + `app.css` + `app.js`, reading `data.js` written beside it.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes `board.json`, `data.js`, copies `dashboard/` + `screenshots/`, writes `dossier.json`.
- `lib/model.ts` — the model, ledger, and farm economics (all fitted at runtime).
- `vendor/makefun-board.ts` — the kit's dossier library, copied byte-for-byte.
- `dashboard/` — the static page (index.html, app.css, app.js; 29 KB total).
- `screenshots/` — three real renders: board, detail, filtered.
