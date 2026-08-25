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
var realtime_exports = {};
__export(realtime_exports, {
  parseFrame: () => parseFrame
});
module.exports = __toCommonJS(realtime_exports);
var import_decode = require("./decode");
var import_stringify = require("./stringify");
const MESSAGE_TYPE_UNIT_STATE_CHANGED = "unitStateChanged";
function fromMessage(message) {
  var _a;
  if (message.messageType !== MESSAGE_TYPE_UNIT_STATE_CHANGED) {
    return null;
  }
  const data = (_a = message.Data) != null ? _a : {};
  const unitId = data.id;
  if (!unitId) {
    return null;
  }
  const unitType = (0, import_stringify.stringify)(data.unitType).toLowerCase();
  const rawSettings = Array.isArray(data.settings) ? data.settings : [];
  const changes = {};
  for (const setting of rawSettings) {
    if (!setting || typeof setting !== "object" || !("name" in setting)) {
      continue;
    }
    const name = (0, import_stringify.stringify)(setting.name);
    const value = setting.value;
    if (unitType === "ata") {
      changes[name] = (0, import_decode.decodeAtaSetting)(name, value);
    } else if (unitType === "atw") {
      changes[name] = (0, import_decode.decodeAtwSetting)(name, value);
    } else {
      changes[name] = value;
    }
  }
  return { unitId: (0, import_stringify.stringify)(unitId), unitType, changes };
}
function parseFrame(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }
  const deltas = [];
  for (const message of payload) {
    if (message && typeof message === "object") {
      const delta = fromMessage(message);
      if (delta) {
        deltas.push(delta);
      }
    }
  }
  return deltas;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseFrame
});
//# sourceMappingURL=realtime.js.map
