export type TrendDirection = 'up' | 'down' | 'sideways';
export type SignalType = 'bullish' | 'bearish' | 'neutral';
export type NewsCategory = 'forex' | 'crypto' | 'economy';
export type PageId = 'home' | 'vip' | 'profile';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  profit: number;
  isOtc: boolean;
  trend: TrendDirection;
  price: number;
  change: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  date: string;
  source: string;
  imageGradient: string;
}

export interface Indicator {
  id: string;
  name: string;
  shortName: string;
  description: string;
  signal: SignalType;
  value: string;
  color: 'yellow' | 'purple' | 'green' | 'blue';
}

export interface LearningCard {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'Початківець' | 'Середній' | 'Просунутий';
  icon: string;
}

export interface MarketAnalysis {
  asset: string;
  signal: SignalType;
  confidence: number;
  trend: TrendDirection;
  sentiment: number;
  entrySuggestion: string;
  expiryMinutes: number;
  support: number;
  resistance: number;
  rsi: number;
  macd: string;
}

export interface VipPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  locked?: boolean;
}

export interface VipSignal {
  id: string;
  asset: string;
  direction: 'CALL' | 'PUT';
  confidence: number;
  expiry: string;
  locked: boolean;
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
  languageCode?: string;
}
