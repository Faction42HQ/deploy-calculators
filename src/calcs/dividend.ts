import type { CalcDef } from '../core/types';
import { compactMoney, money, num, pct } from '../core/format';
import { dividendProjection } from '../math/growth';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

export const dividendCalc: CalcDef = {
  key: 'dividend',
  title: 'Dividend Calculator',
  intro: 'Project dividend income and portfolio growth, with or without reinvesting dividends (DRIP).',
  cta: { text: 'Want income without picking dividend stocks? Deploy agents earn yield from market activity.', button: 'See current yield', href: LINKS.app },
  disclaimer: DISCLAIMERS.investing,
  defaults: { initial: 10_000, monthly: 500, yieldPct: 3.5, divGrowthPct: 5, priceGrowthPct: 5, years: 20, frequency: '4', drip: true, taxPct: 15 },
  fields: [
    { key: 'initial', label: 'Starting investment', type: 'number', prefix: '$', min: 0 },
    { key: 'monthly', label: 'Monthly contribution', type: 'number', prefix: '$', min: 0 },
    { key: 'yieldPct', label: 'Dividend yield', type: 'number', suffix: '%', min: 0, step: 0.1 },
    { key: 'divGrowthPct', label: 'Annual dividend growth', type: 'number', suffix: '%', step: 0.5 },
    { key: 'priceGrowthPct', label: 'Annual share price growth', type: 'number', suffix: '%', step: 0.5 },
    { key: 'years', label: 'Years', type: 'number', min: 1, max: 60, step: 1 },
    { key: 'frequency', label: 'Paid', type: 'segmented', options: opts({ '12': 'Monthly', '4': 'Quarterly', '1': 'Annually' }) },
    { key: 'taxPct', label: 'Tax on dividends', type: 'number', suffix: '%', min: 0, max: 100, help: 'US qualified dividends: 0%, 15% or 20%. Use 0 for tax-advantaged accounts.' },
    { key: 'drip', label: 'Reinvest dividends (DRIP)', type: 'toggle', wide: true },
  ],
  compute(v) {
    requirePositive(v, { years: 'number of years' });
    if (!(v.initial > 0) && !(v.monthly > 0)) throw new Error('Enter a starting investment or a monthly contribution.');
    const years = Math.min(60, Math.round(v.years));
    const r = dividendProjection({
      initial: v.initial || 0,
      monthly: v.monthly || 0,
      yieldPct: v.yieldPct || 0,
      divGrowthPct: v.divGrowthPct || 0,
      priceGrowthPct: v.priceGrowthPct || 0,
      years,
      frequency: Number(v.frequency) as 1 | 4 | 12,
      drip: !!v.drip,
      taxPct: v.taxPct || 0,
    });
    return {
      hero: { label: `Annual dividend income in year ${years}`, value: money(r.annualIncome), tone: 'pos', hint: `${money(r.monthlyIncome)} / month after tax` },
      stats: [
        { label: 'Portfolio value', value: money(r.finalValue) },
        { label: 'Total dividends received', value: money(r.totalDividends) },
        { label: 'Total contributed', value: money(r.contributed) },
        { label: 'Yield on cost', value: pct(r.yieldOnCost), hint: 'Final income ÷ amount contributed' },
      ],
      chart: {
        title: 'Portfolio value over time',
        series: [
          { name: 'Portfolio value', points: r.rows.map((x) => [x.year, x.value]) },
          { name: 'Contributed', points: r.rows.map((x) => [x.year, x.contributed]), dashed: true, color: '#94A3B8' },
        ],
        xFormat: (x) => `Yr ${num(x, 0)}`,
        yFormat: compactMoney,
      },
      table: {
        title: 'Year by year',
        head: ['Year', 'Contributed', 'Dividends', 'Annual income', 'Value'],
        rows: r.rows.slice(1).map((x) => [String(x.year), money(x.contributed), money(x.dividends), money(x.annualIncome), money(x.value)]),
      },
      notes: v.drip ? [] : ['Dividends are kept as cash (not reinvested) and included in the portfolio value.'],
    };
  },
};
