export type AssetCategory =
  | 'forex'
  | 'forex_otc'
  | 'crypto'
  | 'stocks'
  | 'commodities'
  | 'indices';

export type SignalDirection = 'CALL' | 'PUT';
export type TradeOutcome = 'win' | 'loss' | 'undetermined';
export type SignalStatus =
  | 'ACTIVE'
  | 'WIN'
  | 'LOSS'
  | 'NEED_COVER'
  | 'COVER_WIN'
  | 'COVER_LOSS';
export type MartingaleMultiplier = 1 | 2 | 4;
export type TrendDirection = 'up' | 'down' | 'sideways';
export type Language = 'uk' | 'en';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  isOTC: boolean;
  price: number | null;
  lastKnownPrice?: number | null;
  payout: number;
  change: number;
  flags: [string, string?];
  favorite: boolean;
}

export interface SignalResult {
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
  callScore: number;
  putScore: number;
  lowPayoutWarning: boolean;
  indicators: {
    rsi: number;
    macd: number;
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
  category: string;
  date: string;
  time?: string;
  source: string;
  body?: string;
  imageUrl?: string;
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
  imageUrl?: string;
}

export interface LearningArticle {
  id: string;
  titleUk: string;
  titleEn: string;
  contentUk: string;
  contentEn: string;
  tab: 'basics' | 'books';
  duration: string;
  guideUrl?: string;
  icon?: string;
}

export interface TradeSettlement {
  outcome: TradeOutcome;
  status: SignalStatus;
  entryPrice: number;
  exitPrice: number | null;
  direction: SignalDirection;
  multiplier: MartingaleMultiplier;
  coverNeeded: boolean;
  settledAt: string;
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
