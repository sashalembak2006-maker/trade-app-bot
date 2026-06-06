export interface CollectorStatus {
  /** Whether the VPS collector sent a heartbeat recently. */
  online: boolean;
  /** ms since last heartbeat; null if never seen. */
  lastHeartbeat: number | null;
  /** Pocket WebSocket connected on the collector. */
  wsConnected: boolean;
  /** Assets the collector last pushed. */
  assetCount: number;
  /** Assets with a live price in the last push. */
  pricedCount: number;
  /** Active symbol receiving updateStream ticks (if any). */
  activeSymbol: string | null;
  /** Human-readable status / last error. */
  message: string;
  /** Admin requested restart; collector should exit and let systemd/PM2 restart it. */
  restartRequested: boolean;
  /** Collector version string. */
  version: string;
}

export const DEFAULT_COLLECTOR_STATUS: CollectorStatus = {
  online: false,
  lastHeartbeat: null,
  wsConnected: false,
  assetCount: 0,
  pricedCount: 0,
  activeSymbol: null,
  message: 'Collector not connected',
  restartRequested: false,
  version: '0.0.0',
};
