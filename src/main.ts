/*
 * ioBroker adapter for Mitsubishi Electric MELCloud Home.
 */

import * as utils from "@iobroker/adapter-core";
import { MelCloudHomeAuth, type MelCloudHomeSession } from "./lib/melcloud/auth";
import { MelCloudHomeClient } from "./lib/melcloud/client";
import { ATA_STATE_SPECS, ATW_STATE_SPECS, type StateSpec } from "./lib/melcloud/state-specs";
import type {
	ATAUnit,
	ATAUnitControl,
	ATWUnit,
	ATWUnitControl,
	Building,
	UnitStateDelta,
	UserContext,
} from "./lib/melcloud/types";
import { MelCloudHomeWebSocket } from "./lib/melcloud/websocket";

const SESSION_STATE_ID = "info.session";
const MIN_POLL_INTERVAL_SECONDS = 15;

interface UnitLocation {
	path: string;
	kind: "ata" | "atw";
}

class Melcloudhome extends utils.Adapter {
	private auth: MelCloudHomeAuth | undefined;
	private client: MelCloudHomeClient | undefined;
	private socket: MelCloudHomeWebSocket | undefined;
	private pollTimer: ioBroker.Timeout | undefined;
	private stopped = false;

	/** Real MELCloud Home unit id -> where it lives in the object tree, used to apply realtime deltas. */
	private readonly realIdToLocation = new Map<string, UnitLocation>();
	/** Object tree device path -> real MELCloud Home unit id, used to route control commands. */
	private readonly pathToRealId = new Map<string, string>();

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "melcloudhome",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.stopped = false;
		await this.setStateAsync("info.connection", { val: false, ack: true });

		const username = this.config.username?.trim();
		const password = this.config.password;
		if (!username || !password) {
			this.log.error("Please configure your MELCloud Home username and password in the adapter settings.");
			return;
		}
		this.log.debug(
			`Starting with username "${username}", pollInterval=${this.config.pollInterval}s, useWebSocket=${Boolean(this.config.useWebSocket)}`,
		);

		await this.extendObjectAsync(SESSION_STATE_ID, {
			type: "state",
			common: {
				name: "Internal OAuth session (do not edit)",
				type: "string",
				role: "json",
				read: true,
				write: false,
				expert: true,
			},
			native: {},
		});

		this.auth = new MelCloudHomeAuth(username, password, this.log);
		const savedSession = await this.getStateAsync(SESSION_STATE_ID);
		if (savedSession?.val && typeof savedSession.val === "string") {
			try {
				this.auth.importSession(JSON.parse(savedSession.val) as MelCloudHomeSession);
				this.log.debug("Restored persisted MELCloud Home session");
			} catch (err) {
				this.log.debug(
					`Could not parse persisted MELCloud Home session (${(err as Error).message}); a fresh login will be performed.`,
				);
			}
		}
		this.client = new MelCloudHomeClient(this.auth, undefined, undefined, this.log);

		if (this.config.useWebSocket) {
			this.socket = new MelCloudHomeWebSocket(this.auth, {
				onDelta: delta => void this.applyDelta(delta),
				onError: err => this.log.debug(`MELCloud Home WebSocket error: ${err.message}`),
				onConnected: () => this.log.debug("MELCloud Home WebSocket connected"),
				onDisconnected: () => this.log.debug("MELCloud Home WebSocket disconnected"),
			});
			this.socket.start();
		}

