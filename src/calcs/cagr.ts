import type { CalcDef } from '../core/types';
import { compactMoney, money, num, pct, signedMoney, signedPct, tone } from '../core/format';
import { cagr } from '../math/growth';
import { DEPLOY_APY, DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

export const cagrCalc: CalcDef = {
  key: 'cagr',
  title: 'CAGR Calculator',
  intro: 'Find the compound annual growth rate between two values, or grow a value forward at a given rate.',
  cta: { text: `Compare: Deploy's ${DEPLOY_APY.label} has been ${pct(DEPLOY_APY.rate, 1)}.`, button: 'Compare yields', href: LINKS.app },
  disclaimer: DISCLAIMERS.investing,
  defaults: { mode: 'rate', start: 10_000, end: 25_000, years: 7, rate: 10 },
  fields: [
    { key: 'mode', label: 'Solve for', type: 'segmented', wide: true, options: opts({ rate: 'Growth rate (CAGR)', end: 'Ending value' }) },
    { key: 'start', label: 'Beginning value', type: 'number', prefix: '$', min: 0 },
    { key: 'end', label: 'Ending value', type: 'number', prefix: '$', min: 0, show: (v) => v.mode === 'rate' },
    { key: 'rate', label: 'Annual growth rate', type: 'number', suffix: '%', step: 0.5, show: (v) => v.mode === 'end' },
    { key: 'years', label: 'Years', type: 'number', min: 0, step: 0.5, help: 'Fractions allowed, e.g. 2.5 for 2½ years.' },
  ],
  compute(v) {
    requirePositive(v, { start: 'beginning value', years: 'number of years' });
    let rate: number;
    let end: number;
    if (v.mode === 'rate') {
      requirePositive(v, { end: 'ending value' });
      end = v.end;
      rate = cagr(v.start, end, v.years);
    } else {
      rate = (v.rate || 0) / 100;
      end = v.start * (1 + rate) ** v.years;
    }
    const total = end / v.start - 1;
    const pts: [number, number][] = [];
    const n = Math.max(1, Math.ceil(v.years));
    for (let k = 0; k <= n; k++) {
      const t = Math.min(k, v.years);
      pts.push([t, v.start * (1 + rate) ** t]);
    }
    const doubling = rate > 0 ? Math.log(2) / Math.log(1 + rate) : NaN;
    return {
      hero: v.mode === 'rate' ? { label: 'CAGR', value: signedPct(rate), tone: tone(rate), hint: 'per year, compounded' } : { label: 'Ending value', value: money(end), tone: tone(total) },
      stats: [
        { label: 'Total return', value: signedPct(total), tone: tone(total) },
        { label: 'Gain', value: signedMoney(end - v.start), tone: tone(end - v.start) },
        { label: 'Growth multiple', value: `${num(end / v.start, 2)}×` },
        { label: 'Doubling time', value: Number.isFinite(doubling) ? `${num(doubling, 1)} years` : '—', hint: 'At this rate' },
      ],
      chart: { title: 'Growth path at a constant CAGR', series: [{ name: 'Value', points: pts }], xFormat: (x) => `Yr ${num(x, 1)}`, yFormat: compactMoney },
      notes: ['CAGR smooths out the ups and downs; the actual path between the two values will have been bumpier.'],
    };
  },
};
