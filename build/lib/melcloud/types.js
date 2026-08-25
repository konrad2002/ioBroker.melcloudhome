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
var types_exports = {};
__export(types_exports, {
  ATA_FAN_SPEEDS: () => ATA_FAN_SPEEDS,
  ATA_OPERATION_MODES: () => ATA_OPERATION_MODES,
  ATA_VANE_HORIZONTAL: () => ATA_VANE_HORIZONTAL,
  ATA_VANE_VERTICAL: () => ATA_VANE_VERTICAL,
  ATW_OPERATION_MODES: () => ATW_OPERATION_MODES,
  ATW_ZONE_MODES: () => ATW_ZONE_MODES
});
module.exports = __toCommonJS(types_exports);
const ATA_OPERATION_MODES = ["Heat", "Cool", "Automatic", "Dry", "Fan"];
const ATA_FAN_SPEEDS = ["Off", "Auto", "One", "Two", "Three", "Four", "Five"];
const ATA_VANE_VERTICAL = ["Auto", "Swing", "One", "Two", "Three", "Four", "Five"];
const ATA_VANE_HORIZONTAL = ["Auto", "Swing", "Left", "LeftCentre", "Centre", "RightCentre", "Right"];
const ATW_OPERATION_MODES = ["Stop", "HotWater", "HeatZones", "Cool"];
const ATW_ZONE_MODES = [
  "HeatRoomTemperature",
  "HeatFlowTemperature",
  "HeatCurve",
  "CoolRoomTemperature",
  "CoolFlowTemperature"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ATA_FAN_SPEEDS,
  ATA_OPERATION_MODES,
  ATA_VANE_HORIZONTAL,
  ATA_VANE_VERTICAL,
  ATW_OPERATION_MODES,
  ATW_ZONE_MODES
});
//# sourceMappingURL=types.js.map
