/** OAuth 2.0 PKCE authentication for Melcloud Home, mirroring aiomelcloudhome's auth.py. */

import { createHash, randomBytes } from "node:crypto";
import { CookieJar } from "./cookie-jar";
import { MelCloudHomeAuthenticationError } from "./errors";
import { stringify } from "./stringify";

const AUTH_BASE = "https://auth.melcloudhome.com";
const CLIENT_ID = "homemobile";
const REDIRECT_URI = "melcloudhome://";
const SCOPES = "openid profile email offline_access IdentityServerApi";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const MAX_REDIRECTS = 10;

export interface AbstractAuth {
	getAccessToken: () => Promise<string>;
}

/** Auth adapter that always returns a fixed access token. */
export class StaticTokenAuth implements AbstractAuth {
	public constructor(private readonly accessToken: string) {}

	public getAccessToken(): Promise<string> {
		return Promise.resolve(this.accessToken);
	}
}

/** Persistable OAuth session state, so it can be restored across adapter restarts. */
export interface MelCloudHomeSession {
	accessToken: string | null;
	refreshToken: string | null;
	/** Epoch milliseconds. */
	expiresAt: number;
}

function pkcePair(): { verifier: string; challenge: string } {
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	return { verifier, challenge };
}

function resolveUrl(location: string, base: string): string {
	try {
		return new URL(location, base).toString();
	} catch {
		return location;
	}
}

/** Best-effort response body excerpt for error messages; never throws. */
async function safeBody(res: Response): Promise<string> {
	try {
		return (await res.clone().text()).slice(0, 300).replace(/\s+/g, " ");
	} catch {
		return "<unreadable body>";
	}
}

interface RedirectResult {
	/** The final URL reached once redirects stop (either a non-http scheme, or a normal response). */
	location: string;
	/** Set when the chain stopped on a normal (followable) response rather than running out of hops. */
	response?: Response;
}

export class MelCloudHomeAuth implements AbstractAuth {
	private readonly jar = new CookieJar();
	private accessToken: string | null = null;
	private refreshToken: string | null = null;
	private expiresAt = 0;
	private pendingAuth: Promise<void> | null = null;

	public constructor(
		private readonly username: string,
		private readonly password: string,
		private readonly logger?: ioBroker.Logger,
	) {}

	private debug(message: string): void {
		this.logger?.debug(`[auth] ${message}`);
	}

	public get isTokenValid(): boolean {
		return Boolean(this.accessToken) && Date.now() < this.expiresAt - TOKEN_REFRESH_BUFFER_MS;
	}

	/** Export the current session so it can be persisted across adapter restarts. */
	public exportSession(): MelCloudHomeSession {
		return { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresAt: this.expiresAt };
	}

	/**
	 * Restore a previously persisted session (does not validate it; a refresh/re-auth still happens on demand).
	 *
	 * @param session
	 */
	public importSession(session: MelCloudHomeSession | null | undefined): void {
		if (!session) {
			return;
		}
		this.accessToken = session.accessToken;
		this.refreshToken = session.refreshToken;
		this.expiresAt = session.expiresAt;
	}

	public async getAccessToken(): Promise<string> {
		await this.ensureValidToken();
		if (!this.accessToken) {
			throw new MelCloudHomeAuthenticationError("No access token available");
		}
		return this.accessToken;
	}

	private async ensureValidToken(): Promise<void> {
		if (this.isTokenValid) {
			return;
		}
		// Coalesce concurrent callers into a single auth/refresh attempt.
		if (!this.pendingAuth) {
			this.pendingAuth = this.refresh().finally(() => {
				this.pendingAuth = null;
			});
		}
		await this.pendingAuth;
	}

