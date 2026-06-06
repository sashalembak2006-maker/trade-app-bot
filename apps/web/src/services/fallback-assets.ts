import type { Asset } from '../types';

/** Offline fallback — subset of Pocket Option pairs */
export const FALLBACK_ASSETS: Asset[] = [
  { id: 'eur-usd', symbol: 'EUR/USD', name: 'EUR/USD', category: 'forex', isOTC: false, price: 1.0842, payout: 92, change: -0.18, flags: ['🇪🇺', '🇺🇸'], favorite: true },
  { id: 'eur-usd-otc', symbol: 'EUR/USD OTC', name: 'EUR/USD', category: 'forex_otc', isOTC: true, price: 1.0842, payout: 84, change: -0.18, flags: ['🇪🇺', '🇺🇸'], favorite: true },
  { id: 'gbp-usd', symbol: 'GBP/USD', name: 'GBP/USD', category: 'forex', isOTC: false, price: 1.2718, payout: 90, change: 0.05, flags: ['🇬🇧', '🇺🇸'], favorite: false },
  { id: 'gbp-usd-otc', symbol: 'GBP/USD OTC', name: 'GBP/USD', category: 'forex_otc', isOTC: true, price: 1.2718, payout: 82, change: 0.05, flags: ['🇬🇧', '🇺🇸'], favorite: false },
  { id: 'usd-jpy', symbol: 'USD/JPY', name: 'USD/JPY', category: 'forex', isOTC: false, price: 156.42, payout: 88, change: 0.41, flags: ['🇺🇸', '🇯🇵'], favorite: false },
  { id: 'usd-jpy-otc', symbol: 'USD/JPY OTC', name: 'USD/JPY', category: 'forex_otc', isOTC: true, price: 156.42, payout: 80, change: 0.41, flags: ['🇺🇸', '🇯🇵'], favorite: false },
  { id: 'aud-nzd-otc', symbol: 'AUD/NZD OTC', name: 'AUD/NZD', category: 'forex_otc', isOTC: true, price: 1.0915, payout: 76, change: 0.12, flags: ['🇦🇺', '🇳🇿'], favorite: true },
  { id: 'aed-cny-otc', symbol: 'AED/CNY OTC', name: 'AED/CNY', category: 'forex_otc', isOTC: true, price: 2.1196, payout: 68, change: 0.03, flags: ['🇦🇪', '🇨🇳'], favorite: false },
  { id: 'btc-usd', symbol: 'BTC/USD', name: 'Bitcoin', category: 'crypto', isOTC: false, price: 67245.8, payout: 88, change: 1.24, flags: ['₿', '🇺🇸'], favorite: true },
  { id: 'btc-usd-otc', symbol: 'BTC/USD OTC', name: 'Bitcoin', category: 'crypto', isOTC: true, price: 67245.8, payout: 82, change: 1.24, flags: ['₿', '🇺🇸'], favorite: true },
  { id: 'eth-usd', symbol: 'ETH/USD', name: 'Ethereum', category: 'crypto', isOTC: false, price: 3542.6, payout: 86, change: 2.15, flags: ['Ξ', '🇺🇸'], favorite: false },
  { id: 'gold', symbol: 'GOLD', name: 'Gold', category: 'commodities', isOTC: false, price: 2348.5, payout: 83, change: 0.67, flags: ['🥇', '🇺🇸'], favorite: true },
  { id: 'gold-otc', symbol: 'GOLD OTC', name: 'Gold', category: 'commodities', isOTC: true, price: 2348.5, payout: 75, change: 0.67, flags: ['🥇', '🇺🇸'], favorite: true },
];
