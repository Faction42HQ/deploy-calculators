import type { ChartSpec } from './types';
import { h, s } from './dom';

const W = 640;
const H = 260;
const PAD = { l: 64, r: 16, t: 16, b: 32 };
const PALETTE = ['var(--dfc-accent)', '#0EA5E9', '#F59E0B', '#94A3B8', '#10B981'];

/** "Nice" axis ticks (1, 2, 2.5, 5 × 10^n steps). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    const d = Math.abs(min) || 1;
    min -= d / 2;
    max += d / 2;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => st >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(+v.toPrecision(12));
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function renderChart(spec: ChartSpec): HTMLElement {
  const all = spec.series.flatMap((se) => se.points);
  if (!all.length) return h('div');
  let xMin = Math.min(...all.map((p) => p[0]));
  let xMax = Math.max(...all.map((p) => p[0]));
  if (xMin === xMax) xMax = xMin + 1;
  let yMin = Math.min(...all.map((p) => p[1]));
  let yMax = Math.max(...all.map((p) => p[1]));
  if (spec.zeroLine) {
    yMin = Math.min(yMin, 0);
    yMax = Math.max(yMax, 0);
  } else if (yMin > 0 && yMin < yMax * 0.5) yMin = 0;
  const yt = niceTicks(yMin, yMax);
  yMin = yt[0];
  yMax = yt[yt.length - 1];
  const xt = niceTicks(xMin, xMax, 6).filter((t) => t >= xMin && t <= xMax);

  const X = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r);
  const Y = (y: number) => PAD.t + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dfc-chart-svg', role: 'img', 'aria-label': spec.title ?? 'Chart' });

  for (const t of yt) {
    svg.appendChild(s('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(t), y2: Y(t), class: t === 0 && spec.zeroLine ? 'dfc-zero' : 'dfc-grid' }));
    svg.appendChild(s('text', { x: PAD.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'dfc-axis' }, spec.yFormat(t)));
  }
  for (const t of xt) svg.appendChild(s('text', { x: X(t), y: H - 10, 'text-anchor': 'middle', class: 'dfc-axis' }, spec.xFormat(t)));

  // Profit/loss shading for payoff-style charts: clip the first series' area above/below zero.
  if (spec.zeroLine && spec.series[0]) {
    const pts = spec.series[0].points;
    const area = `M${X(pts[0][0])},${Y(0)} ` + pts.map((p) => `L${X(p[0])},${Y(p[1])}`).join(' ') + ` L${X(pts[pts.length - 1][0])},${Y(0)} Z`;
    const id = 'dfc' + Math.random().toString(36).slice(2, 8);
    const defs = s('defs');
    defs.appendChild(s('clipPath', { id: id + 'p' }, s('rect', { x: 0, y: 0, width: W, height: Y(0) })));
    defs.appendChild(s('clipPath', { id: id + 'n' }, s('rect', { x: 0, y: Y(0), width: W, height: H })));
    svg.appendChild(defs);
    svg.appendChild(s('path', { d: area, class: 'dfc-area-pos', 'clip-path': `url(#${id}p)` }));
    svg.appendChild(s('path', { d: area, class: 'dfc-area-neg', 'clip-path': `url(#${id}n)` }));
  }

  spec.series.forEach((se, i) => {
    const d = se.points.map((p, j) => `${j ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    svg.appendChild(
      s('path', { d, class: 'dfc-line', stroke: se.color ?? PALETTE[i % PALETTE.length], 'stroke-dasharray': se.dashed ? '5 4' : null }),
    );
  });

  for (const m of spec.markers ?? []) {
    if (m.x < xMin || m.x > xMax) continue;
    svg.appendChild(s('line', { x1: X(m.x), x2: X(m.x), y1: PAD.t, y2: H - PAD.b, class: 'dfc-marker' }));
    svg.appendChild(s('text', { x: X(m.x) + 4, y: PAD.t + 10, class: 'dfc-axis' }, m.label));
  }

  // Hover crosshair + tooltip reading every series at the nearest x of the first series.
  const cross = s('line', { y1: PAD.t, y2: H - PAD.b, class: 'dfc-cross', visibility: 'hidden' });
  svg.appendChild(cross);
  const tip = h('div', { class: 'dfc-tip', hidden: true });
  const base = spec.series[0].points;
  const onMove = (e: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const x = xMin + (((e.clientX - r.left) / r.width) * W - PAD.l) / (W - PAD.l - PAD.r) * (xMax - xMin);
    let best = 0;
    for (let i = 1; i < base.length; i++) if (Math.abs(base[i][0] - x) < Math.abs(base[best][0] - x)) best = i;
    const bx = base[best][0];
    cross.setAttribute('x1', String(X(bx)));
    cross.setAttribute('x2', String(X(bx)));
    cross.setAttribute('visibility', 'visible');
    tip.replaceChildren(
      h('div', { class: 'dfc-tip-x' }, spec.xFormat(bx)),
      ...spec.series.map((se, i) => {
        const p = se.points.reduce((a, b) => (Math.abs(b[0] - bx) < Math.abs(a[0] - bx) ? b : a));
        return h('div', null, h('i', { style: { background: se.color ?? PALETTE[i % PALETTE.length] } }), `${se.name}: ${spec.yFormat(p[1])}`);
      }),
    );
    tip.hidden = false;
    const left = (X(bx) / W) * r.width;
    tip.style.left = `${Math.min(left + 12, r.width - 170)}px`;
  };
  svg.addEventListener('pointermove', onMove as EventListener);
  svg.addEventListener('pointerleave', () => {
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  });

  const legend =
    spec.series.length > 1
      ? h(
          'div',
          { class: 'dfc-legend' },
          spec.series.map((se, i) => h('span', null, h('i', { style: { background: se.color ?? PALETTE[i % PALETTE.length] } }), se.name)),
        )
      : null;

  return h('figure', { class: 'dfc-chart' }, spec.title ? h('figcaption', null, spec.title) : null, legend, h('div', { class: 'dfc-chart-wrap' }, svg, tip));
}
