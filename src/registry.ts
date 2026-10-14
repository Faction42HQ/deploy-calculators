import type { CalcDef } from './core/types';

// One lazy chunk per calculator: a page only downloads the calculators it embeds.
export const REGISTRY: Record<string, () => Promise<CalcDef>> = {
  'position-size': () => import('./calcs/position-size').then((m) => m.positionSizeCalc),
  profit: () => import('./calcs/profit').then((m) => m.profitCalc),
  'liquidation-price': () => import('./calcs/liquidation').then((m) => m.liquidationCalc),
  pip: () => import('./calcs/pip').then((m) => m.pipCalc),
  'stock-average': () => import('./calcs/stock-average').then((m) => m.stockAverageCalc),
  'options-profit': () => import('./calcs/options-profit').then((m) => m.optionsProfitCalc),
  dividend: () => import('./calcs/dividend').then((m) => m.dividendCalc),
  dca: () => import('./calcs/dca').then((m) => m.dcaCalc),
  cagr: () => import('./calcs/cagr').then((m) => m.cagrCalc),
  apy: () => import('./calcs/apy').then((m) => m.apyCalc),
  'yield-comparison': () => import('./calcs/yield-comparison').then((m) => m.yieldComparisonCalc),
};
