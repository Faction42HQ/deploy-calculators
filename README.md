# Deploy Calculators

Embeddable trading, investing and yield calculators for [deploy.finance](https://www.deploy.finance) (Webflow).
The plan and SEO strategy are in [deploy-calculators-plan.md](deploy-calculators-plan.md).

## Wave 1 (built)

| Key | Calculator | Asset presets (`data-asset`) |
|---|---|---|
| `position-size` | Position Size | stock, crypto, forex, commodity |
| `profit` | Profit / Loss (long/short, fees, leverage) | stock, crypto, other |
| `liquidation-price` | Liquidation (perps) / margin call (stocks) | — |
| `pip` | Forex Pip Value | — |
| `stock-average` | Average Cost / Average Down | stock, crypto |
| `options-profit` | Options Profit (multi-leg, payoff chart) | — |
| `dividend` | Dividend + DRIP | — |
| `dca` | DCA Backtest (live prices) / Projection | — |
| `cagr` | CAGR | — |
| `apy` | APY ↔ APR | — |
| `yield-comparison` | Deploy vs T-bills vs CeFi vs savings (conversion page) | — |

## Commands

```bash
npm install
npm run dev        # http://localhost:5173/demo/ — live preview of every calculator
npm test           # math unit tests (hand-checked values)
npm run typecheck
npm run build      # dist/deploy-calcs.js + lazy chunks (embeds) and dist/deploy-calcs.bundle.js (single file, Webflow)
npm run seo        # dist/seo/: static example HTML, meta and JSON-LD per calculator
```

## Embedding

```html
<div data-deploy-calc="position-size" data-asset="crypto"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/Faction42HQ/deploy-calculators@1/dist/deploy-calcs.js"></script>
```

| Attribute | Effect |
|---|---|
| `data-asset` | Preset the asset class (also switches default prices, fees, units) |
| `data-defaults='{"risk":2}'` | Override any default input (JSON) |
| `data-title="on"` | Show title + intro in the widget (for third-party embeds) |
| `data-url-state="off"` | Don't sync inputs to the URL (on by default when a page has one calculator) |
| `data-theme="dark"` | Dark palette; or override `--dfc-*` CSS variables on a parent |
| `data-page-url` | Canonical page used by "Copy link" and "Powered by" |

Every widget has **Copy link** (shareable state) and **Embed**, which gives other sites a snippet with a link back to deploy.finance for backlinks.

## Webflow setup (not done yet)

1. **Host the bundle.** Done: jsDelivr serves `dist/` from tagged releases of this public repo (see *Releasing*). Webflow inline scripts are limited to 2,000 characters, so the bundle must be hosted.
2. **Register the script.** Webflow → hosted script with the **pinned single-file bundle** URL (`…@1.0.1/dist/deploy-calcs.bundle.js`) and its SRI hash from `npm run sri`, applied to the calculator template page only. (Don't put SRI on the split `deploy-calcs.js` module: the integrity check doesn't extend to its lazily imported chunks and the script fails to run.)
3. **CMS collection "Calculators".** Fields: name, slug, H1, SEO title, meta description, category, calc key, asset preset, intro, example result (rich text, paste `dist/seo/{slug}.html`), how-to, formula, FAQ, related calculators (multi-reference), author (reference to Authors), last reviewed date.
4. **Template page `/calculators/{slug}`.** H1 → intro → HTML Embed `<div data-deploy-calc="{calc key}" data-asset="{asset preset}">` → example result → formula/how-to → FAQ → related links. Paste the JSON-LD from `dist/seo/{slug}.json` into the page's schema field.
5. **Hub page `/calculators`.** Grouped list of all calculators plus `hubJsonLd` from `dist/seo/index.json`. Link it from the footer.
6. **Canonicals.** Shareable links add query params, so the template's canonical must be the clean `/calculators/{slug}` URL.

## Releasing

jsDelivr serves files straight from git tags, so a release = build, commit `dist/`, tag.

```bash
npm version patch --no-git-tag-version   # or minor / major
npm run release                           # clean build + SEO assets
git add -A && git commit -m "Release vX.Y.Z"
git tag vX.Y.Z && git push && git push --tags
npm run sri                               # pinned URL + SRI hash for Webflow
```

| URL | Use |
|---|---|
| `…/deploy-calculators@1.0.1/dist/deploy-calcs.bundle.js` | Webflow: one file with all calculators (~29 KB gz), pinned + SRI. Update the URL + hash in Webflow for each release. |
| `…/deploy-calculators@1/dist/deploy-calcs.js` | Third-party embeds: ES module that lazy-loads only the calculators on the page (~10 KB gz), no SRI. Follows the latest 1.x release (jsDelivr caches up to 7 days; purge at `purge.jsdelivr.net/gh/Faction42HQ/deploy-calculators@1/dist/deploy-calcs.js`). |

Lazy chunks are loaded relative to the entry file, so they always come from the same version.

## Data

- **Hyperliquid info API** (public, no key, CORS-enabled): daily candles for crypto (BTC/ETH since 2020) and HIP-3 stock/index/commodity perps (since late 2025).
- **Deeper stock history:** call `DeployCalcs.setStockHistoryUrl('https://<proxy>/history')` with a proxy that returns `[{t, close}]` for `?ticker=NVDA`. Pick a provider (Polygon, FMP, Tiingo…) and keep its key on the server.

## Before launch

- [ ] Deploy team confirms `src/config.ts`: APY figure and wording, CTA links, disclaimers (compliance review).
- [ ] Write long-form content per page (800–1,500 words: formula, worked example, FAQ).
- [ ] Pick a stock data provider for DCA history before 2025.

## Structure

```
src/
  loader.ts        entry: finds [data-deploy-calc], lazy-loads calculators
  registry.ts      calculator key → lazy import
  config.ts        links, Deploy APY, reference rates, disclaimers
  core/            widget shell, form rendering, SVG charts, URL state, styles, formatting
  math/            pure, unit-tested finance math (no DOM)
  calcs/           one declarative definition per calculator (fields + compute)
  data/prices.ts   price history adapters
scripts/           SEO asset generator + per-page meta
test/              vitest unit tests
demo/              local preview page
```
