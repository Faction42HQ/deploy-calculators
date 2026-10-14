// Generates per-calculator SEO assets into dist/seo/:
//   {slug}.html  static "Example result" block (default inputs → results) for the Webflow CMS,
//                so crawlers and AI answer engines see real numbers without running JS
//   {slug}.json  title, meta description, H1, embed snippet, JSON-LD (WebApplication + BreadcrumbList)
//   index.json   manifest for the /calculators hub (ItemList JSON-LD included)
// Run: npm run seo

import { mkdirSync, writeFileSync } from 'node:fs';
import { REGISTRY } from '../src/registry';
import type { CalcDef, Field, ResultSpec, Values } from '../src/core/types';
import { SEO } from './seo-meta';
import { LINKS } from '../src/config';

const SITE = 'https://www.deploy.finance';
const OUT = 'dist/seo';
const SCRIPT = process.env.SCRIPT_URL ?? 'https://cdn.jsdelivr.net/gh/Faction42HQ/deploy-calculators@1/dist/deploy-calcs.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inputSummary(def: CalcDef, v: Values): string[] {
  const out: string[] = [];
  for (const f of def.fields) {
    if (f.show && !f.show(v)) continue;
    const val = v[f.key];
    if (val == null || val === '' || (typeof val === 'number' && !Number.isFinite(val))) continue;
    out.push(`${f.label}: ${fmtInput(f, val, v)}`);
  }
  return out;
}

function fmtInput(f: Field, val: any, v: Values): string {
  if (f.type === 'number') {
    const pre = typeof f.prefix === 'function' ? f.prefix(v) : f.prefix ?? '';
    const suf = typeof f.suffix === 'function' ? f.suffix(v) : f.suffix ?? '';
    const n = Number(val).toLocaleString('en-US', { maximumFractionDigits: 6 });
    return `${pre}${n}${suf ? (suf.startsWith('%') ? suf : ' ' + suf) : ''}`;
  }
  if (f.type === 'select' || f.type === 'segmented') return f.options.find((o) => o.value === val)?.label ?? String(val);
  if (f.type === 'toggle') return val ? 'Yes' : 'No';
  if (f.type === 'rows')
    return (val as Values[]).map((r) => f.columns.map((c) => (c.type === 'number' ? r[c.key] : (c as any).options.find((o: any) => o.value === r[c.key])?.label ?? r[c.key])).join(' ')).join('; ');
  return String(val);
}

function staticHtml(def: CalcDef, v: Values, r: ResultSpec): string {
  const inputs = inputSummary(def, v);
  const stats = [r.hero, ...r.stats];
  const table = r.table
    ? `\n<table>\n<thead><tr>${r.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>\n<tbody>\n${r.table.rows
        .slice(0, 12)
        .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('\n')}\n</tbody>\n</table>`
    : '';
  return `<section class="calc-example">
<h2>Example: ${esc(def.title.replace(' Calculator', ''))} calculation</h2>
<p>Using these inputs:</p>
<ul>
${inputs.map((i) => `<li>${esc(i)}</li>`).join('\n')}
</ul>
<p>The calculator returns:</p>
<ul>
${stats.map((s) => `<li><strong>${esc(s.label)}:</strong> ${esc(s.value)}${s.hint ? ` (${esc(s.hint)})` : ''}</li>`).join('\n')}
</ul>${table}
</section>
`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const manifest: any[] = [];
  for (const [key, load] of Object.entries(REGISTRY)) {
    const def = await load();
    const meta = SEO[key];
    if (!meta) throw new Error(`Missing SEO meta for ${key}`);
    // DCA's backtest needs live prices; use the deterministic projection for the static example.
    const v: Values = structuredClone(def.defaults);
    if (key === 'dca') v.mode = 'project';
    const r = await def.compute(v);
    if (r.error) throw new Error(`${key}: ${r.error}`);

    const url = `${SITE}/calculators/${meta.slug}`;
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: meta.h1,
        url,
        description: meta.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@type': 'Organization', name: 'Deploy Finance', url: SITE },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Calculators', item: LINKS.calculators },
          { '@type': 'ListItem', position: 3, name: meta.h1, item: url },
        ],
      },
    ];
    const embed = `<div data-deploy-calc="${key}"></div>\n<script type="module" src="${SCRIPT}"></script>`;
    const html = staticHtml(def, v, r);
    writeFileSync(`${OUT}/${meta.slug}.html`, html);
    writeFileSync(`${OUT}/${meta.slug}.json`, JSON.stringify({ key, ...meta, url, intro: def.intro, embed, jsonLd, exampleHtml: html }, null, 2));
    manifest.push({ key, slug: meta.slug, h1: meta.h1, title: meta.title, description: meta.description, category: meta.category, keyword: meta.keyword, url, related: meta.related });
    console.log(`✓ ${meta.slug.padEnd(18)} ${meta.title.length}c title · ${meta.description.length}c description`);
    if (meta.title.length > 60) console.warn(`  ! title over 60 chars`);
    if (meta.description.length > 155) console.warn(`  ! description over 155 chars`);
  }
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Free trading & investing calculators',
    itemListElement: manifest.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.h1, url: m.url })),
  };
  writeFileSync(`${OUT}/index.json`, JSON.stringify({ calculators: manifest, hubJsonLd: itemList }, null, 2));
  console.log(`\nWrote ${manifest.length} calculators to ${OUT}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
