/** Parses realtime WebSocket `unitStateChanged` frames. */

import { decodeAtaSetting, decodeAtwSetting } from "./decode";
import { stringify } from "./stringify";
import type { UnitStateDelta } from "./types";

const MESSAGE_TYPE_UNIT_STATE_CHANGED = "unitStateChanged";

function fromMessage(message: Record<string, unknown>): UnitStateDelta | null {
	if (message.messageType !== MESSAGE_TYPE_UNIT_STATE_CHANGED) {
		return null;
	}
	const data = (message.Data as Record<string, unknown>) ?? {};
	const unitId = data.id;
	if (!unitId) {
		return null;
	}
	const unitType = stringify(data.unitType).toLowerCase();
	const rawSettings = Array.isArray(data.settings) ? (data.settings as { name?: unknown; value?: unknown }[]) : [];

	const changes: Record<string, unknown> = {};
	for (const setting of rawSettings) {
		if (!setting || typeof setting !== "object" || !("name" in setting)) {
			continue;
		}
		const name = stringify(setting.name);
		const value = setting.value;
		if (unitType === "ata") {
			changes[name] = decodeAtaSetting(name, value);
		} else if (unitType === "atw") {
			changes[name] = decodeAtwSetting(name, value);
		} else {
			changes[name] = value;
		}
	}

	return { unitId: stringify(unitId), unitType, changes };
}

/**
 * Parse a decoded WebSocket text frame (a JSON array of messages) into deltas.
 *
 * @param payload
 */
export function parseFrame(payload: unknown): UnitStateDelta[] {
	if (!Array.isArray(payload)) {
		return [];
	}
	const deltas: UnitStateDelta[] = [];
	for (const message of payload) {
		if (message && typeof message === "object") {
			const delta = fromMessage(message as Record<string, unknown>);
			if (delta) {
				deltas.push(delta);
			}
		}
	}
	return deltas;
}
