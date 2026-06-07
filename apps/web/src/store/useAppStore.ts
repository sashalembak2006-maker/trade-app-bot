import { create } from 'zustand';
import type { Asset, SignalResult, Language, AssetCategory, TradeSettlement, MartingaleMultiplier } from '../types';

function isPlausiblePrice(price: number): boolean {
  return Number.isFinite(price) && price > 0 && price < 1_000_000;
}
import type { UserProfile, AccessStatus, MarketDataStatus } from '../services/api';

export type SignalPhase = 'idle' | 'loading' | 'result' | 'settled';

interface AppState {
  language: Language;
  searchQuery: string;
  assets: Asset[];
  selectedAsset: Asset | null;
  activeCategory: AssetCategory | 'favorite' | 'all';
  selectedTimeframe: string;
  signalPhase: SignalPhase;
  signalResult: SignalResult | null;
  settlement: TradeSettlement | null;
  martingaleMultiplier: MartingaleMultiplier;
  loadingStep: number;
  openSection: string | null;
  selectedIndicatorId: string | null;
  selectedArticleId: string | null;
  showVipModal: boolean;
  userProfile: UserProfile | null;
  accessStatus: AccessStatus | null;
  marketStatus: MarketDataStatus | null;
  wsConnected: boolean;
  signalError: string | null;
  /** Last real WS tick for the active signal symbol during countdown. */
  signalCurrentPrice: number | null;

  setLanguage: (lang: Language) => void;
  setSearchQuery: (q: string) => void;
  setAssets: (assets: Asset[]) => void;
  updateAssetPrice: (symbol: string, price: number | null, payout: number, change: number) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  setActiveCategory: (cat: AssetCategory | 'favorite' | 'all') => void;
  setSelectedTimeframe: (tf: string) => void;
  setSignalPhase: (phase: SignalPhase) => void;
  setSignalResult: (result: SignalResult | null) => void;
  /** Atomically start countdown with live price tracking. */
  beginSignalResult: (result: SignalResult) => void;
  setSettlement: (s: TradeSettlement | null) => void;
  setMartingaleMultiplier: (m: MartingaleMultiplier) => void;
  resetSignalSession: () => void;
  setLoadingStep: (step: number) => void;
  toggleSection: (section: string) => void;
  setSelectedIndicatorId: (id: string | null) => void;
  setSelectedArticleId: (id: string | null) => void;
  toggleFavorite: (symbol: string) => void;
  setShowVipModal: (v: boolean) => void;
  setUserProfile: (p: UserProfile | null) => void;
  setAccessStatus: (a: AccessStatus | null) => void;
  setMarketStatus: (m: MarketDataStatus | null) => void;
  setWsConnected: (v: boolean) => void;
  setSignalError: (e: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'uk',
  searchQuery: '',
  assets: [],
  selectedAsset: null,
  activeCategory: 'forex_otc',
  selectedTimeframe: '1m',
  signalPhase: 'idle',
  signalResult: null,
  settlement: null,
  martingaleMultiplier: 1,
  loadingStep: 0,
  openSection: 'analysis',
  selectedIndicatorId: null,
  selectedArticleId: null,
  showVipModal: false,
  userProfile: null,
  accessStatus: null,
  marketStatus: null,
  wsConnected: false,
  signalError: null,
  signalCurrentPrice: null,

  setLanguage: (language) => set({ language }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAssets: (incoming) =>
    set((state) => {
      const prevBySym = new Map(state.assets.map((a) => [a.symbol, a]));
      return {
        assets: incoming.map((a) => {
          const prev = prevBySym.get(a.symbol);
          let price = a.price != null && isPlausiblePrice(a.price) ? a.price : null;
          let lastKnownPrice =
            a.lastKnownPrice != null && isPlausiblePrice(a.lastKnownPrice) ? a.lastKnownPrice : null;
          if (price == null && prev?.price != null) price = prev.price;
          if (lastKnownPrice == null && prev?.lastKnownPrice != null) lastKnownPrice = prev.lastKnownPrice;
          let change = Number.isFinite(a.change) ? a.change : (prev?.change ?? 0);
          const basis = prev?.price ?? prev?.lastKnownPrice;
          if (price != null && basis != null && basis > 0 && price !== basis) {
            change = Math.round(((price - basis) / basis) * 100 * 100) / 100;
          }
          return {
            ...a,
            price,
            lastKnownPrice,
            change,
            favorite: prev?.favorite ?? a.favorite ?? false,
          };
        }),
      };
    }),
  updateAssetPrice: (symbol, price, payout, change) => {
    const pct = Number.isFinite(change) ? Math.round(change * 100) / 100 : 0;
    const pricePatch =
      price != null && isPlausiblePrice(price) ? { price, lastKnownPrice: price } : {};
    const applyPatch = (a: Asset) =>
      a.symbol === symbol ? { ...a, payout, change: pct, ...pricePatch } : a;
    return set({
      assets: get().assets.map(applyPatch),
      selectedAsset:
        get().selectedAsset?.symbol === symbol
          ? { ...get().selectedAsset!, payout, change: pct, ...pricePatch }
          : get().selectedAsset,
      signalCurrentPrice:
        price != null &&
        get().signalResult?.symbol === symbol &&
        (get().signalPhase === 'result' || get().signalPhase === 'loading')
          ? price
          : get().signalCurrentPrice,
    });
  },
  setSelectedAsset: (selectedAsset) =>
    set({
      selectedAsset,
      signalPhase: 'idle',
      signalResult: null,
      settlement: null,
      martingaleMultiplier: 1,
      signalError: null,
    }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
  setSignalPhase: (signalPhase) => set({ signalPhase }),
  setSignalResult: (signalResult) =>
    set({
      signalResult,
      signalCurrentPrice: signalResult?.entryPrice ?? null,
    }),
  beginSignalResult: (signalResult) =>
    set({
      signalResult,
      signalPhase: 'result',
      signalCurrentPrice: signalResult.entryPrice,
      settlement: null,
    }),
  setSettlement: (settlement) => set({ settlement }),
  setMartingaleMultiplier: (martingaleMultiplier) => set({ martingaleMultiplier }),
  resetSignalSession: () =>
    set({
      signalPhase: 'idle',
      signalResult: null,
      settlement: null,
      martingaleMultiplier: 1,
      signalError: null,
      signalCurrentPrice: null,
    }),
  setLoadingStep: (loadingStep) => set({ loadingStep }),
  toggleSection: (section) => set({ openSection: get().openSection === section ? null : section }),
  setSelectedIndicatorId: (selectedIndicatorId) => set({ selectedIndicatorId }),
  setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
  toggleFavorite: (symbol) =>
    set({ assets: get().assets.map((a) => (a.symbol === symbol ? { ...a, favorite: !a.favorite } : a)) }),
  setShowVipModal: (showVipModal) => set({ showVipModal }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setAccessStatus: (accessStatus) => set({ accessStatus }),
  setMarketStatus: (marketStatus) => set({ marketStatus }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setSignalError: (signalError) => set({ signalError }),
}));
