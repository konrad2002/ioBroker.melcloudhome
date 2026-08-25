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
var cookie_jar_exports = {};
__export(cookie_jar_exports, {
  CookieJar: () => CookieJar
});
module.exports = __toCommonJS(cookie_jar_exports);
class CookieJar {
  cookies = /* @__PURE__ */ new Map();
  /**
   * Store any `Set-Cookie` headers found on a response received for `url`.
   *
   * @param url
   * @param headers
   */
  storeFromHeaders(url, headers) {
    const setCookieHeaders = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const raw of setCookieHeaders) {
      const [pair, ...attrs] = raw.split(";").map((part) => part.trim());
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
        this.cookies.set(domain, /* @__PURE__ */ new Map());
      }
      this.cookies.get(domain).set(name, value);
    }
  }
  /**
   * Build the `Cookie` header value applicable to `url`.
   *
   * @param url
   */
  header(url) {
    const host = url.hostname;
    const parts = [];
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CookieJar
});
//# sourceMappingURL=cookie-jar.js.map
