"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_auth = require("./lib/melcloud/auth");
var import_client = require("./lib/melcloud/client");
var import_state_specs = require("./lib/melcloud/state-specs");
var import_websocket = require("./lib/melcloud/websocket");
const SESSION_STATE_ID = "info.session";
const MIN_POLL_INTERVAL_SECONDS = 15;
class Melcloudhome extends utils.Adapter {
  auth;
  client;
  socket;
  pollTimer;
  stopped = false;
  /** Real MELCloud Home unit id -> where it lives in the object tree, used to apply realtime deltas. */
  realIdToLocation = /* @__PURE__ */ new Map();
  /** Object tree device path -> real MELCloud Home unit id, used to route control commands. */
  pathToRealId = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    super({
      ...options,
      name: "melcloudhome"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    var _a;
    this.stopped = false;
    await this.setStateAsync("info.connection", { val: false, ack: true });
    const username = (_a = this.config.username) == null ? void 0 : _a.trim();
    const password = this.config.password;
    if (!username || !password) {
      this.log.error("Please configure your MELCloud Home username and password in the adapter settings.");
      return;
    }
    this.log.debug(
      `Starting with username "${username}", pollInterval=${this.config.pollInterval}s, useWebSocket=${Boolean(this.config.useWebSocket)}`
    );
    await this.extendObjectAsync(SESSION_STATE_ID, {
      type: "state",
      common: {
        name: "Internal OAuth session (do not edit)",
        type: "string",
        role: "json",
        read: true,
        write: false,
        expert: true
      },
      native: {}
    });
    this.auth = new import_auth.MelCloudHomeAuth(username, password, this.log);
    const savedSession = await this.getStateAsync(SESSION_STATE_ID);
    if ((savedSession == null ? void 0 : savedSession.val) && typeof savedSession.val === "string") {
      try {
        this.auth.importSession(JSON.parse(savedSession.val));
        this.log.debug("Restored persisted MELCloud Home session");
      } catch (err) {
        this.log.debug(
          `Could not parse persisted MELCloud Home session (${err.message}); a fresh login will be performed.`
        );
      }
    }
    this.client = new import_client.MelCloudHomeClient(this, this.auth, void 0, void 0, this.log);
    if (this.config.useWebSocket) {
      this.socket = new import_websocket.MelCloudHomeWebSocket(this, this.auth, {
        onDelta: (delta) => void this.applyDelta(delta),
        onError: (err) => this.log.debug(`MELCloud Home WebSocket error: ${err.message}`),
        onConnected: () => this.log.debug("MELCloud Home WebSocket connected"),
        onDisconnected: () => this.log.debug("MELCloud Home WebSocket disconnected")
      });
      this.socket.start();
    }
    void this.pollLoop();
  }
  pollIntervalMs() {
    const seconds = Math.max(Number(this.config.pollInterval) || 60, MIN_POLL_INTERVAL_SECONDS);
    return seconds * 1e3;
  }
  async pollLoop() {
    if (this.stopped) {
      return;
    }
    try {
      await this.refreshContext();
      await this.setStateChangedAsync("info.connection", { val: true, ack: true });
    } catch (err) {
      const error = err;
      this.log.error(`Failed to refresh MELCloud Home data: ${error.message || String(err)}`);
      if (error == null ? void 0 : error.stack) {
        this.log.debug(error.stack);
      }
      await this.setStateChangedAsync("info.connection", { val: false, ack: true });
    }
    if (!this.stopped) {
      this.pollTimer = this.setTimeout(() => void this.pollLoop(), this.pollIntervalMs());
    }
  }
  async refreshContext() {
    if (!this.client || !this.auth) {
      return;
    }
    this.log.debug("Fetching MELCloud Home context (/context)");
    const context = await this.client.getContext();
    const ataCount = context.buildings.reduce((sum, b) => sum + b.airToAirUnits.length, 0);
    const atwCount = context.buildings.reduce((sum, b) => sum + b.airToWaterUnits.length, 0);
    this.log.debug(
      `Fetched context: ${context.buildings.length} building(s), ${ataCount} ATA unit(s), ${atwCount} ATW unit(s)`
    );
    await this.persistSession();
    for (const building of context.buildings) {
      const buildingId = this.sanitize(building.id);
      await this.ensureFolder(buildingId, building.name || building.id);
      for (const unit of building.airToAirUnits) {
        await this.syncAtaUnit(buildingId, building, unit);
      }
      for (const unit of building.airToWaterUnits) {
        await this.syncAtwUnit(buildingId, building, unit);
      }
    }
  }
  async persistSession() {
    if (!this.auth) {
      return;
    }
    await this.setStateAsync(SESSION_STATE_ID, { val: JSON.stringify(this.auth.exportSession()), ack: true });
  }
  async syncAtaUnit(buildingId, _building, unit) {
    const groupId = `${buildingId}.ata`;
    const devicePath = `${groupId}.${this.sanitize(unit.id)}`;
    await this.ensureFolder(groupId, "Air-to-Air units");
    await this.ensureDevice(devicePath, unit.name || unit.id);
    this.realIdToLocation.set(unit.id, { path: devicePath, kind: "ata" });
    this.pathToRealId.set(devicePath, unit.id);
    await this.syncStateSpecs(devicePath, import_state_specs.ATA_STATE_SPECS, unit);
    await this.syncPlainStates(
      `${devicePath}.capabilities`,
      "Capabilities",
      unit.capabilities
    );
    await this.syncPlainStates(
      `${devicePath}.frostProtection`,
      "Frost protection",
      unit.frostProtection
    );
    await this.syncPlainStates(
      `${devicePath}.overheatProtection`,
      "Overheat protection",
      unit.overheatProtection
    );
    await this.syncPlainStates(
      `${devicePath}.holidayMode`,
      "Holiday mode",
      unit.holidayMode
    );
  }
  async syncAtwUnit(buildingId, _building, unit) {
    const groupId = `${buildingId}.atw`;
    const devicePath = `${groupId}.${this.sanitize(unit.id)}`;
    await this.ensureFolder(groupId, "Air-to-Water units");
    await this.ensureDevice(devicePath, unit.name || unit.id);
    this.realIdToLocation.set(unit.id, { path: devicePath, kind: "atw" });
    this.pathToRealId.set(devicePath, unit.id);
    await this.syncStateSpecs(devicePath, import_state_specs.ATW_STATE_SPECS, unit);
    await this.syncPlainStates(
      `${devicePath}.capabilities`,
      "Capabilities",
      unit.capabilities
    );
    await this.syncPlainStates(
      `${devicePath}.frostProtection`,
      "Frost protection",
      unit.frostProtection
    );
    await this.syncPlainStates(
      `${devicePath}.overheatProtection`,
      "Overheat protection",
      unit.overheatProtection
    );
    await this.syncPlainStates(
      `${devicePath}.holidayMode`,
      "Holiday mode",
      unit.holidayMode
    );
  }
  async syncStateSpecs(devicePath, specs, data) {
    for (const spec of specs) {
      const id = `${devicePath}.${spec.id}`;
      await this.ensureState(id, spec);
      const value = data[spec.id];
      if (value !== null && value !== void 0) {
        await this.setStateChangedAsync(id, { val: value, ack: true });
      }
    }
  }
  async syncPlainStates(basePath, channelName, data) {
    if (!data) {
      return;
    }
    await this.ensureChannel(basePath, channelName);
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === void 0) {
        continue;
      }
      const id = `${basePath}.${this.sanitize(key)}`;
      const type = typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string";
      await this.extendObjectAsync(id, {
        type: "state",
        common: { name: key, type, role: type === "boolean" ? "indicator" : "value", read: true, write: false },
        native: {}
      });
      await this.setStateChangedAsync(id, { val: value, ack: true });
    }
  }
  async ensureFolder(id, name) {
    await this.extendObjectAsync(id, { type: "folder", common: { name }, native: {} });
  }
  async ensureChannel(id, name) {
    await this.extendObjectAsync(id, { type: "channel", common: { name }, native: {} });
  }
  async ensureDevice(id, name) {
    await this.extendObjectAsync(id, { type: "device", common: { name }, native: {} });
  }
  async ensureState(id, spec) {
    await this.extendObjectAsync(id, {
      type: "state",
      common: {
        name: spec.name,
        type: spec.type,
        role: spec.role,
        read: true,
        write: spec.write,
        ...spec.unit ? { unit: spec.unit } : {},
        ...spec.states ? { states: spec.states } : {}
      },
      native: {}
    });
    if (spec.write) {
      this.subscribeStates(id);
    }
  }
  sanitize(id) {
    return id.replace(/[^A-Za-z0-9_-]/g, "_");
  }
  async applyDelta(delta) {
    const location = this.realIdToLocation.get(delta.unitId);
    if (!location) {
      return;
    }
    const specs = location.kind === "ata" ? import_state_specs.ATA_STATE_SPECS : import_state_specs.ATW_STATE_SPECS;
    const validIds = new Set(specs.map((s) => s.id));
    try {
      for (const [name, value] of Object.entries(delta.changes)) {
        if (value === null || value === void 0) {
          continue;
        }
        const propId = name.charAt(0).toLowerCase() + name.slice(1);
        if (!validIds.has(propId)) {
          continue;
        }
        await this.setStateChangedAsync(`${location.path}.${propId}`, {
          val: value,
          ack: true
        });
      }
    } catch (err) {
      this.log.debug(`Failed to apply realtime update for ${delta.unitId}: ${err.message}`);
    }
  }
  ataControlFor(prop, value) {
    switch (prop) {
      case "power":
        return { power: Boolean(value) };
      case "operationMode":
        return { operationMode: String(value) };
      case "setTemperature":
        return { setTemperature: Number(value) };
      case "setFanSpeed":
        return { setFanSpeed: String(value) };
      case "vaneVerticalDirection":
        return { vaneVerticalDirection: String(value) };
      case "vaneHorizontalDirection":
        return { vaneHorizontalDirection: String(value) };
      case "inStandbyMode":
        return { inStandbyMode: Boolean(value) };
      default:
        return null;
    }
  }
  atwControlFor(prop, value) {
    switch (prop) {
      case "power":
        return { power: Boolean(value) };
      case "operationModeZone1":
        return { operationModeZone1: String(value) };
      case "operationModeZone2":
        return { operationModeZone2: String(value) };
      case "setTemperatureZone1":
        return { setTemperatureZone1: Number(value) };
      case "setTemperatureZone2":
        return { setTemperatureZone2: Number(value) };
      case "setTankWaterTemperature":
        return { setTankWaterTemperature: Number(value) };
      case "forcedHotWaterMode":
        return { forcedHotWaterMode: Boolean(value) };
      case "inStandbyMode":
        return { inStandbyMode: Boolean(value) };
      case "setHeatFlowTemperatureZone1":
        return { setHeatFlowTemperatureZone1: Number(value) };
      case "setCoolFlowTemperatureZone1":
        return { setCoolFlowTemperatureZone1: Number(value) };
      case "setHeatFlowTemperatureZone2":
        return { setHeatFlowTemperatureZone2: Number(value) };
      case "setCoolFlowTemperatureZone2":
        return { setCoolFlowTemperatureZone2: Number(value) };
      default:
        return null;
    }
  }
  /**
   * Is called if a subscribed state changes.
   *
   * @param id - State ID
   * @param state - State object
   */
  onStateChange(id, state) {
    if (!state || state.ack) {
      return;
    }
    void this.handleStateChange(id, state);
  }
  async handleStateChange(id, state) {
    var _a;
    if (!this.client) {
      return;
    }
    const prefix = `${this.namespace}.`;
    const relative = id.startsWith(prefix) ? id.slice(prefix.length) : id;
    const parts = relative.split(".");
    if (parts.length < 4) {
      return;
    }
    const [buildingId, kind, unitIdPart, ...propParts] = parts;
    const devicePath = `${buildingId}.${kind}.${unitIdPart}`;
    const prop = propParts.join(".");
    const unitId = (_a = this.pathToRealId.get(devicePath)) != null ? _a : unitIdPart;
    try {
      if (kind === "ata") {
        const control = this.ataControlFor(prop, state.val);
        if (!control) {
          return;
        }
        await this.client.controlAtaUnit(unitId, control);
      } else if (kind === "atw") {
        const control = this.atwControlFor(prop, state.val);
        if (!control) {
          return;
        }
        await this.client.controlAtwUnit(unitId, control);
      } else {
        return;
      }
      await this.setStateAsync(id, { val: state.val, ack: true });
    } catch (err) {
      this.log.error(`Failed to control ${id}: ${err.message}`);
    }
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    var _a;
    try {
      this.stopped = true;
      if (this.pollTimer) {
        this.clearTimeout(this.pollTimer);
      }
      (_a = this.socket) == null ? void 0 : _a.close();
      callback();
    } catch (error) {
      this.log.error(`Error during unloading: ${error.message}`);
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Melcloudhome(options);
} else {
  (() => new Melcloudhome())();
}
//# sourceMappingURL=main.js.map
