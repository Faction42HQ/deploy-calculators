import type { CalcDef, Stat } from '../core/types';
import { money, num, pct, price } from '../core/format';
import { FX_PAIRS, needsCrossRate, positionSize, splitPair } from '../math/trading';
import { DISCLAIMERS, LINKS } from '../config';
import { assetField, opts, requirePositive, unitWord } from './common';

const PRESETS: Record<string, Record<string, any>> = {
  stock: { entry: 50, stop: 48, target: 56, feePct: 0, wholeUnits: true, multiplier: 1 },
  crypto: { entry: 60_000, stop: 58_500, target: 64_500, feePct: 0.045, wholeUnits: false, multiplier: 1 },
  forex: { pair: 'EUR/USD', entry: 1.085, stop: 1.08, target: 1.095, feePct: 0, wholeUnits: false, multiplier: 1 },
  commodity: { entry: 2400, stop: 2380, target: 2460, feePct: 0, wholeUnits: true, multiplier: 100 },
};

const acct = (v: any) => (v.asset === 'forex' ? v.account : 'USD');
const sym = (v: any) => ({ USD: '$', EUR: '€', GBP: '£', JPY: '¥' } as Record<string, string>)[acct(v)] ?? '';

export const positionSizeCalc: CalcDef = {
  key: 'position-size',
  title: 'Position Size Calculator',
  intro: 'Size any trade from the amount you are willing to lose. Works for stocks, crypto, forex and futures.',
  cta: { text: 'Superstar sizes every position from a fixed loss budget, automatically.', button: 'Meet Superstar', href: LINKS.superstar },
  disclaimer: DISCLAIMERS.trading,
  defaults: { asset: 'stock', balance: 10_000, riskMode: 'pct', risk: 1, account: 'USD', crossRate: 1, ...PRESETS.stock },
  fields: [
    assetField({ stock: 'Stocks', crypto: 'Crypto', forex: 'Forex', commodity: 'Futures' }, (v) => PRESETS[v.asset]),
    { key: 'pair', label: 'Currency pair', type: 'select', options: FX_PAIRS.map((p) => ({ value: p, label: p })), show: (v) => v.asset === 'forex' },
    { key: 'account', label: 'Account currency', type: 'select', options: opts({ USD: 'USD', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY' }), show: (v) => v.asset === 'forex' },
    { key: 'balance', label: 'Account balance', type: 'number', prefix: sym, min: 0 },
    { key: 'riskMode', label: 'Risk as', type: 'segmented', options: opts({ pct: '% of balance', amount: 'Amount' }) },
    { key: 'risk', label: 'Risk per trade', type: 'number', suffix: (v) => (v.riskMode === 'pct' ? '%' : acct(v)), min: 0, step: 0.1 },
    { key: 'entry', label: 'Entry price', type: 'number', min: 0 },
    { key: 'stop', label: 'Stop-loss price', type: 'number', min: 0 },
    { key: 'target', label: 'Take-profit (optional)', type: 'number', min: 0 },
    { key: 'multiplier', label: 'Contract multiplier', type: 'number', min: 0, help: 'Units per contract, e.g. 100 oz for COMEX gold, 50 for E-mini S&P.', show: (v) => v.asset === 'commodity' },
    {
      key: 'crossRate',
      label: 'Quote → account rate',
      type: 'number',
      min: 0,
      help: 'Price of 1 unit of the quote currency in your account currency.',
      show: (v) => v.asset === 'forex' && needsCrossRate(v.pair, v.account),
    },
    { key: 'feePct', label: 'Fee per side', type: 'number', suffix: '%', min: 0, step: 0.01 },
    { key: 'wholeUnits', label: 'Round down to whole shares / contracts', type: 'toggle', show: (v) => v.asset === 'stock' || v.asset === 'commodity' },
  ],
  compute(v) {
    requirePositive(v, { balance: 'account balance', risk: 'risk amount', entry: 'entry price', stop: 'stop-loss price' });
    const fx = v.asset === 'forex';
    const r = positionSize({
      asset: v.asset,
      balance: v.balance,
      riskMode: v.riskMode,
      risk: v.risk,
      entry: v.entry,
      stop: v.stop,
      target: v.target > 0 ? v.target : undefined,
      feePct: v.feePct || 0,
      wholeUnits: !!v.wholeUnits && !fx && v.asset !== 'crypto',
      multiplier: v.asset === 'commodity' ? v.multiplier : 1,
      pair: v.pair,
      account: v.account,
      crossRate: v.crossRate,
    });
    const cur = acct(v);
    const quote = fx ? splitPair(v.pair)[1] : 'USD';
    if (r.units <= 0) throw new Error('Your risk budget is smaller than the loss on one whole unit. Raise the risk or turn off rounding.');

    const hero: Stat = fx
      ? { label: 'Position size', value: `${num(r.lots!, 2)} lots`, hint: `${num(r.units, 0)} units · ${r.side}` }
      : { label: 'Position size', value: `${num(r.units, v.asset === 'crypto' ? 6 : 4)} ${unitWord(v.asset, r.units)}`, hint: `${r.side === 'long' ? 'Long' : 'Short'} position` };

    const stats: Stat[] = [
      { label: 'Position value', value: money(r.notional, cur) },
      { label: 'Amount at risk', value: money(r.riskAmount, cur), tone: 'neg', hint: pct(r.riskAmount / v.balance) + ' of account' },
      { label: 'Stop distance', value: fx ? `${num(r.pips!, 1)} pips` : pct(r.stopPct), hint: fx ? `${price(r.stopDistance, quote)}` : price(r.stopDistance) },
      { label: 'Leverage needed', value: r.leverage <= 1 ? 'None' : `${num(r.leverage, 2)}×`, tone: r.leverage > 10 ? 'warn' : undefined, hint: `${num(r.leverage, 2)}× notional / balance` },
    ];
    if (r.rr != null) {
      stats.push({ label: 'Reward : risk', value: `${num(r.rr, 2)} : 1`, tone: r.rr >= 1 ? 'pos' : 'warn' });
      stats.push({ label: 'Profit at target', value: money(r.reward!, cur), tone: r.reward! > 0 ? 'pos' : 'neg' });
    }
    const notes: string[] = [];
    if ((v.target > 0) && ((r.side === 'long' && v.target <= v.entry) || (r.side === 'short' && v.target >= v.entry)))
      notes.push('Take-profit is on the wrong side of the entry for this trade direction.');
    if (r.leverage > 1) notes.push(`This position is larger than your account, so it needs margin or leverage (${num(r.leverage, 1)}×). Check the liquidation price before entering.`);
    if (fx) notes.push(`1 standard lot = ${v.pair.startsWith('XAU') ? '100 oz' : '100,000 units'}; mini = 0.1, micro = 0.01.`);
    return { hero, stats, notes };
  },
};
