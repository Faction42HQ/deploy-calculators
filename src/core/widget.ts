import type { CalcDef, Field, NumberField, ResultSpec, RowsField, SelectField, Stat, Values } from './types';
import { h } from './dom';
import { renderChart } from './chart';
import { decodeState, encodeState } from './state';
import { injectStyles } from './styles';
import { DEFAULT_SCRIPT_URL } from '../config';

export interface MountOptions {
  /** Extra defaults, e.g. from data-asset="stock" or data-defaults='{"entry":100}'. */
  defaults?: Values;
  /** Read/write shareable state in the page URL. Off when several widgets share a page. */
  urlState?: boolean;
  /** Show the title + intro inside the widget (embeds). Webflow pages provide their own H1. */
  showTitle?: boolean;
  /** Public URL of the loader script, used in the embed snippet. */
  scriptUrl?: string;
  /** Canonical page on deploy.finance for "Powered by" and share links. */
  pageUrl?: string;
  theme?: 'light' | 'dark';
}

const fieldId = (() => {
  let n = 0;
  return () => `dfc-f${++n}`;
})();

export function mount(el: HTMLElement, def: CalcDef, opts: MountOptions = {}) {
  injectStyles();
  // data-asset="crypto" applies that asset's presets (via the asset field's onChange); explicit defaults still win.
  const assetSel = def.fields.find((f): f is SelectField => f.key === 'asset' && (f.type === 'select' || f.type === 'segmented'));
  const assetPatch = opts.defaults?.asset && assetSel?.onChange ? assetSel.onChange({ ...def.defaults, asset: opts.defaults.asset }) ?? {} : {};
  const defaults: Values = { ...def.defaults, ...assetPatch, ...opts.defaults };
  const url = opts.urlState && typeof location !== 'undefined' ? new URL(location.href) : null;
  const values: Values = { ...structuredClone(defaults), ...(url ? decodeState(def.fields, url.searchParams) : {}) };

  const form = h('div', { class: 'dfc-form' });
  const results = h('div', { class: 'dfc-results', 'aria-live': 'polite' });
  const embedBox = h('div', { class: 'dfc-embed', hidden: true });
  const root = h(
    'div',
    { class: 'dfc', 'data-calc': def.key, 'data-theme': opts.theme ?? null },
    opts.showTitle ? h('div', { class: 'dfc-head' }, h('div', { class: 'dfc-title' }, def.title), h('p', { class: 'dfc-intro' }, def.intro)) : null,
    h('div', { class: 'dfc-body' }, form, h('div', { class: 'dfc-out' }, results, renderCta(def))),
    embedBox,
    h('p', { class: 'dfc-disclaimer' }, def.disclaimer),
    renderFooter(),
  );
  el.replaceChildren(root);

  // ---------- form ----------
  const visibility: [HTMLElement, Field][] = [];

  function renderForm() {
    visibility.length = 0;
    form.replaceChildren(
      ...def.fields.map((f) => {
        const wrap = h('div', { class: 'dfc-field' + (f.wide || f.type === 'rows' ? ' wide' : '') }, renderField(f));
        visibility.push([wrap, f]);
        return wrap;
      }),
    );
    updateVisibility();
  }

  function updateVisibility() {
    for (const [wrap, f] of visibility) wrap.hidden = f.show ? !f.show(values) : false;
  }

  function renderField(f: Field): Node[] {
    const id = fieldId();
    const label = h('label', { class: 'dfc-label', for: f.type === 'segmented' || f.type === 'rows' ? null : id }, f.label);
    const help = f.help ? h('p', { class: 'dfc-help' }, f.help) : null;
    switch (f.type) {
      case 'number':
        return [label, numberInput(f, id, values[f.key], (n) => set(f.key, n)), help].filter(Boolean) as Node[];
      case 'select':
        return [label, selectInput(f, id, values[f.key], (v) => setChoice(f, v)), help].filter(Boolean) as Node[];
      case 'segmented':
        return [
          label,
          h(
            'div',
            { class: 'dfc-seg', role: 'group', 'aria-label': f.label },
            f.options.map((o) =>
              h('button', { type: 'button', 'aria-pressed': String(values[f.key] === o.value), onclick: () => setChoice(f, o.value) }, o.label),
            ),
          ),
          help,
        ].filter(Boolean) as Node[];
      case 'toggle':
        return [
          h(
            'label',
            { class: 'dfc-toggle' },
            h('input', { type: 'checkbox', id, checked: !!values[f.key], onchange: (e: Event) => setStructural(f.key, (e.target as HTMLInputElement).checked) }),
            f.label,
          ),
          help,
        ].filter(Boolean) as Node[];
      case 'date':
        return [
          label,
          h(
            'div',
            { class: 'dfc-input' },
            h('input', { type: 'date', id, value: values[f.key] ?? '', onchange: (e: Event) => set(f.key, (e.target as HTMLInputElement).value) }),
          ),
          help,
        ].filter(Boolean) as Node[];
      case 'rows':
        return [label, rowsInput(f), help].filter(Boolean) as Node[];
    }
  }

  function numberInput(f: NumberField, id: string, v: number, onValue: (n: number) => void) {
    const affix = (a: NumberField['prefix']) => (typeof a === 'function' ? a(values) : a);
    const pre = affix(f.prefix);
    const suf = affix(f.suffix);
    return h(
      'div',
      { class: 'dfc-input' },
      pre ? h('span', null, pre) : null,
      h('input', {
        id,
        type: 'number',
        inputmode: 'decimal',
        step: f.step ?? 'any',
        min: f.min,
        max: f.max,
        value: Number.isFinite(v) ? String(v) : '',
        'aria-label': f.label,
        oninput: (e: Event) => {
          const raw = (e.target as HTMLInputElement).value;
          onValue(raw === '' ? NaN : Number(raw));
        },
      }),
      suf ? h('span', null, suf) : null,
    );
  }

  function selectInput(f: SelectField, id: string, v: string, onValue: (v: string) => void) {
    return h(
      'div',
      { class: 'dfc-input' },
      h(
        'select',
        { id, 'aria-label': f.label, onchange: (e: Event) => onValue((e.target as HTMLSelectElement).value) },
        f.options.map((o) => h('option', { value: o.value, selected: o.value === v }, o.label)),
      ),
    );
  }

  function rowsInput(f: RowsField) {
    const rows: Values[] = values[f.key] ?? [];
    const table = h(
      'table',
      { class: 'dfc-rows' },
      h('thead', null, h('tr', null, f.columns.map((c) => h('th', null, c.label)), h('th'))),
      h(
        'tbody',
        null,
        rows.map((row, i) =>
          h(
            'tr',
            null,
            f.columns.map((c) =>
              h(
                'td',
                null,
                c.type === 'number'
                  ? numberInput(c, fieldId(), row[c.key], (n) => {
                      row[c.key] = n;
                      changed();
                    })
                  : selectInput(c as SelectField, fieldId(), row[c.key], (v) => {
                      row[c.key] = v;
                      changed();
                    }),
              ),
            ),
            h(
              'td',
              null,
              rows.length > (f.minRows ?? 1)
                ? h('button', { type: 'button', class: 'dfc-x', 'aria-label': 'Remove row', onclick: () => { rows.splice(i, 1); markCustom(f); setStructural(f.key, rows); } }, '×')
                : null,
            ),
          ),
        ),
      ),
    );
    const add =
      rows.length < (f.maxRows ?? 20)
        ? h('button', { type: 'button', class: 'dfc-btn', style: { marginTop: '6px' }, onclick: () => { rows.push(f.newRow(values)); markCustom(f); setStructural(f.key, rows); } }, '+ ' + (f.addLabel ?? 'Add row'))
        : null;
    return h('div', null, table, add);
  }

  // Editing option legs by hand switches a "strategy" preset select to "custom".
  function markCustom(_f: RowsField) {
    if ('strategy' in values && values.strategy !== 'custom') values.strategy = 'custom';
  }

  // ---------- state changes ----------
  function set(key: string, v: any) {
    values[key] = v;
    changed();
  }

  /** Changes that alter which fields/labels render: re-render the whole form. */
  function setStructural(key: string, v: any) {
    values[key] = v;
    renderForm();
    changed();
  }

  function setChoice(f: SelectField, v: string) {
    values[f.key] = v;
    const patch = f.onChange?.(values);
    if (patch) Object.assign(values, patch);
    renderForm();
    changed();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  function changed() {
    updateVisibility();
    clearTimeout(timer);
    timer = setTimeout(run, def.async ? 450 : 60);
  }

  async function run() {
    const my = ++seq;
    root.classList.add('dfc-loading');
    let spec: ResultSpec;
    try {
      spec = await def.compute(values);
    } catch (e) {
      spec = { hero: { label: 'Result', value: '—' }, stats: [], error: e instanceof Error ? e.message : 'Something went wrong.' };
    }
    if (my !== seq) return;
    root.classList.remove('dfc-loading');
    renderResults(spec);
    if (url) {
      const p = encodeState(def.fields, values, defaults);
      const next = new URL(location.href);
      next.search = p.toString();
      history.replaceState(history.state, '', next);
    }
  }

  function renderResults(r: ResultSpec) {
    if (r.error) {
      results.replaceChildren(h('div', { class: 'dfc-err', role: 'alert' }, r.error));
      return;
    }
    const parts: (Node | null | undefined)[] = [
      h('div', { class: 'dfc-hero' }, statBody(r.hero)),
      r.stats.length ? h('div', { class: 'dfc-stats' }, r.stats.map((st) => h('div', { class: 'dfc-stat' }, statBody(st)))) : null,
      r.chart ? renderChart(r.chart) : null,
      r.table
        ? h(
            'div',
            { class: 'dfc-table-wrap' },
            h(
              'table',
              { class: 'dfc-table' },
              r.table.title ? h('caption', null, r.table.title) : null,
              h('thead', null, h('tr', null, r.table.head.map((c) => h('th', { scope: 'col' }, c)))),
              h('tbody', null, r.table.rows.map((row) => h('tr', null, row.map((c) => h('td', null, c))))),
            ),
          )
        : null,
      r.notes?.length ? h('ul', { class: 'dfc-notes' }, r.notes.map((n) => h('li', null, n))) : null,
    ];
    results.replaceChildren(...(parts.filter(Boolean) as Node[]));
  }

  function statBody(st: Stat) {
    return [
      h('div', { class: 'dfc-k' }, st.label),
      h('div', { class: 'dfc-v' + (st.tone ? ` dfc-${st.tone}` : '') }, st.value),
      st.hint ? h('div', { class: 'dfc-hint' }, st.hint) : null,
    ];
  }

  // ---------- chrome ----------
  function renderFooter() {
    const page = opts.pageUrl ?? `https://www.deploy.finance/calculators/${def.key}`;
    const copyBtn = h('button', { type: 'button', class: 'dfc-btn', onclick: () => copyLink(copyBtn) }, 'Copy link');
    const embedBtn = h('button', { type: 'button', class: 'dfc-btn', onclick: () => toggleEmbed() }, 'Embed');
    return h(
      'div',
      { class: 'dfc-foot' },
      h('div', { class: 'dfc-actions' }, copyBtn, embedBtn),
      h('div', null, 'Powered by ', h('a', { href: page, target: '_blank', rel: 'noopener' }, `Deploy ${def.title}`)),
    );
  }

  function copyLink(btn: HTMLElement) {
    const base = opts.pageUrl ?? (typeof location !== 'undefined' ? location.origin + location.pathname : '');
    const p = encodeState(def.fields, values, defaults).toString();
    const link = base + (p ? `?${p}` : '');
    navigator.clipboard?.writeText(link).then(
      () => flash(btn, 'Copied'),
      () => flash(btn, 'Copy failed'),
    );
  }

  function toggleEmbed() {
    if (!embedBox.hidden) {
      embedBox.hidden = true;
      return;
    }
    // Third-party embeds track the major version (@1) so fixes reach them; the pinned
    // @1.2.3 URL is only for Webflow, where the SRI hash needs an immutable file.
    const src = (opts.scriptUrl ?? DEFAULT_SCRIPT_URL).replace(/@(\d+)\.\d+\.\d+\//, '@$1/');
    const page = opts.pageUrl ?? `https://www.deploy.finance/calculators/${def.key}`;
    const snippet =
      `<div data-deploy-calc="${def.key}" data-title="on"></div>\n` +
      `<script type="module" src="${src}"></script>\n` +
      `<p style="font-size:12px">Calculator by <a href="${page}">Deploy Finance</a></p>`;
    const ta = h('textarea', { readonly: true, 'aria-label': 'Embed code' }, snippet);
    embedBox.replaceChildren(h('div', { class: 'dfc-label' }, 'Paste this on your site'), ta);
    embedBox.hidden = false;
    ta.select();
  }

  renderForm();
  run();
  return { values, root };
}

function renderCta(def: CalcDef) {
  return h(
    'div',
    { class: 'dfc-cta' },
    h('p', null, def.cta.text),
    h('a', { class: 'dfc-btn primary', href: def.cta.href, target: '_blank', rel: 'noopener', 'data-dfc-cta': def.key }, def.cta.button),
  );
}

function flash(btn: HTMLElement, text: string) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1400);
}
