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
	) {}

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
			const target = new URL(currentUrl);
			const res = await fetch(currentUrl, {
				...init,
				redirect: "manual",
				headers: { ...init.headers, Cookie: this.jar.header(target) },
			});
			this.jar.storeFromHeaders(target, res.headers);
			const location = res.headers.get("location");
			if (res.status >= 300 && res.status < 400 && location) {
				const resolved = resolveUrl(location, currentUrl);
				if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) {
					return { location: resolved };
				}
				currentUrl = resolved;
				// Only the initial request carries a method/body; subsequent redirect hops are GETs.
				init = { headers: init.headers };
				continue;
			}
			return { location: currentUrl, response: res };
		}
		return { location: currentUrl };
	}

	/** Perform the full OAuth 2.0 PKCE authentication flow (username/password login). */
	private async authenticate(): Promise<void> {
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
		if (!parRes.ok) {
			throw new MelCloudHomeAuthenticationError(`PAR request failed: HTTP ${parRes.status}`);
		}
		const parData = (await parRes.json()) as {
			request_uri?: string;
		};
		if (!parData.request_uri) {
			throw new MelCloudHomeAuthenticationError("PAR request failed: no request_uri in response");
		}

		const authUrl = `${AUTH_BASE}/connect/authorize?${new URLSearchParams({ client_id: CLIENT_ID, request_uri: parData.request_uri }).toString()}`;
		const authResult = await this.fetchFollowingRedirects(authUrl, { method: "GET" });

		if (!authResult.response) {
			// Landed directly on the app callback (already authenticated at the IdP).
			await this.handleCallbackLocation(authResult.location, verifier);
			return;
		}

		const cognitoHtml = await authResult.response.text();
		const cognitoUrl = authResult.location;
		const csrfMatch = /name="_csrf"\s+value="([^"]+)"/.exec(cognitoHtml);
		if (!csrfMatch) {
			throw new MelCloudHomeAuthenticationError("Could not extract CSRF token from Cognito login page");
		}
		const csrfToken = csrfMatch[1];

		const parsed = new URL(cognitoUrl);
		const loginUrl = `${parsed.origin}${parsed.pathname}`;
		const loginRequestUrl = `${loginUrl}${parsed.search}`;

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
		if (loginRes.status !== 301 && loginRes.status !== 302) {
			throw new MelCloudHomeAuthenticationError(
				"Cognito credential submission did not redirect; check username/password",
			);
		}
		const rawLocation = loginRes.headers.get("location") ?? "";
		if (!rawLocation) {
			throw new MelCloudHomeAuthenticationError(
				"Cognito credential submission did not return a redirect location",
			);
		}
		const callbackStart = resolveUrl(rawLocation, loginUrl);

		const followResult = await this.fetchFollowingRedirects(callbackStart, { method: "GET" });
		await this.handleCallbackLocation(followResult.location, verifier);
	}

	private async handleCallbackLocation(location: string, verifier: string): Promise<void> {
		let query: URLSearchParams;
		try {
			query = new URL(location).searchParams;
		} catch {
			throw new MelCloudHomeAuthenticationError("No authorization code in callback");
		}
		const code = query.get("code");
		if (!code) {
			throw new MelCloudHomeAuthenticationError("No authorization code in callback");
		}
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
			throw new MelCloudHomeAuthenticationError(`Token exchange failed: HTTP ${res.status}`);
		}
		this.storeTokens((await res.json()) as Record<string, unknown>);
	}

	/** Refresh the access token using the stored refresh token, or perform a full login if needed. */
	private async refresh(): Promise<void> {
		if (!this.refreshToken) {
			await this.authenticate();
			return;
		}
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
				await this.authenticate();
				return;
			}
			throw new MelCloudHomeAuthenticationError(`Token refresh failed: HTTP ${res.status}`);
		}
		this.storeTokens((await res.json()) as Record<string, unknown>);
	}

	private storeTokens(tokenData: Record<string, unknown>): void {
		this.accessToken = stringify(tokenData.access_token);
		this.refreshToken = stringify(tokenData.refresh_token);
		const expiresIn = Number(tokenData.expires_in ?? 3600);
		this.expiresAt = Date.now() + expiresIn * 1000;
	}
}
