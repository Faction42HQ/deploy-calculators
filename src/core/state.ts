import type { Field, RowsField, Values } from './types';

// Shareable URL state. Only values that differ from defaults are written, so a
// clean page URL stays clean (and Webflow's canonical points at it).
// Rows are encoded as "a_b_c~d_e_f".

export function encodeState(fields: Field[], values: Values, defaults: Values): URLSearchParams {
  const p = new URLSearchParams();
  for (const f of fields) {
    const v = values[f.key];
    if (f.type === 'rows') {
      const enc = encodeRows(f, v);
      if (enc !== encodeRows(f, defaults[f.key])) p.set(f.key, enc);
    } else if (v !== defaults[f.key] && v !== '' && v != null) {
      p.set(f.key, f.type === 'toggle' ? (v ? '1' : '0') : String(v));
    }
  }
  return p;
}

export function decodeState(fields: Field[], params: URLSearchParams): Values {
  const out: Values = {};
  for (const f of fields) {
    const raw = params.get(f.key);
    if (raw == null) continue;
    if (f.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) out[f.key] = n;
    } else if (f.type === 'toggle') out[f.key] = raw === '1';
    else if (f.type === 'rows') out[f.key] = decodeRows(f, raw);
    else if (f.type === 'select' || f.type === 'segmented') {
      if (f.options.some((o) => o.value === raw)) out[f.key] = raw;
    } else out[f.key] = raw;
  }
  return out;
}

function encodeRows(f: RowsField, rows: Values[] = []): string {
  return rows.map((r) => f.columns.map((c) => String(r[c.key] ?? '')).join('_')).join('~');
}

function decodeRows(f: RowsField, raw: string): Values[] {
  return raw
    .split('~')
    .filter(Boolean)
    .slice(0, f.maxRows ?? 50)
    .map((chunk) => {
      const parts = chunk.split('_');
      const row: Values = {};
      f.columns.forEach((c, i) => {
        const v = parts[i] ?? '';
        row[c.key] = c.type === 'number' ? Number(v) || 0 : v;
      });
      return row;
    });
}
