// ── LSP Health Check Utility ──────────────────────────────

/**
 * Checks if an LSP server is reachable via its health endpoint.
 *
 * @param baseUrl  The LSP server base URL (e.g. "https://monaco-lsp-hub.onrender.com")
 * @param timeoutMs  Request timeout in milliseconds (default: 5000)
 * @returns `true` if the server responded with 2xx, `false` otherwise
 */
export async function checkLspHealth(
  baseUrl: string,
  timeoutMs = 5000,
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/health`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
