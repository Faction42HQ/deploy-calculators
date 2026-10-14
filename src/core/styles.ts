// Scoped under .dfc so the widget survives Webflow's global styles and third-party embeds.
// Theme hooks: override any --dfc-* variable on a parent element.
export const CSS = `
.dfc{--dfc-accent:#4F46E5;--dfc-accent-soft:rgba(79,70,229,.08);--dfc-bg:#fff;--dfc-panel:#F6F6FE;--dfc-text:#0B0B14;--dfc-muted:#64748B;--dfc-border:#E4E4F0;--dfc-pos:#059669;--dfc-neg:#DC2626;--dfc-warn:#B45309;--dfc-radius:14px;
font-family:inherit;color:var(--dfc-text);background:var(--dfc-bg);border:1px solid var(--dfc-border);border-radius:var(--dfc-radius);overflow:hidden;line-height:1.4;font-size:15px;text-align:left;max-width:1100px;margin:0 auto}
.dfc[data-theme=dark]{--dfc-bg:#0E0E18;--dfc-panel:#151524;--dfc-text:#F1F1F8;--dfc-muted:#9A9AB4;--dfc-border:#26263A;--dfc-accent:#818CF8;--dfc-accent-soft:rgba(129,140,248,.12);--dfc-pos:#34D399;--dfc-neg:#F87171;--dfc-warn:#FBBF24}
.dfc *,.dfc *::before,.dfc *::after{box-sizing:border-box}
.dfc-head{padding:18px 22px 0}
.dfc-title{font-size:20px;font-weight:600;margin:0 0 4px;letter-spacing:-.2px}
.dfc-intro{color:var(--dfc-muted);margin:0;font-size:14px}
.dfc-body{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:0}
.dfc-form{padding:18px 22px 22px;display:grid;grid-template-columns:1fr 1fr;gap:14px 12px;align-content:start}
.dfc-out{padding:18px 22px 22px;background:var(--dfc-panel);border-left:1px solid var(--dfc-border);min-width:0}
.dfc-label{display:block;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dfc-muted);margin:0 0 6px;font-weight:500}
.dfc-field{min-width:0}.dfc-field.wide{grid-column:1/-1}
.dfc-help{font-size:12px;color:var(--dfc-muted);margin:5px 0 0}
.dfc-input{display:flex;align-items:center;border:1px solid var(--dfc-border);border-radius:10px;background:var(--dfc-bg);height:42px;padding:0 12px;transition:border-color .15s,box-shadow .15s}
.dfc-input:focus-within{border-color:var(--dfc-accent);box-shadow:0 0 0 3px var(--dfc-accent-soft)}
.dfc-input span{color:var(--dfc-muted);font-size:14px;white-space:nowrap}
.dfc-input input,.dfc-input select{all:unset;flex:1;min-width:0;height:100%;font:inherit;font-size:15px;color:var(--dfc-text);font-variant-numeric:tabular-nums;padding:0 6px}
.dfc-input select{cursor:pointer;height:auto;padding-right:18px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2364748B' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 2px center}
.dfc-input input::-webkit-inner-spin-button{display:none}
.dfc-seg{display:flex;border:1px solid var(--dfc-border);border-radius:10px;padding:3px;gap:3px;background:var(--dfc-bg);flex-wrap:wrap}
.dfc-seg button{all:unset;flex:1;text-align:center;padding:7px 10px;border-radius:7px;font-size:13.5px;cursor:pointer;color:var(--dfc-muted);white-space:nowrap}
.dfc-seg button[aria-pressed=true]{background:var(--dfc-accent);color:#fff;font-weight:500}
.dfc-seg button:focus-visible,.dfc-btn:focus-visible{outline:2px solid var(--dfc-accent);outline-offset:2px}
.dfc-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;height:42px}
.dfc-toggle input{width:18px;height:18px;accent-color:var(--dfc-accent)}
.dfc-rows{width:100%;border-collapse:collapse;table-layout:fixed}.dfc-rows th:last-child,.dfc-rows td:last-child{width:26px}
.dfc-rows th{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--dfc-muted);font-weight:500;text-align:left;padding:0 4px 4px}
.dfc-rows td{padding:3px 2px}.dfc-rows .dfc-input{height:38px;padding:0 6px}.dfc-rows .dfc-input input,.dfc-rows .dfc-input select{padding:0 2px;font-size:14px}.dfc-rows .dfc-input select{padding-right:14px}.dfc-rows .dfc-input span{font-size:13px}
.dfc-rows .dfc-x{all:unset;cursor:pointer;color:var(--dfc-muted);font-size:18px;padding:0 6px}
.dfc-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dfc-border);border-radius:9px;padding:7px 12px;font-size:13.5px;color:var(--dfc-text);background:var(--dfc-bg)}
.dfc-btn:hover{border-color:var(--dfc-accent)}
.dfc-btn.primary{background:var(--dfc-accent);border-color:var(--dfc-accent);color:#fff;font-weight:500;padding:10px 16px}
.dfc-hero{background:var(--dfc-bg);border:1px solid var(--dfc-border);border-radius:12px;padding:16px 18px}
.dfc-hero .dfc-v{font-size:34px;font-weight:600;letter-spacing:-.8px;font-variant-numeric:tabular-nums;line-height:1.15;word-break:break-word}
.dfc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px}
.dfc-stat{background:var(--dfc-bg);border:1px solid var(--dfc-border);border-radius:12px;padding:11px 14px;min-width:0}
.dfc-stat .dfc-v{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;word-break:break-word}
.dfc-k{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dfc-muted);margin-bottom:3px}
.dfc-hint{font-size:12px;color:var(--dfc-muted);margin-top:2px}
.dfc-pos{color:var(--dfc-pos)}.dfc-neg{color:var(--dfc-neg)}.dfc-warn{color:var(--dfc-warn)}
.dfc-err{background:rgba(220,38,38,.07);color:var(--dfc-neg);border-radius:10px;padding:12px 14px;font-size:14px}
.dfc-notes{margin:12px 0 0;padding:0 0 0 18px;font-size:13px;color:var(--dfc-muted)}.dfc-notes li{margin:3px 0}
.dfc-chart{margin:14px 0 0;background:var(--dfc-bg);border:1px solid var(--dfc-border);border-radius:12px;padding:10px 10px 4px}
.dfc-chart figcaption{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dfc-muted);padding:2px 6px 6px}
.dfc-chart-wrap{position:relative}
.dfc-chart-svg{width:100%;height:auto;display:block;touch-action:pan-y}
.dfc-grid{stroke:var(--dfc-border);stroke-width:1}.dfc-zero{stroke:var(--dfc-muted);stroke-width:1}
.dfc-axis{fill:var(--dfc-muted);font-size:11px;font-family:inherit}
.dfc-line{fill:none;stroke-width:2.2;stroke-linejoin:round}
.dfc-area-pos{fill:var(--dfc-pos);opacity:.1}.dfc-area-neg{fill:var(--dfc-neg);opacity:.1}
.dfc-marker{stroke:var(--dfc-muted);stroke-dasharray:3 3}.dfc-cross{stroke:var(--dfc-muted);stroke-width:1}
.dfc-tip{position:absolute;top:6px;background:var(--dfc-text);color:var(--dfc-bg);font-size:12px;border-radius:8px;padding:7px 9px;pointer-events:none;min-width:150px;font-variant-numeric:tabular-nums}
.dfc-tip-x{opacity:.7;margin-bottom:2px}
.dfc-tip i,.dfc-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
.dfc-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--dfc-muted);padding:0 6px 6px}
.dfc-table-wrap{margin-top:14px;max-height:320px;overflow:auto;border:1px solid var(--dfc-border);border-radius:12px;background:var(--dfc-bg)}
.dfc-table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.dfc-table caption{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dfc-muted);padding:10px 12px 4px}
.dfc-table th{position:sticky;top:0;background:var(--dfc-bg);text-align:right;font-weight:500;color:var(--dfc-muted);padding:7px 12px;border-bottom:1px solid var(--dfc-border);white-space:nowrap}
.dfc-table td{text-align:right;padding:6px 12px;border-bottom:1px solid var(--dfc-border);white-space:nowrap}
.dfc-table th:first-child,.dfc-table td:first-child{text-align:left}
.dfc-loading .dfc-results{opacity:.45;transition:opacity .2s}
.dfc-cta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding:14px 16px;border-radius:12px;background:var(--dfc-accent-soft)}
.dfc-cta p{margin:0;font-size:14px}
.dfc-cta a{text-decoration:none;white-space:nowrap}
.dfc-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 22px;border-top:1px solid var(--dfc-border);font-size:12px;color:var(--dfc-muted)}
.dfc-foot a{color:var(--dfc-accent);text-decoration:none}
.dfc-actions{display:flex;gap:8px}
.dfc-disclaimer{padding:0 22px 14px;font-size:11.5px;color:var(--dfc-muted);margin:0}
.dfc-embed{padding:0 22px 14px}.dfc-embed textarea{width:100%;height:84px;font:12px ui-monospace,Menlo,monospace;border:1px solid var(--dfc-border);border-radius:10px;padding:10px;background:var(--dfc-panel);color:var(--dfc-text);resize:vertical}
@media (max-width:760px){.dfc-body{grid-template-columns:1fr}.dfc-out{border-left:0;border-top:1px solid var(--dfc-border)}.dfc-form,.dfc-out{padding:16px}.dfc-head{padding:16px 16px 0}.dfc-foot{padding:12px 16px}.dfc-hero .dfc-v{font-size:28px}.dfc-cta{flex-direction:column;align-items:flex-start}}
@media (max-width:420px){.dfc-form{grid-template-columns:1fr}}
`;

let injected = false;
export function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-dfc', '');
  el.textContent = CSS;
  document.head.appendChild(el);
}
