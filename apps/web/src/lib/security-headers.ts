/**
 * Security headers + Content-Security-Policy builder.
 *
 * CSP allows what the ported mock needs: Google Fonts (style + font origins)
 * and inline background-image data. Scripts are locked to self + a per-request
 * nonce (no 'unsafe-inline' for scripts).
 */
export interface CspOptions {
  /** Origin of the game-server for WebSocket connect-src (wss/ws). */
  gameServerOrigin?: string;
  /** Turnstile needs its script + frame. */
  enableTurnstile?: boolean;
}

export function buildCsp(nonce: string, opts: CspOptions = {}): string {
  const turnstile = opts.enableTurnstile
    ? ["https://challenges.cloudflare.com"]
    : [];
  const gs = opts.gameServerOrigin || "";
  const ws = gs
    ? [
        gs.replace(/^http/, "ws"),
        gs,
        // Allow trailing-slash variants
        gs.endsWith("/") ? gs.slice(0, -1) : gs + "/",
      ]
    : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'", "'unsafe-eval'", ...turnstile],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'", ...ws],
    "frame-src": [...turnstile],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

/** Static security headers (CSP is added per-request with the nonce). */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};
