/** Parses raw `/context` API payloads into typed models. */

import { coerceBool, coerceFloat, coerceInt, decodeAtaSetting, decodeAtwSetting } from "./decode";
import type {
	ATACapabilities,
	ATAUnit,
	ATWCapabilities,
	ATWUnit,
	Building,
	FrostProtection,
	HolidayMode,
	OverheatProtection,
	UserContext,
} from "./types";

type RawSetting = { name: string; value: string };

function extractSettings(raw: unknown): Record<string, unknown> {
	if (!Array.isArray(raw)) {
		return {};
	}
	const settings: Record<string, unknown> = {};
	for (const entry of raw as RawSetting[]) {
		if (entry && typeof entry === "object" && "name" in entry) {
			settings[String(entry.name)] = entry.value;
		}
	}
	return settings;
}

function parseHolidayMode(data: unknown): HolidayMode | null {
	if (!data || typeof data !== "object") {
		return null;
	}
	const d = data as Record<string, unknown>;
	return {
		active: coerceBool(d.active) ?? false,
		enabled: coerceBool(d.enabled) ?? false,
		startDate: (d.startDate as string) ?? null,
		endDate: (d.endDate as string) ?? null,
	};
}

function parseFrostProtection(data: unknown): FrostProtection | null {
	if (!data || typeof data !== "object") {
		return null;
	}
	const d = data as Record<string, unknown>;
	return {
		active: coerceBool(d.active) ?? false,
		enabled: coerceBool(d.enabled) ?? false,
		min: coerceFloat(d.min) ?? 0,
		max: coerceFloat(d.max) ?? 0,
	};
}

function parseOverheatProtection(data: unknown): OverheatProtection | null {
	if (!data || typeof data !== "object") {
		return null;
	}
	const d = data as Record<string, unknown>;
	return {
		active: coerceBool(d.active) ?? false,
		enabled: coerceBool(d.enabled) ?? false,
		min: coerceFloat(d.min) ?? 0,
		max: coerceFloat(d.max) ?? 0,
	};
}

function parseAtaCapabilities(data: unknown): ATACapabilities | null {
	if (!data || typeof data !== "object") {
		return null;
	}
	const d = data as Record<string, unknown>;
	return {
		numberOfFanSpeeds: coerceInt(d.numberOfFanSpeeds),
		minTempHeat: coerceFloat(d.minTempHeat),
		maxTempHeat: coerceFloat(d.maxTempHeat),
		minTempCool: coerceFloat(d.minTempCool ?? d.minTempCoolDry),
		maxTempCool: coerceFloat(d.maxTempCool ?? d.maxTempCoolDry),
		minTempAutomatic: coerceFloat(d.minTempAutomatic),
		maxTempAutomatic: coerceFloat(d.maxTempAutomatic),
		hasHalfDegreeIncrements: coerceBool(d.hasHalfDegreeIncrements),
		hasCoolOperationMode: coerceBool(d.hasCoolOperationMode),
		hasDryOperationMode: coerceBool(d.hasDryOperationMode),
		hasFanOperationMode: coerceBool(d.hasFanOperationMode),
		hasAutoOperationMode: coerceBool(d.hasAutoOperationMode),
		hasOutdoorTemperatureSensor: coerceBool(d.hasOutdoorTemperatureSensor),
		hasEnergyConsumedMeter: coerceBool(d.hasEnergyConsumedMeter),
		hasVaneVertical: coerceBool(d.hasVaneVertical ?? d.hasAirDirection),
		hasVaneHorizontal: coerceBool(d.hasVaneHorizontal),
		hasStandbyMode: coerceBool(d.hasStandbyMode ?? d.hasStandby),
	};
}

function parseAtwCapabilities(data: unknown): ATWCapabilities | null {
	if (!data || typeof data !== "object") {
		return null;
	}
	const d = data as Record<string, unknown>;
	return {
		hasHotWater: coerceBool(d.hasHotWater),
		hasZone2: coerceBool(d.hasZone2),
		hasHalfDegrees: coerceBool(d.hasHalfDegrees),
		hasCoolingMode: coerceBool(d.hasCoolingMode),
		minSetTankTemperature: coerceFloat(d.minSetTankTemperature),
		maxSetTankTemperature: coerceFloat(d.maxSetTankTemperature),
		minSetTemperatureZone1: coerceFloat(d.minSetTemperatureZone1),
		maxSetTemperatureZone1: coerceFloat(d.maxSetTemperatureZone1),
		minSetTemperatureZone2: coerceFloat(d.minSetTemperatureZone2),
		maxSetTemperatureZone2: coerceFloat(d.maxSetTemperatureZone2),
		hasStandbyMode: coerceBool(d.hasStandbyMode),
		hasEnergyConsumedMeter: coerceBool(d.hasEnergyConsumedMeter),
	};
}

