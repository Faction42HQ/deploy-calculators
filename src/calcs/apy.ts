import type { CalcDef } from '../core/types';
import { money, pct } from '../core/format';
import { aprFromApy, apyFromApr, COMPOUNDING, type Compounding } from '../math/growth';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requireFinite, requirePositive } from './common';

const LABELS: Record<Compounding, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', semiannually: 'Semi-annually', annually: 'Annually', continuous: 'Continuous' };

export const apyCalc: CalcDef = {
  key: 'apy',
  title: 'APY Calculator',
  intro: 'Convert APR to APY (or back) for any compounding frequency, and see what a deposit earns.',
  cta: { text: "Put idle dollars to work: Deploy's Savings Agent earns a variable on-chain yield.", button: 'See current APY', href: LINKS.app },
  disclaimer: DISCLAIMERS.yield,
  defaults: { mode: 'toApy', rate: 5, compounding: 'daily', deposit: 10_000, years: 1 },
  fields: [
    { key: 'mode', label: 'Convert', type: 'segmented', wide: true, options: opts({ toApy: 'APR → APY', toApr: 'APY → APR' }) },
    { key: 'rate', label: 'Rate', type: 'number', suffix: (v) => (v.mode === 'toApy' ? '% APR' : '% APY'), step: 0.01 },
    { key: 'compounding', label: 'Compounding', type: 'select', options: opts(LABELS) },
    { key: 'deposit', label: 'Deposit', type: 'number', prefix: '$', min: 0 },
    { key: 'years', label: 'Years', type: 'number', min: 0, step: 0.5 },
  ],
  compute(v) {
    requireFinite(v, { rate: 'rate' });
    const n = COMPOUNDING[v.compounding as Compounding];
    const r = v.rate / 100;
    const apy = v.mode === 'toApy' ? apyFromApr(r, n) : r;
    const apr = v.mode === 'toApy' ? r : aprFromApy(r, n);
    const stats = [];
    if (v.deposit > 0 && v.years > 0) {
      requirePositive(v, { deposit: 'deposit' });
      const final = v.deposit * (1 + apy) ** v.years;
      stats.push({ label: `Balance after ${v.years} yr`, value: money(final) }, { label: 'Interest earned', value: money(final - v.deposit), tone: 'pos' as const });
    }
    stats.push({ label: v.mode === 'toApy' ? 'APR' : 'Equivalent APR', value: pct(apr, 3) }, { label: 'Compounding boost', value: `+${pct(apy - apr, 3)}`, hint: 'APY minus APR' });
    return {
      hero: v.mode === 'toApy' ? { label: 'APY', value: pct(apy, 3), tone: 'pos', hint: `${pct(apr, 3)} APR, ${LABELS[v.compounding as Compounding].toLowerCase()}` } : { label: 'APR', value: pct(apr, 3), hint: `for ${pct(apy, 3)} APY` },
      stats,
      table: {
        title: `${pct(apr, 3)} APR at every compounding frequency`,
        head: ['Compounding', 'APY', v.deposit > 0 && v.years > 0 ? `Interest on ${money(v.deposit)}` : ''],
        rows: (Object.keys(LABELS) as Compounding[]).map((k) => {
          const a = apyFromApr(apr, COMPOUNDING[k]);
          return [LABELS[k], pct(a, 3), v.deposit > 0 && v.years > 0 ? money(v.deposit * ((1 + a) ** v.years - 1)) : ''];
        }),
      },
      notes: ['APR is the simple annual rate. APY includes the effect of compounding, so it is the better number for comparing savings and yield products.'],
    };
  },
};
