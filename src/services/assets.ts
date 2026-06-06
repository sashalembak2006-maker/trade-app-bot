import type { Asset } from '../types';

export const ASSETS: Asset[] = [
  { id: 'btc-usd', symbol: 'BTC/USD', name: 'Bitcoin', profit: 92, isOtc: false, trend: 'up', price: 67245.8, change: 1.24 },
  { id: 'eur-usd', symbol: 'EUR/USD', name: 'Євро / Долар', profit: 88, isOtc: false, trend: 'down', price: 1.0842, change: -0.18 },
  { id: 'aud-nzd', symbol: 'AUD/NZD', name: 'Австралійський / Новозеландський', profit: 85, isOtc: true, trend: 'up', price: 1.0915, change: 0.32 },
  { id: 'gbp-usd', symbol: 'GBP/USD', name: 'Фунт / Долар', profit: 90, isOtc: false, trend: 'sideways', price: 1.2718, change: 0.05 },
  { id: 'usd-jpy', symbol: 'USD/JPY', name: 'Долар / Єна', profit: 87, isOtc: false, trend: 'up', price: 156.42, change: 0.41 },
  { id: 'eth-usd', symbol: 'ETH/USD', name: 'Ethereum', profit: 91, isOtc: false, trend: 'up', price: 3542.6, change: 2.15 },
  { id: 'xau-usd', symbol: 'XAU/USD', name: 'Золото', profit: 89, isOtc: true, trend: 'up', price: 2348.5, change: 0.67 },
  { id: 'usd-cad', symbol: 'USD/CAD', name: 'Долар / Канадський', profit: 86, isOtc: false, trend: 'down', price: 1.3621, change: -0.22 },
  { id: 'nzd-usd', symbol: 'NZD/USD', name: 'Новозеландський / Долар', profit: 84, isOtc: true, trend: 'sideways', price: 0.6124, change: 0.08 },
  { id: 'eur-gbp', symbol: 'EUR/GBP', name: 'Євро / Фунт', profit: 83, isOtc: true, trend: 'down', price: 0.8521, change: -0.14 },
];

export function filterAssets(query: string, otcOnly = false): Asset[] {
  const normalized = query.trim().toLowerCase();
  return ASSETS.filter((asset) => {
    if (otcOnly && !asset.isOtc) return false;
    if (!normalized) return true;
    return (
      asset.symbol.toLowerCase().includes(normalized) ||
      asset.name.toLowerCase().includes(normalized)
    );
  });
}

export function getAssetBySymbol(symbol: string): Asset | undefined {
  return ASSETS.find((a) => a.symbol === symbol);
}
