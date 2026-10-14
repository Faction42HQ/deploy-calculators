// Expected values are worked out by hand (comments show the arithmetic).
import { describe, expect, it } from 'vitest';
import { averageCost, hlMaintenance, liquidationPrice, pipValue, positionSize, profit, unitsForTargetAverage } from '../src/math/trading';
import { analyze, blackScholes, payoff, presetLegs, type Leg } from '../src/math/options';
import { aprFromApy, apyFromApr, cagr, dividendProjection, project } from '../src/math/growth';
import { backtest, schedule, type Candle } from '../src/math/dca';

describe('position size', () => {
  it('stock: $10k, 1% risk, entry 50, stop 48 → 50 shares', () => {
    // risk $100 / $2 per share = 50 shares, notional $2,500
    const r = positionSize({ asset: 'stock', balance: 10_000, riskMode: 'pct', risk: 1, entry: 50, stop: 48 });
    expect(r.units).toBeCloseTo(50);
    expect(r.notional).toBeCloseTo(2500);
    expect(r.side).toBe('long');
    expect(r.leverage).toBeCloseTo(0.25);
  });
  it('short with target gives R:R', () => {
    // entry 100, stop 105 (risk 5), target 90 (reward 10) → 2R
    const r = positionSize({ asset: 'crypto', balance: 5000, riskMode: 'amount', risk: 50, entry: 100, stop: 105, target: 90 });
    expect(r.side).toBe('short');
    expect(r.units).toBeCloseTo(10);
    expect(r.rr).toBeCloseTo(2);
    expect(r.reward).toBeCloseTo(100);
  });
  it('fees widen the per-unit loss', () => {
    // loss/unit = 2 + 0.001*(50+48) = 2.098 → 100/2.098 = 47.66
    const r = positionSize({ asset: 'stock', balance: 10_000, riskMode: 'pct', risk: 1, entry: 50, stop: 48, feePct: 0.1 });
    expect(r.units).toBeCloseTo(47.664, 2);
  });
  it('forex EUR/USD: 50 pip stop, $100 risk → 0.2 lots', () => {
    // 100 / 0.005 = 20,000 units
    const r = positionSize({ asset: 'forex', balance: 10_000, riskMode: 'pct', risk: 1, entry: 1.1, stop: 1.095, pair: 'EUR/USD', account: 'USD' });
    expect(r.units).toBeCloseTo(20_000);
    expect(r.lots).toBeCloseTo(0.2);
    expect(r.pips).toBeCloseTo(50);
  });
  it('forex USD/JPY converts JPY loss to USD', () => {
    // loss/unit = 0.5 JPY / 150 = 0.003333 USD → 100 / 0.003333 = 30,000 units
    const r = positionSize({ asset: 'forex', balance: 10_000, riskMode: 'pct', risk: 1, entry: 150, stop: 149.5, pair: 'USD/JPY', account: 'USD' });
    expect(r.units).toBeCloseTo(30_000);
    expect(r.pips).toBeCloseTo(50);
  });
  it('rejects stop == entry', () => {
    expect(() => positionSize({ asset: 'stock', balance: 1, riskMode: 'pct', risk: 1, entry: 5, stop: 5 })).toThrow();
  });
});

describe('pip value', () => {
  it('EUR/USD standard lot = $10/pip', () => {
    expect(pipValue({ pair: 'EUR/USD', price: 1.1, units: 100_000, account: 'USD' }).perPip).toBeCloseTo(10);
  });
  it('USD/JPY @150 standard lot = $6.67/pip', () => {
    // 0.01 * 100,000 = 1,000 JPY / 150
    expect(pipValue({ pair: 'USD/JPY', price: 150, units: 100_000, account: 'USD' }).perPip).toBeCloseTo(6.6667, 3);
  });
  it('cross pair uses supplied rate', () => {
    // EUR/GBP pip = 10 GBP per lot; GBP→USD 1.25 → $12.50
    expect(pipValue({ pair: 'EUR/GBP', price: 0.85, units: 100_000, account: 'USD', crossRate: 1.25 }).perPip).toBeCloseTo(12.5);
  });
  it('gold: 0.01 pip on 100 oz = $1', () => {
    expect(pipValue({ pair: 'XAU/USD', price: 2400, units: 100, account: 'USD' }).perPip).toBeCloseTo(1);
  });
});

