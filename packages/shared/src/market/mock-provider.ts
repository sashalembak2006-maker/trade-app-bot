import type { Asset, MarketAnalysisData, MarketDataStatus, PriceUpdate } from '../types/index.js';
import { MOCK_ASSETS } from './mock-data.js';
import type { MarketDataProvider } from './provider.js';

export class MockMarketDataProvider implements MarketDataProvider {
  readonly status: MarketDataStatus = {
    mode: 'mock',
    configured: true,
    source: 'mock-simulation',
  };

  private assets: Map<string, Asset>;
  private intervals: Set<ReturnType<typeof setInterval>> = new Set();

  constructor() {
    this.assets = new Map(MOCK_ASSETS.map((a) => [a.symbol, { ...a }]));
  }

  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAssetPrice(symbol: string): Promise<number> {
    return this.assets.get(symbol)?.price ?? 0;
  }

  async getPayout(symbol: string): Promise<number> {
    return this.assets.get(symbol)?.payout ?? 0;
  }

  async getMarketAnalysis(symbol: string): Promise<MarketAnalysisData> {
    const asset = this.assets.get(symbol);
    const seed = symbol.length + (asset?.price ?? 0);
    const trends = ['up', 'down', 'sideways'] as const;
    const trend = trends[Math.floor(seed) % 3];
    const payout = asset?.payout ?? 70;
    return {
      symbol,
      trend,
      volatilityScore: Math.min(99, 30 + (seed % 50)),
      payoutScore: payout,
      signalConfidence: Math.min(95, 55 + (seed % 40)),
      recommendedTimeframe: ['1m', '3m', '5m', '15m'][seed % 4],
      riskLevel: payout < 65 ? 'high' : payout > 80 ? 'low' : 'medium',
    };
  }

  subscribe(symbols: string[], callback: (data: PriceUpdate) => void): () => void {
    // Tick at a fixed 1s cadence so the frontend never lags more than ~1s.
    // NOTE: payout is intentionally NOT randomized — it is a stable property of
    // the asset (single source of truth). Only price/change drift.
    const interval = setInterval(() => {
      const now = Date.now();
      for (const symbol of symbols) {
        const asset = this.assets.get(symbol);
        if (!asset || asset.price == null) continue;

        const priceDelta = (Math.random() - 0.5) * asset.price * 0.001;
        const newPrice = Math.round((asset.price + priceDelta) * 100000) / 100000;
        const changeDelta = (Math.random() - 0.5) * 0.1;
        const newChange = Math.round((asset.change + changeDelta) * 100) / 100;

        asset.price = newPrice;
        asset.change = newChange;

        callback({ symbol, price: newPrice, payout: asset.payout, change: newChange, ts: now });
      }
    }, 500);

    this.intervals.add(interval);
    return () => {
      clearInterval(interval);
      this.intervals.delete(interval);
    };
  }

  getAsset(symbol: string): Asset | undefined {
    return this.assets.get(symbol);
  }

  updateFavorite(symbol: string, favorite: boolean): void {
    const asset = this.assets.get(symbol);
    if (asset) asset.favorite = favorite;
  }
}