export function parseAtaUnit(data: Record<string, unknown>): ATAUnit {
	const settings = extractSettings(data.settings);
	for (const key of [
		"Power",
		"InStandbyMode",
		"IsInError",
		"OperationMode",
		"SetFanSpeed",
		"ActualFanSpeed",
		"VaneVerticalDirection",
		"VaneHorizontalDirection",
	]) {
		if (key in settings) {
			settings[key] = decodeAtaSetting(key, settings[key]);
		}
	}
	return {
		id: String(data.id),
		name: (data.givenDisplayName as string) ?? "",
		power: (settings.Power as boolean | undefined) ?? null,
		operationMode: (settings.OperationMode as ATAUnit["operationMode"] | undefined) ?? null,
		setTemperature: coerceFloat(settings.SetTemperature),
		roomTemperature: coerceFloat(settings.RoomTemperature),
		setFanSpeed: (settings.SetFanSpeed as ATAUnit["setFanSpeed"] | undefined) ?? null,
		actualFanSpeed: (settings.ActualFanSpeed as ATAUnit["actualFanSpeed"] | undefined) ?? null,
		vaneVerticalDirection: (settings.VaneVerticalDirection as ATAUnit["vaneVerticalDirection"] | undefined) ?? null,
		vaneHorizontalDirection:
			(settings.VaneHorizontalDirection as ATAUnit["vaneHorizontalDirection"] | undefined) ?? null,
		inStandbyMode: (settings.InStandbyMode as boolean | undefined) ?? null,
		isInError: (settings.IsInError as boolean | undefined) ?? null,
		rssi: coerceInt(data.rssi),
		settings,
		capabilities: parseAtaCapabilities(data.capabilities),
		frostProtection: parseFrostProtection(data.frostProtection),
		overheatProtection: parseOverheatProtection(data.overheatProtection),
		holidayMode: parseHolidayMode(data.holidayMode),
	};
}

export function parseAtwUnit(data: Record<string, unknown>): ATWUnit {
	const settings = extractSettings(data.settings);
	for (const key of [
		"Power",
		"InStandbyMode",
		"HasZone2",
		"ForcedHotWaterMode",
		"IsInError",
		"OperationMode",
		"OperationModeZone1",
		"OperationModeZone2",
	]) {
		if (key in settings) {
			settings[key] = decodeAtwSetting(key, settings[key]);
		}
	}
	return {
		id: String(data.id),
		name: (data.givenDisplayName as string) ?? "",
		power: (settings.Power as boolean | undefined) ?? null,
		inStandbyMode: (settings.InStandbyMode as boolean | undefined) ?? null,
		operationMode: (settings.OperationMode as ATWUnit["operationMode"] | undefined) ?? null,
		operationModeZone1: (settings.OperationModeZone1 as ATWUnit["operationModeZone1"] | undefined) ?? null,
		setTemperatureZone1: coerceFloat(settings.SetTemperatureZone1),
		roomTemperatureZone1: coerceFloat(settings.RoomTemperatureZone1),
		hasZone2: (settings.HasZone2 as boolean | undefined) ?? null,
		operationModeZone2: (settings.OperationModeZone2 as ATWUnit["operationModeZone2"] | undefined) ?? null,
		setTemperatureZone2: coerceFloat(settings.SetTemperatureZone2),
		roomTemperatureZone2: coerceFloat(settings.RoomTemperatureZone2),
		setTankWaterTemperature: coerceFloat(settings.SetTankWaterTemperature),
		tankWaterTemperature: coerceFloat(settings.TankWaterTemperature),
		forcedHotWaterMode: (settings.ForcedHotWaterMode as boolean | undefined) ?? null,
		isInError: (settings.IsInError as boolean | undefined) ?? null,
		rssi: coerceInt(data.rssi),
		settings,
		capabilities: parseAtwCapabilities(data.capabilities),
		frostProtection: parseFrostProtection(data.frostProtection),
		overheatProtection: parseOverheatProtection(data.overheatProtection),
		holidayMode: parseHolidayMode(data.holidayMode),
	};
}

function parseBuilding(data: Record<string, unknown>): Building {
	return {
		id: String(data.id),
		name: (data.name as string) ?? "",
		airToAirUnits: Array.isArray(data.airToAirUnits)
			? (data.airToAirUnits as Record<string, unknown>[]).map(parseAtaUnit)
			: [],
		airToWaterUnits: Array.isArray(data.airToWaterUnits)
			? (data.airToWaterUnits as Record<string, unknown>[]).map(parseAtwUnit)
			: [],
	};
}

export function parseUserContext(data: Record<string, unknown>): UserContext {
	const buildings = [
		...(Array.isArray(data.buildings) ? data.buildings : []),
		...(Array.isArray(data.guestBuildings) ? data.guestBuildings : []),
	];
	return {
		id: (data.id as string) ?? null,
		firstName: (data.firstname as string) ?? null,
		lastName: (data.lastname as string) ?? null,
		email: (data.email as string) ?? null,
		buildings: (buildings as Record<string, unknown>[]).map(parseBuilding),
	};
}
