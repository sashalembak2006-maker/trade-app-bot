import { useEffect, useState } from 'react';
import { ASSETS } from '../services/assets';

export interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  trend: 'up' | 'down' | 'sideways';
}

export function useAssetTicker() {
  const [items, setItems] = useState<TickerItem[]>(
    ASSETS.slice(0, 5).map((a) => ({
      symbol: a.symbol,
      price: a.price,
      change: a.change,
      trend: a.trend,
    })),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.5) * 0.02;
          const newChange = Math.round((item.change + delta) * 100) / 100;
          const newPrice = Math.round(item.price * (1 + delta / 100) * 100) / 100;
          return {
            ...item,
            price: newPrice,
            change: newChange,
            trend: newChange > 0.05 ? 'up' : newChange < -0.05 ? 'down' : 'sideways',
          };
        }),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return items;
}
