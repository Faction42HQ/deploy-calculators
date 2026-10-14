// Asset-agnostic trading math: position sizing, P/L, liquidation / margin call, FX pips, average cost.

export type Side = 'long' | 'short';
export type AssetClass = 'stock' | 'crypto' | 'forex' | 'commodity';

// ---------------- FX helpers ----------------

export const FX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'AUD/JPY', 'XAU/USD',
] as const;

export function splitPair(pair: string): [string, string] {
  const [b, q] = pair.split('/');
  return [b, q];
}

/** Pip size: 0.01 for JPY-quoted pairs and gold, otherwise 0.0001. */
export function pipSize(pair: string): number {
  const [b, q] = splitPair(pair);
  return q === 'JPY' || b === 'XAU' ? 0.01 : 0.0001;
}

/** Contract size per standard lot (100 oz for gold, 100,000 units for currencies). */
export function lotUnits(pair: string): number {
  return splitPair(pair)[0] === 'XAU' ? 100 : 100_000;
}

/**
 * Multiplier converting an amount in the pair's quote currency into the account currency.
 * quote == account → 1; base == account → 1/price; otherwise the caller supplies quote→account.
 */
export function quoteToAccount(pair: string, price: number, account: string, crossRate?: number): number {
  const [b, q] = splitPair(pair);
  if (q === account) return 1;
  if (b === account) return 1 / price;
  if (!crossRate || crossRate <= 0) return NaN;
  return crossRate;
}

export function needsCrossRate(pair: string, account: string): boolean {
  const [b, q] = splitPair(pair);
  return q !== account && b !== account;
}

export interface PipValueInput {
  pair: string;
  price: number;
  units: number;
  account: string;
  crossRate?: number;
}

export function pipValue(i: PipValueInput) {
  const ps = pipSize(i.pair);
  const inQuote = ps * i.units;
  const conv = quoteToAccount(i.pair, i.price, i.account, i.crossRate);
  return { pipSize: ps, perPipQuote: inQuote, perPip: inQuote * conv, perPipPerLot: ps * lotUnits(i.pair) * conv };
}

// ---------------- Position size ----------------

export interface PositionSizeInput {
  asset: AssetClass;
  balance: number;
  riskMode: 'pct' | 'amount';
  risk: number; // percent (1 = 1%) or account-currency amount
  entry: number;
  stop: number;
  target?: number;
  feePct?: number; // per side, percent of notional
  wholeUnits?: boolean; // round down to whole shares/contracts
  /** Units per contract (futures/commodities). 1 for stocks/crypto. */
  multiplier?: number;
  /** Forex only. */
  pair?: string;
  account?: string;
  crossRate?: number;
}

export function positionSize(i: PositionSizeInput) {
  const riskAmount = i.riskMode === 'pct' ? (i.balance * i.risk) / 100 : i.risk;
  const side: Side = i.stop < i.entry ? 'long' : 'short';
  const dist = Math.abs(i.entry - i.stop);
  if (!(dist > 0)) throw new Error('Stop-loss must be different from the entry price.');
  if (!(riskAmount > 0)) throw new Error('Risk must be greater than zero.');

  const fee = (i.feePct ?? 0) / 100;
  const mult = i.multiplier && i.multiplier > 0 ? i.multiplier : 1;
  const conv = i.asset === 'forex' && i.pair ? quoteToAccount(i.pair, i.entry, i.account ?? 'USD', i.crossRate) : 1;
  if (!Number.isFinite(conv)) throw new Error('Enter the conversion rate from the quote currency to your account currency.');

  // Loss per unit if the stop is hit, including entry + exit fees.
  const lossPerUnit = (dist + fee * (i.entry + i.stop)) * mult * conv;
  let units = riskAmount / lossPerUnit;
  if (i.wholeUnits) units = Math.floor(units);

  const notional = units * i.entry * mult * conv;
  const actualRisk = units * lossPerUnit;
  const out = {
    side,
    units,
    notional,
    riskAmount: actualRisk,
    stopDistance: dist,
    stopPct: dist / i.entry,
    leverage: notional / i.balance,
    lots: i.asset === 'forex' && i.pair ? units / lotUnits(i.pair) : undefined,
    pips: i.asset === 'forex' && i.pair ? dist / pipSize(i.pair) : undefined,
    reward: undefined as number | undefined,
    rr: undefined as number | undefined,
  };
  if (i.target && i.target > 0) {
    const gainPerUnit = ((side === 'long' ? i.target - i.entry : i.entry - i.target) - fee * (i.entry + i.target)) * mult * conv;
    out.reward = units * gainPerUnit;
    out.rr = gainPerUnit / lossPerUnit;
  }
  return out;
}

