"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var client_exports = {};
__export(client_exports, {
  MelCloudHomeClient: () => MelCloudHomeClient
});
module.exports = __toCommonJS(client_exports);
var import_context = require("./context");
var import_errors = require("./errors");
const API_BASE = "https://mobile.bff.melcloudhome.com";
class MelCloudHomeClient {
  constructor(auth, apiBase = API_BASE, requestTimeoutMs = 1e4, logger) {
    this.auth = auth;
    this.apiBase = apiBase;
    this.requestTimeoutMs = requestTimeoutMs;
    this.logger = logger;
  }
  async request(uri, options = {}) {
    var _a, _b, _c, _d;
    const method = (_a = options.method) != null ? _a : "GET";
    let token;
    try {
      token = await this.auth.getAccessToken();
    } catch (err) {
      (_b = this.logger) == null ? void 0 : _b.debug(`[client] Failed to obtain access token for ${method} ${uri}: ${err.message}`);
      throw err;
    }
    const url = new URL(uri.replace(/^\//, ""), `${this.apiBase}/`);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "iobroker.melcloudhome"
        },
        body: options.json ? JSON.stringify(options.json) : void 0,
        signal: controller.signal
      });
    } catch (err) {
      (_c = this.logger) == null ? void 0 : _c.debug(`[client] ${method} ${url.toString()} failed before a response was received: ${err.message}`);
      if (err.name === "AbortError") {
        throw new import_errors.MelCloudHomeConnectionError(`Request timed out: ${uri}`);
      }
      throw new import_errors.MelCloudHomeConnectionError(`Connection error: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
    (_d = this.logger) == null ? void 0 : _d.debug(`[client] ${method} ${url.toString()} -> HTTP ${res.status}`);
    if (res.status === 401) {
      throw new import_errors.MelCloudHomeAuthenticationError("Authentication failed");
    }
    if (res.status === 404) {
      throw new import_errors.MelCloudHomeNotFoundError(`Resource not found: ${uri}`);
    }
    if (!res.ok) {
      const body = await res.text().then((t) => t.slice(0, 300).replace(/\s+/g, " ")).catch(() => "<unreadable body>");
      throw new import_errors.MelCloudHomeConnectionError(`Request failed: HTTP ${res.status} for ${uri} - ${body}`);
    }
    if (res.status === 204 || res.status === 304) {
      return {};
    }
    const text = await res.text();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new import_errors.MelCloudHomeConnectionError(
        `Response for ${uri} was not valid JSON: ${err.message} - body starts with: ${text.slice(0, 200).replace(/\s+/g, " ")}`
      );
    }
  }
  /** Fetch the full user context (all buildings and devices). */
  async getContext() {
    return (0, import_context.parseUserContext)(await this.request("/context"));
  }
  /**
   * Control an Air-to-Air unit.
   *
   * @param unitId
   * @param control
   */
  async controlAtaUnit(unitId, control) {
    var _a, _b, _c, _d, _e, _f, _g;
    await this.request(`/monitor/ataunit/${unitId}`, {
      method: "PUT",
      json: {
        power: (_a = control.power) != null ? _a : null,
        operationMode: (_b = control.operationMode) != null ? _b : null,
        setTemperature: (_c = control.setTemperature) != null ? _c : null,
        setFanSpeed: (_d = control.setFanSpeed) != null ? _d : null,
        vaneVerticalDirection: (_e = control.vaneVerticalDirection) != null ? _e : null,
        vaneHorizontalDirection: (_f = control.vaneHorizontalDirection) != null ? _f : null,
        temperatureIncrementOverride: null,
        inStandbyMode: (_g = control.inStandbyMode) != null ? _g : null
      }
    });
  }
  /**
   * Control an Air-to-Water unit.
   *
   * @param unitId
   * @param control
   */
  async controlAtwUnit(unitId, control) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    await this.request(`/monitor/atwunit/${unitId}`, {
      method: "PUT",
      json: {
        power: (_a = control.power) != null ? _a : null,
        setTemperatureZone1: (_b = control.setTemperatureZone1) != null ? _b : null,
        setTemperatureZone2: (_c = control.setTemperatureZone2) != null ? _c : null,
        operationModeZone1: (_d = control.operationModeZone1) != null ? _d : null,
        operationModeZone2: (_e = control.operationModeZone2) != null ? _e : null,
        setTankWaterTemperature: (_f = control.setTankWaterTemperature) != null ? _f : null,
        forcedHotWaterMode: (_g = control.forcedHotWaterMode) != null ? _g : null,
        inStandbyMode: (_h = control.inStandbyMode) != null ? _h : null,
        setHeatFlowTemperatureZone1: (_i = control.setHeatFlowTemperatureZone1) != null ? _i : null,
        setCoolFlowTemperatureZone1: (_j = control.setCoolFlowTemperatureZone1) != null ? _j : null,
        setHeatFlowTemperatureZone2: (_k = control.setHeatFlowTemperatureZone2) != null ? _k : null,
        setCoolFlowTemperatureZone2: (_l = control.setCoolFlowTemperatureZone2) != null ? _l : null
      }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MelCloudHomeClient
});
//# sourceMappingURL=client.js.map
