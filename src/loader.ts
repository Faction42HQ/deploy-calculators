// Entry point. Usage on any page:
//   <div data-deploy-calc="position-size"></div>
//   <script type="module" src=".../deploy-calcs.js"></script>
//
// Optional attributes on the div:
//   data-asset="crypto"          preset the asset class (stock | crypto | forex | commodity)
//   data-defaults='{"risk":2}'   override any default input value (JSON)
//   data-title="on"              show title + intro inside the widget (embeds on other sites)
//   data-url-state="off"         don't read/write inputs in the page URL
//   data-theme="dark"            dark palette
//   data-page-url="https://…"    canonical page for share links and "Powered by"

import { REGISTRY } from './registry';
import { mount } from './core/widget';
import { setStockHistoryUrl } from './data/prices';

const SCRIPT_URL = import.meta.url;

async function init(root: ParentNode = document) {
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-deploy-calc]:not([data-dfc-mounted])')];
  const single = document.querySelectorAll('[data-deploy-calc]').length === 1;
  await Promise.all(
    nodes.map(async (el) => {
      el.setAttribute('data-dfc-mounted', '');
      const key = el.dataset.deployCalc!;
      const load = REGISTRY[key];
      if (!load) {
        console.warn(`[deploy-calcs] Unknown calculator "${key}". Available: ${Object.keys(REGISTRY).join(', ')}`);
        return;
      }
      let defaults: Record<string, unknown> = {};
      try {
        if (el.dataset.defaults) defaults = JSON.parse(el.dataset.defaults);
      } catch {
        console.warn('[deploy-calcs] data-defaults is not valid JSON');
      }
      if (el.dataset.asset) defaults.asset = el.dataset.asset;
      const def = await load();
      mount(el, def, {
        defaults,
        urlState: el.dataset.urlState !== 'off' && single,
        showTitle: el.dataset.title === 'on',
        theme: el.dataset.theme === 'dark' ? 'dark' : undefined,
        scriptUrl: SCRIPT_URL || undefined, // empty in the single-file bundle
        pageUrl: el.dataset.pageUrl,
      });
    }),
  );
}

declare global {
  interface Window {
    DeployCalcs?: { init: typeof init; setStockHistoryUrl: typeof setStockHistoryUrl; list: string[] };
  }
}
window.DeployCalcs = { init, setStockHistoryUrl, list: Object.keys(REGISTRY) };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
else init();
