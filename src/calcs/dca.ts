import type { CalcDef } from '../core/types';
import { compactMoney, date, money, num, pct, price, signedMoney, signedPct, tone } from '../core/format';
import { backtest, type Frequency } from '../math/dca';
import { project } from '../math/growth';
import { dailyCloses, MARKETS } from '../data/prices';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

const PER_YEAR: Record<Frequency, number> = { daily: 365, weekly: 52, biweekly: 26, monthly: 12 };
const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);

export const dcaCalc: CalcDef = {
  key: 'dca',
  title: 'DCA Calculator',
  intro: 'Backtest dollar-cost averaging into stocks, indices, commodities or crypto, or project a regular investing plan forward.',
  cta: { text: 'Automate it: Deploy agents put deposits to work around the clock.', button: 'Launch app', href: LINKS.app },
  disclaimer: DISCLAIMERS.investing,
  async: true,
  defaults: { mode: 'backtest', market: 'BTC', amount: 100, frequency: 'weekly', start: '2022-01-01', end: '', feePct: 0.1, years: 10, returnPct: 8 },
  fields: [
    { key: 'mode', label: 'Mode', type: 'segmented', wide: true, options: opts({ backtest: 'Backtest real prices', project: 'Project forward' }) },
    {
      key: 'market',
      label: 'Asset',
      type: 'select',
      wide: true,
      options: MARKETS.map((m) => ({ value: m.id, label: `${m.label} · ${m.group}` })),
      show: (v) => v.mode === 'backtest',
    },
    { key: 'amount', label: 'Amount per purchase', type: 'number', prefix: '$', min: 0 },
    { key: 'frequency', label: 'Every', type: 'select', options: opts({ daily: 'Day', weekly: 'Week', biweekly: '2 weeks', monthly: 'Month' }) },
    { key: 'start', label: 'Start date', type: 'date', show: (v) => v.mode === 'backtest' },
    { key: 'end', label: 'End date', type: 'date', help: 'Leave empty for today.', show: (v) => v.mode === 'backtest' },
    { key: 'feePct', label: 'Fee per purchase', type: 'number', suffix: '%', min: 0, step: 0.01, show: (v) => v.mode === 'backtest' },
    { key: 'years', label: 'Years', type: 'number', min: 1, max: 50, show: (v) => v.mode === 'project' },
    { key: 'returnPct', label: 'Expected annual return', type: 'number', suffix: '%', step: 0.5, show: (v) => v.mode === 'project', help: 'Long-run US stocks ≈ 10%/yr nominal; crypto is far more volatile.' },
  ],
  async compute(v) {
    requirePositive(v, { amount: 'purchase amount' });
    const freq = v.frequency as Frequency;
    if (v.mode === 'project') {
      requirePositive(v, { years: 'number of years' });
      const monthly = (v.amount * PER_YEAR[freq]) / 12;
      const rows = project(0, monthly, (v.returnPct || 0) / 100, Math.min(50, v.years));
      const last = rows[rows.length - 1];
      return {
        hero: { label: `Value after ${num(last.year)} years`, value: money(last.balance), tone: 'pos' },
        stats: [
          { label: 'Total invested', value: money(last.contributed) },
          { label: 'Growth', value: signedMoney(last.growth), tone: tone(last.growth) },
          { label: 'Monthly equivalent', value: money(monthly) },
        ],
        chart: {
          title: 'Projected value',
          series: [
            { name: 'Value', points: rows.map((r) => [r.year, r.balance]) },
            { name: 'Invested', points: rows.map((r) => [r.year, r.contributed]), dashed: true, color: '#94A3B8' },
          ],
          xFormat: (x) => `Yr ${num(x, 0)}`,
          yFormat: compactMoney,
        },
        notes: ['Assumes a steady return. Real markets fluctuate, which is exactly what DCA smooths out. Switch to backtest to see real price history.'],
      };
    }

    const market = MARKETS.find((m) => m.id === v.market) ?? MARKETS[0];
    const candles = await dailyCloses(market.id);
    if (!candles.length) throw new Error('No price history available for this asset.');
    const start = v.start ? Date.parse(v.start) : Date.parse(isoDaysAgo(365));
    const end = v.end ? Date.parse(v.end) : Date.now();
    if (!(end > start)) throw new Error('End date must be after the start date.');
    const earliest = candles[0].t;
    const r = backtest({ candles, amount: v.amount, frequency: freq, start: Math.max(start, earliest), end, feePct: v.feePct || 0 });

    const notes: string[] = [];
    if (start < earliest) notes.push(`Price history for ${market.label} starts ${date(earliest)}, so the backtest begins there.`);
    if (market.group !== 'Crypto') notes.push(`${market.label} prices come from its Hyperliquid perpetual market, which tracks the underlying asset closely.`);
    const beat = r.value >= r.lumpValue;
    notes.push(`Investing the same ${money(r.invested)} as a lump sum on ${date(r.firstDate)} would be worth ${money(r.lumpValue)} (${signedPct(r.lumpReturn)}), so DCA ${beat ? 'did better' : 'did worse'} over this period.`);

    return {
      hero: { label: `Value on ${date(r.lastDate)}`, value: money(r.value), tone: tone(r.profit), hint: `${signedMoney(r.profit)} (${signedPct(r.returnPct)})` },
      stats: [
        { label: 'Total invested', value: money(r.invested), hint: `${num(r.buys)} purchases` },
        { label: 'Average cost', value: price(r.avgCost), hint: `Last price ${price(r.lastPrice)}` },
        { label: 'Holdings', value: num(r.units, 6), hint: market.label },
        { label: 'Lump sum instead', value: money(r.lumpValue), tone: tone(r.lumpReturn), hint: signedPct(r.lumpReturn) },
      ],
      chart: {
        title: `${market.label}: DCA vs invested`,
        series: [
          { name: 'DCA value', points: thin(r.series.map((p) => [p.t, p.value])) },
          { name: 'Invested', points: thin(r.series.map((p) => [p.t, p.invested])), dashed: true, color: '#94A3B8' },
        ],
        xFormat: (x) => new Date(x).toISOString().slice(0, 7),
        yFormat: compactMoney,
      },
      notes: [...notes, `Return ${pct(r.returnPct)} excludes taxes. Fees of ${num(v.feePct || 0)}% per purchase included.`],
    };
  },
};

/** Keep charts light: at most ~300 points. */
function thin(points: [number, number][]): [number, number][] {
  const step = Math.ceil(points.length / 300);
  return step <= 1 ? points : points.filter((_, i) => i % step === 0 || i === points.length - 1);
}
