"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var websocket_exports = {};
__export(websocket_exports, {
  MelCloudHomeWebSocket: () => MelCloudHomeWebSocket
});
module.exports = __toCommonJS(websocket_exports);
var import_ws = __toESM(require("ws"));
var import_errors = require("./errors");
var import_realtime = require("./realtime");
const WS_TOKEN_URL = "https://6x2dgdulg7omjsxalnhmo4ynba0dcgwk.lambda-url.eu-west-1.on.aws/";
const WS_URL = "wss://ws.melcloudhome.com/";
const BACKOFF_INITIAL_MS = 1e3;
const BACKOFF_MAX_MS = 6e4;
const HEARTBEAT_MS = 3e4;
class MelCloudHomeWebSocket {
  constructor(adapter, auth, handlers) {
    this.adapter = adapter;
    this.auth = auth;
    this.handlers = handlers;
  }
  stopped = false;
  ws = null;
  reconnectTimer = void 0;
  heartbeatTimer = void 0;
  backoffMs = BACKOFF_INITIAL_MS;
  /** Start the (re)connecting live-update stream. Resolves once the first connection attempt has been made. */
  start() {
    this.stopped = false;
    this.backoffMs = BACKOFF_INITIAL_MS;
    void this.connect();
  }
  /** Stop the stream gracefully and tear down the active socket. */
  close() {
    var _a;
    this.stopped = true;
    if (this.reconnectTimer) {
      this.adapter.clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      this.adapter.clearInterval(this.heartbeatTimer);
    }
    (_a = this.ws) == null ? void 0 : _a.close();
    this.ws = null;
  }
  async fetchHash() {
    const token = await this.auth.getAccessToken();
    const res = await fetch(WS_TOKEN_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new import_errors.MelCloudHomeWebSocketError(`WebSocket token request failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.hash) {
      throw new import_errors.MelCloudHomeWebSocketError("WebSocket token response did not contain a hash");
    }
    return data.hash;
  }
  async connect() {
    var _a, _b;
    if (this.stopped) {
      return;
    }
    try {
      const hash = await this.fetchHash();
      const url = new URL(WS_URL);
      url.searchParams.set("hash", hash);
      const ws = new import_ws.default(url);
      this.ws = ws;
      ws.on("open", () => {
        var _a2, _b2;
        this.backoffMs = BACKOFF_INITIAL_MS;
        (_b2 = (_a2 = this.handlers).onConnected) == null ? void 0 : _b2.call(_a2);
        this.heartbeatTimer = this.adapter.setInterval(() => {
          if (ws.readyState === import_ws.default.OPEN) {
            ws.ping();
          }
        }, HEARTBEAT_MS);
      });
      ws.on("message", (data) => {
        var _a2, _b2;
        try {
          const raw = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
          const payload = JSON.parse(raw.toString("utf8"));
          for (const delta of (0, import_realtime.parseFrame)(payload)) {
            this.handlers.onDelta(delta);
          }
        } catch (err) {
          (_b2 = (_a2 = this.handlers).onError) == null ? void 0 : _b2.call(_a2, err);
        }
      });
      const scheduleReconnect = () => {
        var _a2, _b2;
        if (this.heartbeatTimer) {
          this.adapter.clearInterval(this.heartbeatTimer);
        }
        this.ws = null;
        (_b2 = (_a2 = this.handlers).onDisconnected) == null ? void 0 : _b2.call(_a2);
        if (this.stopped) {
          return;
        }
        this.adapter.setTimeout(() => void this.connect(), this.backoffMs);
        this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
      };
      ws.on("close", scheduleReconnect);
      ws.on("error", (err) => {
        var _a2, _b2;
        (_b2 = (_a2 = this.handlers).onError) == null ? void 0 : _b2.call(_a2, err);
      });
    } catch (err) {
      (_b = (_a = this.handlers).onError) == null ? void 0 : _b.call(_a, err);
      if (!this.stopped) {
        this.reconnectTimer = this.adapter.setTimeout(() => void this.connect(), this.backoffMs);
        this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
      }
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MelCloudHomeWebSocket
});
//# sourceMappingURL=websocket.js.map
