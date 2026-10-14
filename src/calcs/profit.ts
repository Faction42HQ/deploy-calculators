import type { CalcDef } from '../core/types';
import { money, num, pct, price, signedMoney, signedPct, tone } from '../core/format';
import { profit } from '../math/trading';
import { DISCLAIMERS, LINKS } from '../config';
import { assetField, opts, requirePositive, unitWord } from './common';

const PRESETS: Record<string, Record<string, any>> = {
  stock: { entry: 150, exit: 165, qty: 50, feeMode: 'flat', fee: 0, leverage: 1 },
  crypto: { entry: 3000, exit: 3300, qty: 2, feeMode: 'pct', fee: 0.045, leverage: 1 },
  other: { entry: 100, exit: 110, qty: 10, feeMode: 'pct', fee: 0.1, leverage: 1 },
};

export const profitCalc: CalcDef = {
  key: 'profit',
  title: 'Profit Calculator',
  intro: 'Work out profit or loss on a long or short trade, after fees and leverage.',
  cta: { text: 'Let an AI agent manage entries, exits and risk across stocks and crypto.', button: 'Explore agents', href: LINKS.app },
  disclaimer: DISCLAIMERS.trading,
  defaults: { asset: 'stock', side: 'long', ...PRESETS.stock },
  fields: [
    assetField({ stock: 'Stocks', crypto: 'Crypto', other: 'Other' }, (v) => PRESETS[v.asset]),
    { key: 'side', label: 'Direction', type: 'segmented', options: opts({ long: 'Long (buy)', short: 'Short (sell)' }), wide: true },
    { key: 'entry', label: 'Entry price', type: 'number', prefix: '$', min: 0 },
    { key: 'exit', label: 'Exit price', type: 'number', prefix: '$', min: 0 },
    { key: 'qty', label: 'Quantity', type: 'number', suffix: (v) => unitWord(v.asset, 2), min: 0 },
    { key: 'leverage', label: 'Leverage', type: 'number', suffix: '×', min: 1, step: 1, help: '1× means no leverage.' },
    { key: 'feeMode', label: 'Fees', type: 'segmented', options: opts({ pct: '% per side', flat: '$ per side' }) },
    { key: 'fee', label: 'Fee', type: 'number', prefix: (v) => (v.feeMode === 'flat' ? '$' : ''), suffix: (v) => (v.feeMode === 'pct' ? '%' : ''), min: 0, step: 0.01 },
  ],
  compute(v) {
    requirePositive(v, { entry: 'entry price', exit: 'exit price', qty: 'quantity' });
    const lev = v.leverage >= 1 ? v.leverage : 1;
    const r = profit({ side: v.side, entry: v.entry, exit: v.exit, qty: v.qty, feeMode: v.feeMode, fee: v.fee || 0, leverage: lev });

    // P/L across a range of exit prices.
    const lo = v.entry * 0.7;
    const hi = v.entry * 1.3;
    const points: [number, number][] = [];
    for (let k = 0; k <= 60; k++) {
      const x = lo + ((hi - lo) * k) / 60;
      points.push([x, profit({ side: v.side, entry: v.entry, exit: x, qty: v.qty, feeMode: v.feeMode, fee: v.fee || 0, leverage: lev }).net]);
    }

    return {
      hero: { label: r.net >= 0 ? 'Net profit' : 'Net loss', value: signedMoney(r.net), tone: tone(r.net), hint: `${signedPct(r.priceChange)} price move` },
      stats: [
        { label: lev > 1 ? 'Return on margin (ROE)' : 'Return', value: signedPct(lev > 1 ? r.roe : r.returnOnCost), tone: tone(r.net) },
        { label: 'Position value', value: money(r.cost), hint: lev > 1 ? `Margin used ${money(r.margin)}` : `${num(v.qty, 6)} × ${price(v.entry)}` },
        { label: 'Fees', value: money(r.fees) },
        { label: 'Break-even exit', value: price(r.breakeven), hint: `${signedPct((r.breakeven - v.entry) / v.entry)} from entry` },
      ],
      chart: {
        title: 'Profit / loss by exit price',
        series: [{ name: 'Net P/L', points }],
        xFormat: (x) => price(x).replace(/\.\d+$/, ''),
        yFormat: (y) => money(y, 'USD', 0),
        zeroLine: true,
        markers: [{ x: v.entry, label: 'Entry' }],
      },
      notes: lev > 1 ? [`At ${num(lev)}× leverage a ${pct(1 / lev, 1)} move against you wipes out the margin, before maintenance requirements and fees.`] : [],
    };
  },
};