// ---------------- Profit / loss ----------------

export interface ProfitInput {
  side: Side;
  entry: number;
  exit: number;
  qty: number;
  feeMode: 'pct' | 'flat';
  fee: number; // percent per side, or flat amount per side
  leverage: number; // 1 = unlevered
}

export function profit(i: ProfitInput) {
  const cost = i.entry * i.qty;
  const proceeds = i.exit * i.qty;
  const gross = i.side === 'long' ? proceeds - cost : cost - proceeds;
  const fees = i.feeMode === 'pct' ? ((cost + proceeds) * i.fee) / 100 : 2 * i.fee;
  const net = gross - fees;
  const lev = i.leverage > 0 ? i.leverage : 1;
  const margin = cost / lev;
  let breakeven: number;
  if (i.feeMode === 'pct') {
    const f = i.fee / 100;
    breakeven = i.side === 'long' ? (i.entry * (1 + f)) / (1 - f) : (i.entry * (1 - f)) / (1 + f);
  } else {
    breakeven = i.side === 'long' ? i.entry + (2 * i.fee) / i.qty : i.entry - (2 * i.fee) / i.qty;
  }
  return { cost, proceeds, gross, fees, net, margin, returnOnCost: net / cost, roe: net / margin, breakeven, priceChange: (i.exit - i.entry) / i.entry };
}

// ---------------- Liquidation / margin call ----------------

export interface LiquidationInput {
  side: Side;
  entry: number;
  leverage: number;
  /** Maintenance margin as a fraction of position value (0.05 = 5%). */
  mmr: number;
}

/**
 * Isolated-margin liquidation (perps) or margin-call price (broker margin).
 * Equity at price P hits maintenance:
 *   long:  E/L + (P − E) = mmr·P  →  P = E(1 − 1/L) / (1 − mmr)
 *   short: E/L + (E − P) = mmr·P  →  P = E(1 + 1/L) / (1 + mmr)
 * Matches Hyperliquid's formula with mmr = 1 / (2 × max leverage).
 */
export function liquidationPrice(i: LiquidationInput) {
  const im = 1 / i.leverage;
  if (im <= i.mmr) return { price: i.entry, distancePct: 0, immediate: true };
  const price = i.side === 'long' ? (i.entry * (1 - im)) / (1 - i.mmr) : (i.entry * (1 + im)) / (1 + i.mmr);
  return { price, distancePct: Math.abs(price - i.entry) / i.entry, immediate: false };
}

/** Hyperliquid maintenance margin rate for a market with the given max leverage. */
export const hlMaintenance = (maxLeverage: number) => 1 / (2 * maxLeverage);

// ---------------- Average cost ----------------

export interface Lot {
  qty: number;
  price: number;
}

export function averageCost(lots: Lot[], feePerTrade = 0) {
  const valid = lots.filter((l) => l.qty > 0 && l.price > 0);
  const qty = valid.reduce((a, l) => a + l.qty, 0);
  const cost = valid.reduce((a, l) => a + l.qty * l.price, 0) + feePerTrade * valid.length;
  return { qty, cost, average: qty > 0 ? cost / qty : NaN };
}

/**
 * Units to buy at `buyPrice` so the average becomes `target`.
 * Q(avg − target) = n(target − buyPrice). Valid when target lies strictly between buyPrice and avg.
 */
export function unitsForTargetAverage(qty: number, avg: number, buyPrice: number, target: number): number {
  const lo = Math.min(avg, buyPrice);
  const hi = Math.max(avg, buyPrice);
  if (!(target > lo && target < hi)) return NaN;
  return (qty * (avg - target)) / (target - buyPrice);
}