		void this.pollLoop();
	}

	private pollIntervalMs(): number {
		const seconds = Math.max(Number(this.config.pollInterval) || 60, MIN_POLL_INTERVAL_SECONDS);
		return seconds * 1000;
	}

	private async pollLoop(): Promise<void> {
		if (this.stopped) {
			return;
		}
		try {
			await this.refreshContext();
			await this.setStateChangedAsync("info.connection", { val: true, ack: true });
		} catch (err) {
			const error = err as Error;
			this.log.error(`Failed to refresh MELCloud Home data: ${error.message || String(err)}`);
			if (error?.stack) {
				this.log.debug(error.stack);
			}
			await this.setStateChangedAsync("info.connection", { val: false, ack: true });
		}
		if (!this.stopped) {
			this.pollTimer = this.setTimeout(() => void this.pollLoop(), this.pollIntervalMs());
		}
	}

	private async refreshContext(): Promise<void> {
		if (!this.client || !this.auth) {
			return;
		}
		this.log.debug("Fetching MELCloud Home context (/context)");
		const context: UserContext = await this.client.getContext();
		const ataCount = context.buildings.reduce((sum, b) => sum + b.airToAirUnits.length, 0);
		const atwCount = context.buildings.reduce((sum, b) => sum + b.airToWaterUnits.length, 0);
		this.log.debug(
			`Fetched context: ${context.buildings.length} building(s), ${ataCount} ATA unit(s), ${atwCount} ATW unit(s)`,
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

	private async persistSession(): Promise<void> {
		if (!this.auth) {
			return;
		}
		await this.setStateAsync(SESSION_STATE_ID, { val: JSON.stringify(this.auth.exportSession()), ack: true });
	}

	private async syncAtaUnit(buildingId: string, _building: Building, unit: ATAUnit): Promise<void> {
		const channelId = `${buildingId}.ata`;
		const devicePath = `${channelId}.${this.sanitize(unit.id)}`;
		await this.ensureChannel(channelId, "Air-to-Air units");
		await this.ensureDevice(devicePath, unit.name || unit.id);

		this.realIdToLocation.set(unit.id, { path: devicePath, kind: "ata" });
		this.pathToRealId.set(devicePath, unit.id);

		await this.syncStateSpecs(devicePath, ATA_STATE_SPECS, unit as unknown as Record<string, unknown>);
		await this.syncPlainStates(
			`${devicePath}.capabilities`,
			"Capabilities",
			unit.capabilities as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.frostProtection`,
			"Frost protection",
			unit.frostProtection as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.overheatProtection`,
			"Overheat protection",
			unit.overheatProtection as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.holidayMode`,
			"Holiday mode",
			unit.holidayMode as unknown as Record<string, unknown> | null,
		);
	}

	private async syncAtwUnit(buildingId: string, _building: Building, unit: ATWUnit): Promise<void> {
		const channelId = `${buildingId}.atw`;
		const devicePath = `${channelId}.${this.sanitize(unit.id)}`;
		await this.ensureChannel(channelId, "Air-to-Water units");
		await this.ensureDevice(devicePath, unit.name || unit.id);

		this.realIdToLocation.set(unit.id, { path: devicePath, kind: "atw" });
		this.pathToRealId.set(devicePath, unit.id);

		await this.syncStateSpecs(devicePath, ATW_STATE_SPECS, unit as unknown as Record<string, unknown>);
		await this.syncPlainStates(
			`${devicePath}.capabilities`,
			"Capabilities",
			unit.capabilities as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.frostProtection`,
			"Frost protection",
			unit.frostProtection as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.overheatProtection`,
			"Overheat protection",
			unit.overheatProtection as unknown as Record<string, unknown> | null,
		);
		await this.syncPlainStates(
			`${devicePath}.holidayMode`,
			"Holiday mode",
			unit.holidayMode as unknown as Record<string, unknown> | null,
		);
	}

	private async syncStateSpecs(devicePath: string, specs: StateSpec[], data: Record<string, unknown>): Promise<void> {
		for (const spec of specs) {
			const id = `${devicePath}.${spec.id}`;
			await this.ensureState(id, spec);
			const value = data[spec.id];
			if (value !== null && value !== undefined) {
				await this.setStateChangedAsync(id, { val: value as ioBroker.StateValue, ack: true });
			}
		}
	}

	private async syncPlainStates(
		basePath: string,
		channelName: string,
		data: Record<string, unknown> | null,
	): Promise<void> {
		if (!data) {
			return;
		}
		await this.ensureChannel(basePath, channelName);
		for (const [key, value] of Object.entries(data)) {
			if (value === null || value === undefined) {
				continue;
			}
			const id = `${basePath}.${this.sanitize(key)}`;
			const type = typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string";
			await this.extendObjectAsync(id, {
				type: "state",
				common: { name: key, type, role: type === "boolean" ? "indicator" : "value", read: true, write: false },
				native: {},
			});
			await this.setStateChangedAsync(id, { val: value as ioBroker.StateValue, ack: true });
		}
	}

	private async ensureFolder(id: string, name: string): Promise<void> {
		await this.extendObjectAsync(id, { type: "folder", common: { name }, native: {} });
	}

	private async ensureChannel(id: string, name: string): Promise<void> {
		await this.extendObjectAsync(id, { type: "channel", common: { name }, native: {} });
	}

	private async ensureDevice(id: string, name: string): Promise<void> {
		await this.extendObjectAsync(id, { type: "device", common: { name }, native: {} });
	}

	private async ensureState(id: string, spec: StateSpec): Promise<void> {
		await this.extendObjectAsync(id, {
			type: "state",
			common: {
				name: spec.name,
				type: spec.type,
				role: spec.role,
				read: true,
				write: spec.write,
				...(spec.unit ? { unit: spec.unit } : {}),
				...(spec.states ? { states: spec.states } : {}),
			},
			native: {},
		});
		if (spec.write) {
			this.subscribeStates(id);
		}
	}

	private sanitize(id: string): string {
		return id.replace(/[^A-Za-z0-9_-]/g, "_");
	}

	private async applyDelta(delta: UnitStateDelta): Promise<void> {
		const location = this.realIdToLocation.get(delta.unitId);
		if (!location) {
			return;
		}
		const specs = location.kind === "ata" ? ATA_STATE_SPECS : ATW_STATE_SPECS;
		const validIds = new Set(specs.map(s => s.id));
		try {
			for (const [name, value] of Object.entries(delta.changes)) {
				if (value === null || value === undefined) {
					continue;
				}
				const propId = name.charAt(0).toLowerCase() + name.slice(1);
				if (!validIds.has(propId)) {
					continue;
				}
				await this.setStateChangedAsync(`${location.path}.${propId}`, {
					val: value as ioBroker.StateValue,
					ack: true,
				});
			}
		} catch (err) {
			this.log.debug(`Failed to apply realtime update for ${delta.unitId}: ${(err as Error).message}`);
		}
	}

	private ataControlFor(prop: string, value: ioBroker.StateValue): ATAUnitControl | null {
		switch (prop) {
			case "power":
				return { power: Boolean(value) };
			case "operationMode":
				return { operationMode: String(value) as ATAUnitControl["operationMode"] };
			case "setTemperature":
				return { setTemperature: Number(value) };
			case "setFanSpeed":
				return { setFanSpeed: String(value) as ATAUnitControl["setFanSpeed"] };
			case "vaneVerticalDirection":
				return { vaneVerticalDirection: String(value) as ATAUnitControl["vaneVerticalDirection"] };
			case "vaneHorizontalDirection":
				return { vaneHorizontalDirection: String(value) as ATAUnitControl["vaneHorizontalDirection"] };
			case "inStandbyMode":
				return { inStandbyMode: Boolean(value) };
			default:
				return null;
		}
	}

	private atwControlFor(prop: string, value: ioBroker.StateValue): ATWUnitControl | null {
		switch (prop) {
			case "power":
				return { power: Boolean(value) };
			case "operationModeZone1":
				return { operationModeZone1: String(value) as ATWUnitControl["operationModeZone1"] };
			case "operationModeZone2":
				return { operationModeZone2: String(value) as ATWUnitControl["operationModeZone2"] };
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
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (!state || state.ack) {
			return;
		}
		void this.handleStateChange(id, state);
	}

	private async handleStateChange(id: string, state: ioBroker.State): Promise<void> {
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
		const unitId = this.pathToRealId.get(devicePath) ?? unitIdPart;

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
			this.log.error(`Failed to control ${id}: ${(err as Error).message}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			this.stopped = true;
			if (this.pollTimer) {
				this.clearTimeout(this.pollTimer);
			}
			this.socket?.close();
			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${(error as Error).message}`);
			callback();
		}
	}
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Melcloudhome(options);
} else {
	// otherwise start the instance directly
	(() => new Melcloudhome())();
}
