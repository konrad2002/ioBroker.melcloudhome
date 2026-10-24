/** On-demand WebSocket live-update client for MELCloud Home. */

import WebSocket from "ws";
import { fetchWithTimeout, type AbstractAuth } from "./auth";
import { MelCloudHomeWebSocketError } from "./errors";
import { parseFrame } from "./realtime";
import type { UnitStateDelta } from "./types";

const WS_TOKEN_URL = "https://6x2dgdulg7omjsxalnhmo4ynba0dcgwk.lambda-url.eu-west-1.on.aws/";
const WS_URL = "wss://ws.melcloudhome.com/";

const BACKOFF_INITIAL_MS = 1000;
const BACKOFF_MAX_MS = 60_000;
const HEARTBEAT_MS = 30_000;

export type MelCloudHomeWebSocketHandlers = {
	onDelta: (delta: UnitStateDelta) => void;
	onError?: (err: Error) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
};

export class MelCloudHomeWebSocket {
	private stopped = false;
	private ws: WebSocket | null = null;
	private reconnectTimer: ioBroker.Timeout | undefined = undefined;
	private heartbeatTimer: ioBroker.Interval | undefined = undefined;
	private backoffMs = BACKOFF_INITIAL_MS;

	public constructor(
		private readonly adapter: ioBroker.Adapter,
		private readonly auth: AbstractAuth,
		private readonly handlers: MelCloudHomeWebSocketHandlers,
	) {}

	/** Start the (re)connecting live-update stream. Resolves once the first connection attempt has been made. */
	public start(): void {
		this.stopped = false;
		this.backoffMs = BACKOFF_INITIAL_MS;
		void this.connect();
	}

	/** Stop the stream gracefully and tear down the active socket. */
	public close(): void {
		this.stopped = true;
		if (this.reconnectTimer) {
			this.adapter.clearTimeout(this.reconnectTimer);
		}
		if (this.heartbeatTimer) {
			this.adapter.clearInterval(this.heartbeatTimer);
		}
		this.ws?.close();
		this.ws = null;
	}

	private async fetchHash(): Promise<string> {
		const token = await this.auth.getAccessToken();
		const res = await fetchWithTimeout(WS_TOKEN_URL, { headers: { Authorization: `Bearer ${token}` } });
		if (!res.ok) {
			throw new MelCloudHomeWebSocketError(`WebSocket token request failed: HTTP ${res.status}`);
		}
		const data = (await res.json()) as {
			hash?: string;
		};
		if (!data.hash) {
			throw new MelCloudHomeWebSocketError("WebSocket token response did not contain a hash");
		}
		return data.hash;
	}

	private async connect(): Promise<void> {
		if (this.stopped) {
			return;
		}
		try {
			const hash = await this.fetchHash();
			const url = new URL(WS_URL);
			url.searchParams.set("hash", hash);
			const ws = new WebSocket(url);
			this.ws = ws;

			ws.on("open", () => {
				this.backoffMs = BACKOFF_INITIAL_MS;
				this.handlers.onConnected?.();
				this.heartbeatTimer = this.adapter.setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.ping();
					}
				}, HEARTBEAT_MS);
			});

			ws.on("message", data => {
				try {
					const raw = Array.isArray(data)
						? Buffer.concat(data)
						: Buffer.isBuffer(data)
							? data
							: Buffer.from(data);
					const payload = JSON.parse(raw.toString("utf8"));
					for (const delta of parseFrame(payload)) {
						this.handlers.onDelta(delta);
					}
				} catch (err) {
					this.handlers.onError?.(err as Error);
				}
			});

			const scheduleReconnect = (): void => {
				if (this.heartbeatTimer) {
					this.adapter.clearInterval(this.heartbeatTimer);
				}
				this.ws = null;
				this.handlers.onDisconnected?.();
				if (this.stopped) {
					return;
				}

				this.adapter.setTimeout(() => void this.connect(), this.backoffMs);
				this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
			};

			ws.on("close", scheduleReconnect);
			ws.on("error", err => {
				this.handlers.onError?.(err);
			});
		} catch (err) {
			this.handlers.onError?.(err as Error);
			if (!this.stopped) {
				this.reconnectTimer = this.adapter.setTimeout(() => void this.connect(), this.backoffMs);
				this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
			}
		}
	}
}
