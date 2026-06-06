import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  rateKey,
  RATE_RULES,
  type KvStore,
} from "./rate-limit.js";
import {
  createSignedToken,
  generateNumericCode,
  verifySignedToken,
} from "./signing.js";
import { createEmailToken, verifyEmailToken } from "./email-verification.js";

/** In-memory KV with TTL, good enough to test the limiter algorithm. */
function fakeStore(): KvStore {
  const vals = new Map<string, number>();
  const ttls = new Map<string, number>();
  return {
    async incr(k) {
      const n = (vals.get(k) ?? 0) + 1;
      vals.set(k, n);
      return n;
    },
    async expire(k, s) {
      ttls.set(k, s);
    },
    async ttl(k) {
      return ttls.get(k) ?? -1;
    },
  };
}

describe("checkRateLimit", () => {
  it("allows up to max, then blocks with retryAfter", async () => {
    const store = fakeStore();
    const key = rateKey("login", "1.2.3.4");
    const rule = RATE_RULES.login; // max 5 / 60s

    for (let i = 0; i < rule.max; i++) {
      const r = await checkRateLimit(store, key, rule);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(store, key, rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });
});

describe("signing", () => {
  it("round-trips signed data", () => {
    const t = createSignedToken({ roomId: "abc" }, "secret", 60);
    expect(verifySignedToken<{ roomId: string }>(t, "secret").roomId).toBe("abc");
  });

  it("rejects wrong secret", () => {
    const t = createSignedToken({ a: 1 }, "secret", 60);
    expect(() => verifySignedToken(t, "other")).toThrow();
  });

  it("rejects expired", () => {
    const t = createSignedToken({ a: 1 }, "secret", -1);
    expect(() => verifySignedToken(t, "secret")).toThrow(/expired/);
  });

  it("rejects tampered payload", () => {
    const t = createSignedToken({ admin: false }, "secret", 60);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(
      JSON.stringify({ data: { admin: true }, exp: 9999999999 }),
    ).toString("base64url");
    expect(() => verifySignedToken(`${forged}.${sig}`, "secret")).toThrow();
    expect(body).toBeTruthy();
  });

  it("generates zero-padded numeric codes", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateNumericCode(6);
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("email tokens", () => {
  it("verifies matching purpose, rejects mismatched", () => {
    const t = createEmailToken("user-1", "verify-email", "secret");
    expect(verifyEmailToken(t, "verify-email", "secret")).toBe("user-1");
    expect(() => verifyEmailToken(t, "reset-password", "secret")).toThrow();
  });
});
