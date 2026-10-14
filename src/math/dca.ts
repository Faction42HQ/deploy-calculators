// Dollar-cost averaging backtest over daily closes.

export interface Candle {
  t: number; // ms, start of day UTC
  close: number;
}

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface DcaInput {
  candles: Candle[];
  amount: number;
  frequency: Frequency;
  start: number; // ms
  end: number; // ms
  feePct: number;
}

const DAY = 86_400_000;

/** Scheduled buy dates from start to end (inclusive). Monthly keeps the start day-of-month. */
export function schedule(start: number, end: number, f: Frequency): number[] {
  const out: number[] = [];
  if (f === 'monthly') {
    const d0 = new Date(start);
    for (let k = 0; ; k++) {
      const d = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, 1);
      const dim = new Date(Date.UTC(new Date(d).getUTCFullYear(), new Date(d).getUTCMonth() + 1, 0)).getUTCDate();
      const t = d + (Math.min(d0.getUTCDate(), dim) - 1) * DAY;
      if (t > end) break;
      out.push(t);
    }
    return out;
  }
  const step = f === 'daily' ? DAY : f === 'weekly' ? 7 * DAY : 14 * DAY;
  for (let t = start; t <= end; t += step) out.push(t);
  return out;
}

export function backtest(i: DcaInput) {
  const candles = i.candles.filter((c) => c.t >= i.start - DAY && c.t <= i.end).sort((a, b) => a.t - b.t);
  if (candles.length < 2) throw new Error('Not enough price history in this date range.');
  const fee = i.feePct / 100;
  const dates = schedule(Math.max(i.start, candles[0].t), Math.min(i.end, candles[candles.length - 1].t), i.frequency);

  let ci = 0;
  let units = 0;
  let invested = 0;
  let buys = 0;
  const series: { t: number; invested: number; value: number }[] = [];
  const buyAt = new Set<number>();
  for (const d of dates) {
    while (ci < candles.length && candles[ci].t < d) ci++;
    if (ci >= candles.length) break;
    buyAt.add(ci);
  }
  for (let k = 0; k < candles.length; k++) {
    const c = candles[k];
    if (buyAt.has(k)) {
      units += (i.amount * (1 - fee)) / c.close;
      invested += i.amount;
      buys++;
    }
    if (invested > 0) series.push({ t: c.t, invested, value: units * c.close });
  }
  if (!buys) throw new Error('No purchases fall inside this date range.');

  const last = candles[candles.length - 1];
  const value = units * last.close;
  const firstBuy = candles[Math.min(...buyAt)];
  const lumpUnits = (invested * (1 - fee)) / firstBuy.close;
  const lumpValue = lumpUnits * last.close;
  const lumpSeries = candles.filter((c) => c.t >= firstBuy.t).map((c) => ({ t: c.t, value: lumpUnits * c.close }));

  return {
    invested,
    value,
    profit: value - invested,
    returnPct: value / invested - 1,
    units,
    avgCost: invested / units,
    lastPrice: last.close,
    buys,
    firstDate: firstBuy.t,
    lastDate: last.t,
    lumpValue,
    lumpReturn: lumpValue / invested - 1,
    series,
    lumpSeries,
  };
}
