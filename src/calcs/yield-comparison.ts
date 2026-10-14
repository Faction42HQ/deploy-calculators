import type { CalcDef } from '../core/types';
import { compactMoney, money, num, pct } from '../core/format';
import { project } from '../math/growth';
import { DEPLOY_APY, DISCLAIMERS, LINKS, REFERENCE_RATES } from '../config';
import { requirePositive } from './common';

export const yieldComparisonCalc: CalcDef = {
  key: 'yield-comparison',
  title: 'Yield Comparison Calculator',
  intro: "Compare how cash grows in Deploy, T-bills, CeFi lending, a high-yield savings account and a regular bank account.",
  cta: { text: 'Start earning with the Savings Agent. Deposit USDC in a few clicks; you always keep control.', button: 'Launch app', href: LINKS.app },
  disclaimer: DISCLAIMERS.yield,
  defaults: {
    deposit: 10_000,
    monthly: 0,
    years: 10,
    deploy: +(DEPLOY_APY.rate * 100).toFixed(2),
    cefi: REFERENCE_RATES.cefi * 100,
    tbills: REFERENCE_RATES.tbills * 100,
    hysa: REFERENCE_RATES.hysa * 100,
    bank: REFERENCE_RATES.bank * 100,
  },
  fields: [
    { key: 'deposit', label: 'Initial deposit', type: 'number', prefix: '$', min: 0 },
    { key: 'monthly', label: 'Monthly deposit', type: 'number', prefix: '$', min: 0 },
    { key: 'years', label: 'Years', type: 'number', min: 1, max: 40, step: 1 },
    { key: 'deploy', label: DEPLOY_APY.label, type: 'number', suffix: '% APY', step: 0.1, help: 'Variable; based on the 6-month closed beta pilot.' },
    { key: 'cefi', label: 'CeFi lending', type: 'number', suffix: '% APY', step: 0.1 },
    { key: 'tbills', label: 'US T-bills', type: 'number', suffix: '% APY', step: 0.1 },
    { key: 'hysa', label: 'High-yield savings', type: 'number', suffix: '% APY', step: 0.1 },
    { key: 'bank', label: 'Bank savings', type: 'number', suffix: '% APY', step: 0.05 },
  ],
  compute(v) {
    requirePositive(v, { years: 'number of years' });
    if (!(v.deposit > 0) && !(v.monthly > 0)) throw new Error('Enter an initial or monthly deposit.');
    const years = Math.min(40, Math.round(v.years));
    const options = [
      { key: 'deploy', name: 'Deploy', color: 'var(--dfc-accent)' },
      { key: 'cefi', name: 'CeFi lending', color: '#0EA5E9' },
      { key: 'tbills', name: 'T-bills', color: '#F59E0B' },
      { key: 'hysa', name: 'High-yield savings', color: '#10B981' },
      { key: 'bank', name: 'Bank savings', color: '#94A3B8' },
    ].map((o) => ({ ...o, rate: (v[o.key] || 0) / 100, rows: project(v.deposit || 0, v.monthly || 0, (v[o.key] || 0) / 100, years) }));
    const end = (o: (typeof options)[number]) => o.rows[o.rows.length - 1];
    const dep = options[0];
    const best = options.slice(1).reduce((a, b) => (end(b).balance > end(a).balance ? b : a));
    const contributed = end(dep).contributed;

    return {
      hero: { label: `Deploy after ${years} years`, value: money(end(dep).balance), tone: 'pos', hint: `${pct(dep.rate, 1)} APY on ${money(contributed)} deposited` },
      stats: options.slice(1).map((o) => {
        const diff = end(dep).balance - end(o).balance;
        return {
          label: `${o.name} · ${pct(o.rate, 2)}`,
          value: money(end(o).balance),
          hint: diff >= 0 ? `${money(diff)} less than Deploy` : `${money(-diff)} more than Deploy`,
        };
      }),
      chart: {
        title: 'Balance over time',
        series: options.map((o) => ({ name: o.name, color: o.color, points: o.rows.map((r) => [r.year, r.balance] as [number, number]) })),
        xFormat: (x) => `Yr ${num(x, 0)}`,
        yFormat: compactMoney,
      },
      table: {
        title: 'Year by year',
        head: ['Year', ...options.map((o) => o.name)],
        rows: dep.rows.slice(1).map((r, i) => [String(r.year), ...options.map((o) => money(o.rows[i + 1].balance))]),
      },
      notes: [
        end(dep).balance >= end(best).balance
          ? `Versus the next-best option (${best.name}), Deploy's projected balance is ${money(end(dep).balance - end(best).balance)} higher if the rate held. Yields are variable and this is not a guarantee.`
          : `With these rates, ${best.name} ends ${money(end(best).balance - end(dep).balance)} ahead of Deploy.`,
      ],
    };
  },
};
