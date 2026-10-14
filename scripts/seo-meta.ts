// Page-level SEO for each calculator. Feeds the Webflow "Calculators" CMS collection.
// Titles ≤ 60 chars, descriptions ≤ 155 chars. Keep the target keyword first.

export interface SeoMeta {
  slug: string; // URL: /calculators/{slug}
  h1: string;
  title: string;
  description: string;
  category: 'Trading' | 'Investing' | 'Yield';
  keyword: string; // primary target query
  related: string[]; // keys of related calculators for internal links
}

export const SEO: Record<string, SeoMeta> = {
  'position-size': {
    slug: 'position-size',
    h1: 'Position Size Calculator',
    title: 'Position Size Calculator for Stocks, Crypto & Forex | Deploy',
    description: 'Calculate how many shares, coins or lots to buy from your account size, risk % and stop-loss. Free position size calculator with fees and leverage.',
    category: 'Trading',
    keyword: 'position size calculator',
    related: ['liquidation-price', 'profit', 'pip', 'stock-average'],
  },
  profit: {
    slug: 'profit',
    h1: 'Profit Calculator',
    title: 'Stock & Crypto Profit Calculator (Long/Short) | Deploy',
    description: 'Calculate profit or loss on any trade, long or short, after fees and leverage. See your return, ROE and break-even exit price instantly.',
    category: 'Trading',
    keyword: 'stock profit calculator',
    related: ['position-size', 'stock-average', 'liquidation-price', 'cagr'],
  },
  'liquidation-price': {
    slug: 'liquidation-price',
    h1: 'Liquidation Price Calculator',
    title: 'Liquidation Price Calculator for Perps & Margin | Deploy',
    description: 'Find the liquidation price of a leveraged long or short, or the margin call price on a stock margin account. Uses Hyperliquid maintenance rules.',
    category: 'Trading',
    keyword: 'liquidation price calculator',
    related: ['position-size', 'profit', 'pip', 'options-profit'],
  },
  pip: {
    slug: 'pip',
    h1: 'Pip Calculator',
    title: 'Pip Calculator: Forex Pip Value for Any Pair | Deploy',
    description: 'Calculate the value of one pip for any currency pair or gold, per standard, mini or micro lot, in USD, EUR, GBP, JPY and more.',
    category: 'Trading',
    keyword: 'pip calculator',
    related: ['position-size', 'profit', 'liquidation-price', 'apy'],
  },
  'stock-average': {
    slug: 'stock-average',
    h1: 'Stock Average Calculator',
    title: 'Stock Average Calculator: Average Down Cost | Deploy',
    description: 'Find your average cost per share across multiple buys, and how many shares you need to average down to a target price. Works for crypto too.',
    category: 'Investing',
    keyword: 'stock average calculator',
    related: ['profit', 'dca', 'position-size', 'dividend'],
  },
  'options-profit': {
    slug: 'options-profit',
    h1: 'Options Profit Calculator',
    title: 'Options Profit Calculator: Calls, Puts & Spreads | Deploy',
    description: 'Calculate profit, max loss and break-even for calls, puts, spreads, straddles and iron condors, with a payoff chart at expiration.',
    category: 'Trading',
    keyword: 'options profit calculator',
    related: ['profit', 'position-size', 'liquidation-price', 'stock-average'],
  },
  dividend: {
    slug: 'dividend',
    h1: 'Dividend Calculator',
    title: 'Dividend Calculator with DRIP Reinvestment | Deploy',
    description: 'Project dividend income and portfolio growth with dividend reinvestment (DRIP), dividend growth, monthly contributions and dividend tax.',
    category: 'Investing',
    keyword: 'dividend calculator',
    related: ['dca', 'cagr', 'yield-comparison', 'stock-average'],
  },
  dca: {
    slug: 'dca',
    h1: 'DCA Calculator',
    title: 'DCA Calculator: Backtest Dollar-Cost Averaging | Deploy',
    description: 'Backtest dollar-cost averaging into Bitcoin, the S&P 500, NVIDIA, gold and more with real prices, and compare DCA vs lump sum investing.',
    category: 'Investing',
    keyword: 'dca calculator',
    related: ['stock-average', 'cagr', 'dividend', 'yield-comparison'],
  },
  cagr: {
    slug: 'cagr',
    h1: 'CAGR Calculator',
    title: 'CAGR Calculator: Compound Annual Growth Rate | Deploy',
    description: 'Calculate the compound annual growth rate between two values, or project a value forward at a given CAGR. Includes total return and doubling time.',
    category: 'Investing',
    keyword: 'cagr calculator',
    related: ['apy', 'dca', 'dividend', 'yield-comparison'],
  },
  apy: {
    slug: 'apy',
    h1: 'APY Calculator',
    title: 'APY Calculator: Convert APR to APY | Deploy',
    description: 'Convert APR to APY (and APY to APR) for daily, monthly or continuous compounding, and see how much interest a deposit earns.',
    category: 'Yield',
    keyword: 'apy calculator',
    related: ['yield-comparison', 'cagr', 'dividend', 'dca'],
  },
  'yield-comparison': {
    slug: 'yield-comparison',
    h1: 'Yield Comparison Calculator',
    title: 'Stablecoin Yield vs T-Bills vs Savings Calculator | Deploy',
    description: "Compare how your cash grows with Deploy's on-chain yield, US T-bills, CeFi lending, high-yield savings and a bank account over time.",
    category: 'Yield',
    keyword: 'stablecoin yield calculator',
    related: ['apy', 'cagr', 'dividend', 'dca'],
  },
};
