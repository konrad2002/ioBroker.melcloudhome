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
var decode_exports = {};
__export(decode_exports, {
  coerceBool: () => coerceBool,
  coerceFloat: () => coerceFloat,
  coerceInt: () => coerceInt,
  decodeAtaSetting: () => decodeAtaSetting,
  decodeAtwSetting: () => decodeAtwSetting
});
module.exports = __toCommonJS(decode_exports);
var import_stringify = require("./stringify");
const ATA_OPERATION_MODE_BY_CODE = {
  1: "Heat",
  2: "Dry",
  3: "Cool",
  4: "Fan",
  5: "Automatic"
};
const ATA_FAN_SPEED_BY_CODE = {
  0: "Auto",
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five"
};
const ATA_VANE_VERTICAL_BY_CODE = {
  0: "Auto",
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Swing"
};
const ATA_VANE_HORIZONTAL_BY_CODE = {
  0: "Auto",
  1: "Left",
  2: "LeftCentre",
  3: "Centre",
  4: "RightCentre",
  5: "Right",
  7: "Swing"
};
const ATA_BOOL_SETTINGS = /* @__PURE__ */ new Set(["Power", "InStandbyMode", "IsInError"]);
const ATA_FLOAT_SETTINGS = /* @__PURE__ */ new Set(["SetTemperature", "RoomTemperature"]);
const ATA_ENUM_SETTINGS = {
  OperationMode: ATA_OPERATION_MODE_BY_CODE,
  SetFanSpeed: ATA_FAN_SPEED_BY_CODE,
  ActualFanSpeed: ATA_FAN_SPEED_BY_CODE,
  VaneVerticalDirection: ATA_VANE_VERTICAL_BY_CODE,
  VaneHorizontalDirection: ATA_VANE_HORIZONTAL_BY_CODE
};
const ATW_BOOL_SETTINGS = /* @__PURE__ */ new Set(["Power", "InStandbyMode", "HasZone2", "ForcedHotWaterMode", "IsInError"]);
const ATW_FLOAT_SETTINGS = /* @__PURE__ */ new Set([
  "SetTemperatureZone1",
  "RoomTemperatureZone1",
  "SetTemperatureZone2",
  "RoomTemperatureZone2",
  "SetTankWaterTemperature",
  "TankWaterTemperature"
]);
const ATW_ENUM_SETTINGS = /* @__PURE__ */ new Set(["OperationMode", "OperationModeZone1", "OperationModeZone2"]);
const ATW_ENUM_VALUES = /* @__PURE__ */ new Set([
  "Stop",
  "HotWater",
  "HeatZones",
  "Cool",
  "HeatRoomTemperature",
  "HeatFlowTemperature",
  "HeatCurve",
  "CoolRoomTemperature",
  "CoolFlowTemperature"
]);
function coerceBool(value) {
  if (value === null || value === void 0) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return (0, import_stringify.stringify)(value).trim().toLowerCase() === "true";
}
function coerceFloat(value) {
  if (value === null || value === void 0) {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}
function coerceInt(value) {
  if (value === null || value === void 0) {
    return null;
  }
  const num = Number.parseInt((0, import_stringify.stringify)(value), 10);
  return Number.isNaN(num) ? null : num;
}
function decodeEnumValue(codeMap, value) {
  var _a, _b;
  if (value === null || value === void 0 || typeof value === "boolean") {
    return null;
  }
  if (typeof value === "number") {
    return (_a = codeMap[value]) != null ? _a : null;
  }
  const text = (0, import_stringify.stringify)(value).trim();
  if (/^-?\d+$/.test(text)) {
    return (_b = codeMap[Number.parseInt(text, 10)]) != null ? _b : null;
  }
  return text;
}
function decodeAtaSetting(name, value) {
  if (ATA_BOOL_SETTINGS.has(name)) {
    return coerceBool(value);
  }
  if (ATA_FLOAT_SETTINGS.has(name)) {
    return coerceFloat(value);
  }
  const codeMap = ATA_ENUM_SETTINGS[name];
  if (codeMap) {
    return decodeEnumValue(codeMap, value);
  }
  return value;
}
function decodeAtwSetting(name, value) {
  if (ATW_BOOL_SETTINGS.has(name)) {
    return coerceBool(value);
  }
  if (ATW_FLOAT_SETTINGS.has(name)) {
    return coerceFloat(value);
  }
  if (ATW_ENUM_SETTINGS.has(name) && value !== null && value !== void 0 && typeof value !== "boolean") {
    const text = (0, import_stringify.stringify)(value).trim();
    return ATW_ENUM_VALUES.has(text) ? text : value;
  }
  return value;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  coerceBool,
  coerceFloat,
  coerceInt,
  decodeAtaSetting,
  decodeAtwSetting
});
//# sourceMappingURL=decode.js.map
