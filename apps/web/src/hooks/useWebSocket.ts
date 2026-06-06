import { useEffect } from 'react';
import { wsClient } from '../services/websocket';
import { useAppStore } from '../store/useAppStore';

export interface PriceUpdate {
  symbol: string;
  price: number | null;
  payout: number;
  change: number;
  ts?: number;
}

export function useWebSocket() {
  const assets = useAppStore((s) => s.assets);
  const signalSymbol = useAppStore((s) => s.signalResult?.symbol);
  const selectedSymbol = useAppStore((s) => s.selectedAsset?.symbol);
  const updateAssetPrice = useAppStore((s) => s.updateAssetPrice);
  const setWsConnected = useAppStore((s) => s.setWsConnected);

  useEffect(() => {
    const off = wsClient.onStatus(setWsConnected);
    return off;
  }, [setWsConnected]);

  const symbolKey = `${assets.map((a) => a.symbol).join('\0')}\0${signalSymbol ?? ''}\0${selectedSymbol ?? ''}`;

  useEffect(() => {
    const symbols = new Set(assets.map((a) => a.symbol));
    if (signalSymbol) symbols.add(signalSymbol);
    if (selectedSymbol) symbols.add(selectedSymbol);
    if (symbols.size === 0) return;
    const unsub = wsClient.subscribe(Array.from(symbols), (data) => {
      updateAssetPrice(data.symbol, data.price, data.payout, data.change);
    });
    return unsub;
  }, [symbolKey, updateAssetPrice, signalSymbol]);
}
