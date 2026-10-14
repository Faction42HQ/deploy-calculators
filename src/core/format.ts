const cache = new Map<string, Intl.NumberFormat>();

function nf(opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = JSON.stringify(opts);
  let f = cache.get(k);
  if (!f) {
    f = new Intl.NumberFormat('en-US', opts);
    cache.set(k, f);
  }
  return f;
}

export function money(v: number, currency = 'USD', dp?: number): string {
  if (!Number.isFinite(v)) return '—';
  const digits = dp ?? (Math.abs(v) >= 1000 ? 0 : 2);
  return nf({ style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** Money with an explicit sign, for P/L figures. */
export function signedMoney(v: number, currency = 'USD', dp?: number): string {
  if (!Number.isFinite(v)) return '—';
  const s = money(Math.abs(v), currency, dp);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export function num(v: number, dp = 2): string {
  if (!Number.isFinite(v)) return '—';
  return nf({ minimumFractionDigits: 0, maximumFractionDigits: dp }).format(v);
}

/** Price with precision that adapts to magnitude (0.00001234 vs 64,000). */
export function price(v: number, currency = 'USD'): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const dp = a >= 100 ? 2 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
  const sym = currency === 'USD' ? '$' : '';
  return sym + nf({ minimumFractionDigits: 2, maximumFractionDigits: dp }).format(v) + (sym ? '' : ` ${currency}`);
}

/** Fraction → percent string. pct(0.0512) = "5.12%". */
export function pct(v: number, dp = 2): string {
  if (!Number.isFinite(v)) return '—';
  return nf({ minimumFractionDigits: 0, maximumFractionDigits: dp }).format(v * 100) + '%';
}

export function signedPct(v: number, dp = 2): string {
  if (!Number.isFinite(v)) return '—';
  const s = pct(Math.abs(v), dp);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export function compactMoney(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return nf({ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function date(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const tone = (v: number): 'pos' | 'neg' | undefined => (v > 0 ? 'pos' : v < 0 ? 'neg' : undefined);
