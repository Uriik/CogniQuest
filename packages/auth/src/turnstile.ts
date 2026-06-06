/**
 * Cloudflare Turnstile server-side verification.
 * Call on register/login before trusting the request.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return { success: false, errorCodes: [`http-${res.status}`] };

  const data = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };
  return { success: data.success, errorCodes: data["error-codes"] ?? [] };
}
