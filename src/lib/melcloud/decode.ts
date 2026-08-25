/** Decoders for raw ATA/ATW `settings` entries. */

import { stringify } from "./stringify";
import type {
	ATAFanSpeed,
	ATAOperationMode,
	ATAVaneHorizontal,
	ATAVaneVertical,
	ATWOperationMode,
	ATWZoneMode,
} from "./types";

// WebSocket unitStateChanged frames encode enum settings as integer codes, whereas the
// REST context endpoint returns their string names. Both shapes must be supported.
const ATA_OPERATION_MODE_BY_CODE: Record<number, ATAOperationMode> = {
	1: "Heat",
	2: "Dry",
	3: "Cool",
	4: "Fan",
	5: "Automatic",
};

const ATA_FAN_SPEED_BY_CODE: Record<number, ATAFanSpeed> = {
	0: "Auto",
	1: "One",
	2: "Two",
	3: "Three",
	4: "Four",
	5: "Five",
};

const ATA_VANE_VERTICAL_BY_CODE: Record<number, ATAVaneVertical> = {
	0: "Auto",
	1: "One",
	2: "Two",
	3: "Three",
	4: "Four",
	5: "Five",
	6: "Swing",
};

const ATA_VANE_HORIZONTAL_BY_CODE: Record<number, ATAVaneHorizontal> = {
	0: "Auto",
	1: "Left",
	2: "LeftCentre",
	3: "Centre",
	4: "RightCentre",
	5: "Right",
	7: "Swing",
};

const ATA_BOOL_SETTINGS = new Set(["Power", "InStandbyMode", "IsInError"]);
const ATA_FLOAT_SETTINGS = new Set(["SetTemperature", "RoomTemperature"]);
const ATA_ENUM_SETTINGS: Record<string, Record<number, string>> = {
	OperationMode: ATA_OPERATION_MODE_BY_CODE,
	SetFanSpeed: ATA_FAN_SPEED_BY_CODE,
	ActualFanSpeed: ATA_FAN_SPEED_BY_CODE,
	VaneVerticalDirection: ATA_VANE_VERTICAL_BY_CODE,
	VaneHorizontalDirection: ATA_VANE_HORIZONTAL_BY_CODE,
};

const ATW_BOOL_SETTINGS = new Set(["Power", "InStandbyMode", "HasZone2", "ForcedHotWaterMode", "IsInError"]);
const ATW_FLOAT_SETTINGS = new Set([
	"SetTemperatureZone1",
	"RoomTemperatureZone1",
	"SetTemperatureZone2",
	"RoomTemperatureZone2",
	"SetTankWaterTemperature",
	"TankWaterTemperature",
]);
const ATW_ENUM_SETTINGS = new Set(["OperationMode", "OperationModeZone1", "OperationModeZone2"]);
const ATW_ENUM_VALUES: Set<string> = new Set<ATWOperationMode | ATWZoneMode>([
	"Stop",
	"HotWater",
	"HeatZones",
	"Cool",
	"HeatRoomTemperature",
	"HeatFlowTemperature",
	"HeatCurve",
	"CoolRoomTemperature",
	"CoolFlowTemperature",
]);

/**
 * Coerce a REST string ("True"/"False") or WebSocket boolean into a `boolean`.
 *
 * @param value
 */
export function coerceBool(value: unknown): boolean | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "boolean") {
		return value;
	}
	return stringify(value).trim().toLowerCase() === "true";
}

/**
 * Coerce a REST string or WebSocket number into a `number`.
 *
 * @param value
 */
export function coerceFloat(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const num = Number(value);
	return Number.isNaN(num) ? null : num;
}

function coerceInt(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const num = Number.parseInt(stringify(value), 10);
	return Number.isNaN(num) ? null : num;
}

function decodeEnumValue(codeMap: Record<number, string>, value: unknown): string | null {
	if (value === null || value === undefined || typeof value === "boolean") {
		return null;
	}
	if (typeof value === "number") {
		return codeMap[value] ?? null;
	}
	const text = stringify(value).trim();
	if (/^-?\d+$/.test(text)) {
		return codeMap[Number.parseInt(text, 10)] ?? null;
	}
	return text;
}

/**
 * Decode a single ATA setting value into its typed form (bool/number/enum string).
 *
 * @param name
 * @param value
 */
export function decodeAtaSetting(name: string, value: unknown): unknown {
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

/**
 * Decode a single ATW setting value from a WebSocket `unitStateChanged` frame or REST payload.
 *
 * @param name
 * @param value
 */
export function decodeAtwSetting(name: string, value: unknown): unknown {
	if (ATW_BOOL_SETTINGS.has(name)) {
		return coerceBool(value);
	}
	if (ATW_FLOAT_SETTINGS.has(name)) {
		return coerceFloat(value);
	}
	if (ATW_ENUM_SETTINGS.has(name) && value !== null && value !== undefined && typeof value !== "boolean") {
		const text = stringify(value).trim();
		return ATW_ENUM_VALUES.has(text) ? text : value;
	}
	return value;
}

export { coerceInt };
