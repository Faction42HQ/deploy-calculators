// Shared types for calculator definitions. A calculator is declarative:
// fields describe the inputs, compute() turns values into a ResultSpec.
// compute() is pure (or async for market data) so it also runs in Node for SEO output.

export type Values = Record<string, any>;

interface FieldBase {
  key: string;
  label: string;
  help?: string;
  /** Hide the field unless this returns true. */
  show?: (v: Values) => boolean;
  /** Full-width field instead of half-width. */
  wide?: boolean;
}

export interface NumberField extends FieldBase {
  type: 'number';
  prefix?: string | ((v: Values) => string);
  suffix?: string | ((v: Values) => string);
  step?: number;
  min?: number;
  max?: number;
}

export interface SelectField extends FieldBase {
  type: 'select' | 'segmented';
  options: { value: string; label: string }[];
  /** Return extra values to apply when this field changes (e.g. strategy presets). */
  onChange?: (v: Values) => Values | void;
}

export interface ToggleField extends FieldBase {
  type: 'toggle';
}

export interface DateField extends FieldBase {
  type: 'date';
}

export interface RowsField extends FieldBase {
  type: 'rows';
  columns: (NumberField | SelectField)[];
  newRow: (v: Values) => Values;
  minRows?: number;
  maxRows?: number;
  addLabel?: string;
}

export type Field = NumberField | SelectField | ToggleField | DateField | RowsField;

export interface Stat {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'warn';
  hint?: string;
}

export interface Series {
  name: string;
  points: [number, number][];
  color?: string;
  dashed?: boolean;
}

export interface ChartSpec {
  title?: string;
  series: Series[];
  xFormat: (x: number) => string;
  yFormat: (y: number) => string;
  /** Draw y=0 and shade profit/loss areas of the first series (payoff charts). */
  zeroLine?: boolean;
  markers?: { x: number; label: string }[];
}

export interface TableSpec {
  title?: string;
  head: string[];
  rows: string[][];
}

export interface ResultSpec {
  hero: Stat;
  stats: Stat[];
  chart?: ChartSpec;
  table?: TableSpec;
  notes?: string[];
  error?: string;
}

export interface Cta {
  text: string;
  button: string;
  href: string;
}

export interface CalcDef {
  key: string;
  title: string;
  /** Short explanation shown above the inputs. */
  intro: string;
  fields: Field[];
  defaults: Values;
  compute: (v: Values) => ResultSpec | Promise<ResultSpec>;
  cta: Cta;
  disclaimer: string;
  /** Async calculators show a "Run" state instead of recomputing on every keystroke. */
  async?: boolean;
}
