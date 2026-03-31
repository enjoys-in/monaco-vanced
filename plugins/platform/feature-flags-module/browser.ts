// ── Feature Flags Module — BrowserDetector ────────────────────

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  mobile: boolean;
}

export class BrowserDetector {
  detect(): BrowserInfo {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const info: BrowserInfo = {
      name: "unknown",
      version: "0",
      engine: "unknown",
      mobile: /mobile|android/i.test(ua),
    };

    if (/firefox\//i.test(ua)) {
      info.name = "firefox";
      info.engine = "gecko";
      info.version = ua.match(/firefox\/([\d.]+)/i)?.[1] ?? "0";
    } else if (/edg\//i.test(ua)) {
      info.name = "edge";
      info.engine = "blink";
      info.version = ua.match(/edg\/([\d.]+)/i)?.[1] ?? "0";
    } else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) {
      info.name = "chrome";
      info.engine = "blink";
      info.version = ua.match(/chrome\/([\d.]+)/i)?.[1] ?? "0";
    } else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) {
      info.name = "safari";
      info.engine = "webkit";
      info.version = ua.match(/version\/([\d.]+)/i)?.[1] ?? "0";
    }

    return info;
  }

  toFlags(): Map<string, boolean | string> {
    const info = this.detect();
    const flags = new Map<string, boolean | string>();
    flags.set("browser.name", info.name);
    flags.set("browser.version", info.version);
    flags.set("browser.engine", info.engine);
    flags.set("browser.mobile", info.mobile);
    return flags;
  }
}
