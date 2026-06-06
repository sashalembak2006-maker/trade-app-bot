import type { Asset, MarketAnalysisData, MarketDataStatus, PriceUpdate } from '../types/index.js';
import type { MarketDataProvider } from './provider.js';

/**
 * Real platform integration adapter.
 * Connect via official API, partner API, or approved data bridge.
 * Do NOT implement unauthorized scraping or protection bypass.
 *
 * Until the official endpoints are implemented below, this provider reports
 * itself as NOT configured so production never shows fabricated numbers.
 */
export class PlatformAdapterProvider implements MarketDataProvider {
  readonly status: MarketDataStatus;
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    const configured = Boolean(apiUrl && apiKey);
    this.status = {
      mode: configured ? 'live' : 'unconfigured',
      configured,
      source: configured ? apiUrl : 'platform (missing PLATFORM_API_URL/PLATFORM_API_KEY)',
    };
  }

  async getAssets(): Promise<Asset[]> {
    throw new Error(
      `PlatformAdapterProvider not configured. Set PLATFORM_API_URL and PLATFORM_API_KEY. Endpoint: ${this.apiUrl}`,
    );
  }

  async getAssetPrice(_symbol: string): Promise<number> {
    throw new Error('PlatformAdapterProvider: implement official API integration');
  }

  async getPayout(_symbol: string): Promise<number> {
    throw new Error('PlatformAdapterProvider: payout must come from platform API');
  }

  async getMarketAnalysis(_symbol: string): Promise<MarketAnalysisData> {
    throw new Error('PlatformAdapterProvider: implement market analysis endpoint');
  }

  subscribe(_symbols: string[], _callback: (data: PriceUpdate) => void): () => void {
    // TODO: open a WebSocket to the official platform feed and forward updates
    // as PriceUpdate { symbol, price, payout, change, ts }.
    return () => undefined;
  }
}
