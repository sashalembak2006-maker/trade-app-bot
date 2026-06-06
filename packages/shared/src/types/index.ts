export type AssetCategory =
  | 'forex'
  | 'forex_otc'
  | 'crypto'
  | 'stocks'
  | 'commodities'
  | 'indices';

export type SignalDirection = 'CALL' | 'PUT';
export type TradeOutcome = 'win' | 'loss' | 'undetermined';
export type MartingaleMultiplier = 1 | 2 | 4;
export type TrendDirection = 'up' | 'down' | 'sideways';
export type Language = 'uk' | 'en';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  isOTC: boolean;
  /** Fresh live price (active chart / focused pair). `null` when not streaming. */
  price: number | null;
  /** Last real tick seen for this symbol — display only, not used for signal entry. */
  lastKnownPrice?: number | null;
  payout: number;
  change: number;
  flags: [string, string?];
  favorite: boolean;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  id: string;
  assetId: string;
  symbol: string;
  direction: SignalDirection;
  timeframe: string;
  entryPrice: number;
  confidence: number;
  payout: number;
  market: 'OTC' | 'MARKET';
  createdAt: string;
  expiresAt: string;
}

export interface SignalRequest {
  assetId: string;
  symbol: string;
  timeframe: string;
  price: number;
  payout: number;
  isOTC: boolean;
}

export interface SignalResult extends Signal {
  callScore: number;
  putScore: number;
  lowPayoutWarning: boolean;
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    ema21: number;
    ema50: number;
    bollingerUpper: number;
    bollingerLower: number;
    trend: TrendDirection;
    volatility: number;
  };
}

export interface MartingaleRow {
  step: number;
  bet: number;
  potentialProfit: number;
  totalRisk: number;
}

export interface CalculatorResult {
  firstBet: number;
  totalRisk: number;
  riskPercent: number;
  rows: MartingaleRow[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'forex' | 'crypto' | 'economy';
  date: string;
  source: string;
}

export interface IndicatorInfo {
  id: string;
  nameUk: string;
  nameEn: string;
  shortDescUk: string;
  shortDescEn: string;
  detailUk: string;
  detailEn: string;
  icon: string;
}

export interface LearningArticle {
  id: string;
  titleUk: string;
  titleEn: string;
  contentUk: string;
  contentEn: string;
  tab: 'basics' | 'books';
  duration: string;
  /** Printable HTML guide (user saves as PDF from browser). */
  guideUrl?: string;
  icon?: string;
}

export interface MarketAnalysisData {
  symbol: string;
  trend: TrendDirection;
  volatilityScore: number;
  payoutScore: number;
  signalConfidence: number;
  recommendedTimeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PriceUpdate {
  symbol: string;
  /** `null` for payout-only updates on assets that are not currently open. */
  price: number | null;
  payout: number;
  change: number;
  ts: number;
}

export type MarketDataMode = 'mock' | 'live' | 'unconfigured';

export interface MarketDataStatus {
  mode: MarketDataMode;
  configured: boolean;
  source: string;
  /** true when a live source has data but it is older than the staleness window */
  stale?: boolean;
  /** epoch ms of the last successful data update (live sources) */
  lastUpdate?: number | null;
  /** number of assets currently held by the provider */
  assetCount?: number;
}

export interface BridgeAssetInput {
  symbol: string;
  /** Pocket Option internal asset id (e.g. EURUSD_otc) when known. */
  poAsset?: string;
  /** Live price for the ACTIVE pair only. Omit/null for list-only assets. */
  price?: number | null;
  payout: number;
  change?: number;
  category?: string;
  isOTC?: boolean;
  timestamp?: number;
}

export interface MarketDataRow {
  symbol: string;
  price: number | null;
  payout: number;
  source: string;
  lastUpdated: number | null;
  stale: boolean;
}

export interface TradeSettlement {
  outcome: TradeOutcome;
  entryPrice: number;
  /** Real exit tick at expiry; null when no quote was available. */
  exitPrice: number | null;
  direction: SignalDirection;
  multiplier: MartingaleMultiplier;
}
