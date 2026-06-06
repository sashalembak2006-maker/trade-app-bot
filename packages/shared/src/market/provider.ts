import type { Asset, MarketAnalysisData, MarketDataStatus, PriceUpdate } from '../types/index.js';

export class DataSourceNotConfiguredError extends Error {
  code = 'DATA_SOURCE_NOT_CONFIGURED';
  constructor(message = 'DATA SOURCE NOT CONFIGURED') {
    super(message);
    this.name = 'DataSourceNotConfiguredError';
  }
}

/**
 * Thrown when an asset is known (has payout) but has no current live price —
 * e.g. a list-only asset that is not currently open on the platform.
 * Maps to HTTP 422 / code NO_PRICE so the UI can ask the user to open it.
 */
export class NoLivePriceError extends Error {
  code = 'NO_PRICE';
  constructor(message = 'No live price for asset') {
    super(message);
    this.name = 'NoLivePriceError';
  }
}

export interface MarketDataProvider {
  readonly status: MarketDataStatus;
  getAssets(): Promise<Asset[]>;
  getAssetPrice(symbol: string): Promise<number>;
  getPayout(symbol: string): Promise<number>;
  getMarketAnalysis(symbol: string): Promise<MarketAnalysisData>;
  subscribe(symbols: string[], callback: (data: PriceUpdate) => void): () => void;
}
