/** Type definitions mirroring the aiomelcloudhome Python models (ata.py, atw.py, context.py, realtime.py). */

export const ATA_OPERATION_MODES = ["Heat", "Cool", "Automatic", "Dry", "Fan"] as const;
export type ATAOperationMode = (typeof ATA_OPERATION_MODES)[number];

export const ATA_FAN_SPEEDS = ["Off", "Auto", "One", "Two", "Three", "Four", "Five"] as const;
export type ATAFanSpeed = (typeof ATA_FAN_SPEEDS)[number];

export const ATA_VANE_VERTICAL = ["Auto", "Swing", "One", "Two", "Three", "Four", "Five"] as const;
export type ATAVaneVertical = (typeof ATA_VANE_VERTICAL)[number];

export const ATA_VANE_HORIZONTAL = ["Auto", "Swing", "Left", "LeftCentre", "Centre", "RightCentre", "Right"] as const;
export type ATAVaneHorizontal = (typeof ATA_VANE_HORIZONTAL)[number];

export const ATW_OPERATION_MODES = ["Stop", "HotWater", "HeatZones", "Cool"] as const;
export type ATWOperationMode = (typeof ATW_OPERATION_MODES)[number];

export const ATW_ZONE_MODES = [
	"HeatRoomTemperature",
	"HeatFlowTemperature",
	"HeatCurve",
	"CoolRoomTemperature",
	"CoolFlowTemperature",
] as const;
export type ATWZoneMode = (typeof ATW_ZONE_MODES)[number];

export interface HolidayMode {
	active: boolean;
	enabled: boolean;
	startDate: string | null;
	endDate: string | null;
}

export interface FrostProtection {
	active: boolean;
	enabled: boolean;
	min: number;
	max: number;
}

export interface OverheatProtection {
	active: boolean;
	enabled: boolean;
	min: number;
	max: number;
}

export interface ATACapabilities {
	numberOfFanSpeeds: number | null;
	minTempHeat: number | null;
	maxTempHeat: number | null;
	minTempCool: number | null;
	maxTempCool: number | null;
	minTempAutomatic: number | null;
	maxTempAutomatic: number | null;
	hasHalfDegreeIncrements: boolean | null;
	hasCoolOperationMode: boolean | null;
	hasDryOperationMode: boolean | null;
	hasFanOperationMode: boolean | null;
	hasAutoOperationMode: boolean | null;
	hasOutdoorTemperatureSensor: boolean | null;
	hasEnergyConsumedMeter: boolean | null;
	hasVaneVertical: boolean | null;
	hasVaneHorizontal: boolean | null;
	hasStandbyMode: boolean | null;
}

export interface ATAUnitControl {
	power?: boolean | null;
	operationMode?: ATAOperationMode | null;
	setTemperature?: number | null;
	setFanSpeed?: ATAFanSpeed | null;
	vaneVerticalDirection?: ATAVaneVertical | null;
	vaneHorizontalDirection?: ATAVaneHorizontal | null;
	inStandbyMode?: boolean | null;
}

export interface ATAUnit {
	id: string;
	name: string;
	power: boolean | null;
	operationMode: ATAOperationMode | null;
	setTemperature: number | null;
	roomTemperature: number | null;
	setFanSpeed: ATAFanSpeed | null;
	actualFanSpeed: ATAFanSpeed | null;
	vaneVerticalDirection: ATAVaneVertical | null;
	vaneHorizontalDirection: ATAVaneHorizontal | null;
	inStandbyMode: boolean | null;
	isInError: boolean | null;
	rssi: number | null;
	settings: Record<string, unknown>;
	capabilities: ATACapabilities | null;
	frostProtection: FrostProtection | null;
	overheatProtection: OverheatProtection | null;
	holidayMode: HolidayMode | null;
}

export interface ATWCapabilities {
	hasHotWater: boolean | null;
	hasZone2: boolean | null;
	hasHalfDegrees: boolean | null;
	hasCoolingMode: boolean | null;
	minSetTankTemperature: number | null;
	maxSetTankTemperature: number | null;
	minSetTemperatureZone1: number | null;
	maxSetTemperatureZone1: number | null;
	minSetTemperatureZone2: number | null;
	maxSetTemperatureZone2: number | null;
	hasStandbyMode: boolean | null;
	hasEnergyConsumedMeter: boolean | null;
}

export interface ATWUnitControl {
	power?: boolean | null;
	operationModeZone1?: ATWZoneMode | null;
	operationModeZone2?: ATWZoneMode | null;
	setTemperatureZone1?: number | null;
	setTemperatureZone2?: number | null;
	setTankWaterTemperature?: number | null;
	forcedHotWaterMode?: boolean | null;
	inStandbyMode?: boolean | null;
	setHeatFlowTemperatureZone1?: number | null;
	setCoolFlowTemperatureZone1?: number | null;
	setHeatFlowTemperatureZone2?: number | null;
	setCoolFlowTemperatureZone2?: number | null;
}

export interface ATWUnit {
	id: string;
	name: string;
	power: boolean | null;
	inStandbyMode: boolean | null;
	operationMode: ATWOperationMode | null;
	operationModeZone1: ATWZoneMode | null;
	setTemperatureZone1: number | null;
	roomTemperatureZone1: number | null;
	hasZone2: boolean | null;
	operationModeZone2: ATWZoneMode | null;
	setTemperatureZone2: number | null;
	roomTemperatureZone2: number | null;
	setTankWaterTemperature: number | null;
	tankWaterTemperature: number | null;
	forcedHotWaterMode: boolean | null;
	isInError: boolean | null;
	rssi: number | null;
	settings: Record<string, unknown>;
	capabilities: ATWCapabilities | null;
	frostProtection: FrostProtection | null;
	overheatProtection: OverheatProtection | null;
	holidayMode: HolidayMode | null;
}

export interface Building {
	id: string;
	name: string;
	airToAirUnits: ATAUnit[];
	airToWaterUnits: ATWUnit[];
}

export interface UserContext {
	id: string | null;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	buildings: Building[];
}

export interface UnitStateDelta {
	unitId: string;
	unitType: string;
	changes: Record<string, unknown>;
}
