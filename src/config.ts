// Product links, published rates and disclaimers. Review these with the Deploy team before launch.

export const LINKS = {
  app: 'https://app.deploy.finance/dashboard',
  superstar: 'https://www.deploy.finance/superstar',
  docsAgents: 'https://docs.deploy.finance/foundations/agents',
  calculators: 'https://www.deploy.finance/calculators',
};

/** Must match the figure and wording on deploy.finance's homepage Yield Simulator. */
export const DEPLOY_APY = {
  rate: 0.226,
  label: 'Deploy (6-mo avg APY)',
  source: 'annualised APY of the 6-month closed beta pilot',
};

/** Reference rates for comparisons. Homepage uses CeFi 6% and T-Bills 4% (20-year historical averages). */
export const REFERENCE_RATES = {
  tbills: 0.04,
  cefi: 0.06,
  hysa: 0.04,
  bank: 0.004,
};

export const DISCLAIMERS = {
  trading:
    'For educational purposes only, not financial advice. Leveraged trading carries a high risk of loss, and results ignore slippage, funding and other costs unless entered.',
  options:
    'For educational purposes only, not financial advice. Payoffs are shown at expiration and exclude commissions and early assignment. Options involve substantial risk.',
  investing:
    'For educational purposes only, not financial advice. Projections rely on your assumptions and are not guarantees. Past performance does not indicate future results.',
  yield: `For educational purposes only, not financial advice. Deploy's rate is the ${DEPLOY_APY.source} and is variable, not guaranteed. Past performance does not indicate future results. Traditional rates are long-run averages.`,
};

/** Default CDN location for the embed snippet; the loader overrides this with its own URL at runtime. */
export const DEFAULT_SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/Faction42HQ/deploy-calculators@1/dist/deploy-calcs.js';
