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
var context_exports = {};
__export(context_exports, {
  parseAtaUnit: () => parseAtaUnit,
  parseAtwUnit: () => parseAtwUnit,
  parseUserContext: () => parseUserContext
});
module.exports = __toCommonJS(context_exports);
var import_decode = require("./decode");
function extractSettings(raw) {
  if (!Array.isArray(raw)) {
    return {};
  }
  const settings = {};
  for (const entry of raw) {
    if (entry && typeof entry === "object" && "name" in entry) {
      settings[String(entry.name)] = entry.value;
    }
  }
  return settings;
}
function parseHolidayMode(data) {
  var _a, _b, _c, _d;
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data;
  return {
    active: (_a = (0, import_decode.coerceBool)(d.active)) != null ? _a : false,
    enabled: (_b = (0, import_decode.coerceBool)(d.enabled)) != null ? _b : false,
    startDate: (_c = d.startDate) != null ? _c : null,
    endDate: (_d = d.endDate) != null ? _d : null
  };
}
function parseFrostProtection(data) {
  var _a, _b, _c, _d;
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data;
  return {
    active: (_a = (0, import_decode.coerceBool)(d.active)) != null ? _a : false,
    enabled: (_b = (0, import_decode.coerceBool)(d.enabled)) != null ? _b : false,
    min: (_c = (0, import_decode.coerceFloat)(d.min)) != null ? _c : 0,
    max: (_d = (0, import_decode.coerceFloat)(d.max)) != null ? _d : 0
  };
}
function parseOverheatProtection(data) {
  var _a, _b, _c, _d;
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data;
  return {
    active: (_a = (0, import_decode.coerceBool)(d.active)) != null ? _a : false,
    enabled: (_b = (0, import_decode.coerceBool)(d.enabled)) != null ? _b : false,
    min: (_c = (0, import_decode.coerceFloat)(d.min)) != null ? _c : 0,
    max: (_d = (0, import_decode.coerceFloat)(d.max)) != null ? _d : 0
  };
}
function parseAtaCapabilities(data) {
  var _a, _b, _c, _d;
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data;
  return {
    numberOfFanSpeeds: (0, import_decode.coerceInt)(d.numberOfFanSpeeds),
    minTempHeat: (0, import_decode.coerceFloat)(d.minTempHeat),
    maxTempHeat: (0, import_decode.coerceFloat)(d.maxTempHeat),
    minTempCool: (0, import_decode.coerceFloat)((_a = d.minTempCool) != null ? _a : d.minTempCoolDry),
    maxTempCool: (0, import_decode.coerceFloat)((_b = d.maxTempCool) != null ? _b : d.maxTempCoolDry),
    minTempAutomatic: (0, import_decode.coerceFloat)(d.minTempAutomatic),
    maxTempAutomatic: (0, import_decode.coerceFloat)(d.maxTempAutomatic),
    hasHalfDegreeIncrements: (0, import_decode.coerceBool)(d.hasHalfDegreeIncrements),
    hasCoolOperationMode: (0, import_decode.coerceBool)(d.hasCoolOperationMode),
    hasDryOperationMode: (0, import_decode.coerceBool)(d.hasDryOperationMode),
    hasFanOperationMode: (0, import_decode.coerceBool)(d.hasFanOperationMode),
    hasAutoOperationMode: (0, import_decode.coerceBool)(d.hasAutoOperationMode),
    hasOutdoorTemperatureSensor: (0, import_decode.coerceBool)(d.hasOutdoorTemperatureSensor),
    hasEnergyConsumedMeter: (0, import_decode.coerceBool)(d.hasEnergyConsumedMeter),
    hasVaneVertical: (0, import_decode.coerceBool)((_c = d.hasVaneVertical) != null ? _c : d.hasAirDirection),
    hasVaneHorizontal: (0, import_decode.coerceBool)(d.hasVaneHorizontal),
    hasStandbyMode: (0, import_decode.coerceBool)((_d = d.hasStandbyMode) != null ? _d : d.hasStandby)
  };
}
function parseAtwCapabilities(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data;
  return {
    hasHotWater: (0, import_decode.coerceBool)(d.hasHotWater),
    hasZone2: (0, import_decode.coerceBool)(d.hasZone2),
    hasHalfDegrees: (0, import_decode.coerceBool)(d.hasHalfDegrees),
    hasCoolingMode: (0, import_decode.coerceBool)(d.hasCoolingMode),
    minSetTankTemperature: (0, import_decode.coerceFloat)(d.minSetTankTemperature),
    maxSetTankTemperature: (0, import_decode.coerceFloat)(d.maxSetTankTemperature),
    minSetTemperatureZone1: (0, import_decode.coerceFloat)(d.minSetTemperatureZone1),
    maxSetTemperatureZone1: (0, import_decode.coerceFloat)(d.maxSetTemperatureZone1),
    minSetTemperatureZone2: (0, import_decode.coerceFloat)(d.minSetTemperatureZone2),
    maxSetTemperatureZone2: (0, import_decode.coerceFloat)(d.maxSetTemperatureZone2),
    hasStandbyMode: (0, import_decode.coerceBool)(d.hasStandbyMode),
    hasEnergyConsumedMeter: (0, import_decode.coerceBool)(d.hasEnergyConsumedMeter)
  };
}
function parseAtaUnit(data) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const settings = extractSettings(data.settings);
  for (const key of [
    "Power",
    "InStandbyMode",
    "IsInError",
    "OperationMode",
    "SetFanSpeed",
    "ActualFanSpeed",
    "VaneVerticalDirection",
    "VaneHorizontalDirection"
  ]) {
    if (key in settings) {
      settings[key] = (0, import_decode.decodeAtaSetting)(key, settings[key]);
    }
  }
  return {
    id: String(data.id),
    name: (_a = data.givenDisplayName) != null ? _a : "",
    power: (_b = settings.Power) != null ? _b : null,
    operationMode: (_c = settings.OperationMode) != null ? _c : null,
    setTemperature: (0, import_decode.coerceFloat)(settings.SetTemperature),
    roomTemperature: (0, import_decode.coerceFloat)(settings.RoomTemperature),
    setFanSpeed: (_d = settings.SetFanSpeed) != null ? _d : null,
    actualFanSpeed: (_e = settings.ActualFanSpeed) != null ? _e : null,
    vaneVerticalDirection: (_f = settings.VaneVerticalDirection) != null ? _f : null,
    vaneHorizontalDirection: (_g = settings.VaneHorizontalDirection) != null ? _g : null,
    inStandbyMode: (_h = settings.InStandbyMode) != null ? _h : null,
    isInError: (_i = settings.IsInError) != null ? _i : null,
    rssi: (0, import_decode.coerceInt)(data.rssi),
    settings,
    capabilities: parseAtaCapabilities(data.capabilities),
    frostProtection: parseFrostProtection(data.frostProtection),
    overheatProtection: parseOverheatProtection(data.overheatProtection),
    holidayMode: parseHolidayMode(data.holidayMode)
  };
}
function parseAtwUnit(data) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const settings = extractSettings(data.settings);
  for (const key of [
    "Power",
    "InStandbyMode",
    "HasZone2",
    "ForcedHotWaterMode",
    "IsInError",
    "OperationMode",
    "OperationModeZone1",
    "OperationModeZone2"
  ]) {
    if (key in settings) {
      settings[key] = (0, import_decode.decodeAtwSetting)(key, settings[key]);
    }
  }
  return {
    id: String(data.id),
    name: (_a = data.givenDisplayName) != null ? _a : "",
    power: (_b = settings.Power) != null ? _b : null,
    inStandbyMode: (_c = settings.InStandbyMode) != null ? _c : null,
    operationMode: (_d = settings.OperationMode) != null ? _d : null,
    operationModeZone1: (_e = settings.OperationModeZone1) != null ? _e : null,
    setTemperatureZone1: (0, import_decode.coerceFloat)(settings.SetTemperatureZone1),
    roomTemperatureZone1: (0, import_decode.coerceFloat)(settings.RoomTemperatureZone1),
    hasZone2: (_f = settings.HasZone2) != null ? _f : null,
    operationModeZone2: (_g = settings.OperationModeZone2) != null ? _g : null,
    setTemperatureZone2: (0, import_decode.coerceFloat)(settings.SetTemperatureZone2),
    roomTemperatureZone2: (0, import_decode.coerceFloat)(settings.RoomTemperatureZone2),
    setTankWaterTemperature: (0, import_decode.coerceFloat)(settings.SetTankWaterTemperature),
    tankWaterTemperature: (0, import_decode.coerceFloat)(settings.TankWaterTemperature),
    forcedHotWaterMode: (_h = settings.ForcedHotWaterMode) != null ? _h : null,
    isInError: (_i = settings.IsInError) != null ? _i : null,
    rssi: (0, import_decode.coerceInt)(data.rssi),
    settings,
    capabilities: parseAtwCapabilities(data.capabilities),
    frostProtection: parseFrostProtection(data.frostProtection),
    overheatProtection: parseOverheatProtection(data.overheatProtection),
    holidayMode: parseHolidayMode(data.holidayMode)
  };
}
function parseBuilding(data) {
  var _a;
  return {
    id: String(data.id),
    name: (_a = data.name) != null ? _a : "",
    airToAirUnits: Array.isArray(data.airToAirUnits) ? data.airToAirUnits.map(parseAtaUnit) : [],
    airToWaterUnits: Array.isArray(data.airToWaterUnits) ? data.airToWaterUnits.map(parseAtwUnit) : []
  };
}
function parseUserContext(data) {
  var _a, _b, _c, _d;
  const buildings = [
    ...Array.isArray(data.buildings) ? data.buildings : [],
    ...Array.isArray(data.guestBuildings) ? data.guestBuildings : []
  ];
  return {
    id: (_a = data.id) != null ? _a : null,
    firstName: (_b = data.firstname) != null ? _b : null,
    lastName: (_c = data.lastname) != null ? _c : null,
    email: (_d = data.email) != null ? _d : null,
    buildings: buildings.map(parseBuilding)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseAtaUnit,
  parseAtwUnit,
  parseUserContext
});
//# sourceMappingURL=context.js.map