	private async fetchFollowingRedirects(url: string, init: RequestInit): Promise<RedirectResult> {
		let currentUrl = url;
		for (let i = 0; i < MAX_REDIRECTS; i++) {
			if (!currentUrl || (!currentUrl.startsWith("http://") && !currentUrl.startsWith("https://"))) {
				return { location: currentUrl };
			}
			const target = new URL(currentUrl);
			let res: Response;
			try {
				res = await fetch(currentUrl, {
					...init,
					redirect: "manual",
					headers: { ...init.headers, Cookie: this.jar.header(target) },
				});
			} catch (err) {
				throw new MelCloudHomeAuthenticationError(`Request to ${currentUrl} failed: ${(err as Error).message}`);
			}
			this.jar.storeFromHeaders(target, res.headers);
			const locationHeader = res.headers.get("location");
			// Some hops are client-side "Redirect" pages with no HTTP Location header; the real next
			// hop is instead embedded in a `RedirectUri` query parameter of the page we just requested.
			const redirectUriParam = !locationHeader ? target.searchParams.get("RedirectUri") : null;
			const nextHop = locationHeader ?? redirectUriParam;
			this.debug(
				`Redirect hop ${i + 1}: HTTP ${res.status} for ${currentUrl}${nextHop ? ` -> ${nextHop}` : " (terminal)"}`,
			);
			if (!nextHop) {
				return { location: currentUrl, response: res };
			}
			currentUrl = resolveUrl(nextHop, currentUrl);
			// Only the initial request carries a method/body; subsequent redirect hops are GETs.
			init = { headers: init.headers };
		}
		this.debug(`Gave up following redirects after ${MAX_REDIRECTS} hops, last url: ${currentUrl}`);
		return { location: currentUrl };
	}

