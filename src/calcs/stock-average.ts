import type { CalcDef, Stat } from '../core/types';
import { money, num, price, signedMoney, signedPct, tone } from '../core/format';
import { averageCost, unitsForTargetAverage } from '../math/trading';
import { DISCLAIMERS, LINKS } from '../config';
import { assetField, unitWord } from './common';

export const stockAverageCalc: CalcDef = {
  key: 'stock-average',
  title: 'Stock Average Calculator',
  intro: 'Find your average cost across multiple buys, and how many shares it takes to average down to a target.',
  cta: { text: 'Prefer rules over averaging down? Deploy agents size and exit every trade systematically.', button: 'Explore agents', href: LINKS.app },
  disclaimer: DISCLAIMERS.investing,
  defaults: {
    asset: 'stock',
    lots: [
      { qty: 20, price: 180 },
      { qty: 15, price: 150 },
    ],
    current: 140,
    buyPrice: 140,
    targetAvg: 155,
    fee: 0,
  },
  fields: [
    assetField({ stock: 'Stocks', crypto: 'Crypto' }),
    {
      key: 'lots',
      label: 'Your purchases',
      type: 'rows',
      columns: [
        { key: 'qty', label: 'Quantity', type: 'number', min: 0 },
        { key: 'price', label: 'Price', type: 'number', prefix: '$', min: 0 },
      ],
      newRow: () => ({ qty: 10, price: 100 }),
      addLabel: 'Add purchase',
      maxRows: 25,
    },
    { key: 'current', label: 'Current price', type: 'number', prefix: '$', min: 0 },
    { key: 'fee', label: 'Fee per trade', type: 'number', prefix: '$', min: 0 },
    { key: 'buyPrice', label: 'Next buy price', type: 'number', prefix: '$', min: 0 },
    { key: 'targetAvg', label: 'Target average', type: 'number', prefix: '$', min: 0 },
  ],
  compute(v) {
    const r = averageCost(v.lots ?? [], v.fee || 0);
    if (!(r.qty > 0)) throw new Error('Add at least one purchase with a quantity and price.');
    const w = (n: number) => unitWord(v.asset, n);
    const dp = v.asset === 'crypto' ? 6 : 4;
    const stats: Stat[] = [
      { label: 'Total quantity', value: `${num(r.qty, dp)} ${w(r.qty)}` },
      { label: 'Total invested', value: money(r.cost) },
    ];
    if (v.current > 0) {
      const value = r.qty * v.current;
      const pl = value - r.cost;
      stats.push({ label: 'Unrealized P/L', value: signedMoney(pl), tone: tone(pl), hint: signedPct(pl / r.cost) });
      stats.push({ label: 'Break-even price', value: price(r.average), hint: `${signedPct(r.average / v.current - 1)} from current` });
    }
    const notes: string[] = [];
    if (v.buyPrice > 0 && v.targetAvg > 0) {
      const n = unitsForTargetAverage(r.qty, r.average, v.buyPrice, v.targetAvg);
      if (Number.isFinite(n) && n > 0) {
        const buyN = v.asset === 'stock' ? Math.ceil(n) : n;
        stats.push({ label: `To reach ${price(v.targetAvg)} avg`, value: `Buy ${num(buyN, dp)} ${w(buyN)}`, hint: `≈ ${money(buyN * v.buyPrice)} at ${price(v.buyPrice)}` });
      } else {
        notes.push(`A ${price(v.targetAvg)} average is not reachable by buying at ${price(v.buyPrice)}. The target must sit between your current average (${price(r.average)}) and the buy price.`);
      }
    }
    const rows = (v.lots as { qty: number; price: number }[])
      .filter((l) => l.qty > 0 && l.price > 0)
      .map((l, i, arr) => {
        const sub = averageCost(arr.slice(0, i + 1), v.fee || 0);
        return [`#${i + 1}`, num(l.qty, dp), price(l.price), money(l.qty * l.price), price(sub.average)];
      });
    return {
      hero: { label: 'Average cost', value: price(r.average), hint: `per ${w(1)}${v.fee ? ', fees included' : ''}` },
      stats,
      table: rows.length > 1 ? { title: 'Running average', head: ['Buy', 'Qty', 'Price', 'Cost', 'Avg after'], rows } : undefined,
      notes,
    };
  },
};
