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
var state_specs_exports = {};
__export(state_specs_exports, {
  ATA_STATE_SPECS: () => ATA_STATE_SPECS,
  ATW_STATE_SPECS: () => ATW_STATE_SPECS,
  ATW_WRITE_ONLY_PROPS: () => ATW_WRITE_ONLY_PROPS
});
module.exports = __toCommonJS(state_specs_exports);
var import_types = require("./types");
function enumStates(values) {
  return Object.fromEntries(values.map((v) => [v, v]));
}
const ATA_STATE_SPECS = [
  { id: "power", name: "Power on/off", type: "boolean", role: "switch.power", write: true },
  {
    id: "operationMode",
    name: "Operation mode",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATA_OPERATION_MODES)
  },
  {
    id: "setTemperature",
    name: "Target temperature",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "roomTemperature",
    name: "Room temperature",
    type: "number",
    role: "value.temperature",
    write: false,
    unit: "\xB0C"
  },
  {
    id: "setFanSpeed",
    name: "Fan speed (set)",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATA_FAN_SPEEDS)
  },
  {
    id: "actualFanSpeed",
    name: "Fan speed (actual)",
    type: "string",
    role: "state",
    write: false,
    states: enumStates(import_types.ATA_FAN_SPEEDS)
  },
  {
    id: "vaneVerticalDirection",
    name: "Vane vertical direction",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATA_VANE_VERTICAL)
  },
  {
    id: "vaneHorizontalDirection",
    name: "Vane horizontal direction",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATA_VANE_HORIZONTAL)
  },
  { id: "inStandbyMode", name: "In standby mode", type: "boolean", role: "switch", write: true },
  { id: "isInError", name: "Is in error", type: "boolean", role: "indicator.error", write: false },
  { id: "rssi", name: "Signal strength (RSSI)", type: "number", role: "value.rssi", write: false }
];
const ATW_STATE_SPECS = [
  { id: "power", name: "Power on/off", type: "boolean", role: "switch.power", write: true },
  { id: "inStandbyMode", name: "In standby mode", type: "boolean", role: "switch", write: true },
  {
    id: "operationMode",
    name: "Operation mode",
    type: "string",
    role: "state",
    write: false,
    states: enumStates(import_types.ATW_OPERATION_MODES)
  },
  {
    id: "operationModeZone1",
    name: "Zone 1 mode",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATW_ZONE_MODES)
  },
  {
    id: "setTemperatureZone1",
    name: "Zone 1 target temperature",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "roomTemperatureZone1",
    name: "Zone 1 room temperature",
    type: "number",
    role: "value.temperature",
    write: false,
    unit: "\xB0C"
  },
  { id: "hasZone2", name: "Has zone 2", type: "boolean", role: "indicator", write: false },
  {
    id: "operationModeZone2",
    name: "Zone 2 mode",
    type: "string",
    role: "state",
    write: true,
    states: enumStates(import_types.ATW_ZONE_MODES)
  },
  {
    id: "setTemperatureZone2",
    name: "Zone 2 target temperature",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "roomTemperatureZone2",
    name: "Zone 2 room temperature",
    type: "number",
    role: "value.temperature",
    write: false,
    unit: "\xB0C"
  },
  {
    id: "setTankWaterTemperature",
    name: "Tank target temperature",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "tankWaterTemperature",
    name: "Tank water temperature",
    type: "number",
    role: "value.temperature",
    write: false,
    unit: "\xB0C"
  },
  { id: "forcedHotWaterMode", name: "Forced hot water mode", type: "boolean", role: "switch", write: true },
  { id: "isInError", name: "Is in error", type: "boolean", role: "indicator.error", write: false },
  { id: "rssi", name: "Signal strength (RSSI)", type: "number", role: "value.rssi", write: false },
  // Write-only advanced flow-temperature overrides: the API accepts these but never reports a current value.
  {
    id: "setHeatFlowTemperatureZone1",
    name: "Zone 1 heat flow temperature override",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "setCoolFlowTemperatureZone1",
    name: "Zone 1 cool flow temperature override",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "setHeatFlowTemperatureZone2",
    name: "Zone 2 heat flow temperature override",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  },
  {
    id: "setCoolFlowTemperatureZone2",
    name: "Zone 2 cool flow temperature override",
    type: "number",
    role: "level.temperature",
    write: true,
    unit: "\xB0C"
  }
];
const ATW_WRITE_ONLY_PROPS = /* @__PURE__ */ new Set([
  "setHeatFlowTemperatureZone1",
  "setCoolFlowTemperatureZone1",
  "setHeatFlowTemperatureZone2",
  "setCoolFlowTemperatureZone2"
]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ATA_STATE_SPECS,
  ATW_STATE_SPECS,
  ATW_WRITE_ONLY_PROPS
});
//# sourceMappingURL=state-specs.js.map
