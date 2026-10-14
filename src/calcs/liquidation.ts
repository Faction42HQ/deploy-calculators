import type { CalcDef } from '../core/types';
import { money, num, pct, price, signedMoney } from '../core/format';
import { hlMaintenance, liquidationPrice } from '../math/trading';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

export const liquidationCalc: CalcDef = {
  key: 'liquidation-price',
  title: 'Liquidation Price Calculator',
  intro: 'Find where a leveraged position gets liquidated (perpetuals) or hits a margin call (stocks on margin).',
  cta: { text: "Deploy's agents manage leverage and stops for you, around the clock.", button: 'Explore agents', href: LINKS.app },
  disclaimer: DISCLAIMERS.trading,
  defaults: { market: 'perp', side: 'long', entry: 60_000, leverage: 10, maxLeverage: '40', size: 1_000, maint: 25 },
  fields: [
    {
      key: 'market',
      label: 'Market',
      type: 'segmented',
      wide: true,
      options: opts({ perp: 'Perpetual futures', margin: 'Stock margin account' }),
      onChange: (v) => (v.market === 'margin' ? { entry: 150, leverage: 2, size: 10_000, maint: v.side === 'short' ? 30 : 25 } : { entry: 60_000, leverage: 10, size: 1_000 }),
    },
    { key: 'side', label: 'Direction', type: 'segmented', wide: true, options: opts({ long: 'Long', short: 'Short' }), onChange: (v) => (v.market === 'margin' ? { maint: v.side === 'short' ? 30 : 25 } : undefined) },
    { key: 'entry', label: 'Entry price', type: 'number', prefix: '$', min: 0 },
    { key: 'leverage', label: 'Leverage', type: 'number', suffix: '×', min: 1, step: 0.5, help: 'Reg-T stock margin is 2× (50% initial margin).' },
    { key: 'size', label: 'Position value', type: 'number', prefix: '$', min: 0, help: 'Optional. Used to show margin and loss in dollars.' },
    {
      key: 'maxLeverage',
      label: 'Market max leverage',
      type: 'select',
      options: ['50', '40', '25', '20', '10', '5', '3'].map((x) => ({ value: x, label: `${x}× (maintenance ${num(100 * hlMaintenance(+x), 2)}%)` })),
      help: 'On Hyperliquid, maintenance margin is half the initial margin at max leverage. BTC is 40×, most stock perps 10–20×.',
      show: (v) => v.market === 'perp',
    },
    { key: 'maint', label: 'Maintenance margin', type: 'number', suffix: '%', min: 0, max: 100, help: 'FINRA minimum is 25% for longs; brokers often require 30%+.', show: (v) => v.market === 'margin' },
  ],
  compute(v) {
    requirePositive(v, { entry: 'entry price', leverage: 'leverage' });
    if (v.leverage < 1) throw new Error('Leverage must be at least 1×.');
    const mmr = v.market === 'perp' ? hlMaintenance(Number(v.maxLeverage)) : (v.maint || 0) / 100;
    if (v.market === 'perp' && v.leverage > Number(v.maxLeverage)) throw new Error(`This market allows at most ${v.maxLeverage}× leverage.`);
    const r = liquidationPrice({ side: v.side, entry: v.entry, leverage: v.leverage, mmr });
    const word = v.market === 'perp' ? 'Liquidation price' : 'Margin call price';

    if (r.immediate) {
      return { hero: { label: word, value: 'Immediate', tone: 'neg' }, stats: [], notes: ['Initial margin is at or below the maintenance requirement, so the position would be liquidated straight away. Lower the leverage.'] };
    }
    const size = v.size > 0 ? v.size : 0;
    const qty = size / v.entry;
    const margin = size / v.leverage;
    const lossAtLiq = qty * Math.abs(r.price - v.entry);
    const notes = [
      v.market === 'perp'
        ? 'Isolated margin. In cross margin, the rest of your account balance backs the position and pushes the liquidation price further away. Funding payments and fees also move it over time.'
        : 'At the margin call price your equity falls to the maintenance requirement. Your broker can then demand cash or sell positions without notice.',
    ];
    if (v.side === 'long' && v.leverage === 1) notes.push('An unlevered long can never be liquidated; the price would have to reach zero.');

    return {
      hero: { label: word, value: price(r.price), tone: 'neg', hint: `${pct(r.distancePct)} ${v.side === 'long' ? 'below' : 'above'} entry` },
      stats: [
        { label: 'Distance to ' + (v.market === 'perp' ? 'liquidation' : 'margin call'), value: pct(r.distancePct), tone: r.distancePct < 0.05 ? 'warn' : undefined },
        { label: 'Maintenance margin', value: pct(mmr) },
        ...(size
          ? [
              { label: v.market === 'perp' ? 'Initial margin' : 'Your equity', value: money(margin) },
              { label: 'Loss at that price', value: signedMoney(-lossAtLiq), tone: 'neg' as const, hint: `${pct(lossAtLiq / margin)} of margin` },
            ]
          : []),
      ],
      notes,
    };
  },
};