	/** Perform the full OAuth 2.0 PKCE authentication flow (username/password login). */
	private async authenticate(): Promise<void> {
		this.debug("Starting full login (PAR + Cognito + code exchange)");
		const { verifier, challenge } = pkcePair();
		const state = randomBytes(16).toString("base64url");

		const parUrl = `${AUTH_BASE}/connect/par`;
		const parTarget = new URL(parUrl);
		let parRes: Response;
		try {
			parRes = await fetch(parUrl, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: this.jar.header(parTarget) },
				body: new URLSearchParams({
					client_id: CLIENT_ID,
					redirect_uri: REDIRECT_URI,
					response_type: "code",
					scope: SCOPES,
					state,
					code_challenge: challenge,
					code_challenge_method: "S256",
				}),
				redirect: "manual",
			});
		} catch (err) {
			throw new MelCloudHomeAuthenticationError(`PAR request failed: ${(err as Error).message}`);
		}
		this.jar.storeFromHeaders(parTarget, parRes.headers);
		this.debug(`PAR response: HTTP ${parRes.status}`);
		if (!parRes.ok) {
			throw new MelCloudHomeAuthenticationError(
				`PAR request failed: HTTP ${parRes.status} - ${await safeBody(parRes)}`,
			);
		}
		let parData: { request_uri?: string };
		try {
			parData = (await parRes.json()) as { request_uri?: string };
		} catch (err) {
			throw new MelCloudHomeAuthenticationError(`PAR response was not valid JSON: ${(err as Error).message}`);
		}
		if (!parData.request_uri) {
			throw new MelCloudHomeAuthenticationError("PAR request failed: no request_uri in response");
		}

		const authUrl = `${AUTH_BASE}/connect/authorize?${new URLSearchParams({ client_id: CLIENT_ID, request_uri: parData.request_uri }).toString()}`;
		this.debug("Following /connect/authorize redirects");
		const authResult = await this.fetchFollowingRedirects(authUrl, { method: "GET" });

		if (!authResult.response) {
			this.debug(
				`Authorize landed directly on a non-http redirect (already authenticated at the IdP): ${authResult.location}`,
			);
			// Landed directly on the app callback (already authenticated at the IdP).
			await this.handleCallbackLocation(authResult.location, verifier);
			return;
		}

		this.debug(`Authorize ended on: ${authResult.location} (HTTP ${authResult.response.status})`);
		const cognitoHtml = await authResult.response.text();
		const cognitoUrl = authResult.location;
		const csrfMatch = /name="_csrf"\s+value="([^"]+)"/.exec(cognitoHtml);
		if (!csrfMatch) {
			throw new MelCloudHomeAuthenticationError(
				`Could not extract CSRF token from Cognito login page (HTTP ${authResult.response.status}, url: ${cognitoUrl}, body starts with: ${cognitoHtml.slice(0, 200).replace(/\s+/g, " ")})`,
			);
		}
		const csrfToken = csrfMatch[1];

		const parsed = new URL(cognitoUrl);
		const loginUrl = `${parsed.origin}${parsed.pathname}`;
		const loginRequestUrl = `${loginUrl}${parsed.search}`;

		this.debug("Submitting Cognito credentials");
		const loginTarget = new URL(loginRequestUrl);
		let loginRes: Response;
		try {
			loginRes = await fetch(loginRequestUrl, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: this.jar.header(loginTarget) },
				body: new URLSearchParams({ _csrf: csrfToken, username: this.username, password: this.password }),
				redirect: "manual",
			});
		} catch (err) {
			throw new MelCloudHomeAuthenticationError(`Credential submission failed: ${(err as Error).message}`);
		}
		this.jar.storeFromHeaders(loginTarget, loginRes.headers);
		this.debug(`Credential submission response: HTTP ${loginRes.status}`);
		if (loginRes.status !== 301 && loginRes.status !== 302) {
			throw new MelCloudHomeAuthenticationError(
				`Cognito credential submission did not redirect (HTTP ${loginRes.status}); check username/password. Body: ${await safeBody(loginRes)}`,
			);
		}
		const rawLocation = loginRes.headers.get("location") ?? "";
		if (!rawLocation) {
			throw new MelCloudHomeAuthenticationError(
				"Cognito credential submission did not return a redirect location",
			);
		}
		const callbackStart = resolveUrl(rawLocation, loginUrl);

		this.debug("Following post-login redirects to the app callback");
		const followResult = await this.fetchFollowingRedirects(callbackStart, { method: "GET" });
		await this.handleCallbackLocation(followResult.location, verifier);
	}

	private async handleCallbackLocation(location: string, verifier: string): Promise<void> {
		let query: URLSearchParams;
		try {
			query = new URL(location).searchParams;
		} catch {
			throw new MelCloudHomeAuthenticationError(
				`No authorization code in callback (unparseable location: ${location})`,
			);
		}
		const code = query.get("code");
		if (!code) {
			throw new MelCloudHomeAuthenticationError(`No authorization code in callback location: ${location}`);
		}
		this.debug("Authorization code received, exchanging for tokens");
		await this.exchangeCode(code, verifier);
	}

	private async exchangeCode(code: string, verifier: string): Promise<void> {
		let res: Response;
		try {
			res = await fetch(`${AUTH_BASE}/connect/token`, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					grant_type: "authorization_code",
					client_id: CLIENT_ID,
					code,
					redirect_uri: REDIRECT_URI,
					code_verifier: verifier,
				}),
			});
		} catch (err) {
			throw new MelCloudHomeAuthenticationError(`Token exchange failed: ${(err as Error).message}`);
		}
		if (!res.ok) {
			throw new MelCloudHomeAuthenticationError(
				`Token exchange failed: HTTP ${res.status} - ${await safeBody(res)}`,
			);
		}
		this.storeTokens((await res.json()) as Record<string, unknown>);
		this.debug("Token exchange succeeded; session established");
	}

	/** Refresh the access token using the stored refresh token, or perform a full login if needed. */
	private async refresh(): Promise<void> {
		if (!this.refreshToken) {
			this.debug("No refresh token available; performing full login");
			await this.authenticate();
			return;
		}
		this.debug("Refreshing access token using stored refresh token");
		let res: Response;
		try {
			res = await fetch(`${AUTH_BASE}/connect/token`, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					grant_type: "refresh_token",
					client_id: CLIENT_ID,
					refresh_token: this.refreshToken,
				}),
			});
		} catch (err) {
			throw new MelCloudHomeAuthenticationError(`Token refresh failed: ${(err as Error).message}`);
		}
		if (!res.ok) {
			if (res.status === 400) {
				this.debug("Refresh token rejected (HTTP 400); falling back to full login");
				await this.authenticate();
				return;
			}
			throw new MelCloudHomeAuthenticationError(
				`Token refresh failed: HTTP ${res.status} - ${await safeBody(res)}`,
			);
		}
		this.storeTokens((await res.json()) as Record<string, unknown>);
		this.debug("Token refresh succeeded");
	}

	private storeTokens(tokenData: Record<string, unknown>): void {
		this.accessToken = stringify(tokenData.access_token);
		this.refreshToken = stringify(tokenData.refresh_token);
		const expiresIn = Number(tokenData.expires_in ?? 3600);
		this.expiresAt = Date.now() + expiresIn * 1000;
	}
}