describe('profit', () => {
  it('long 10 @100 → 110 with 0.1% fees', () => {
    // gross 100, fees 0.001*(1000+1100) = 2.1, net 97.9; breakeven 100*1.001/0.999
    const r = profit({ side: 'long', entry: 100, exit: 110, qty: 10, feeMode: 'pct', fee: 0.1, leverage: 1 });
    expect(r.gross).toBeCloseTo(100);
    expect(r.fees).toBeCloseTo(2.1);
    expect(r.net).toBeCloseTo(97.9);
    expect(r.breakeven).toBeCloseTo(100.2002, 3);
  });
  it('short with leverage reports ROE on margin', () => {
    // short 2 @ 3000 → 2700: gross 600, margin 6000/5 = 1200 → ROE 50%
    const r = profit({ side: 'short', entry: 3000, exit: 2700, qty: 2, feeMode: 'flat', fee: 0, leverage: 5 });
    expect(r.net).toBeCloseTo(600);
    expect(r.roe).toBeCloseTo(0.5);
  });
});

describe('liquidation / margin call', () => {
  it('10x long, 5% maintenance → 94.74', () => {
    // 100 * 0.9 / 0.95
    expect(liquidationPrice({ side: 'long', entry: 100, leverage: 10, mmr: 0.05 }).price).toBeCloseTo(94.7368, 3);
  });
  it('10x short → 104.76', () => {
    // 100 * 1.1 / 1.05
    expect(liquidationPrice({ side: 'short', entry: 100, leverage: 10, mmr: 0.05 }).price).toBeCloseTo(104.7619, 3);
  });
  it('Reg-T 2x long, 25% maintenance → margin call at 66.67', () => {
    expect(liquidationPrice({ side: 'long', entry: 100, leverage: 2, mmr: 0.25 }).price).toBeCloseTo(66.667, 2);
  });
  it('leverage above max liquidates immediately', () => {
    expect(liquidationPrice({ side: 'long', entry: 100, leverage: 50, mmr: hlMaintenance(20) }).immediate).toBe(true);
  });
  it('Hyperliquid maintenance = 1/(2·maxLev)', () => {
    expect(hlMaintenance(40)).toBeCloseTo(0.0125);
  });
});

describe('average cost', () => {
  it('10 @100 + 10 @80 = 90', () => {
    expect(averageCost([{ qty: 10, price: 100 }, { qty: 10, price: 80 }]).average).toBeCloseTo(90);
  });
  it('shares to buy at 70 to bring avg 90 → 85', () => {
    // 20*(90-85)/(85-70) = 6.667
    expect(unitsForTargetAverage(20, 90, 70, 85)).toBeCloseTo(6.6667, 3);
  });
  it('impossible target → NaN', () => {
    expect(unitsForTargetAverage(20, 90, 70, 60)).toBeNaN();
  });
});

describe('options', () => {
  it('Black–Scholes reference values', () => {
    // Hull: S=100 K=100 T=1 r=5% σ=20% → C 10.4506, P 5.5735
    expect(blackScholes('call', 100, 100, 1, 0.05, 0.2)).toBeCloseTo(10.4506, 3);
    expect(blackScholes('put', 100, 100, 1, 0.05, 0.2)).toBeCloseTo(5.5735, 3);
  });
  it('long call K100 @5: max loss 500, unlimited profit, breakeven 105', () => {
    const a = analyze([{ side: 'buy', type: 'call', strike: 100, premium: 5, qty: 1 }]);
    expect(a.maxLoss).toBeCloseTo(-500);
    expect(a.unlimitedProfit).toBe(true);
    expect(a.breakevens).toHaveLength(1);
    expect(a.breakevens[0]).toBeCloseTo(105);
  });
  it('iron condor 90/95/105/110 for 2 credit', () => {
    const legs: Leg[] = [
      { side: 'buy', type: 'put', strike: 90, premium: 1, qty: 1 },
      { side: 'sell', type: 'put', strike: 95, premium: 2, qty: 1 },
      { side: 'sell', type: 'call', strike: 105, premium: 2, qty: 1 },
      { side: 'buy', type: 'call', strike: 110, premium: 1, qty: 1 },
    ];
    const a = analyze(legs);
    expect(a.netPremium).toBeCloseTo(200);
    expect(a.maxProfit).toBeCloseTo(200);
    expect(a.maxLoss).toBeCloseTo(-300);
    expect(a.breakevens.map((b) => +b.toFixed(4))).toEqual([93, 107]);
  });
  it('naked short call has unlimited loss', () => {
    expect(analyze([{ side: 'sell', type: 'call', strike: 100, premium: 3, qty: 1 }]).unlimitedLoss).toBe(true);
  });
  it('covered call caps profit', () => {
    // 100 sh @100 + short 105 call @2: max profit = 500 + 200 = 700, breakeven 98
    const a = analyze([
      { side: 'buy', type: 'stock', strike: 100, premium: 0, qty: 100 },
      { side: 'sell', type: 'call', strike: 105, premium: 2, qty: 1 },
    ]);
    expect(a.maxProfit).toBeCloseTo(700);
    expect(a.breakevens[0]).toBeCloseTo(98);
    expect(payoff([{ side: 'buy', type: 'stock', strike: 100, premium: 0, qty: 100 }], 0)).toBeCloseTo(-10_000);
  });
  it('presets produce sane legs', () => {
    const legs = presetLegs('iron-condor', 200);
    expect(legs).toHaveLength(4);
    expect(legs.every((l) => l.premium >= 0)).toBe(true);
    expect(analyze(legs).netPremium).toBeGreaterThan(0);
  });
  it('breakeven beyond the scanned range is still found', () => {
    // premium 150 on a 100 strike → breakeven 250 (> 2 × strike)
    const a = analyze([{ side: 'buy', type: 'call', strike: 100, premium: 150, qty: 1 }]);
    expect(a.breakevens[0]).toBeCloseTo(250);
  });
});

