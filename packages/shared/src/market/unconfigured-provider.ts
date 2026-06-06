import type { Asset, MarketAnalysisData, MarketDataStatus, PriceUpdate } from '../types/index.js';
import { DataSourceNotConfiguredError, type MarketDataProvider } from './provider.js';

/**
 * Used in production when no real market data source is connected.
 * It NEVER fabricates prices or payouts. Reads return empty/throw so the
 * frontend can render a clear "DATA SOURCE NOT CONFIGURED" state.
 */
export class UnconfiguredMarketProvider implements MarketDataProvider {
  readonly status: MarketDataStatus = {
    mode: 'unconfigured',
    configured: false,
    source: 'none',
  };

  async getAssets(): Promise<Asset[]> {
    return [];
  }

  async getAssetPrice(_symbol: string): Promise<number> {
    throw new DataSourceNotConfiguredError();
  }

  async getPayout(_symbol: string): Promise<number> {
    throw new DataSourceNotConfiguredError();
  }

  async getMarketAnalysis(_symbol: string): Promise<MarketAnalysisData> {
    throw new DataSourceNotConfiguredError();
  }

  subscribe(_symbols: string[], _callback: (data: PriceUpdate) => void): () => void {
    return () => undefined;
  }
}
