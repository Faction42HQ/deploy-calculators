// Compounding, APY/APR, CAGR, dividends (DRIP) and contribution projections.

export const COMPOUNDING = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  semiannually: 2,
  annually: 1,
  continuous: Infinity,
} as const;
export type Compounding = keyof typeof COMPOUNDING;

export function apyFromApr(apr: number, n: number): number {
  return n === Infinity ? Math.exp(apr) - 1 : (1 + apr / n) ** n - 1;
}

export function aprFromApy(apy: number, n: number): number {
  return n === Infinity ? Math.log(1 + apy) : n * ((1 + apy) ** (1 / n) - 1);
}

export function cagr(start: number, end: number, years: number): number {
  if (!(start > 0) || !(end > 0) || !(years > 0)) return NaN;
  return (end / start) ** (1 / years) - 1;
}

export interface ProjectionRow {
  year: number;
  contributed: number;
  balance: number;
  growth: number;
}

/**
 * Month-by-month balance with contributions at the end of each month.
 * The annual rate is an effective yield (APY), converted to a monthly rate.
 */
export function project(start: number, monthly: number, apy: number, years: number): ProjectionRow[] {
  const r = (1 + apy) ** (1 / 12) - 1;
  let bal = start;
  let contributed = start;
  const rows: ProjectionRow[] = [{ year: 0, contributed, balance: bal, growth: 0 }];
  const months = Math.round(years * 12);
  for (let m = 1; m <= months; m++) {
    bal = bal * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0 || m === months) rows.push({ year: m / 12, contributed, balance: bal, growth: bal - contributed });
  }
  return rows;
}

/** Compound interest with an explicit compounding frequency (APR input) and monthly deposits. */
export function compound(start: number, monthly: number, apr: number, n: number, years: number): ProjectionRow[] {
  return project(start, monthly, apyFromApr(apr, n), years);
}

// ---------------- Dividends / DRIP ----------------

export interface DividendInput {
  initial: number;
  monthly: number;
  yieldPct: number; // starting dividend yield, %
  divGrowthPct: number; // annual dividend-per-share growth, %
  priceGrowthPct: number; // annual share price appreciation, %
  years: number;
  frequency: 1 | 4 | 12; // payments per year
  drip: boolean;
  taxPct: number; // tax on dividends, %
}

export interface DividendRow {
  year: number;
  contributed: number;
  dividends: number; // net dividends paid during the year
  annualIncome: number; // forward annual net income at year end
  value: number; // holdings + uninvested dividend cash
  shares: number;
}

export function dividendProjection(i: DividendInput) {
  const price0 = 100; // arbitrary; results are price-independent
  const monthlyPriceGrowth = (1 + i.priceGrowthPct / 100) ** (1 / 12);
  let price = price0;
  let dps = (price0 * i.yieldPct) / 100; // annual dividend per share
  let shares = i.initial / price;
  let cash = 0;
  let contributed = i.initial;
  let totalDividends = 0;
  let yearDivs = 0;
  const every = 12 / i.frequency;
  const net = 1 - i.taxPct / 100;
  const rows: DividendRow[] = [{ year: 0, contributed, dividends: 0, annualIncome: shares * dps * net, value: i.initial, shares }];

  const months = Math.round(i.years * 12);
  for (let m = 1; m <= months; m++) {
    price *= monthlyPriceGrowth;
    if (m % every === 0) {
      const paid = ((shares * dps) / i.frequency) * net;
      totalDividends += paid;
      yearDivs += paid;
      if (i.drip) shares += paid / price;
      else cash += paid;
    }
    if (i.monthly) {
      shares += i.monthly / price;
      contributed += i.monthly;
    }
    if (m % 12 === 0) {
      dps *= 1 + i.divGrowthPct / 100;
      rows.push({ year: m / 12, contributed, dividends: yearDivs, annualIncome: shares * dps * net, value: shares * price + cash, shares });
      yearDivs = 0;
    }
  }
  const last = rows[rows.length - 1];
  return {
    rows,
    finalValue: last.value,
    totalDividends,
    contributed,
    annualIncome: last.annualIncome,
    monthlyIncome: last.annualIncome / 12,
    yieldOnCost: last.annualIncome / contributed,
  };
}
