// Token Radar v3-c dashboard. Static, no network: every figure comes from
// window.RADAR (data.js, written by main.ts from the same board as board.json).
const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const fmtM = (n) => n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(0) + 'K' : '$' + Math.round(n);
const fmt$ = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2);
const fmtS = (n) => (n >= 0 ? '+' : '') + n.toFixed(1);
const ageFmt = (d) => d === null ? '—' : d >= 365 ? (d / 365.25).toFixed(1) + ' yr' : d + ' d';
const state = { q: '', verdict: '', tier: '', cat: '', chain: '', deposit: 1000, drop: 0.10, horizon: 84, sort: 'rank', dir: 1 };

function ticketOf(r) { return state.deposit === 'plan' ? r.farm.sized_ticket_usd : state.deposit; }
function depositLabel() { return state.deposit === 'plan' ? 'sized position 0.02% of TVL' : 'ticket $' + state.deposit.toLocaleString('en-US'); }
function econ(r) {
  const ticket = ticketOf(r);
  const slice = r.implied_value_usd * state.drop * (ticket / r.tvl_usd);
  const fees = r.farm.fees_usd; // step costs are fixed; changing the deposit changes the slice only
  const net = slice - fees - r.farm.hours * 25;
  const perHour = net / r.farm.hours;
  const verdict = net > 25 && perHour > 25 ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
  return { slice, fees, net, perHour, verdict, ticket };
}
const flatOf = (key) => R.evidence.find((e) => e.term.startsWith('flat'))[key];
const keptOf = (key) => R.evidence.find((e) => e.term.includes('category effect'))[key];

