"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var auth_exports = {};
__export(auth_exports, {
  MelCloudHomeAuth: () => MelCloudHomeAuth,
  StaticTokenAuth: () => StaticTokenAuth
});
module.exports = __toCommonJS(auth_exports);
var import_node_crypto = require("node:crypto");
var import_cookie_jar = require("./cookie-jar");
var import_errors = require("./errors");
var import_stringify = require("./stringify");
const AUTH_BASE = "https://auth.melcloudhome.com";
const CLIENT_ID = "homemobile";
const REDIRECT_URI = "melcloudhome://";
const SCOPES = "openid profile email offline_access IdentityServerApi";
const TOKEN_REFRESH_BUFFER_MS = 6e4;
const MAX_REDIRECTS = 10;
class StaticTokenAuth {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }
  getAccessToken() {
    return Promise.resolve(this.accessToken);
  }
}
function pkcePair() {
  const verifier = (0, import_node_crypto.randomBytes)(32).toString("base64url");
  const challenge = (0, import_node_crypto.createHash)("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
function resolveUrl(location, base) {
  try {
    return new URL(location, base).toString();
  } catch {
    return location;
  }
}
async function safeBody(res) {
  try {
    return (await res.clone().text()).slice(0, 300).replace(/\s+/g, " ");
  } catch {
    return "<unreadable body>";
  }
}
class MelCloudHomeAuth {
  constructor(username, password, logger) {
    this.username = username;
    this.password = password;
    this.logger = logger;
  }
  jar = new import_cookie_jar.CookieJar();
  accessToken = null;
  refreshToken = null;
  expiresAt = 0;
  pendingAuth = null;
  debug(message) {
    var _a;
    (_a = this.logger) == null ? void 0 : _a.debug(`[auth] ${message}`);
  }
  get isTokenValid() {
    return Boolean(this.accessToken) && Date.now() < this.expiresAt - TOKEN_REFRESH_BUFFER_MS;
  }
  /** Export the current session so it can be persisted across adapter restarts. */
  exportSession() {
    return { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresAt: this.expiresAt };
  }
  /**
   * Restore a previously persisted session (does not validate it; a refresh/re-auth still happens on demand).
   *
   * @param session
   */
  importSession(session) {
    if (!session) {
      return;
    }
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.expiresAt = session.expiresAt;
  }
  async getAccessToken() {
    await this.ensureValidToken();
    if (!this.accessToken) {
      throw new import_errors.MelCloudHomeAuthenticationError("No access token available");
    }
    return this.accessToken;
  }
  async ensureValidToken() {
    if (this.isTokenValid) {
      return;
    }
    if (!this.pendingAuth) {
      this.pendingAuth = this.refresh().finally(() => {
        this.pendingAuth = null;
      });
    }
    await this.pendingAuth;
  }
  async fetchFollowingRedirects(url, init) {
    let currentUrl = url;
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      if (!currentUrl || !currentUrl.startsWith("http://") && !currentUrl.startsWith("https://")) {
        return { location: currentUrl };
      }
      const target = new URL(currentUrl);
      let res;
      try {
        res = await fetch(currentUrl, {
          ...init,
          redirect: "manual",
          headers: { ...init.headers, Cookie: this.jar.header(target) }
        });
      } catch (err) {
        throw new import_errors.MelCloudHomeAuthenticationError(`Request to ${currentUrl} failed: ${err.message}`);
      }
      this.jar.storeFromHeaders(target, res.headers);
      const locationHeader = res.headers.get("location");
      const redirectUriParam = !locationHeader ? target.searchParams.get("RedirectUri") : null;
      const nextHop = locationHeader != null ? locationHeader : redirectUriParam;
      this.debug(`Redirect hop ${i + 1}: HTTP ${res.status} for ${currentUrl}${nextHop ? ` -> ${nextHop}` : " (terminal)"}`);
      if (!nextHop) {
        return { location: currentUrl, response: res };
      }
      currentUrl = resolveUrl(nextHop, currentUrl);
      init = { headers: init.headers };
    }
    this.debug(`Gave up following redirects after ${MAX_REDIRECTS} hops, last url: ${currentUrl}`);
    return { location: currentUrl };
  }
  /** Perform the full OAuth 2.0 PKCE authentication flow (username/password login). */
  async authenticate() {
    var _a;
    this.debug("Starting full login (PAR + Cognito + code exchange)");
    const { verifier, challenge } = pkcePair();
    const state = (0, import_node_crypto.randomBytes)(16).toString("base64url");
    const parUrl = `${AUTH_BASE}/connect/par`;
    const parTarget = new URL(parUrl);
    let parRes;
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
          code_challenge_method: "S256"
        }),
        redirect: "manual"
      });
    } catch (err) {
      throw new import_errors.MelCloudHomeAuthenticationError(`PAR request failed: ${err.message}`);
    }
    this.jar.storeFromHeaders(parTarget, parRes.headers);
    this.debug(`PAR response: HTTP ${parRes.status}`);
    if (!parRes.ok) {
      throw new import_errors.MelCloudHomeAuthenticationError(
        `PAR request failed: HTTP ${parRes.status} - ${await safeBody(parRes)}`
      );
    }
    let parData;
    try {
      parData = await parRes.json();
    } catch (err) {
      throw new import_errors.MelCloudHomeAuthenticationError(`PAR response was not valid JSON: ${err.message}`);
    }
    if (!parData.request_uri) {
      throw new import_errors.MelCloudHomeAuthenticationError("PAR request failed: no request_uri in response");
    }
    const authUrl = `${AUTH_BASE}/connect/authorize?${new URLSearchParams({ client_id: CLIENT_ID, request_uri: parData.request_uri }).toString()}`;
    this.debug("Following /connect/authorize redirects");
    const authResult = await this.fetchFollowingRedirects(authUrl, { method: "GET" });
    if (!authResult.response) {
      this.debug(
        `Authorize landed directly on a non-http redirect (already authenticated at the IdP): ${authResult.location}`
      );
      await this.handleCallbackLocation(authResult.location, verifier);
      return;
    }
    this.debug(`Authorize ended on: ${authResult.location} (HTTP ${authResult.response.status})`);
    const cognitoHtml = await authResult.response.text();
    const cognitoUrl = authResult.location;
    const csrfMatch = /name="_csrf"\s+value="([^"]+)"/.exec(cognitoHtml);
    if (!csrfMatch) {
      throw new import_errors.MelCloudHomeAuthenticationError(
        `Could not extract CSRF token from Cognito login page (HTTP ${authResult.response.status}, url: ${cognitoUrl}, body starts with: ${cognitoHtml.slice(0, 200).replace(/\s+/g, " ")})`
      );
    }
    const csrfToken = csrfMatch[1];
    const parsed = new URL(cognitoUrl);
    const loginUrl = `${parsed.origin}${parsed.pathname}`;
    const loginRequestUrl = `${loginUrl}${parsed.search}`;
    this.debug("Submitting Cognito credentials");
    const loginTarget = new URL(loginRequestUrl);
    let loginRes;
    try {
      loginRes = await fetch(loginRequestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: this.jar.header(loginTarget) },
        body: new URLSearchParams({ _csrf: csrfToken, username: this.username, password: this.password }),
        redirect: "manual"
      });
    } catch (err) {
      throw new import_errors.MelCloudHomeAuthenticationError(`Credential submission failed: ${err.message}`);
    }
    this.jar.storeFromHeaders(loginTarget, loginRes.headers);
    this.debug(`Credential submission response: HTTP ${loginRes.status}`);
    if (loginRes.status !== 301 && loginRes.status !== 302) {
      throw new import_errors.MelCloudHomeAuthenticationError(
        `Cognito credential submission did not redirect (HTTP ${loginRes.status}); check username/password. Body: ${await safeBody(loginRes)}`
      );
    }
    const rawLocation = (_a = loginRes.headers.get("location")) != null ? _a : "";
    if (!rawLocation) {
      throw new import_errors.MelCloudHomeAuthenticationError(
        "Cognito credential submission did not return a redirect location"
      );
    }
    const callbackStart = resolveUrl(rawLocation, loginUrl);
    this.debug("Following post-login redirects to the app callback");
    const followResult = await this.fetchFollowingRedirects(callbackStart, { method: "GET" });
    await this.handleCallbackLocation(followResult.location, verifier);
  }
  async handleCallbackLocation(location, verifier) {
    let query;
    try {
      query = new URL(location).searchParams;
    } catch {
      throw new import_errors.MelCloudHomeAuthenticationError(
        `No authorization code in callback (unparseable location: ${location})`
      );
    }
    const code = query.get("code");
    if (!code) {
      throw new import_errors.MelCloudHomeAuthenticationError(`No authorization code in callback location: ${location}`);
    }
    this.debug("Authorization code received, exchanging for tokens");
    await this.exchangeCode(code, verifier);
  }
  async exchangeCode(code, verifier) {
    let res;
    try {
      res = await fetch(`${AUTH_BASE}/connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier
        })
      });
    } catch (err) {
      throw new import_errors.MelCloudHomeAuthenticationError(`Token exchange failed: ${err.message}`);
    }
    if (!res.ok) {
      throw new import_errors.MelCloudHomeAuthenticationError(
        `Token exchange failed: HTTP ${res.status} - ${await safeBody(res)}`
      );
    }
    this.storeTokens(await res.json());
    this.debug("Token exchange succeeded; session established");
  }
  /** Refresh the access token using the stored refresh token, or perform a full login if needed. */
  async refresh() {
    if (!this.refreshToken) {
      this.debug("No refresh token available; performing full login");
      await this.authenticate();
      return;
    }
    this.debug("Refreshing access token using stored refresh token");
    let res;
    try {
      res = await fetch(`${AUTH_BASE}/connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: CLIENT_ID,
          refresh_token: this.refreshToken
        })
      });
    } catch (err) {
      throw new import_errors.MelCloudHomeAuthenticationError(`Token refresh failed: ${err.message}`);
    }
    if (!res.ok) {
      if (res.status === 400) {
        this.debug("Refresh token rejected (HTTP 400); falling back to full login");
        await this.authenticate();
        return;
      }
      throw new import_errors.MelCloudHomeAuthenticationError(
        `Token refresh failed: HTTP ${res.status} - ${await safeBody(res)}`
      );
    }
    this.storeTokens(await res.json());
    this.debug("Token refresh succeeded");
  }
  storeTokens(tokenData) {
    var _a;
    this.accessToken = (0, import_stringify.stringify)(tokenData.access_token);
    this.refreshToken = (0, import_stringify.stringify)(tokenData.refresh_token);
    const expiresIn = Number((_a = tokenData.expires_in) != null ? _a : 3600);
    this.expiresAt = Date.now() + expiresIn * 1e3;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MelCloudHomeAuth,
  StaticTokenAuth
});
//# sourceMappingURL=auth.js.map
