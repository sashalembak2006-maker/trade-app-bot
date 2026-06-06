import type { CollectorStatus } from '@trade-app/shared';
import { DEFAULT_COLLECTOR_STATUS } from '@trade-app/shared';

const HEARTBEAT_STALE_MS = 15_000;

let status: CollectorStatus = { ...DEFAULT_COLLECTOR_STATUS };

export function getCollectorStatus(): CollectorStatus {
  const age = status.lastHeartbeat ? Date.now() - status.lastHeartbeat : null;
  return {
    ...status,
    online: age != null && age <= HEARTBEAT_STALE_MS,
  };
}

export function updateCollectorHeartbeat(patch: Partial<CollectorStatus>): CollectorStatus {
  status = {
    ...status,
    ...patch,
    lastHeartbeat: Date.now(),
    restartRequested: patch.restartRequested ?? status.restartRequested,
  };
  return getCollectorStatus();
}

export function requestCollectorRestart(): CollectorStatus {
  status.restartRequested = true;
  status.message = 'Restart requested by admin';
  return getCollectorStatus();
}

export function acknowledgeCollectorRestart(): void {
  status.restartRequested = false;
}

export function isCollectorRestartRequested(): boolean {
  return status.restartRequested;
}
