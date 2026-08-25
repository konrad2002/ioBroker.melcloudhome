/** REST client for the Melcloud Home API, mirroring aiomelcloudhome's aiomelcloudhome.py. */

import type { AbstractAuth } from "./auth";
import { parseUserContext } from "./context";
import { MelCloudHomeAuthenticationError, MelCloudHomeConnectionError, MelCloudHomeNotFoundError } from "./errors";
import type { ATAUnitControl, ATWUnitControl, UserContext } from "./types";

const API_BASE = "https://mobile.bff.melcloudhome.com";

export class MelCloudHomeClient {
	public constructor(
		private readonly auth: AbstractAuth,
		private readonly apiBase: string = API_BASE,
		private readonly requestTimeoutMs = 10_000,
	) {}

	private async request(
		uri: string,
		options: {
			method?: string;
			params?: Record<string, string>;
			json?: Record<string, unknown>;
		} = {},
	): Promise<Record<string, unknown>> {
		const token = await this.auth.getAccessToken();
		const url = new URL(uri.replace(/^\//, ""), `${this.apiBase}/`);
		if (options.params) {
			for (const [key, value] of Object.entries(options.params)) {
				url.searchParams.set(key, value);
			}
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
		let res: Response;
		try {
			res = await fetch(url, {
				method: options.method ?? "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					"User-Agent": "iobroker.melcloudhome",
				},
				body: options.json ? JSON.stringify(options.json) : undefined,
				signal: controller.signal,
			});
		} catch (err) {
			if ((err as Error).name === "AbortError") {
				throw new MelCloudHomeConnectionError(`Request timed out: ${uri}`);
			}
			throw new MelCloudHomeConnectionError(`Connection error: ${(err as Error).message}`);
		} finally {
			clearTimeout(timeout);
		}

		if (res.status === 401) {
			throw new MelCloudHomeAuthenticationError("Authentication failed");
		}
		if (res.status === 404) {
			throw new MelCloudHomeNotFoundError(`Resource not found: ${uri}`);
		}
		if (!res.ok) {
			throw new MelCloudHomeConnectionError(`Request failed: HTTP ${res.status} for ${uri}`);
		}

		if (res.status === 204 || res.status === 304) {
			return {};
		}
		const text = await res.text();
		if (!text) {
			return {};
		}
		return JSON.parse(text) as Record<string, unknown>;
	}

	/** Fetch the full user context (all buildings and devices). */
	public async getContext(): Promise<UserContext> {
		return parseUserContext(await this.request("/context"));
	}

	/**
	 * Control an Air-to-Air unit.
	 *
	 * @param unitId
	 * @param control
	 */
	public async controlAtaUnit(unitId: string, control: ATAUnitControl): Promise<void> {
		await this.request(`/monitor/ataunit/${unitId}`, {
			method: "PUT",
			json: {
				power: control.power ?? null,
				operationMode: control.operationMode ?? null,
				setTemperature: control.setTemperature ?? null,
				setFanSpeed: control.setFanSpeed ?? null,
				vaneVerticalDirection: control.vaneVerticalDirection ?? null,
				vaneHorizontalDirection: control.vaneHorizontalDirection ?? null,
				temperatureIncrementOverride: null,
				inStandbyMode: control.inStandbyMode ?? null,
			},
		});
	}

	/**
	 * Control an Air-to-Water unit.
	 *
	 * @param unitId
	 * @param control
	 */
	public async controlAtwUnit(unitId: string, control: ATWUnitControl): Promise<void> {
		await this.request(`/monitor/atwunit/${unitId}`, {
			method: "PUT",
			json: {
				power: control.power ?? null,
				setTemperatureZone1: control.setTemperatureZone1 ?? null,
				setTemperatureZone2: control.setTemperatureZone2 ?? null,
				operationModeZone1: control.operationModeZone1 ?? null,
				operationModeZone2: control.operationModeZone2 ?? null,
				setTankWaterTemperature: control.setTankWaterTemperature ?? null,
				forcedHotWaterMode: control.forcedHotWaterMode ?? null,
				inStandbyMode: control.inStandbyMode ?? null,
				setHeatFlowTemperatureZone1: control.setHeatFlowTemperatureZone1 ?? null,
				setCoolFlowTemperatureZone1: control.setCoolFlowTemperatureZone1 ?? null,
				setHeatFlowTemperatureZone2: control.setHeatFlowTemperatureZone2 ?? null,
				setCoolFlowTemperatureZone2: control.setCoolFlowTemperatureZone2 ?? null,
			},
		});
	}
}