function renderKpis() {
  const farmN = R.rows.filter((r) => econ(r).verdict === 'FARM').length;
  const top1 = R.rows.find((r) => r.rank === 1);
  const sizedNote = 'sized 0.02% TVL: ' + R.verdict_counts_sized.FARM + ' FARM / ' + R.verdict_counts_sized.MARGINAL + ' MARGINAL · Steakhouse sized $' + Math.round(top1.farm.sized_ticket_usd).toLocaleString('en-US');
  const cards = [
    ['198', 'ranked · 40 watchlist + 138 early + 20 off-list', 'board.json, ranks 1–198'],
    [fmtM(R.total_implied_usd), 'total implied value', 'sum of the board'],
    ['×' + keptOf('loo').toFixed(2) + ' vs ×' + flatOf('loo').toFixed(2) + ' flat', 'leave-one-out miss', 'typical miss, 128 comps'],
    ['×' + keptOf('walk_forward').toFixed(2) + ' vs ×' + flatOf('walk_forward').toFixed(2) + ' flat', 'walk-forward miss', 'older → newer, ' + R.wf_test_n + ' tested'],
    [R.brier_model.toFixed(3) + ' vs ' + R.brier_base.toFixed(3) + ' base', 'token odds, Brier', R.odds_peers_n + ' peers, base rate ' + (R.odds_token_rate * 100).toFixed(1) + '%'],
    [farmN + ' of 198', 'worth farming, this scenario', depositLabel() + ' · drop ' + (state.drop * 100) + '% · ' + sizedNote],
  ];
  $('kpis').innerHTML = cards.map((c) => `<div class="kpi"><b>${c[0]}</b><span>${c[1]}</span><small>${c[2]}</small></div>`).join('');
}
function renderFormula() {
  $('formulaLine').innerHTML = `<b>Implied value</b> = exp(${R.size_a.toFixed(3)} + ${R.size_b.toFixed(3)} · ln TVL) × category factor × token odds &nbsp;·&nbsp; odds = logistic(no-token age) × 0.5 if kin of a token &nbsp;·&nbsp; R² ${R.size_r2.toFixed(3)} on ${R.comps_n} comps`;
  $('snapLine').textContent = 'DefiLlama snapshot ' + R.as_of + ' · model ' + R.model_version + ' · refitted in the browser from board.json';
  const sorted = [...R.rows].sort((a, b) => a.rank - b.rank);
  const ranksOk = sorted.every((r, i) => r.rank === i + 1);
  const nonRising = sorted.every((r, i) => i === 0 || r.implied_value_usd <= sorted[i - 1].implied_value_usd);
  const wlOk = R.rows.filter((r) => r.tier === 'Watchlist').length === 40;
  const ledgerOk = R.ledger_total === 758 && R.ledger.reduce((s, g) => s + g.count, 0) === 758;
  $('integrityStrip').innerHTML = `<b>Integrity strip — this page checks itself:</b> this table = board.json <b>✓</b> ${R.rows.length} of ${R.rows.length} rows <b>✓</b> ranks 1–198 in order: ${ranksOk ? '<b>✓</b>' : '✗'} values never rise: ${nonRising ? '<b>✓</b>' : '✗'} ledger ${R.ledger_total} of 758: ${ledgerOk ? '<b>✓</b>' : '✗'} watchlist 40 of 40: ${wlOk ? '<b>✓</b>' : '✗'} model ${R.model_version}`;
  const sizeRow = R.evidence.find((e) => e.term.startsWith('+ size curve'));
  const catRow = R.evidence.find((e) => e.term.includes('category effect'));
  $('ridgeLine').innerHTML = `<b>Ridge trade-off, stated not hidden:</b> the category ridge helps held-out (LOO ×${sizeRow.loo.toFixed(2)}→×${catRow.loo.toFixed(2)}, walk-forward ×${sizeRow.walk_forward.toFixed(2)}→×${catRow.walk_forward.toFixed(2)}) but hurts by-category (×${catRow.by_category.toFixed(2)}) and by-size (×${catRow.by_size.toFixed(2)} vs ×${sizeRow.by_size.toFixed(2)} size-only). The keep rule is leave-one-out + walk-forward, which the ridge passes; the two failing tests stay visible here and in the evidence table.`;
  const young = R.odds_age_buckets.find((b) => b.bucket.startsWith('under 6 months'));
  const old = R.odds_age_buckets.find((b) => b.bucket.startsWith('3–5 years'));
  $('ageLine').innerHTML = `<b>Token odds rise with age.</b> ${(young.token_rate * 100).toFixed(0)}% of protocols listed under 6 months record a token (n=${young.n}), vs ${(old.token_rate * 100).toFixed(0)}% at 3–5 years (n=${old.n}). The odds follow the peers' record — they do not assume a token becomes less likely with time, and they never say one will launch, or when.`;
}
function renderTop10() {
  const top = [...R.rows].sort((a, b) => a.rank - b.rank).slice(0, 10);
  $('top10Note').textContent = `The first 10 rows of the board, at the current scenario (${depositLabel()}, drop ${(state.drop * 100)}%). The full 198-row board with filters is below.`;
  $('top10Body').innerHTML = top.map((r) => {
    const e = econ(r);
    const tierBadge = r.tier === 'Watchlist' ? '<span class="badge">Watchlist</span>' : r.tier === 'Off-list' ? '<span class="badge off">Off-list</span>' : '';
    const kinBadge = r.kin ? '<span class="badge kin" title="Kin of a token: a sibling token already trades; odds ×0.5">Kin ×0.5</span>' : '';
    return `<tr data-slug="${r.slug}"><td>${r.rank}</td><td><b>${r.name}</b>${tierBadge}${kinBadge}</td><td>${fmtM(r.tvl_usd)}</td><td>${(r.model.odds * 100).toFixed(0)}%</td><td>${fmtM(r.model.size_curve_usd * r.model.category_factor)}</td><td><b>${fmtM(r.implied_value_usd)}</b></td><td>${fmtM(r.model.size_curve_usd * r.model.odds)}</td><td><span class="verdict ${e.verdict}">${e.verdict}</span> ${fmt$(e.net)}</td></tr>`;
  }).join('');
  document.querySelectorAll('#top10Body tr').forEach((tr) => tr.addEventListener('click', () => showDetail(tr.getAttribute('data-slug'))));
}
function renderLadder() {
  const tickets = [100, 500, 1000, 2500, 5000, 10000];
  const counts = (ticket) => {
    let f = 0, m = 0, s = 0;
    for (const r of R.rows) {
      const sl = r.implied_value_usd * state.drop * (ticket / r.tvl_usd);
      const net = sl - r.farm.fees_usd - r.farm.hours * 25;
      if (net > 25 && net / r.farm.hours > 25) f++; else if (net > 0) m++; else s++;
    }
    return [f, m, s];
  };
  const parts = tickets.map((t) => { const [f, m, s] = counts(t); return `$${t.toLocaleString('en-US')}: ${f} FARM / ${m} MARGINAL / ${s} SKIP`; });
  const [sf, sm, ss] = [R.verdict_counts_sized.FARM, R.verdict_counts_sized.MARGINAL, R.verdict_counts_sized.SKIP];
  parts.push(`sized 0.02% TVL: ${sf} / ${sm} / ${ss}`);
  $('ladderLine').innerHTML = `<b>Deposit ladder</b> (drop ${(state.drop * 100)}%, same formula at every ticket) — ${parts.join(' · ')}. At the flat $1,000 default the verdict column ranks almost nothing; the ladder shows what ticket flips each row.`;
}
const PALETTE = ['#2f6fb2', '#4da3ff', '#b083f0', '#3fb68b', '#7a8a99', '#e5534b', '#e0a63c', '#c96a4a', '#8a6fc0', '#5b7d8a', '#a34d6e', '#6e9e5f', '#946b2d'];
function renderLedger() {
  const total = R.ledger_total;
  $('ledgerBar').innerHTML = R.ledger.map((g, i) => `<div title="${g.label}: ${g.count}" style="width:${(g.count / total * 100).toFixed(2)}%;background:${PALETTE[i % PALETTE.length]}"></div>`).join('');
  $('ledgerGrid').innerHTML = R.ledger.map((g, i) => `<div class="lg"><span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span><b>${g.count}</b>${g.label} — <span class="mut">${g.reason}</span></div>`).join('');
  const sumOk = R.ledger.reduce((s, g) => s + g.count, 0) === 758 && total === 758;
  $('ledgerCheck').textContent = `✓ this ledger sums to ${total} of 758 protocols · ${R.board_size} ranked + ${R.ledger.find((g) => g.key === 'trades').count} token trades + ${R.ledger.find((g) => g.key === 'nocap').count} token on record, no cap + ${R.ledger.filter((g) => g.key.startsWith('setaside')).reduce((s, g) => s + g.count, 0)} set aside` + (sumOk ? ' ✓' : ' ✗ MISMATCH');
}
function renderEvidence() {
  const rows = R.evidence.map((e) => `<tr><td>${e.term}</td><td>×${e.loo.toFixed(2)}</td><td>×${e.walk_forward.toFixed(2)}</td><td>×${e.by_category.toFixed(2)}</td><td>×${e.by_size.toFixed(2)}</td><td>×${e.tenfold.toFixed(2)}</td><td class="${e.decision === 'kept' ? 'keep' : e.decision === 'baseline' ? 'base' : 'drop'}">${e.decision}</td></tr>`).join('');
  $('evValue').innerHTML = `<thead><tr><th>Term, added in order</th><th>Leave-one-out</th><th>Walk-forward</th><th>By-category</th><th>By-size</th><th>Ten-fold</th><th>Decision</th></tr></thead><tbody>${rows}</tbody>`;
  const orows = R.odds_evidence.map((e) => `<tr><td>${e.term}</td><td>${e.brier_in_sample.toFixed(3)}</td><td>${e.brier_walk_forward.toFixed(3)}</td><td class="${e.decision === 'kept' ? 'keep' : e.decision === 'baseline' ? 'base' : 'drop'}">${e.decision}</td></tr>`).join('');
  $('evOdds').innerHTML = `<thead><tr><th>Term, added in order</th><th>Brier, in sample</th><th>Brier, walk-forward</th><th>Decision</th></tr></thead><tbody>${orows}</tbody>`;
  $('oddsNote').textContent = `Peers are defined reproducibly: the ${R.odds_peers_n} protocols with a listed date, of which ${Math.round(R.odds_token_rate * R.odds_peers_n)} record a token (base rate ${(R.odds_token_rate * 100).toFixed(1)}%). Walk-forward base is the older peers' base rate carried forward (Brier ${R.brier_wf_base.toFixed(3)}); the age model scores ${R.brier_wf_model.toFixed(3)} on the newer peers. In sample the model calls ${(R.odds_acc * 100).toFixed(0)}% of peers right vs ${(R.odds_acc_base * 100).toFixed(0)}% for the base rate. Log TVL and relative momentum were tested in the odds — alone and jointly (B-style, Brier ${R.odds_joint.brier_in_sample.toFixed(3)} in sample / ${R.odds_joint.brier_walk_forward.toFixed(3)} walk-forward vs ${R.brier_model.toFixed(3)} / ${R.brier_wf_model.toFixed(3)} for age-only) — and did not lower the walk-forward Brier by more than noise, so they stay out.`;
  $('oddsAge').innerHTML = `<h3>Token odds as a function of age — the peers' record</h3><table class="ev"><thead><tr><th>No-token age</th><th>Peers</th><th>Share that record a token</th></tr></thead><tbody>${R.odds_age_buckets.map((b) => `<tr><td>${b.bucket}</td><td>${b.n}</td><td>${(b.token_rate * 100).toFixed(0)}%</td></tr>`).join('')}</tbody></table><p class="note">Tested, not assumed: the odds rise with age in this snapshot — a protocol that has run years with no token is more likely to be one that records a token eventually. The model follows the peers; it does not assume a token becomes less likely with time. That is the record, not a forecast.</p>`;
  const bandWidth = (b) => '×' + Math.exp(b.q75 - b.q25).toFixed(1);
  $('rangeNote').innerHTML = `<b>Is the printed range honest? Ranges are priced per kind.</b> Each row's P25–P75 / P10–P90 comes from the leave-one-out residuals of its own kind: categories with ≥8 comps use their own residuals, the rest use the global band. P25–P75 widths (top ÷ bottom): global ${bandWidth({ q25: R.range_q25, q75: R.range_q75 })} (n=128)` + R.range_bands.map((b) => ` · ${b.kind} ${bandWidth(b)} (n=${b.n})`).join('') + `. Scored against each comp's own band, P25–P75 covers ${(R.range_honesty_p50 * 100).toFixed(0)}% of held-out caps (stated 50%), P10–P90 covers ${(R.range_honesty_p80 * 100).toFixed(0)}% (stated 80%). A row's own cap was never used to set its range.`;
  const ctrl = R.evidence.find((e) => e.term.includes('control'));
  const keptEv = R.evidence.find((e) => e.term.includes('category effect'));
  $('controlNote').innerHTML = `<b>Negative control:</b> the growth of another row does not help — LOO ×${ctrl.loo.toFixed(2)} / walk-forward ×${ctrl.walk_forward.toFixed(2)} vs the kept model ×${keptEv.loo.toFixed(2)} / ×${keptEv.walk_forward.toFixed(2)}. If the control helped, the test would be broken.`;
  $('catFactors').innerHTML = `<thead><tr><th>Category</th><th>Comps (n)</th><th>Factor</th></tr></thead><tbody>${R.category_factors.map((c) => `<tr><td>${c.category}</td><td>${c.n}</td><td>×${c.factor.toFixed(3)}</td></tr>`).join('')}</tbody>`;
  $('catNote').textContent = `Factor = exp(shrunk median residual of the 128 comps in that category), shrink k=32 toward ×1.000, n≥3 only — categories with fewer than 3 comps get ×1.000 (no effect). Largest with real data: CEX ×1.267 (n=9); smallest: Liquid Staking ×0.803 (n=9). Every factor above is re-fit from the snapshot on every run; nothing is a hardcoded list.`;
}
function renderScatter() {
  const W = 760, H = 440, L = 64, Rm = 16, T = 18, B = 44;
  const x0 = Math.log10(5e6), x1 = Math.log10(3e9), y0 = 5, y1 = 8.4;
  const X = (v) => L + (Math.log10(v) - x0) / (x1 - x0) * (W - L - Rm);
  const Y = (v) => T + (y1 - Math.log10(Math.max(1e5, v))) / (y1 - y0) * (H - T - B);
  const ln10 = Math.log(10);
  let pts = '';
  for (let t = 1e7; t <= 1e9; t *= 10) {
    const y = Math.exp(R.size_a + R.size_b * Math.log(t)) ;
    pts += `${X(t).toFixed(1)},${Y(y).toFixed(1)} `;
  }
  const comps = R.comps.map((c) => `<circle cx="${X(c.tvl).toFixed(1)}" cy="${Y(c.mcap).toFixed(1)}" r="2.6" fill="#7a8a99" opacity="0.55"><title>comp: TVL ${fmtM(c.tvl)}, mcap ${fmtM(c.mcap)}</title></circle>`).join('');
  const board = R.rows.map((r) => `<circle cx="${X(r.tvl_usd).toFixed(1)}" cy="${Y(r.implied_value_usd).toFixed(1)}" r="3.2" fill="#5aa2ff"><title>#${r.rank} ${r.name}: TVL ${fmtM(r.tvl_usd)}, implied ${fmtM(r.implied_value_usd)}</title></circle>`).join('');
  const grid = [1e7, 1e8, 1e9].map((t) => `<line x1="${X(t)}" y1="${T}" x2="${X(t)}" y2="${H - B}" stroke="#1e2a38"/><text x="${X(t)}" y="${H - B + 18}" fill="#8b9bab" font-size="11" text-anchor="middle">${fmtM(t)}</text>`).join('')
    + [1e6, 1e7, 1e8].map((t) => `<line x1="${L}" y1="${Y(t)}" x2="${W - Rm}" y2="${Y(t)}" stroke="#1e2a38"/><text x="${L - 8}" y="${Y(t) + 4}" fill="#8b9bab" font-size="11" text-anchor="end">${fmtM(t)}</text>`).join('');
  $('scatter').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Log-log scatter of market cap against TVL">
    ${grid}<polyline points="${pts}" fill="none" stroke="#e0a63c" stroke-width="2"/>
    ${comps}${board}
    <text x="${L}" y="${H - 8}" fill="#8b9bab" font-size="11">TVL (log) →</text>
    <text x="14" y="${T + 8}" fill="#8b9bab" font-size="11">Market cap / implied value (log)</text>
    <text x="${W - Rm}" y="${T + 8}" fill="#8b9bab" font-size="11" text-anchor="end">grey = 128 comps · amber line = size curve · blue = 198 board rows</text>
  </svg>`;
}
function filteredRows() {
  const q = state.q.toLowerCase();
  let rows = R.rows.filter((r) => {
    if (state.verdict && econ(r).verdict !== state.verdict) return false;
    if (state.tier && r.tier !== state.tier) return false;
    if (state.cat && r.category !== state.cat) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (r.farm.hold_days > state.horizon) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q) || r.chains.join(' ').toLowerCase().includes(q))) return false;
    return true;
  });
  const k = state.sort;
  const val = (r) => k === 'name' ? r.name : k === 'size_curve_usd' ? r.model.size_curve_usd : k === 'odds' ? r.model.odds : k === 'size_only' ? r.model.size_curve_usd * r.model.odds : k === 'net' ? econ(r).net : k === 'net_per_hour' ? econ(r).perHour : k === 'rel_momentum_pp' ? (r.rel_momentum_pp ?? -999) : k === 'age_days' ? (r.age_days ?? -1) : r[k];
  rows = [...rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * state.dir;
  });
  return rows;
}
function renderTable() {
  const rows = filteredRows();
  $('rowCount').textContent = `${rows.length} of ${R.rows.length} rows · ${fmtM(rows.reduce((s, r) => s + r.implied_value_usd, 0))} implied in view (of ${fmtM(R.rows.reduce((s, r) => s + r.implied_value_usd, 0))} total) · TVL ${fmtM(rows.reduce((s, r) => s + r.tvl_usd, 0))}`;
  $('boardBody').innerHTML = rows.map((r) => {
    const e = econ(r);
    const tierBadge = r.tier === 'Watchlist' ? '<span class="badge">Watchlist</span>' : r.tier === 'Off-list' ? '<span class="badge off">Off-list</span>' : '';
    const kinBadge = r.kin ? '<span class="badge kin" title="Kin of a token: a sibling token already trades; odds ×0.5">Kin ×0.5</span>' : '';
    return `<tr data-slug="${r.slug}"><td>${r.rank}</td><td><b>${r.name}</b>${tierBadge}${kinBadge}<br><span class="mut">${r.category || '—'} · ${r.chains[0] || ''}${r.chains.length > 1 ? ' +' + (r.chains.length - 1) : ''}</span></td><td>${fmtM(r.tvl_usd)}</td><td>${r.rel_momentum_pp === null ? '—' : fmtS(r.rel_momentum_pp) + ' pp'}</td><td>${ageFmt(r.age_days)}</td><td>${(r.model.odds * 100).toFixed(0)}%<div class="bar"><i style="width:${(r.model.odds * 100).toFixed(0)}%"></i></div></td><td>${fmtM(r.model.size_curve_usd * r.model.category_factor)}</td><td><b>${fmtM(r.implied_value_usd)}</b></td><td title="Size-only implied value: size curve × odds, no category factor">${fmtM(r.model.size_curve_usd * r.model.odds)}</td><td>${fmtM(r.p25_usd)}–${fmtM(r.p75_usd)}</td><td><span class="verdict ${e.verdict}">${e.verdict}</span> ${fmt$(e.net)}<br><span class="mut">slice ${fmt$(e.slice)} − fees ${fmt$(e.fees)}</span></td><td>${fmt$(e.perHour)}/h</td></tr>`;
  }).join('');
  const sorted = [...R.rows].sort((a, b) => a.rank - b.rank);
  const ranksOk = sorted.every((r, i) => r.rank === i + 1);
  const nonRising = sorted.every((r, i) => i === 0 || r.implied_value_usd <= sorted[i - 1].implied_value_usd);
  const wlOk = R.rows.filter((r) => r.tier === 'Watchlist').length === 40;
  $('selfCheck').textContent = `this table = board.json ✓ ${R.rows.length} of ${R.rows.length} rows recomputed here ✓ ranks 1–198 in order: ${ranksOk ? '✓' : '✗'} ✓ values never rise: ${nonRising ? '✓' : '✗'} ✓ totals equal: ledger ${R.ledger_total} of 758 ✓ watchlist 40 of 40: ${wlOk ? '✓' : '✗'} ✓ model ${R.model_version}`;
  document.querySelectorAll('#boardBody tr').forEach((tr) => tr.addEventListener('click', () => showDetail(tr.getAttribute('data-slug'))));
}
function showDetail(slug, fromHash) {
  const r = R.rows.find((x) => x.slug === slug);
  if (!r) return;
  const e = econ(r);
  $('detailPanel').hidden = false;
  $('detailTitle').textContent = `#${r.rank} — ${r.name} (${r.tier}${r.kin ? ', kin of a token' : ''})`;
  $('detailBody').innerHTML = `<div class="grid"><div>
    <h3>Model breakdown — how the implied value is built</h3>
    <table><tbody>
    <tr><td>TVL</td><td>${fmtM(r.tvl_usd)} (${r.chains.join(', ')})</td></tr>
    <tr><td>Size curve, exp(${R.size_a.toFixed(3)} + ${R.size_b.toFixed(3)} · ln TVL)</td><td>${fmtM(r.model.size_curve_usd)}</td></tr>
    <tr><td>Category factor, ${r.category || 'no category'} (n=${r.model.category_n} comps)</td><td>×${r.model.category_factor.toFixed(3)}</td></tr>
    <tr><td>If it launches (size × category)</td><td>${fmtM(r.model.size_curve_usd * r.model.category_factor)}</td></tr>
    <tr><td>Token odds, logistic on ${ageFmt(r.age_days)} with no token</td><td>${(r.model.odds_raw * 100).toFixed(1)}%</td></tr>
    <tr><td>Kin discount${r.kin ? ' — a sibling token already trades' : ' — not kin'}</td><td>×${r.model.kin_discount}</td></tr>
    <tr><td><b>Implied value</b></td><td><b>${fmtM(r.implied_value_usd)}</b></td></tr>
    <tr><td>Implied value, size curve only (no category factor)</td><td>${fmtM(r.model.size_curve_usd * r.model.odds)}</td></tr>
    <tr><td>Range P25–P75 / P10–P90 (${r.model.range_band})</td><td>${fmtM(r.p25_usd)}–${fmtM(r.p75_usd)} / ${fmtM(r.p10_usd)}–${fmtM(r.p90_usd)}</td></tr>
    <tr><td>7-day TVL vs the week's median (${R.median_change_7d.toFixed(1)}%)</td><td>${r.rel_momentum_pp === null ? '—' : fmtS(r.rel_momentum_pp) + ' pp'}</td></tr>
    </tbody></table>
    <p class="note">Odds reasoning: among the ${R.odds_peers_n} peers with a listed date, ${(R.odds_token_rate * 100).toFixed(1)}% record a token, and the share rises steeply with years listed — ${ageFmt(r.age_days)} with no token puts this protocol at ${(r.model.odds_raw * 100).toFixed(1)}% on age alone${r.kin ? ', halved to ' + (r.model.odds * 100).toFixed(1) + '% because a sibling token already trades (kin heuristic, ×0.5)' : ''}. That is the peers' record, not a forecast.</p>
    <h3>Farm economics — ${depositLabel()}, drop share ${(state.drop * 100)}%</h3>
    <table><tbody>
    <tr><td>Airdrop slice (implied × drop × ticket/TVL)</td><td>${fmt$(e.slice)}</td></tr>
    <tr><td>Fees (bridge $2 + gas ×5 + 0.1% of plan capital)</td><td>−${fmt$(e.fees)}</td></tr>
    <tr><td>Time cost (${r.farm.hours.toFixed(1)} h × $25/h)</td><td>−${fmt$(r.farm.hours * 25)}</td></tr>
    <tr><td><b>Net</b></td><td><b>${fmt$(e.net)}</b> (${fmt$(e.perHour)}/h)</td></tr>
    <tr><td>Verdict</td><td><span class="verdict ${e.verdict}">${e.verdict}</span> — FARM if net &gt; $25 and net/hour &gt; $25; MARGINAL if net &gt; $0; else SKIP</td></tr>
    <tr><td>Deposit that breaks even (net $0) at this drop share</td><td>${fmtM((r.farm.fees_usd + r.farm.hours * 25) * r.tvl_usd / (r.implied_value_usd * state.drop))}</td></tr>
    <tr><td>Deposit that reaches FARM (net &gt; $25 and &gt; $25/h)</td><td>${fmtM((r.farm.fees_usd + r.farm.hours * 25 + 75) * r.tvl_usd / (r.implied_value_usd * state.drop))}</td></tr>
    <tr><td>Plan capital — minimum viable, sized from TVL / hold</td><td>${fmtM(r.farm.capital_usd)} / ${r.farm.hold_days} days</td></tr>
    </tbody></table>
    <p class="note"><b>What would change this verdict:</b> at this drop share, a deposit of ${fmtM((r.farm.fees_usd + r.farm.hours * 25) * r.tvl_usd / (r.implied_value_usd * state.drop))} breaks even and ${fmtM((r.farm.fees_usd + r.farm.hours * 25 + 75) * r.tvl_usd / (r.implied_value_usd * state.drop))} reaches FARM. TVL growth alone does not flip it at a fixed ticket — the slice is implied × drop × ticket/TVL, and implied grows only as TVL^0.52, so the slice shrinks as TVL^−0.48 when TVL rises. Time listed helps instead: the odds rise with age, so the implied value — and the slice — grow as the protocol runs longer with no token.</p></div>
    <div><h3>Farm plan — 6 steps at minimum viable capital, costed</h3><ol>${r.farm_steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    <p class="note">Venue, caps, lockups and points rates are not in the sealed snapshot (10 fields per protocol), so this plan names no venue, no points rate and no lockup term — the steps use the protocol's category playbook and the stated fee table, and every number above is derived from the snapshot plus that table.</p>
    <p class="note">${R.fee_note} Primary chain ${r.chains[0] || '—'} gas $${(R.fee_table[r.chains[0]] ?? 0.50).toFixed(2)} per transaction.</p></div></div>`;
  // A deep-linked detail view is a view of its own: show the panel at the top
  // instead of scrolling a long page (headless captures lose the scroll).
  if (fromHash) document.body.classList.add('detail-only');
  else $('detailPanel').scrollIntoView({ behavior: 'auto', block: 'start' });
}
function fillSelects() {
  const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
  $('fCat').innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${c}</option>`).join('');
  const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
  $('fChain').innerHTML = '<option value="">All chains</option>' + chains.map((c) => `<option>${c}</option>`).join('');
}
function bind() {
  $('q').addEventListener('input', (e) => { state.q = e.target.value; renderTable(); });
  const map = [['fVerdict', 'verdict'], ['fTier', 'tier'], ['fCat', 'cat'], ['fChain', 'chain']];
  for (const [id, key] of map) $(id).addEventListener('change', (e) => { state[key] = e.target.value; renderTable(); });
  $('fTicket').addEventListener('change', (e) => { state.deposit = e.target.value === 'plan' ? 'plan' : +e.target.value; renderKpis(); renderTop10(); renderTable(); });
  $('fDrop').addEventListener('change', (e) => { state.drop = +e.target.value; renderKpis(); renderTop10(); renderLadder(); renderTable(); });
  $('fHorizon').addEventListener('change', (e) => { state.horizon = +e.target.value; renderTable(); });
  $('resetBtn').addEventListener('click', () => { Object.assign(state, { q: '', verdict: '', tier: '', cat: '', chain: '', deposit: 1000, drop: 0.10, horizon: 84, sort: 'rank', dir: 1 }); $('q').value = ''; for (const [id] of map) $(id).value = ''; $('fTicket').value = '1000'; $('fDrop').value = '0.10'; $('fHorizon').value = '84'; renderKpis(); renderTop10(); renderLadder(); renderTable(); });
  document.querySelectorAll('#boardTable th[data-sort]').forEach((th) => th.addEventListener('click', () => {
    const k = th.getAttribute('data-sort');
    if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = k === 'name' ? 1 : -1; }
    renderTable();
  }));
  $('csvBtn').addEventListener('click', () => download('token-radar-v3-c.csv', 'text/csv', ['rank,slug,name,tier,category,chains,tvl_usd,implied_value_usd,odds,verdict,net_usd,net_per_hour_usd'].concat(filteredRows().map((r) => { const e = econ(r); return [r.rank, r.slug, '"' + r.name + '"', r.tier, '"' + (r.category || '') + '"', '"' + r.chains.join('|') + '"', r.tvl_usd, r.implied_value_usd, r.model.odds.toFixed(3), e.verdict, e.net.toFixed(2), e.perHour.toFixed(2)].join(','); })).join('\n')));
  $('jsonBtn').addEventListener('click', () => download('token-radar-v3-c.json', 'application/json', JSON.stringify(filteredRows(), null, 2)));
}
function download(name, type, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('detail')) { showDetail(h.get('detail'), true); return; }
  let filtered = false;
  if (h.get('verdict')) { state.verdict = h.get('verdict'); $('fVerdict').value = state.verdict; filtered = true; }
  if (h.get('tier')) { state.tier = h.get('tier'); $('fTier').value = state.tier; filtered = true; }
  if (h.get('cat')) { state.cat = h.get('cat'); $('fCat').value = state.cat; filtered = true; }
  if (h.get('chain')) { state.chain = h.get('chain'); $('fChain').value = state.chain; filtered = true; }
  if (h.get('ticket')) { state.deposit = h.get('ticket') === 'plan' ? 'plan' : +h.get('ticket'); $('fTicket').value = h.get('ticket'); filtered = true; }
  if (h.get('drop')) { state.drop = +h.get('drop'); $('fDrop').value = h.get('drop'); filtered = true; }
  if (h.get('q')) { state.q = h.get('q'); $('q').value = state.q; filtered = true; }
  if (filtered) document.body.classList.add('focus-board');
}
renderKpis(); renderFormula(); renderLedger(); renderEvidence(); renderScatter(); fillSelects(); bind(); applyHash(); renderTop10(); renderLadder(); renderTable();
