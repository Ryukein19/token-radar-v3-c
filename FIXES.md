# Token Radar v3-c — fixes (fixer session, 2026-11-26)

Built on commit `75ff09d`. Nothing was rebuilt from scratch; all changes are
edits to the builder's own code. NOT submitted, no GitHub repo created.
Model version bumped to `v3-c.1 size+category, odds age-only, flat $1,000 default`.

## What the judges asked for, and what changed

Fixes are numbered as in the fixer brief (§1–§8 must-do, §9–§12 should-do).

### 1. Flat-$1,000 default ticket + toggle — DONE
- `lib/model.ts`: the stored row farm is now computed at a **flat $1,000 ticket**
  (`ticket_usd: 1000`); the sized position is kept as `farm.sized_ticket_usd`
  (0.02% of the row's TVL) for the "Sized position" option.
- `verdict_counts` is now the flat-default view: **0 FARM / 0 MARGINAL / 198 SKIP**,
  stated plainly on the cover. `verdict_counts_sized` (new) holds the sized
  view: **25 / 36 / 137** (unchanged).
- Dashboard default is `$1,000` (was "Plan size"); the select's plan option is
  relabelled "Sized position · 0.02% of TVL". Detail view defaults to
  flat-ticket economics with per-row break-even deposit (see §12).
- The cover KPI card states the sized figure: "sized 0.02% TVL: 25 FARM /
  36 MARGINAL · Steakhouse sized $550,796". Footer + fee note rewritten to the
  flat default.

### 2. Top-10 board rows on the cover — DONE
- New "Top 10 — the board at a glance" panel directly under the KPI strip
  (rendered live from the current scenario: deposit + drop share). All 10 rows
  fit in a 1440×900 viewport. Clicking a row opens its detail view.

### 3. By-group diagnostics on the cover — DONE
- New integrity-strip line (rendered from the evidence table, not hardcoded):
  "Ridge trade-off, stated not hidden: the category ridge helps held-out
  (LOO ×3.40→×3.33, walk-forward ×3.01→×2.89) but hurts by-category (×3.78)
  and by-size (×4.33 vs ×4.21 size-only)."

### 4. Ridge coefficients on the page — DONE
- New "Category factors" table in the evidence section: all 34 categories with
  n comps and factor (CEX ×1.267 n=9 down to Liquid Staking ×0.803 n=9;
  categories with n<3 show ×1.000, no effect). Note states the shrink rule
  (k=32 toward ×1.000, n≥3 only) and that every factor is re-fit per run.

### 5. B's richer odds spec tested — DONE, NOT KEPT
- `lib/model.ts` now also fits the joint spec (age + log TVL + relative
  momentum, B-style) and records it in the odds evidence table:
  **Brier 0.215 in sample / 0.233 walk-forward vs 0.216 / 0.232 for age-only**.
  In-sample gain 0.0007 (under the 0.002 guard) and walk-forward is WORSE by
  0.0012, so the decision is "tested, not kept" and **the odds model is
  unchanged (age-only)**. The odds note on the page now names the joint test
  with its numbers.

### 6. Odds-rise-with-age sentence on the cover — DONE
- New amber cover line under the integrity strip, rendered from the age
  buckets: "Token odds rise with age. 26% of protocols listed under 6 months
  record a token (n=88), vs 79% at 3–5 years (n=155)."

### 7. Screenshots re-rendered — DONE
- `shoot.py` (new, kept in the repo): chrome-headless-shell + PIL, 1440×900,
  JPEG q95 4:2:0 tuned to 300–350 KB. All three are real renders of the fixed
  dashboard: 1-board (cover, top-10 visible), 2-detail (Steakhouse, farm
  economics table visible), 3-filtered (Watchlist filter + ladder).
  Sizes: 307,707 / 347,018 / 315,007 bytes.
- Note: the detail screenshot's farm-economics table is visible; the
  break-even row sits at the bottom edge and the sensitivity note is just
  below the fold (it is in the page source and the dossier text).

### 8. Local verification — DONE (see Metrics below)
- Two runs byte-identical; all 7 gate rows replicated locally and passing.
  `makefun check` / bundle NOT run — submit-time steps.

### 9. Ghost column — DONE
- Board table + top-10 strip + detail view all show a "Size-only" value
  (size curve × odds, no category factor) next to the ridge-adjusted implied
  value. Top rows have factor ×1.000 (thin categories), so the two agree
  there; Lending rows (×0.84) show the gap.

### 10. Negative-control evidence on the cover — DONE
- One line in the evidence section with the actual numbers: "Negative control:
  the growth of another row does not help — LOO ×3.37 / walk-forward ×3.18
  vs the kept model ×3.33 / ×2.89."

### 11. B-style deposit-ladder controls — DONE
- The deposit/drop/horizon controls already recomputed live; added a
  **deposit ladder line** under the board controls, live at the current drop
  share: $100 → 0/0/198 · $500 → 0/0/198 · $1,000 → 0/0/198 ·
  $2,500 → 0/5/193 · $5,000 → 5/48/145 · $10,000 → 57/71/70 ·
  sized 0.02% TVL → 25/36/137.

### 12. Per-protocol step lists + sensitivity panel — PARTIAL (see below)
- **Sensitivity panel: DONE.** Detail view now shows the break-even deposit
  (net $0) and the FARM deposit (net > $25 and > $25/h) at the current drop
  share, plus a note: TVL growth alone does NOT flip a row at a fixed ticket
  (slice ∝ TVL^−0.48, since implied grows only as TVL^0.52); time listed
  helps instead, because the odds rise with age. Steakhouse at drop 10%:
  break-even $55,490, FARM $109,156.
- **Per-protocol step lists (venue / caps / lockups / points per day / claim
  window): LEFT OUT, deliberately.** The snapshot carries only 10 fields per
  protocol; none of those quantities is derivable from them. Inventing a venue
  name, a points rate or a lockup term as fact would be fabrication. The
  detail view now says so on the page: "Venue, caps, lockups and points rates
  are not in the sealed snapshot (10 fields per protocol), so this plan names
  no venue, no points rate and no lockup term." The 6 costed steps per row
  (category playbook + stated fee table) remain.

## Metrics (fixed build, verified 2026-11-26)

| | Before (75ff09d) | After (v3-c.1) |
|---|---|---|
| Size curve | ln(mcap) = 6.965 + 0.522·ln(TVL), R² 0.194, 128 comps | unchanged |
| Held-out miss (kept) | LOO ×3.33 / WF ×2.89 | unchanged |
| Odds Brier | 0.216 vs 0.250 base | unchanged (joint spec tested, not kept) |
| Board | 198 rows (40 + 138 + 20), ledger 758 | unchanged |
| Farm @ flat $1,000 | 0 / 0 / 198 (was not the default) | 0 / 0 / 198, now the default |
| Farm @ sized 0.02% TVL | 25 / 36 / 137 (was the default) | 25 / 36 / 137, now the option |
| Dashboard source | 33,654 B | 41,729 B (cap 65,536) |
| Dossier | 1,305,383 B | 1,336,341 B (cap 1,500,000) |
| Screenshots | 337,878 / 323,509 / 310,260 B (old cover) | 307,707 / 347,018 / 315,007 B (new cover) |

Two runs byte-identical (`diff -r` clean). All 7 gate rows replicated locally
and passing (dashboard files, board file, sorted-by-value, coverage 40/40,
farm steps, screenshots 1440×900 JPEG, dossier). No http(s) strings in the
dashboard. No regressions: every fitted number is identical to the pre-fix
build; the only model addition is the odds joint test, which lost.

## Files changed (fixer session)
- `lib/model.ts` — joint odds ablation + evidence row; flat-$1,000 default
  ticket + `sized_ticket_usd`; `verdict_counts_sized`; fee note; version bump.
- `dashboard/index.html` — top-10 panel; age line; ridge line element;
  category-factors table + control note elements; ladder line; deposit select
  default $1,000; ghost column header; footer rewrite.
- `dashboard/app.js` — default deposit 1000; sized ticket handling; top-10 +
  ladder renderers; ridge/age lines; category factors + control note; ghost
  column + sort; detail sensitivity rows + honesty note; heading fix
  ("ticket $1,000, ticket $1K" duplication removed).
- `dashboard/app.css` — cover-note style; compact top-10 rows; detail-only
  hides the integrity/ridge/age lines + subtitle so the farm table fits the
  detail screenshot.
- `screenshots/` — all three re-rendered (see §7).
- `README.md` — farm economics + odds sections rewritten to the fix.
- `shoot.py` (new) — screenshot renderer for future re-renders.

## For the submit-time agent
- Re-run `main.ts` twice and confirm byte-identical; then bundle the builder's
  sessions + this fixer session's sessions and run `makefun check` (not done
  here — submit-time steps). Do NOT re-run the odds joint test; it is recorded
  in the evidence table. Quota at fix time: 4 of 5 left today, 36 of 40 overall.
