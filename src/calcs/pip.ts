import type { CalcDef } from '../core/types';
import { money, num, signedMoney, tone } from '../core/format';
import { FX_PAIRS, lotUnits, needsCrossRate, pipValue, splitPair } from '../math/trading';
import { DISCLAIMERS, LINKS } from '../config';
import { opts, requirePositive } from './common';

const LOT = { standard: 1, mini: 0.1, micro: 0.01, units: 0 } as const;
const DEFAULT_PRICE: Record<string, number> = { 'EUR/USD': 1.085, 'GBP/USD': 1.27, 'USD/JPY': 150, 'USD/CHF': 0.88, 'AUD/USD': 0.66, 'USD/CAD': 1.37, 'NZD/USD': 0.6, 'EUR/GBP': 0.855, 'EUR/JPY': 162, 'GBP/JPY': 190, 'EUR/CHF': 0.95, 'AUD/JPY': 99, 'XAU/USD': 2400 };

export const pipCalc: CalcDef = {
  key: 'pip',
  title: 'Pip Calculator',
  intro: 'Find the value of one pip for any currency pair or gold, in your account currency.',
  cta: { text: "Deploy's agents trade FX, commodities, stocks and crypto from one account.", button: 'Explore agents', href: LINKS.app },
  disclaimer: DISCLAIMERS.trading,
  defaults: { pair: 'EUR/USD', account: 'USD', price: 1.085, sizeMode: 'standard', size: 1, crossRate: 1, pips: 20 },
  fields: [
    { key: 'pair', label: 'Currency pair', type: 'select', options: FX_PAIRS.map((p) => ({ value: p, label: p })), onChange: (v) => ({ price: DEFAULT_PRICE[v.pair] ?? 1 }) },
    { key: 'account', label: 'Account currency', type: 'select', options: opts({ USD: 'USD', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY', CHF: 'CHF', AUD: 'AUD', CAD: 'CAD' }) },
    { key: 'price', label: 'Current price', type: 'number', min: 0 },
    { key: 'sizeMode', label: 'Size in', type: 'segmented', options: opts({ standard: 'Lots', mini: 'Mini', micro: 'Micro', units: 'Units' }) },
    { key: 'size', label: 'Position size', type: 'number', min: 0, suffix: (v) => (v.sizeMode === 'units' ? 'units' : `${v.sizeMode === 'standard' ? '' : v.sizeMode + ' '}lots`) },
    { key: 'pips', label: 'Pips moved', type: 'number', help: 'Optional. Shows profit or loss for this move.' },
    {
      key: 'crossRate',
      label: 'Quote → account rate',
      type: 'number',
      min: 0,
      help: 'Price of 1 unit of the quote currency in your account currency (e.g. GBP→USD for EUR/GBP in a USD account).',
      show: (v) => needsCrossRate(v.pair, v.account),
    },
  ],
  compute(v) {
    requirePositive(v, { price: 'price', size: 'position size' });
    const perLot = lotUnits(v.pair);
    const units = v.sizeMode === 'units' ? v.size : v.size * LOT[v.sizeMode as keyof typeof LOT] * perLot;
    const r = pipValue({ pair: v.pair, price: v.price, units, account: v.account, crossRate: v.crossRate });
    if (!Number.isFinite(r.perPip)) throw new Error('Enter the quote → account conversion rate.');
    const quote = splitPair(v.pair)[1];
    const pl = Number.isFinite(v.pips) && v.pips ? r.perPip * v.pips : null;
    return {
      hero: { label: 'Pip value', value: money(r.perPip, v.account, 2), hint: `per pip on ${num(units, 0)} ${v.pair.startsWith('XAU') ? 'oz' : 'units'}` },
      stats: [
        { label: 'Standard lot', value: money(r.perPipPerLot, v.account, 2) },
        { label: 'Mini lot (0.1)', value: money(r.perPipPerLot / 10, v.account, 2) },
        { label: 'Micro lot (0.01)', value: money(r.perPipPerLot / 100, v.account, 3) },
        { label: 'Pip size', value: String(r.pipSize), hint: `${num(r.perPipQuote, 2)} ${quote} per pip` },
        ...(pl != null ? [{ label: `${num(v.pips)} pip move`, value: signedMoney(pl, v.account), tone: tone(pl) }] : []),
      ],
      notes: [v.pair.startsWith('XAU') ? 'Gold: 1 standard lot = 100 oz, 1 pip = $0.01.' : 'JPY pairs quote to 2 decimals (pip = 0.01); most others to 4 (pip = 0.0001).'],
    };
  },
};
