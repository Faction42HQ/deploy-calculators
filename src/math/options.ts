// Options payoff at expiration (multi-leg) and Black–Scholes pricing for realistic default premiums.

export type LegType = 'call' | 'put' | 'stock';
export type LegSide = 'buy' | 'sell';

export interface Leg {
  side: LegSide;
  type: LegType;
  /** Strike for options; purchase price for stock legs. */
  strike: number;
  /** Premium per share (options). Ignored for stock legs. */
  premium: number;
  /** Contracts for options, shares for stock legs. */
  qty: number;
}

export const CONTRACT = 100;

const sign = (s: LegSide) => (s === 'buy' ? 1 : -1);

export function legPayoff(l: Leg, S: number): number {
  const sg = sign(l.side);
  if (l.type === 'stock') return sg * l.qty * (S - l.strike);
  const intrinsic = l.type === 'call' ? Math.max(0, S - l.strike) : Math.max(0, l.strike - S);
  return sg * l.qty * CONTRACT * (intrinsic - l.premium);
}

export const payoff = (legs: Leg[], S: number) => legs.reduce((a, l) => a + legPayoff(l, S), 0);

/** Net premium: negative = you pay (debit), positive = you receive (credit). */
export const netPremium = (legs: Leg[]) =>
  legs.filter((l) => l.type !== 'stock').reduce((a, l) => a - sign(l.side) * l.qty * CONTRACT * l.premium, 0);

/** Payoff slope (per $1 of underlying) for S above every strike. */
function upperSlope(legs: Leg[]): number {
  return legs.reduce((a, l) => {
    const sg = sign(l.side);
    if (l.type === 'stock') return a + sg * l.qty;
    if (l.type === 'call') return a + sg * l.qty * CONTRACT;
    return a;
  }, 0);
}

export function analyze(legs: Leg[]) {
  if (!legs.length) throw new Error('Add at least one leg.');
  // Payoff is piecewise linear with kinks at strikes; extremes are at 0, a kink, or ±∞.
  const kinks = [...new Set(legs.filter((l) => l.type !== 'stock').map((l) => l.strike))].sort((a, b) => a - b);
  const xs = [0, ...kinks.filter((k) => k > 0)];
  const hiX = Math.max(...legs.map((l) => l.strike), 1) * 2;
  xs.push(hiX);
  const ys = xs.map((x) => payoff(legs, x));
  const slopeHi = upperSlope(legs);

  let maxProfit = Math.max(...ys);
  let maxLoss = Math.min(...ys);
  const unlimitedProfit = slopeHi > 1e-9;
  const unlimitedLoss = slopeHi < -1e-9;
  if (unlimitedProfit) maxProfit = Infinity;
  if (unlimitedLoss) maxLoss = -Infinity;

  const breakevens: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[i], ys[i + 1]];
    if (y0 === 0 && (i === 0 || ys[i - 1] !== 0)) breakevens.push(x0);
    if ((y0 < 0 && y1 > 0) || (y0 > 0 && y1 < 0)) breakevens.push(x0 + ((0 - y0) * (x1 - x0)) / (y1 - y0));
  }
  // Beyond the scanned range the payoff keeps its upper slope; catch a crossing out there.
  const yHi = ys[ys.length - 1];
  if ((yHi < 0 && slopeHi > 0) || (yHi > 0 && slopeHi < 0)) breakevens.push(hiX - yHi / slopeHi);
  return { maxProfit, maxLoss, unlimitedProfit, unlimitedLoss, breakevens: dedupe(breakevens), netPremium: netPremium(legs) };
}

function dedupe(a: number[]) {
  return a.filter((v, i) => i === 0 || Math.abs(v - a[i - 1]) > 1e-6);
}

// ---------------- Black–Scholes ----------------

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 7.5e-8). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export function blackScholes(type: 'call' | 'put', S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, type === 'call' ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return type === 'call' ? S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2) : K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

// ---------------- Strategy presets ----------------

export const STRATEGIES = {
  'long-call': 'Long call',
  'long-put': 'Long put',
  'covered-call': 'Covered call',
  'cash-secured-put': 'Cash-secured put',
  'bull-call-spread': 'Bull call spread',
  'bear-put-spread': 'Bear put spread',
  'long-straddle': 'Long straddle',
  'long-strangle': 'Long strangle',
  'iron-condor': 'Iron condor',
  custom: 'Custom',
} as const;

export type Strategy = keyof typeof STRATEGIES;

/** Strike grid step that looks natural for the underlying price. */
export function strikeStep(S: number): number {
  if (S < 25) return 0.5;
  if (S < 100) return 1;
  if (S < 250) return 2.5;
  if (S < 1000) return 5;
  return 10 ** Math.floor(Math.log10(S)) / 100 * 5;
}

/**
 * Build legs for a preset around underlying S, priced with Black–Scholes
 * (30 days, 30% IV, 4% rate) so default premiums are realistic.
 */
export function presetLegs(strategy: Strategy, S: number, days = 30, iv = 0.3, r = 0.04): Leg[] {
  const step = strikeStep(S);
  const atm = Math.round(S / step) * step;
  const T = days / 365;
  const px = (type: 'call' | 'put', K: number) => +blackScholes(type, S, K, T, r, iv).toFixed(2);
  const opt = (side: LegSide, type: 'call' | 'put', K: number): Leg => ({ side, type, strike: +K.toFixed(2), premium: px(type, K), qty: 1 });
  const w = step * Math.max(1, Math.round((S * 0.05) / step)); // ~5% wing width
  switch (strategy) {
    case 'long-call': return [opt('buy', 'call', atm)];
    case 'long-put': return [opt('buy', 'put', atm)];
    case 'covered-call': return [{ side: 'buy', type: 'stock', strike: S, premium: 0, qty: 100 }, opt('sell', 'call', atm + w)];
    case 'cash-secured-put': return [opt('sell', 'put', atm - w)];
    case 'bull-call-spread': return [opt('buy', 'call', atm), opt('sell', 'call', atm + w)];
    case 'bear-put-spread': return [opt('buy', 'put', atm), opt('sell', 'put', atm - w)];
    case 'long-straddle': return [opt('buy', 'call', atm), opt('buy', 'put', atm)];
    case 'long-strangle': return [opt('buy', 'call', atm + w), opt('buy', 'put', atm - w)];
    case 'iron-condor':
      return [opt('buy', 'put', atm - 2 * w), opt('sell', 'put', atm - w), opt('sell', 'call', atm + w), opt('buy', 'call', atm + 2 * w)];
    default: return [opt('buy', 'call', atm)];
  }
}
