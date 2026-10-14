import type { SelectField, Values } from '../core/types';

/** Throw a friendly validation error unless every key is a positive finite number. */
export function requirePositive(v: Values, labels: Record<string, string>) {
  for (const [k, label] of Object.entries(labels)) {
    if (!(Number.isFinite(v[k]) && v[k] > 0)) throw new Error(`Enter a ${label} greater than zero.`);
  }
}

export function requireFinite(v: Values, labels: Record<string, string>) {
  for (const [k, label] of Object.entries(labels)) {
    if (!Number.isFinite(v[k])) throw new Error(`Enter a ${label}.`);
  }
}

export const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const ASSET_UNITS: Record<string, [string, string]> = {
  stock: ['share', 'shares'],
  crypto: ['coin', 'coins'],
  forex: ['unit', 'units'],
  commodity: ['contract', 'contracts'],
  other: ['unit', 'units'],
};

export const unitWord = (asset: string, n: number) => {
  const [one, many] = ASSET_UNITS[asset] ?? ASSET_UNITS.other;
  return Math.abs(n - 1) < 1e-9 ? one : many;
};

export function assetField(options: Record<string, string>, onChange?: SelectField['onChange']): SelectField {
  return { key: 'asset', label: 'Asset class', type: 'segmented', wide: true, options: opts(options), onChange };
}
