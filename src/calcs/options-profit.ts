import type { CalcDef } from '../core/types';
import { money, num, price, signedMoney, tone } from '../core/format';
import { analyze, CONTRACT, payoff, presetLegs, STRATEGIES, type Leg, type Strategy } from '../math/options';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

const S0 = 200;

export const optionsProfitCalc: CalcDef = {
  key: 'options-profit',
  title: 'Options Profit Calculator',
  intro: 'See profit, max loss and break-even at expiration for calls, puts and multi-leg strategies.',
  cta: { text: "Deploy's Options Agent runs systematic, defined-risk options strategies.", button: 'Join the waitlist', href: LINKS.app },
  disclaimer: DISCLAIMERS.options,
  defaults: { underlying: S0, strategy: 'long-call', legs: presetLegs('long-call', S0), target: 220 },
  fields: [
    { key: 'underlying', label: 'Current stock price', type: 'number', prefix: '$', min: 0, help: 'Pick the strategy again after changing this to re-price the legs.' },
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      options: opts(STRATEGIES),
      onChange: (v) => (v.strategy === 'custom' ? undefined : { legs: presetLegs(v.strategy as Strategy, v.underlying > 0 ? v.underlying : S0) }),
    },
    {
      key: 'legs',
      label: 'Legs (premium per share; 1 contract = 100 shares)',
      type: 'rows',
      columns: [
        { key: 'side', label: 'Side', type: 'select', options: opts({ buy: 'Buy', sell: 'Sell' }) },
        { key: 'type', label: 'Type', type: 'select', options: opts({ call: 'Call', put: 'Put', stock: 'Stock' }) },
        { key: 'strike', label: 'Strike', type: 'number', min: 0 },
        { key: 'premium', label: 'Premium', type: 'number', min: 0, step: 0.01 },
        { key: 'qty', label: 'Qty', type: 'number', min: 0, step: 1 },
      ],
      newRow: (v) => ({ side: 'buy', type: 'call', strike: Math.round(v.underlying || S0), premium: 1, qty: 1 }),
      addLabel: 'Add leg',
      maxRows: 6,
    },
    { key: 'target', label: 'Stock price at expiration', type: 'number', prefix: '$', min: 0 },
  ],
  compute(v) {
    requirePositive(v, { underlying: 'stock price' });
    const legs: Leg[] = (v.legs ?? []).filter((l: Leg) => l.qty > 0 && l.strike > 0);
    const a = analyze(legs);
    const S = v.underlying;
    const T = v.target > 0 ? v.target : S;
    const atTarget = payoff(legs, T);

    const lo = Math.max(0, Math.min(S * 0.6, ...legs.map((l) => l.strike * 0.85)));
    const hi = Math.max(S * 1.4, ...legs.map((l) => l.strike * 1.15));
    const pts: [number, number][] = [];
    const xs = new Set<number>();
    for (let k = 0; k <= 120; k++) xs.add(lo + ((hi - lo) * k) / 120);
    legs.forEach((l) => l.strike >= lo && l.strike <= hi && xs.add(l.strike));
    [...xs].sort((x, y) => x - y).forEach((x) => pts.push([x, payoff(legs, x)]));

    const fmtMax = (x: number, unlimited: boolean) => (unlimited ? 'Unlimited' : signedMoney(x));
    const shares = legs.filter((l) => l.type !== 'stock').reduce((s, l) => s + l.qty * CONTRACT, 0);
    return {
      hero: { label: `Profit / loss at ${price(T)}`, value: signedMoney(atTarget), tone: tone(atTarget), hint: 'at expiration' },
      stats: [
        { label: 'Max profit', value: fmtMax(a.maxProfit, a.unlimitedProfit), tone: 'pos' },
        { label: 'Max loss', value: fmtMax(a.maxLoss, a.unlimitedLoss), tone: 'neg' },
        { label: a.breakevens.length > 1 ? 'Break-evens' : 'Break-even', value: a.breakevens.length ? a.breakevens.map((b) => price(b)).join(' / ') : 'None' },
        { label: a.netPremium >= 0 ? 'Net credit received' : 'Net debit paid', value: money(Math.abs(a.netPremium)), hint: shares ? `${num(shares)} shares controlled` : undefined },
      ],
      chart: {
        title: 'Payoff at expiration',
        series: [{ name: 'Profit / loss', points: pts }],
        xFormat: (x) => '$' + num(x, 0),
        yFormat: (y) => money(y, 'USD', 0),
        zeroLine: true,
        markers: [{ x: S, label: 'Now' }],
      },
      notes: [
        'Values at expiration only. Before expiry the position is also worth some time value, which depends on implied volatility and days left.',
        ...(a.unlimitedLoss ? ['This position has unlimited loss if the stock rises sharply. Brokers require extra margin for naked short calls.'] : []),
      ],
    };
  },
};
