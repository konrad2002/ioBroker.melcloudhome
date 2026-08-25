/** Minimal domain-aware cookie jar for the manual PKCE/Cognito login flow (no external deps). */

export class CookieJar {
	private readonly cookies = new Map<string, Map<string, string>>();

	/**
	 * Store any `Set-Cookie` headers found on a response received for `url`.
	 *
	 * @param url
	 * @param headers
	 */
	public storeFromHeaders(url: URL, headers: Headers): void {
		const setCookieHeaders = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
		for (const raw of setCookieHeaders) {
			const [pair, ...attrs] = raw.split(";").map(part => part.trim());
			const eq = pair.indexOf("=");
			if (eq === -1) {
				continue;
			}
			const name = pair.slice(0, eq);
			const value = pair.slice(eq + 1);
			let domain = url.hostname;
			for (const attr of attrs) {
				const sep = attr.indexOf("=");
				if (sep === -1) {
					continue;
				}
				const key = attr.slice(0, sep).trim().toLowerCase();
				const val = attr.slice(sep + 1).trim();
				if (key === "domain" && val) {
					domain = val.replace(/^\./, "");
				}
			}
			if (!this.cookies.has(domain)) {
				this.cookies.set(domain, new Map());
			}
			this.cookies.get(domain)!.set(name, value);
		}
	}

	/**
	 * Build the `Cookie` header value applicable to `url`.
	 *
	 * @param url
	 */
	public header(url: URL): string {
		const host = url.hostname;
		const parts: string[] = [];
		for (const [domain, values] of this.cookies) {
			if (host === domain || host.endsWith(`.${domain}`)) {
				for (const [name, value] of values) {
					parts.push(`${name}=${value}`);
				}
			}
		}
		return parts.join("; ");
	}
}
