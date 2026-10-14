import type { Candle } from '../math/dca';

// Daily price history adapters. Hyperliquid's public info API needs no key and allows CORS.
// Crypto history starts in 2020; HIP-3 stock/index/commodity markets (xyz:*) start late 2025.
// To add deeper stock history, point STOCK_HISTORY_URL at a proxy that returns [{t, close}].

const HL = 'https://api.hyperliquid.xyz/info';
export let STOCK_HISTORY_URL: string | null = null;
export const setStockHistoryUrl = (u: string | null) => (STOCK_HISTORY_URL = u);

export interface Market {
  id: string; // Hyperliquid coin name
  label: string;
  group: 'Crypto' | 'Stocks' | 'Indices' | 'Commodities';
  /** Ticker the stock-history proxy understands, when one is configured. */
  ticker?: string;
}

export const MARKETS: Market[] = [
  { id: 'BTC', label: 'Bitcoin (BTC)', group: 'Crypto' },
  { id: 'ETH', label: 'Ethereum (ETH)', group: 'Crypto' },
  { id: 'SOL', label: 'Solana (SOL)', group: 'Crypto' },
  { id: 'HYPE', label: 'Hyperliquid (HYPE)', group: 'Crypto' },
  { id: 'xyz:SP500', label: 'S&P 500', group: 'Indices', ticker: 'SPY' },
  { id: 'xyz:XYZ100', label: 'Nasdaq-100 (XYZ100)', group: 'Indices', ticker: 'QQQ' },
  { id: 'xyz:NVDA', label: 'NVIDIA (NVDA)', group: 'Stocks', ticker: 'NVDA' },
  { id: 'xyz:AAPL', label: 'Apple (AAPL)', group: 'Stocks', ticker: 'AAPL' },
  { id: 'xyz:MSFT', label: 'Microsoft (MSFT)', group: 'Stocks', ticker: 'MSFT' },
  { id: 'xyz:TSLA', label: 'Tesla (TSLA)', group: 'Stocks', ticker: 'TSLA' },
  { id: 'xyz:AMZN', label: 'Amazon (AMZN)', group: 'Stocks', ticker: 'AMZN' },
  { id: 'xyz:GOOGL', label: 'Alphabet (GOOGL)', group: 'Stocks', ticker: 'GOOGL' },
  { id: 'xyz:META', label: 'Meta (META)', group: 'Stocks', ticker: 'META' },
  { id: 'xyz:GOLD', label: 'Gold', group: 'Commodities', ticker: 'GLD' },
  { id: 'xyz:SILVER', label: 'Silver', group: 'Commodities', ticker: 'SLV' },
  { id: 'xyz:CL', label: 'Crude oil (WTI)', group: 'Commodities', ticker: 'USO' },
];

const cache = new Map<string, Promise<Candle[]>>();

export function dailyCloses(marketId: string): Promise<Candle[]> {
  let p = cache.get(marketId);
  if (!p) {
    p = load(marketId);
    p.catch(() => cache.delete(marketId));
    cache.set(marketId, p);
  }
  return p;
}

async function load(marketId: string): Promise<Candle[]> {
  const m = MARKETS.find((x) => x.id === marketId);
  if (STOCK_HISTORY_URL && m?.ticker) {
    const r = await fetch(`${STOCK_HISTORY_URL}?ticker=${encodeURIComponent(m.ticker)}`);
    if (r.ok) return (await r.json()) as Candle[];
  }
  const r = await fetch(HL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'candleSnapshot', req: { coin: marketId, interval: '1d', startTime: Date.UTC(2015, 0, 1), endTime: Date.now() } }),
  });
  if (!r.ok) throw new Error('Price data is unavailable right now. Please try again shortly.');
  const rows = (await r.json()) as { t: number; c: string }[];
  return rows.map((c) => ({ t: c.t, close: Number(c.c) }));
}
