/* eslint-disable */
const TICK_MS = 200;

setInterval(() => BridgeHttp.runRelayTick('relay'), TICK_MS);
BridgeHttp.runRelayTick('relay');