describe('growth', () => {
  it('APR ↔ APY', () => {
    expect(apyFromApr(0.05, 12)).toBeCloseTo(0.051162, 5);
    expect(apyFromApr(0.05, 365)).toBeCloseTo(0.051267, 5);
    expect(apyFromApr(0.05, Infinity)).toBeCloseTo(0.051271, 5);
    expect(aprFromApy(apyFromApr(0.07, 52), 52)).toBeCloseTo(0.07, 10);
  });
  it('CAGR 100 → 200 in 5y = 14.87%', () => {
    expect(cagr(100, 200, 5)).toBeCloseTo(0.148698, 5);
  });
  it('projection: $1,000 at 10% APY for 1 year, no deposits', () => {
    const rows = project(1000, 0, 0.1, 1);
    expect(rows[rows.length - 1].balance).toBeCloseTo(1100);
  });
  it('projection: deposits only (0%) sum up', () => {
    expect(project(0, 100, 0, 2).slice(-1)[0].balance).toBeCloseTo(2400);
  });
  it('dividends: 4% yield, annual pay, DRIP, flat price → 10,400', () => {
    const r = dividendProjection({ initial: 10_000, monthly: 0, yieldPct: 4, divGrowthPct: 0, priceGrowthPct: 0, years: 1, frequency: 1, drip: true, taxPct: 0 });
    expect(r.finalValue).toBeCloseTo(10_400);
    expect(r.totalDividends).toBeCloseTo(400);
  });
  it('dividends: no DRIP keeps cash, DRIP compounds more', () => {
    const base = { initial: 10_000, monthly: 0, yieldPct: 4, divGrowthPct: 0, priceGrowthPct: 0, years: 10, frequency: 4 as const, taxPct: 0 };
    const cash = dividendProjection({ ...base, drip: false });
    const drip = dividendProjection({ ...base, drip: true });
    expect(cash.finalValue).toBeCloseTo(14_000); // 10 years × $400
    expect(drip.finalValue).toBeGreaterThan(14_800); // ≈ 10,000 × 1.01^40 = 14,889
    expect(drip.finalValue).toBeCloseTo(10_000 * 1.01 ** 40, 0);
  });
  it('dividend tax reduces income', () => {
    const r = dividendProjection({ initial: 10_000, monthly: 0, yieldPct: 4, divGrowthPct: 0, priceGrowthPct: 0, years: 1, frequency: 1, drip: false, taxPct: 15 });
    expect(r.totalDividends).toBeCloseTo(340);
  });
});

describe('DCA backtest', () => {
  const DAY = 86_400_000;
  const t0 = Date.UTC(2024, 0, 1);
  // price 100 for 31 days, then 200 for the rest of Feb
  const candles: Candle[] = Array.from({ length: 60 }, (_, i) => ({ t: t0 + i * DAY, close: i < 31 ? 100 : 200 }));

  it('monthly schedule keeps day-of-month and clamps short months', () => {
    const s = schedule(Date.UTC(2024, 0, 31), Date.UTC(2024, 3, 30), 'monthly');
    expect(s.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
  });
  it('two monthly buys: $100 @100 + $100 @200', () => {
    // units = 1 + 0.5 = 1.5; value at 200 = 300; avg cost 200/1.5 = 133.33
    const r = backtest({ candles, amount: 100, frequency: 'monthly', start: t0, end: t0 + 59 * DAY, feePct: 0 });
    expect(r.buys).toBe(2);
    expect(r.invested).toBe(200);
    expect(r.value).toBeCloseTo(300);
    expect(r.avgCost).toBeCloseTo(133.333, 2);
    // lump sum: 200 @100 = 2 units → 400
    expect(r.lumpValue).toBeCloseTo(400);
  });
  it('fees reduce units', () => {
    const r = backtest({ candles, amount: 100, frequency: 'monthly', start: t0, end: t0 + 59 * DAY, feePct: 1 });
    expect(r.value).toBeCloseTo(297);
  });
});
