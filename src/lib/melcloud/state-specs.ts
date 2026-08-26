/** ioBroker state definitions for ATA/ATW unit properties, used to build objects and route state changes. */

import {
	ATA_FAN_SPEEDS,
	ATA_OPERATION_MODES,
	ATA_VANE_HORIZONTAL,
	ATA_VANE_VERTICAL,
	ATW_OPERATION_MODES,
	ATW_ZONE_MODES,
} from "./types";

export interface StateSpec {
	/** Suffix id under the unit's channel, e.g. "power". */
	id: string;
	name: string;
	type: "boolean" | "number" | "string";
	role: string;
	write: boolean;
	unit?: string;
	states?: Record<string, string>;
}

function enumStates(values: readonly string[]): Record<string, string> {
	return Object.fromEntries(values.map(v => [v, v]));
}

export const ATA_STATE_SPECS: StateSpec[] = [
	{ id: "power", name: "Power on/off", type: "boolean", role: "switch.power", write: true },
	{
		id: "operationMode",
		name: "Operation mode",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATA_OPERATION_MODES),
	},
	{
		id: "setTemperature",
		name: "Target temperature",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "roomTemperature",
		name: "Room temperature",
		type: "number",
		role: "value.temperature",
		write: false,
		unit: "°C",
	},
	{
		id: "setFanSpeed",
		name: "Fan speed (set)",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATA_FAN_SPEEDS),
	},
	{
		id: "actualFanSpeed",
		name: "Fan speed (actual)",
		type: "string",
		role: "state",
		write: false,
		states: enumStates(ATA_FAN_SPEEDS),
	},
	{
		id: "vaneVerticalDirection",
		name: "Vane vertical direction",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATA_VANE_VERTICAL),
	},
	{
		id: "vaneHorizontalDirection",
		name: "Vane horizontal direction",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATA_VANE_HORIZONTAL),
	},
	{ id: "inStandbyMode", name: "In standby mode", type: "boolean", role: "switch", write: true },
	{ id: "isInError", name: "Is in error", type: "boolean", role: "indicator.error", write: false },
	{ id: "rssi", name: "Signal strength (RSSI)", type: "number", role: "value.rssi", write: false },
];

export const ATW_STATE_SPECS: StateSpec[] = [
	{ id: "power", name: "Power on/off", type: "boolean", role: "switch.power", write: true },
	{ id: "inStandbyMode", name: "In standby mode", type: "boolean", role: "switch", write: true },
	{
		id: "operationMode",
		name: "Operation mode",
		type: "string",
		role: "state",
		write: false,
		states: enumStates(ATW_OPERATION_MODES),
	},
	{
		id: "operationModeZone1",
		name: "Zone 1 mode",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATW_ZONE_MODES),
	},
	{
		id: "setTemperatureZone1",
		name: "Zone 1 target temperature",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "roomTemperatureZone1",
		name: "Zone 1 room temperature",
		type: "number",
		role: "value.temperature",
		write: false,
		unit: "°C",
	},
	{ id: "hasZone2", name: "Has zone 2", type: "boolean", role: "indicator", write: false },
	{
		id: "operationModeZone2",
		name: "Zone 2 mode",
		type: "string",
		role: "state",
		write: true,
		states: enumStates(ATW_ZONE_MODES),
	},
	{
		id: "setTemperatureZone2",
		name: "Zone 2 target temperature",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "roomTemperatureZone2",
		name: "Zone 2 room temperature",
		type: "number",
		role: "value.temperature",
		write: false,
		unit: "°C",
	},
	{
		id: "setTankWaterTemperature",
		name: "Tank target temperature",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "tankWaterTemperature",
		name: "Tank water temperature",
		type: "number",
		role: "value.temperature",
		write: false,
		unit: "°C",
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
		unit: "°C",
	},
	{
		id: "setCoolFlowTemperatureZone1",
		name: "Zone 1 cool flow temperature override",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "setHeatFlowTemperatureZone2",
		name: "Zone 2 heat flow temperature override",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
	{
		id: "setCoolFlowTemperatureZone2",
		name: "Zone 2 cool flow temperature override",
		type: "number",
		role: "level.temperature",
		write: true,
		unit: "°C",
	},
];

/** Properties that exist only as commands (never reported back by the API). */
export const ATW_WRITE_ONLY_PROPS = new Set([
	"setHeatFlowTemperatureZone1",
	"setCoolFlowTemperatureZone1",
	"setHeatFlowTemperatureZone2",
	"setCoolFlowTemperatureZone2",
]);
